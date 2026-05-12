export type GatewayDecision =
  | "ALLOW"
  | "ALLOW_BUT_LOG"
  | "RATE_LIMIT"
  | "TEMP_BLOCK"
  | "REQUIRE_STEP_UP";

export type RequestEvent = {
  requestId: string;
  ip: string;
  apiKey?: string;
  subjectType: "ip" | "apiKey";
  subject: string;
  method: string;
  path: string;
  statusCode: number;
  decision: GatewayDecision;
  riskScoreBefore: number;
  riskScoreAfter?: number;
  userAgent?: string;
  latencyMs: number;
  reasons: string[];
  createdAt: Date;
};

export type RiskProfile = {
  subjectType: "ip" | "apiKey";
  subject: string;
  score: number;
  reasons: string[];
  lastUpdatedAt: Date;
  blockedUntil?: Date;
};

export type ApiKey = {
  name: string;
  keyHash: string;
  plan: "free" | "pro";
  isActive: boolean;
  createdAt: Date;
};
