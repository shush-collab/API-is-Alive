import { redis } from "./redis";

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  used: number;
  usageRatio: number;
  key: string;
};

export const checkTokenBucket = (key: string, limit: number, windowMs: number): LimitResult => {
  const used = redis.incr(key, windowMs);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used <= limit,
    remaining,
    used,
    usageRatio: used / limit,
    key,
  };
};
