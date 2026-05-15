import type { Request } from "express";
import { enqueueRequestEvent } from "./eventQueue";
import { mongo } from "./mongo";
import type { GatewayDecision, RequestEvent } from "../types/shared";

export const buildRequestEvent = (
  req: Request,
  {
    statusCode,
    decision = req.gateway.decision,
    reasons = req.gateway.reasons,
    subjectType,
    subject,
    apiKey,
  }: {
    statusCode: number;
    decision?: GatewayDecision;
    reasons?: string[];
    subjectType?: "ip" | "apiKey";
    subject?: string;
    apiKey?: string | null;
  },
): RequestEvent => {
  const resolvedApiKey = apiKey === null ? undefined : (apiKey ?? req.gateway.apiKey);
  const resolvedSubjectType = subjectType ?? (resolvedApiKey ? "apiKey" : "ip");
  const resolvedSubject = subject ?? resolvedApiKey ?? req.gateway.ip;

  return {
    requestId: req.gateway.requestId,
    ip: req.gateway.ip,
    apiKey: resolvedApiKey,
    subjectType: resolvedSubjectType,
    subject: resolvedSubject,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    decision,
    riskScoreAtDecision: req.gateway.riskScoreBefore,
    userAgent: req.gateway.userAgent,
    latencyMs: Date.now() - req.gateway.startedAt,
    reasons: [...new Set(reasons)],
    createdAt: new Date(),
  };
};

export const storeAndEnqueueRequestEvent = async (event: RequestEvent) => {
  await mongo.storeRequestEvent(event);

  try {
    await enqueueRequestEvent(event);
  } catch (error) {
    console.error("[gateway] failed to publish request event", {
      requestId: event.requestId,
      error,
    });
  }
};
