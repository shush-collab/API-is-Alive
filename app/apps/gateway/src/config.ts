import "dotenv/config";

export const config = {
  port: Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 4000),
  upstreamUrl: process.env.UPSTREAM_URL ?? "http://localhost:5000",
  mongoUrl: process.env.MONGO_URL ?? "mongodb://localhost:27017/sentinel",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  cooldownMs: 10 * 60 * 1000,
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
