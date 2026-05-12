import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { RiskProfileModel } from "../apps/worker/src/models/RiskProfile";
import { processEvent } from "../apps/worker/src/processEvent";
import { connectMongo, disconnectMongo } from "../apps/worker/src/services/mongo";
import { redis, redisClient } from "../apps/worker/src/services/redis";
import type { RequestEvent } from "../packages/shared/src/types";

const makeEvent = (overrides: Partial<RequestEvent> = {}): RequestEvent => ({
  requestId: `req_${Math.random().toString(16).slice(2)}`,
  ip: "203.0.113.99",
  subjectType: "ip",
  subject: "203.0.113.99",
  method: "POST",
  path: "/login",
  statusCode: 401,
  decision: "ALLOW",
  riskScoreBefore: 0,
  userAgent: "test",
  latencyMs: 10,
  reasons: ["login_failed"],
  createdAt: new Date(),
  ...overrides,
});

beforeEach(async () => {
  await connectMongo();
  await redisClient.flushdb();
  await RiskProfileModel.deleteMany({});
});

after(async () => {
  await disconnectMongo();
  redisClient.disconnect();
});

test("normal_behavior decays risk", async () => {
  await redis.setNumber("risk:ip:203.0.113.99", 50);

  await processEvent(makeEvent({
    statusCode: 200,
    reasons: ["normal_behavior"],
  }));

  assert.equal(await redis.getNumber("risk:ip:203.0.113.99"), 45);
});

test("login_failed increases risk by 25", async () => {
  await processEvent(makeEvent());

  assert.equal(await redis.getNumber("risk:ip:203.0.113.99"), 25);
});

test("login_failures_gt_5 adds 15", async () => {
  await processEvent(makeEvent({
    reasons: ["login_failed", "login_failures_gt_5"],
  }));

  assert.equal(await redis.getNumber("risk:ip:203.0.113.99"), 40);
});

test("risk >= 80 sets cooldown and writes risk profile", async () => {
  await processEvent(makeEvent({ requestId: "req_1" }));
  await processEvent(makeEvent({ requestId: "req_2" }));
  await processEvent(makeEvent({ requestId: "req_3" }));
  await processEvent(makeEvent({ requestId: "req_4" }));

  const risk = await redis.getNumber("risk:ip:203.0.113.99");
  const cooldownUntil = await redis.getNumber("cooldown:ip:203.0.113.99");
  const profile = await RiskProfileModel.findOne({
    subjectType: "ip",
    subject: "203.0.113.99",
  }).lean<{ score: number }>();

  assert.equal(risk, 100);
  assert(cooldownUntil > Date.now());
  assert.equal(profile?.score, 100);
});
