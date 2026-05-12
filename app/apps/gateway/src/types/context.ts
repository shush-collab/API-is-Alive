import type { GatewayDecision } from "./shared";

export type GatewayContext = {
  requestId: string;
  startedAt: number;
  ip: string;
  apiKey?: string;
  userAgent?: string;
  riskKey: string;
  cooldownKey: string;
  riskScoreBefore: number;
  riskScoreAfter?: number;
  decision: GatewayDecision;
  decisionReason?: string;
  rateLimitRemaining: number;
  rateLimitHit: boolean;
  highUsage: boolean;
  reasons: string[];
};

declare global {
  namespace Express {
    interface Request {
      gateway: GatewayContext;
    }
  }
}
