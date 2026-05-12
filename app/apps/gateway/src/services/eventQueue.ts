import { Queue } from "bullmq";
import { config } from "../config";
import type { RequestEvent } from "../types/shared";

export const requestEventsQueue = new Queue<RequestEvent>("request-events", {
  connection: {
    url: config.redisUrl,
  },
});

export const enqueueRequestEvent = async (event: RequestEvent) => {
  await requestEventsQueue.add("request-event", event, {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
};
