import type { GatewayDecision, RiskProfile } from "../types/shared";
import { config } from "../config";
import { redis } from "./redis";

const clampRisk = (score: number) => Math.max(0, Math.min(100, score));

export const scoreToDecision = (score: number): GatewayDecision => {
  if (score >= 80) return "TEMP_BLOCK";
  if (score >= 60) return "REQUIRE_STEP_UP";
  if (score >= 40) return "ALLOW_BUT_LOG";
  return "ALLOW";
};

export const readRisk = (riskKey: string) => redis.getNumber(riskKey);

export const applyRiskDelta = ({
  riskKey,
  cooldownKey,
  baseScore,
  reasons,
  subjectType,
  subject,
}: {
  riskKey: string;
  cooldownKey: string;
  baseScore: number;
  reasons: string[];
  subjectType: "ip" | "apiKey";
  subject: string;
}): RiskProfile => {
  const delta = reasons.reduce((sum, reason) => {
    if (reason === "login_failed") return sum + 25;
    if (reason === "login_failures_gt_5") return sum + 15;
    if (reason === "rate_above_70_percent") return sum + 20;
    if (reason === "rate_limit_hit") return sum + 25;
    if (reason === "user_agent_changed_gt_3") return sum + 15;
    if (reason === "scraper_like_search") return sum + 20;
    if (reason === "checkout_spam") return sum + 30;
    if (reason === "normal_behavior") return sum - 5;
    return sum;
  }, 0);

  const score = clampRisk(baseScore + delta);
  redis.setNumber(riskKey, score);

  const profile: RiskProfile = {
    subjectType,
    subject,
    score,
    reasons,
    lastUpdatedAt: new Date(),
  };

  if (score >= 80) {
    const blockedUntil = new Date(Date.now() + config.cooldownMs);
    redis.setNumber(cooldownKey, blockedUntil.getTime(), config.cooldownMs);
    profile.blockedUntil = blockedUntil;
  }

  return profile;
};
