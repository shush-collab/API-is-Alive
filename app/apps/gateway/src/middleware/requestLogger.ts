import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
  const forwardedIp = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedIp || req.ip?.replace("::ffff:", "") || req.socket.remoteAddress || "unknown";
  const apiKey = req.header("x-api-key") ?? undefined;
  const userAgent = req.header("user-agent") ?? undefined;

  req.gateway = {
    requestId: randomUUID(),
    startedAt: Date.now(),
    ip,
    apiKey,
    userAgent,
    riskKey: apiKey ? `risk:key:${apiKey}` : `risk:ip:${ip}`,
    cooldownKey: apiKey ? `cooldown:key:${apiKey}` : `cooldown:ip:${ip}`,
    riskScoreBefore: 0,
    decision: "ALLOW",
    rateLimitRemaining: Number.MAX_SAFE_INTEGER,
    rateLimitHit: false,
    highUsage: false,
    reasons: [],
  };

  res.setHeader("X-Request-Id", req.gateway.requestId);
  next();
};
