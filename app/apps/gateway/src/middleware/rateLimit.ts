import type { Request, RequestHandler } from "express";
import { rateRules } from "../config";
import { redis } from "../services/redis";
import { checkSlidingWindow } from "../services/slidingWindow";
import { checkTokenBucket, type LimitResult } from "../services/tokenBucket";

const applyResult = async (req: Request, result: LimitResult, windowMs: number) => {
  req.gateway.rateLimitRemaining = Math.min(req.gateway.rateLimitRemaining, result.remaining);

  if (result.usageRatio > 0.7) {
    req.gateway.highUsage = true;

    const markerKey = `riskmark:${result.key}:70pct`;
    const alreadyMarked = await redis.getNumber(markerKey);

    if (alreadyMarked === 0) {
      await redis.setNumber(markerKey, 1, windowMs);
      req.gateway.reasons.push("rate_above_70_percent");
    }
  }

  if (!result.allowed) {
    req.gateway.rateLimitHit = true;
    req.gateway.reasons.push("rate_limit_hit");
  }
};

const pathKind = (path: string) => {
  if (path.startsWith("/login")) return "login";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/checkout")) return "checkout";
  return "other";
};

export const rateLimit: RequestHandler = async (req, _res, next) => {
  try {
    const { ip, apiKey } = req.gateway;
    const kind = pathKind(req.path);

    await applyResult(
      req,
      await checkTokenBucket(`rate:ip:${ip}:global`, rateRules.ipGlobal.limit, rateRules.ipGlobal.windowMs),
      rateRules.ipGlobal.windowMs,
    );

    if (apiKey) {
      await applyResult(
        req,
        await checkTokenBucket(`rate:key:${apiKey}:global`, rateRules.apiKeyGlobal.limit, rateRules.apiKeyGlobal.windowMs),
        rateRules.apiKeyGlobal.windowMs,
      );
    }

    if (kind === "login") {
      await applyResult(
        req,
        await checkSlidingWindow(`rate:ip:${ip}:login`, rateRules.loginByIp.limit, rateRules.loginByIp.windowMs),
        rateRules.loginByIp.windowMs,
      );
    }

    if (kind === "search") {
      await applyResult(
        req,
        await checkSlidingWindow(`rate:ip:${ip}:search`, rateRules.searchByIp.limit, rateRules.searchByIp.windowMs),
        rateRules.searchByIp.windowMs,
      );
    }

    if (kind === "checkout" && apiKey) {
      const checkoutResult = await checkSlidingWindow(
        `rate:key:${apiKey}:checkout`,
        rateRules.checkoutByApiKey.limit,
        rateRules.checkoutByApiKey.windowMs,
      );

      await applyResult(req, checkoutResult, rateRules.checkoutByApiKey.windowMs);

      if (!checkoutResult.allowed) {
        req.gateway.reasons.push("checkout_spam");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
