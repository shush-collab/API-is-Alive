import { randomUUID } from "crypto";
import { redisClient } from "./redis";

export type SlidingWindowResult = {
  allowed: boolean;
  remaining: number;
  used: number;
  usageRatio: number;
  key: string;
};

export const checkSlidingWindow = async (
  key: string,
  limit: number,
  windowMs: number,
): Promise<SlidingWindowResult> => {
  const now = Date.now();
  const cutoff = now - windowMs;
  const member = `${now}:${randomUUID()}`;

  const multi = redisClient.multi();

  multi.zremrangebyscore(key, 0, cutoff);
  multi.zadd(key, now, member);
  multi.zcard(key);
  multi.pexpire(key, windowMs);

  const results = await multi.exec();

  if (!results) {
    throw new Error("Redis sliding-window transaction failed");
  }

  const used = Number(results[2]?.[1] ?? 0);

  return {
    allowed: used <= limit,
    remaining: Math.max(0, limit - used),
    used,
    usageRatio: used / limit,
    key,
  };
};

export const countSlidingWindow = async (key: string, windowMs: number) => {
  const cutoff = Date.now() - windowMs;

  await redisClient.zremrangebyscore(key, 0, cutoff);
  return redisClient.zcard(key);
};

export const resetSlidingWindows = async () => {
  // No-op now. Real reset is handled by redis.flushdb().
};
