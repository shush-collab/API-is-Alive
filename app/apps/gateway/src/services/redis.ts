import Redis from "ioredis";
import { config } from "../config";

export const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redisClient.on("connect", () => {
  console.log("[redis] connected");
});

redisClient.on("error", (error) => {
  console.error("[redis] error", error);
});

const ttlSeconds = (ttlMs: number) => Math.ceil(ttlMs / 1000);

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

  async incr(key: string, ttlMs: number) {
    const value = await redisClient.incr(key);

    if (value === 1) {
      await redisClient.pexpire(key, ttlMs);
    }

    return value;
  },

  async ttlMs(key: string) {
    const ttl = await redisClient.pttl(key);
    return ttl > 0 ? ttl : 0;
  },

  async del(key: string) {
    await redisClient.del(key);
  },

  async addToSet(key: string, value: string, ttlMs: number) {
    await redisClient.sadd(key, value);
    await redisClient.expire(key, ttlSeconds(ttlMs));
    return redisClient.scard(key);
  },

  async push(queueKey: string, value: unknown) {
    const length = await redisClient.rpush(queueKey, JSON.stringify(value));
    return length;
  },

  async queueLength(queueKey: string) {
    return redisClient.llen(queueKey);
  },

  async reset() {
    await redisClient.flushdb();
  },
};

export const connectRedis = async () => {
  const maxAttempts = 20;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await redisClient.ping();
      console.log("[redis] ready");
      return;
    } catch (error) {
      console.error(`[redis] connection attempt ${attempt}/${maxAttempts} failed`);

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};
