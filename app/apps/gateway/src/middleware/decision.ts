import type { RequestHandler } from "express";
import { readRisk, scoreToDecision } from "../services/decisionEngine";

export const decision: RequestHandler = (req, _res, next) => {
  req.gateway.riskScoreBefore = readRisk(req.gateway.riskKey);

  if (req.gateway.decision === "TEMP_BLOCK") return next();

  if (req.gateway.rateLimitHit) {
    req.gateway.decision = "RATE_LIMIT";
    return next();
  }

  req.gateway.decision = scoreToDecision(req.gateway.riskScoreBefore);
  next();
};
