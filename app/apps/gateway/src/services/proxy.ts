import type { Request } from "express";
import { config } from "../config";

export type ProxyResponse = {
  statusCode: number;
  body: unknown;
};

export const proxyRequest = async (req: Request): Promise<ProxyResponse> => {
  const url = new URL(req.originalUrl, config.upstreamUrl);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const response = await fetch(url, {
    method,
    headers,
    body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  return { statusCode: response.status, body };
};
