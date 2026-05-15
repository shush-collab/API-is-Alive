import { Kafka, type Producer } from "kafkajs";
import { config } from "../config";
import type { RequestEvent } from "../types/shared";

type EventPublisher = (event: RequestEvent) => Promise<void>;

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers,
});

let producer: Producer | null = null;
let eventPublisher: EventPublisher | null = null;

const publishToKafka = async (event: RequestEvent) => {
  if (!producer) {
    throw new Error("Kafka producer is not connected");
  }

  await producer.send({
    topic: config.requestEventsTopic,
    messages: [
      {
        key: event.subject,
        value: JSON.stringify(event),
        headers: {
          requestId: event.requestId,
          decision: event.decision,
          subjectType: event.subjectType,
        },
      },
    ],
  });
};

export const connectEventProducer = async () => {
  if (producer) return;

  producer = kafka.producer({
    allowAutoTopicCreation: true,
  });

  await producer.connect();
  eventPublisher = publishToKafka;
  console.log("[kafka] producer connected");
};

export const disconnectEventProducer = async () => {
  if (!producer) return;

  await producer.disconnect();
  producer = null;
  eventPublisher = null;
};

export const enqueueRequestEvent = async (event: RequestEvent) => {
  if (!eventPublisher) {
    throw new Error("Kafka producer is not connected");
  }

  await eventPublisher(event);
};

export const setEventPublisherForTests = (publisher: EventPublisher | null) => {
  eventPublisher = publisher;
};
