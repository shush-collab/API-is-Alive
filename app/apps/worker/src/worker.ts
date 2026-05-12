import { Worker } from "bullmq";
import { config } from "./config";
import { processEvent } from "./processEvent";
import { connectMongo, disconnectMongo } from "./services/mongo";
import { redisClient } from "./services/redis";
import type { RequestEvent } from "../../../packages/shared/src/types";

const start = async () => {
  await connectMongo();

  const worker = new Worker<RequestEvent>(
    "request-events",
    async (job) => {
      await processEvent(job.data);
    },
    {
      connection: redisClient,
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
    redisClient.disconnect();
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
