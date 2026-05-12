import "dotenv/config";

export const config = {
  mongoUrl: process.env.MONGO_URL ?? "mongodb://localhost:27017/sentinel",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  cooldownMs: 10 * 60 * 1000,
};
