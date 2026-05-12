import { Worker } from "bullmq";
import { config } from "./config";
import { RiskProfileModel } from "./models/RiskProfile";
import { clampRisk, riskDeltaFromReasons } from "./riskScorer";
import { connectMongo, disconnectMongo } from "./services/mongo";
import { redis } from "./services/redis";
import type { RequestEvent, RiskProfile } from "../../../packages/shared/src/types";

const processEvent = async (event: RequestEvent) => {
  const riskKey = event.apiKey ? `risk:key:${event.apiKey}` : `risk:ip:${event.ip}`;
  const cooldownKey = event.apiKey ? `cooldown:key:${event.apiKey}` : `cooldown:ip:${event.ip}`;

  const baseScore = await redis.getNumber(riskKey);
  const delta = riskDeltaFromReasons(event.reasons);
  const score = clampRisk(baseScore + delta);

  await redis.setNumber(riskKey, score);

  const profile: RiskProfile = {
    subjectType: event.subjectType,
    subject: event.subject,
    score,
    reasons: event.reasons,
    lastUpdatedAt: new Date(),
  };

  if (score >= 80) {
    const blockedUntil = new Date(Date.now() + config.cooldownMs);
    await redis.setNumber(cooldownKey, blockedUntil.getTime(), config.cooldownMs);
    profile.blockedUntil = blockedUntil;
  }

  await RiskProfileModel.findOneAndUpdate(
    {
      subjectType: profile.subjectType,
      subject: profile.subject,
    },
    {
      $set: profile,
    },
    {
      upsert: true,
      new: true,
    },
  );

  console.log("[worker] processed event", {
    requestId: event.requestId,
    subject: event.subject,
    score,
    reasons: event.reasons,
  });
};

const start = async () => {
  await connectMongo();

  const worker = new Worker<RequestEvent>(
    "request-events",
    async (job) => {
      await processEvent(job.data);
    },
    {
      connection: {
        url: config.redisUrl,
      },
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log("[worker] completed", job.id);
  });

  worker.on("failed", (job, error) => {
    console.error("[worker] failed", job?.id, error);
  });

  const shutdown = async () => {
    console.log("[worker] shutting down");
    await worker.close();
    await disconnectMongo();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[worker] started");
};

start().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
