import { redis } from "./redis";

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  used: number;
  usageRatio: number;
  key: string;
};

export const checkTokenBucket = async (
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimitResult> => {
  const used = await redis.incr(key, windowMs);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used <= limit,
    remaining,
    used,
    usageRatio: used / limit,
    key,
  };
};
