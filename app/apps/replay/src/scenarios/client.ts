const baseUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";
const scenarioName = process.argv[2] ?? "normal";
const scenarioApiKey = `replay-${scenarioName}`;
const scenarioIp = `10.0.0.${Math.abs([...scenarioName].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 200 + 1}`;

export type ReplayResult = {
  status: number;
  decision: string | null;
  risk: string | null;
  remaining: string | null;
};

export const request = async (path: string, init: RequestInit = {}): Promise<ReplayResult> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": scenarioApiKey,
      "x-forwarded-for": scenarioIp,
      "user-agent": "sentinel-replay/1.0",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  await response.text();

  return {
    status: response.status,
    decision: response.headers.get("x-gateway-decision"),
    risk: response.headers.get("x-risk-score"),
    remaining: response.headers.get("x-ratelimit-remaining"),
  };
};

export const summarize = (name: string, results: ReplayResult[]) => {
  const decisions = results.reduce<Record<string, number>>((counts, result) => {
    const decision = result.decision ?? "UNKNOWN";
    counts[decision] = (counts[decision] ?? 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({ scenario: name, total: results.length, decisions, last: results.at(-1) }, null, 2));
};
