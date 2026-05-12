export const scoreRisk = (input: { requests: number }) => Math.min(100, input.requests * 10);
