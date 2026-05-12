import type { AdminStats, QueueStats, RequestEvent, RiskProfile } from "../types";

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:4000").replace(/\/$/, "");
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? "dev-admin-token";

const adminFetch = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      "x-admin-token": ADMIN_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export const api = {
  stats: () => adminFetch<AdminStats>("/admin/stats"),

  events: async (limit = 50) => {
    const body = await adminFetch<{ data: RequestEvent[] }>(`/admin/events?limit=${limit}`);
    return body.data;
  },

  riskProfiles: async () => {
    const body = await adminFetch<{ data: RiskProfile[] }>("/admin/risk-profiles");
    return body.data;
  },

  queue: () => adminFetch<QueueStats>("/admin/queue"),
};
