import { redisClient } from "./redis";

export type LimitResult = {
  allowed: boolean;
  remaining: number;
  used: number;
  usageRatio: number;
  key: string;
};

type TokenBucketResult = [number, string];

export const checkTokenBucket = async (
  key: string,
  limit: number,
  windowMs: number,
): Promise<LimitResult> => {
  const nowMs = Date.now();
  const refillRatePerMs = limit / windowMs;
  const ttlMs = Math.max(windowMs * 2, 60_000);

  const result = (await redisClient.eval(
    `
    local keyType = redis.call("TYPE", KEYS[1]).ok

    if keyType ~= "none" and keyType ~= "hash" then
      redis.call("DEL", KEYS[1])
    end

    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local nowMs = tonumber(ARGV[3])
    local ttlMs = tonumber(ARGV[4])

    local tokens = tonumber(redis.call("HGET", KEYS[1], "tokens") or capacity)
    local lastRefillAt = tonumber(redis.call("HGET", KEYS[1], "lastRefillAt") or nowMs)
    local elapsedMs = math.max(0, nowMs - lastRefillAt)

    tokens = math.min(capacity, tokens + (elapsedMs * refillRate))

    local allowed = 0

    if tokens >= 1 then
      tokens = tokens - 1
      allowed = 1
    end

    redis.call("HSET", KEYS[1], "tokens", tokens, "lastRefillAt", nowMs, "capacity", capacity, "refillRate", refillRate)
    redis.call("PEXPIRE", KEYS[1], ttlMs)

    return { allowed, tostring(tokens) }
    `,
    1,
    key,
    String(limit),
    String(refillRatePerMs),
    String(nowMs),
    String(ttlMs),
  )) as TokenBucketResult;

  const allowed = Number(result[0]) === 1;
  const tokens = Number(result[1]);
  const remaining = Math.max(0, Math.floor(tokens));
  const used = Math.max(0, limit - remaining);

  return {
    allowed,
    remaining,
    used,
    usageRatio: used / limit,
    key,
  };
};
