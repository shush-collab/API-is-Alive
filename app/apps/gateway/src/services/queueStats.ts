import { requestEventsQueue } from "./eventQueue";

export const getQueueStats = async () => {
  const counts = await requestEventsQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  ) as Record<string, number>;

  return {
    queue: "request-events",
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
  };
};
