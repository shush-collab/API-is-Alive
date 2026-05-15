import { type EachMessagePayload, Kafka } from "kafkajs";
import { config } from "./config";
import { processEvent } from "./processEvent";
import { connectMongo, disconnectMongo } from "./services/mongo";
import { connectRedis, redisClient } from "./services/redis";
import type { RequestEvent } from "../../../packages/shared/src/types";

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
});

const ensureRequestEventsTopic = async () => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = await admin.listTopics();
    if (topics.includes(config.requestEventsTopic)) {
      return;
    }

    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: config.requestEventsTopic,
          numPartitions: 1,
          replicationFactor: 1,
        },
      ],
    });
  } finally {
    await admin.disconnect();
  }
};

const parseRequestEvent = (payload: EachMessagePayload): RequestEvent => {
  const raw = payload.message.value?.toString();

  if (!raw) {
    throw new Error("Kafka message has empty value");
  }

  const parsed = JSON.parse(raw) as RequestEvent;

  if (!parsed.requestId || !parsed.subject || !parsed.subjectType || !parsed.decision) {
    throw new Error("Invalid RequestEvent payload");
  }

  return parsed;
};

const commitPayloadOffset = async (
  consumer: ReturnType<Kafka["consumer"]>,
  payload: EachMessagePayload,
) => {
  await consumer.commitOffsets([
    {
      topic: payload.topic,
      partition: payload.partition,
      offset: String(Number(payload.message.offset) + 1),
    },
  ]);
};

const start = async () => {
  await connectMongo();
  await connectRedis();
  await ensureRequestEventsTopic();

  const consumer = kafka.consumer({
    groupId: config.riskWorkerGroupId,
  });

  await consumer.connect();
  await consumer.subscribe({
    topic: config.requestEventsTopic,
    fromBeginning: false,
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async (payload) => {
      let event: RequestEvent;

      try {
        event = parseRequestEvent(payload);
      } catch (error) {
        console.error("[worker] invalid kafka event skipped", {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
          error,
        });
        await commitPayloadOffset(consumer, payload);
        return;
      }

      await processEvent(event);
      await commitPayloadOffset(consumer, payload);

      console.log("[worker] consumed kafka event", {
        requestId: event.requestId,
        subject: event.subject,
        partition: payload.partition,
        offset: payload.message.offset,
      });
    },
  });

  const shutdown = async () => {
    console.log("[worker] shutting down");
    await consumer.disconnect();
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
