export type SlidingWindowResult = {
  allowed: boolean;
  remaining: number;
  used: number;
  usageRatio: number;
  key: string;
};

const windows = new Map<string, number[]>();

export const checkSlidingWindow = (key: string, limit: number, windowMs: number): SlidingWindowResult => {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (windows.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  hits.push(now);
  windows.set(key, hits);

  return {
    allowed: hits.length <= limit,
    remaining: Math.max(0, limit - hits.length),
    used: hits.length,
    usageRatio: hits.length / limit,
    key,
  };
};

export const countSlidingWindow = (key: string, windowMs: number) => {
  const cutoff = Date.now() - windowMs;
  const hits = (windows.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  windows.set(key, hits);
  return hits.length;
};

export const resetSlidingWindows = () => {
  windows.clear();
};
