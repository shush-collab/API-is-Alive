import "dotenv/config";

export const config = {
  port: Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 4000),
  upstreamUrl: process.env.UPSTREAM_URL ?? "http://localhost:5000",
  mongoUrl: process.env.MONGO_URL ?? "mongodb://localhost:27017/sentinel",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  cooldownMs: 10 * 60 * 1000,
  adminToken: process.env.ADMIN_TOKEN ?? "dev-admin-token",
  apiKeyPepper: process.env.API_KEY_PEPPER ?? "dev-api-key-pepper",
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "api-is-alive",
  requestEventsTopic: process.env.KAFKA_REQUEST_EVENTS_TOPIC ?? "request-events",
  riskWorkerGroupId: process.env.KAFKA_RISK_WORKER_GROUP_ID ?? "risk-worker",
};

export const rateRules = {
  ipGlobal: {
    limit: 100,
    windowMs: 60_000,
  },
  apiKeyGlobal: {
    limit: 200,
    windowMs: 60_000,
  },
  loginByIp: {
    limit: 10,
    windowMs: 60_000,
  },
  searchByIp: {
    limit: 30,
    windowMs: 60_000,
  },
  checkoutByApiKey: {
    limit: 5,
    windowMs: 60_000,
  },
};
