import type { RequestEvent, RiskProfile } from "../types/shared";

const requestEvents: RequestEvent[] = [];
const riskProfiles = new Map<string, RiskProfile>();

export const mongo = {
  async storeRequestEvent(event: RequestEvent) {
    requestEvents.unshift(event);
    requestEvents.splice(500);
  },

  async listRequestEvents(limit = 50) {
    return requestEvents.slice(0, limit);
  },

  async upsertRiskProfile(profile: RiskProfile) {
    riskProfiles.set(`${profile.subjectType}:${profile.subject}`, profile);
  },

  async listRiskProfiles() {
    return [...riskProfiles.values()].sort((a, b) => b.score - a.score);
  },

  async getRiskProfile(subject: string) {
    return riskProfiles.get(`ip:${subject}`) ?? riskProfiles.get(`apiKey:${subject}`);
  },

  async unblockRiskProfile(subject: string) {
    for (const key of [`ip:${subject}`, `apiKey:${subject}`]) {
      const profile = riskProfiles.get(key);
      if (profile) {
        delete profile.blockedUntil;
        profile.score = Math.min(profile.score, 79);
        profile.lastUpdatedAt = new Date();
        riskProfiles.set(key, profile);
      }
    }
  },

  stats() {
    const totalRequests = requestEvents.length;
    const allowed = requestEvents.filter((event) => event.decision === "ALLOW" || event.decision === "ALLOW_BUT_LOG").length;
    const rateLimited = requestEvents.filter((event) => event.decision === "RATE_LIMIT").length;
    const blocked = requestEvents.filter((event) => event.decision === "TEMP_BLOCK").length;
    const avgLatencyMs = totalRequests
      ? Math.round(requestEvents.reduce((sum, event) => sum + event.latencyMs, 0) / totalRequests)
      : 0;

    return { totalRequests, allowed, rateLimited, blocked, avgLatencyMs };
  },

  reset() {
    requestEvents.splice(0);
    riskProfiles.clear();
  },
};
