import type { Request, Response } from "express";
import { Router } from "express";
import { proxyRequest } from "../services/proxy";
import { buildRequestEvent, storeAndEnqueueRequestEvent } from "../services/requestEvents";
import { checkSlidingWindow } from "../services/slidingWindow";

export const proxyRouter = Router();

const finalize = async (req: Request, res: Response, statusCode: number, body: unknown) => {
  const reasons = [...new Set(req.gateway.reasons)];

  if (reasons.length === 0 && req.gateway.decision === "ALLOW") {
    reasons.push("normal_behavior");
  }

  const event = buildRequestEvent(req, {
    statusCode,
    reasons,
  });

  await storeAndEnqueueRequestEvent(event);

  res.setHeader("X-Gateway-Decision", req.gateway.decision);
  res.setHeader("X-Risk-Score", String(req.gateway.riskScoreBefore));
  res.setHeader("X-RateLimit-Remaining", String(req.gateway.rateLimitRemaining));
  res.status(statusCode).json(body);
};

proxyRouter.use(async (req, res) => {
  if (req.gateway.decision === "TEMP_BLOCK") {
    await finalize(req, res, 429, { decision: "TEMP_BLOCK", message: "Temporarily blocked" });
    return;
  }

  if (req.gateway.decision === "RATE_LIMIT") {
    await finalize(req, res, 429, { decision: "RATE_LIMIT", message: "Rate limit exceeded" });
    return;
  }

  if (req.gateway.decision === "REQUIRE_STEP_UP") {
    await finalize(req, res, 403, {
      decision: "REQUIRE_STEP_UP",
      message: "Additional verification required",
    });
    return;
  }

  const proxied = await proxyRequest(req);

  if (req.path.startsWith("/login") && proxied.statusCode === 401) {
    req.gateway.reasons.push("login_failed");
    const failures = await checkSlidingWindow(`fail:ip:${req.gateway.ip}:login`, 5, 60_000);
    if (failures.used > 5) req.gateway.reasons.push("login_failures_gt_5");
  }

  await finalize(req, res, proxied.statusCode, proxied.body);
});
