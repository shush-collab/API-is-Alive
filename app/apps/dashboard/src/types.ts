export type GatewayDecision =
  | "ALLOW"
  | "ALLOW_BUT_LOG"
  | "RATE_LIMIT"
  | "TEMP_BLOCK"
  | "REQUIRE_STEP_UP"
  | "AUTH_MISSING"
  | "AUTH_INVALID";

export type AdminStats = {
  totalRequests: number;
  allowed: number;
  rateLimited: number;
  blocked: number;
  authFailed: number;
  avgLatencyMs: number;
  queueLag: number;
};

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
  riskScoreAtDecision: number;
  riskScoreAfterWorker?: number;
  userAgent?: string;
  latencyMs: number;
  reasons: string[];
  createdAt: string;
};

export type RiskProfile = {
  subjectType: "ip" | "apiKey";
  subject: string;
  score: number;
  reasons: string[];
  lastUpdatedAt: string;
  blockedUntil?: string;
};

export type QueueStats = {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};
