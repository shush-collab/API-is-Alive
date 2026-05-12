type Entry = {
  value: number;
  expiresAt?: number;
};

const counters = new Map<string, Entry>();
const sets = new Map<string, { values: Set<string>; expiresAt?: number }>();
const queues = new Map<string, unknown[]>();

const now = () => Date.now();

const expired = (expiresAt?: number) => expiresAt !== undefined && expiresAt <= now();

const getEntry = (key: string) => {
  const entry = counters.get(key);
  if (!entry || expired(entry.expiresAt)) {
    counters.delete(key);
    return undefined;
  }
  return entry;
};

export const redis = {
  getNumber(key: string) {
    return getEntry(key)?.value ?? 0;
  },

  setNumber(key: string, value: number, ttlMs?: number) {
    counters.set(key, { value, expiresAt: ttlMs ? now() + ttlMs : undefined });
  },

  incr(key: string, ttlMs: number) {
    const entry = getEntry(key);
    const value = (entry?.value ?? 0) + 1;
    counters.set(key, { value, expiresAt: entry?.expiresAt ?? now() + ttlMs });
    return value;
  },

  ttlMs(key: string) {
    const entry = getEntry(key);
    if (!entry?.expiresAt) return 0;
    return Math.max(0, entry.expiresAt - now());
  },

  del(key: string) {
    counters.delete(key);
    sets.delete(key);
  },

  addToSet(key: string, value: string, ttlMs: number) {
    const existing = sets.get(key);
    const current = existing && !expired(existing.expiresAt) ? existing : { values: new Set<string>(), expiresAt: now() + ttlMs };
    current.values.add(value);
    sets.set(key, current);
    return current.values.size;
  },

  push(queueKey: string, value: unknown) {
    const queue = queues.get(queueKey) ?? [];
    queue.push(value);
    queues.set(queueKey, queue);
    return queue.length;
  },

  queueLength(queueKey: string) {
    return queues.get(queueKey)?.length ?? 0;
  },

  reset() {
    counters.clear();
    sets.clear();
    queues.clear();
  },
};
