import type { Request, RequestHandler } from "express";
import { findActiveApiKey } from "../services/apiKeys";
import { buildRequestEvent, storeAndEnqueueRequestEvent } from "../services/requestEvents";

const recordAuthFailure = async (
  req: Request,
  decision: "AUTH_MISSING" | "AUTH_INVALID",
  reason: "missing_api_key" | "invalid_api_key",
) => {
  req.gateway.decision = decision;
  req.gateway.reasons.push(reason);

  await storeAndEnqueueRequestEvent(buildRequestEvent(req, {
    statusCode: 401,
    decision,
    reasons: req.gateway.reasons,
    subjectType: "ip",
    subject: req.gateway.ip,
    apiKey: null,
  }));

  req.res?.setHeader("X-Gateway-Decision", decision);
  req.res?.setHeader("X-Risk-Score", String(req.gateway.riskScoreBefore));
};

export const auth: RequestHandler = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      await recordAuthFailure(req, "AUTH_MISSING", "missing_api_key");
      res.status(401).json({
        error: "Missing API key",
      });
      return;
    }

    const record = await findActiveApiKey(apiKey);

    if (!record) {
      await recordAuthFailure(req, "AUTH_INVALID", "invalid_api_key");
      res.status(401).json({
        error: "Invalid or inactive API key",
      });
      return;
    }

    req.gateway.apiKey = apiKey;
    req.gateway.riskKey = `risk:key:${apiKey}`;
    req.gateway.cooldownKey = `cooldown:key:${apiKey}`;

    next();
  } catch (error) {
    next(error);
  }
};
