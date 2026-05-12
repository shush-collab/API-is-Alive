import type { RequestHandler } from "express";
import { redis } from "../services/redis";

const looksScraperLike = (query: unknown) => {
  if (typeof query !== "string") return false;
  return /[{}<>*]|select\s|union\s|http|\.\.\//i.test(query) || query.length > 40;
};

export const riskCheck: RequestHandler = (req, _res, next) => {
  const cooldownUntil = redis.getNumber(req.gateway.cooldownKey);
  if (cooldownUntil > Date.now()) {
    req.gateway.decision = "TEMP_BLOCK";
    req.gateway.decisionReason = "cooldown_active";
  }

  const userAgentKey = req.gateway.apiKey
    ? `ua:key:${req.gateway.apiKey}`
    : `ua:ip:${req.gateway.ip}`;

  if (req.gateway.userAgent) {
    const userAgentCount = redis.addToSet(userAgentKey, req.gateway.userAgent, 5 * 60 * 1000);
    if (userAgentCount > 3) req.gateway.reasons.push("user_agent_changed_gt_3");
  }

  if (req.path.startsWith("/search") && looksScraperLike(req.query.q)) {
    req.gateway.reasons.push("scraper_like_search");
  }

  next();
};
