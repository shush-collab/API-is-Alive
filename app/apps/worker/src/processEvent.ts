import { config } from "./config";
import { RiskProfileModel } from "./models/RiskProfile";
import { riskDeltaFromReasons } from "./riskScorer";
import { redis } from "./services/redis";
import type { RequestEvent, RiskProfile } from "../../../packages/shared/src/types";

export const processEvent = async (event: RequestEvent) => {
  const riskKey = event.apiKey ? `risk:key:${event.apiKey}` : `risk:ip:${event.ip}`;
  const cooldownKey = event.apiKey ? `cooldown:key:${event.apiKey}` : `cooldown:ip:${event.ip}`;

  const delta = riskDeltaFromReasons(event.reasons);
  const score = await redis.addClamped(riskKey, delta, 0, 100);

  const profile: RiskProfile = {
    subjectType: event.subjectType,
    subject: event.subject,
    score,
    reasons: event.reasons,
    lastUpdatedAt: new Date(),
  };

  if (score >= 80) {
    const blockedUntil = new Date(Date.now() + config.cooldownMs);
    await redis.setNumber(cooldownKey, blockedUntil.getTime(), config.cooldownMs);
    profile.blockedUntil = blockedUntil;
  }

  await RiskProfileModel.findOneAndUpdate(
    {
      subjectType: profile.subjectType,
      subject: profile.subject,
    },
    {
      $set: profile,
    },
    {
      upsert: true,
      new: true,
    },
  );

  console.log("[worker] processed event", {
    requestId: event.requestId,
    subject: event.subject,
    score,
    reasons: event.reasons,
  });
};
