import type { GatewayDecision } from "../types/shared";
import { redis } from "./redis";

export const scoreToDecision = (score: number): GatewayDecision => {
  if (score >= 80) return "TEMP_BLOCK";
  if (score >= 60) return "REQUIRE_STEP_UP";
  if (score >= 40) return "ALLOW_BUT_LOG";
  return "ALLOW";
};

export const readRisk = async (riskKey: string) => redis.getNumber(riskKey);
