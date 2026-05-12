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

  async addClamped(key: string, delta: number, min = 0, max = 100) {
    const result = await redisClient.eval(
      `
      local current = tonumber(redis.call("GET", KEYS[1]) or "0")
      local delta = tonumber(ARGV[1])
      local min = tonumber(ARGV[2])
      local max = tonumber(ARGV[3])

      local next = current + delta

      if next < min then
        next = min
      end

      if next > max then
        next = max
      end

      redis.call("SET", KEYS[1], next)
      return next
      `,
      1,
      key,
      String(delta),
      String(min),
      String(max),
    );

    return Number(result);
  },
};
