import type { RequestHandler } from "express";
import { findActiveApiKey } from "../services/apiKeys";

export const auth: RequestHandler = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      res.status(401).json({
        error: "Missing API key",
      });
      return;
    }

    const record = await findActiveApiKey(apiKey);

    if (!record) {
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
