import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test, { beforeEach, after } from "node:test";
import { createApp } from "../apps/gateway/src/app";
import { config } from "../apps/gateway/src/config";
import { ApiKeyModel } from "../apps/gateway/src/models/ApiKey";
import { hashApiKey } from "../apps/gateway/src/services/apiKeys";
import { setEventPublisherForTests } from "../apps/gateway/src/services/eventQueue";
import { connectMongo, disconnectMongo, mongo } from "../apps/gateway/src/services/mongo";
import { setQueueStatsProviderForTests } from "../apps/gateway/src/services/queueStats";
import { redis, redisClient } from "../apps/gateway/src/services/redis";
import { resetSlidingWindows } from "../apps/gateway/src/services/slidingWindow";
import { checkTokenBucket } from "../apps/gateway/src/services/tokenBucket";
import { checkSlidingWindow } from "../apps/gateway/src/services/slidingWindow";
import type { RequestEvent } from "../apps/gateway/src/types/shared";

const publishedEvents: RequestEvent[] = [];

const resetState = async () => {
  await redis.reset();
  await mongo.reset();
  await ApiKeyModel.deleteMany({});
  publishedEvents.length = 0;
  setEventPublisherForTests(async (event) => {
    publishedEvents.push(event);
  });
  setQueueStatsProviderForTests(async () => ({
    queue: "request-events",
    backend: "kafka",
    topic: "request-events",
    groupId: "risk-worker",
    totalLag: publishedEvents.length,
    partitions: [
      {
        partition: 0,
        highWatermark: String(publishedEvents.length),
        committedOffset: "0",
        lag: publishedEvents.length,
      },
    ],
  }));
  await resetSlidingWindows();
};

const seedApiKey = async (rawKey: string) => {
  await ApiKeyModel.findOneAndUpdate(
    { keyHash: hashApiKey(rawKey) },
    {
      $set: {
        name: rawKey,
        keyHash: hashApiKey(rawKey),
        plan: "free",
        isActive: true,
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
    },
  );
};

const startFakeApi = async () => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");

    if (req.url === "/health") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url?.startsWith("/search")) {
      res.end(JSON.stringify({ q: new URL(req.url, "http://localhost").searchParams.get("q"), results: [{ id: "prod_keyboard" }] }));
      return;
    }

    if (req.url === "/checkout") {
      res.statusCode = 201;
      res.end(JSON.stringify({ orderId: "order_fake_123", status: "confirmed" }));
      return;
    }

    if (req.url === "/login") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        if (parsed.email === "user@example.com" && parsed.password === "password123") {
          res.end(JSON.stringify({ token: "fake-jwt-token" }));
          return;
        }
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Invalid email or password" }));
      });
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return { server, url: `http://127.0.0.1:${address.port}` };
};

const startGateway = async (upstreamUrl: string) => {
  config.upstreamUrl = upstreamUrl;
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return { server, url: `http://127.0.0.1:${address.port}` };
};

const closeServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
};

const request = async (baseUrl: string, path: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, {
  ...init,
  headers: {
    "content-type": "application/json",
    "x-api-key": "test-key",
    "x-forwarded-for": "203.0.113.10",
    "user-agent": "test-agent",
    ...(init.headers as Record<string, string> | undefined),
  },
});

beforeEach(async () => {
  await connectMongo();
  await resetState();
  await Promise.all([
    seedApiKey("test-key"),
    seedApiKey("stuffing-key"),
    seedApiKey("scraper-key"),
    seedApiKey("checkout-limit-key"),
    seedApiKey("integration-stuffing-key"),
  ]);
});

after(async () => {
  await disconnectMongo();
  setEventPublisherForTests(null);
  setQueueStatsProviderForTests(null);
  redisClient.disconnect();
});

test("token bucket allows requests under limit", async () => {
  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:global", 2, 60_000)).allowed, true);
  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:global", 2, 60_000)).allowed, true);
});

test("token bucket blocks burst over limit", async () => {
  await checkTokenBucket("rate:ip:127.0.0.1:global", 2, 60_000);
  await checkTokenBucket("rate:ip:127.0.0.1:global", 2, 60_000);
  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:global", 2, 60_000)).allowed, false);
});

test("token bucket refills over time", async () => {
  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:refill", 1, 10)).allowed, true);
  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:refill", 1, 10)).allowed, false);

  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal((await checkTokenBucket("rate:ip:127.0.0.1:refill", 1, 10)).allowed, true);
});

test("sliding window expires old requests", async () => {
  assert.equal((await checkSlidingWindow("rate:ip:127.0.0.1:search", 1, 10)).allowed, true);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal((await checkSlidingWindow("rate:ip:127.0.0.1:search", 1, 10)).allowed, true);
});

test("cooldown blocks risky IP", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    await redis.setNumber("cooldown:key:test-key", Date.now() + 600_000, 600_000);
    const response = await fetch(`${gateway.url}/search?q=keyboard`, {
      headers: {
        "x-api-key": "test-key",
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "test-agent",
      },
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("x-gateway-decision"), "TEMP_BLOCK");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("missing API key returns 401", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const response = await fetch(`${gateway.url}/search?q=keyboard`, {
      headers: {
        "user-agent": "test-agent",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("x-gateway-decision"), "AUTH_MISSING");
    assert.deepEqual(await response.json(), { error: "Missing API key" });

    const events = await mongo.listRequestEvents(10);
    assert.equal(events[0]?.decision, "AUTH_MISSING");
    assert(events[0]?.reasons.includes("missing_api_key"));
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("invalid API key returns 401", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const response = await fetch(`${gateway.url}/search?q=keyboard`, {
      headers: {
        "x-api-key": "invalid-key",
        "user-agent": "test-agent",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("x-gateway-decision"), "AUTH_INVALID");
    assert.deepEqual(await response.json(), { error: "Invalid or inactive API key" });

    const events = await mongo.listRequestEvents(10);
    assert.equal(events[0]?.decision, "AUTH_INVALID");
    assert(events[0]?.reasons.includes("invalid_api_key"));
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("normal traffic is allowed", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const response = await request(gateway.url, "/search?q=keyboard");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-gateway-decision"), "ALLOW");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("cached high risk becomes TEMP_BLOCK", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    await redis.setNumber("risk:key:stuffing-key", 80);
    const response = await request(gateway.url, "/search?q=keyboard", {
      headers: { "x-forwarded-for": "203.0.113.20", "x-api-key": "stuffing-key" },
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("x-gateway-decision"), "TEMP_BLOCK");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("scraper becomes RATE_LIMIT", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const decisions: string[] = [];
    for (let index = 0; index < 40; index += 1) {
      const response = await request(gateway.url, `/search?q=keyboard-${index}`, {
        headers: { "x-forwarded-for": "203.0.113.30", "x-api-key": "scraper-key" },
      });
      decisions.push(response.headers.get("x-gateway-decision") ?? "");
    }
    assert(decisions.includes("RATE_LIMIT"));
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});



test("checkout limit returns RATE_LIMIT on sixth attempt", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const decisions: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const response = await request(gateway.url, "/checkout", {
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "prod_keyboard", quantity: 1 }] }),
        headers: { "x-forwarded-for": `203.0.114.${index}`, "x-api-key": "checkout-limit-key" },
      });
      decisions.push(response.headers.get("x-gateway-decision") ?? "");
    }
    assert.equal(decisions[5], "RATE_LIMIT");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("request event is published to kafka transport", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    await request(gateway.url, "/search?q=keyboard");
    assert.equal(publishedEvents.length, 1);
    assert.equal(publishedEvents[0]?.subject, "test-key");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("admin stats endpoint returns data", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    await request(gateway.url, "/search?q=keyboard");
    const response = await fetch(`${gateway.url}/admin/stats`, {
      headers: {
        "x-admin-token": "dev-admin-token",
      },
    });
    const body = await response.json() as Record<string, number>;
    assert.equal(typeof body.totalRequests, "number");
    assert.equal(typeof body.allowed, "number");
    assert.equal(typeof body.rateLimited, "number");
    assert.equal(typeof body.blocked, "number");
    assert.equal(typeof body.authFailed, "number");
    assert.equal(typeof body.avgLatencyMs, "number");
    assert.equal(typeof body.queueLag, "number");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("admin route without token returns 401", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const response = await fetch(`${gateway.url}/admin/stats`);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Invalid admin token" });
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("admin route with token returns stats", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    const response = await fetch(`${gateway.url}/admin/stats`, {
      headers: {
        "x-admin-token": "dev-admin-token",
      },
    });

    const body = await response.json() as Record<string, number>;
    assert.equal(response.status, 200);
    assert.equal(typeof body.totalRequests, "number");
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});

test("failed login requests are labeled for worker scoring", async () => {
  const fake = await startFakeApi();
  const gateway = await startGateway(fake.url);
  try {
    for (let index = 0; index < 3; index += 1) {
      await request(gateway.url, "/login", {
        method: "POST",
        body: JSON.stringify({ email: `bot${index}@example.com`, password: "wrong" }),
        headers: { "x-forwarded-for": "203.0.113.40", "x-api-key": "integration-stuffing-key" },
      });
    }

    const events = await mongo.listRequestEvents(10);
    const labeledEvent = events.find((event) => event.reasons.includes("login_failed"));
    assert(labeledEvent);
  } finally {
    await closeServer(gateway.server);
    await closeServer(fake.server);
  }
});
