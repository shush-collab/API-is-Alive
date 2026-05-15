import "dotenv/config";

export const config = {
  mongoUrl: process.env.MONGO_URL ?? "mongodb://localhost:27017/sentinel",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  cooldownMs: 10 * 60 * 1000,
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "api-is-alive",
  requestEventsTopic: process.env.KAFKA_REQUEST_EVENTS_TOPIC ?? "request-events",
  riskWorkerGroupId: process.env.KAFKA_RISK_WORKER_GROUP_ID ?? "risk-worker",
};
