import Redis from "ioredis";
import { config } from "../config";

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

redisClient.on("connect", () => {
  console.log("[worker redis] connected");
});

redisClient.on("error", (error) => {
  console.error("[worker redis] error", error);
});

export const redis = {
  async getNumber(key: string) {
    const value = await redisClient.get(key);
    return value === null ? 0 : Number(value);
  },

  async setNumber(key: string, value: number, ttlMs?: number) {
    if (ttlMs) {
      await redisClient.set(key, String(value), "PX", ttlMs);
      return;
    }

    await redisClient.set(key, String(value));
  },
};
