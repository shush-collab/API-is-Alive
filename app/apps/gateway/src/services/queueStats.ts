import { Kafka } from "kafkajs";
import { config } from "../config";

export type KafkaQueueStats = {
  queue: string;
  backend: "kafka";
  topic: string;
  groupId: string;
  totalLag: number;
  partitions: {
    partition: number;
    highWatermark: string;
    committedOffset: string;
    lag: number;
  }[];
};

type QueueStatsProvider = () => Promise<KafkaQueueStats>;

const kafka = new Kafka({
  clientId: `${config.kafkaClientId}-admin`,
  brokers: config.kafkaBrokers,
});

const getKafkaQueueStats = async (): Promise<KafkaQueueStats> => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = await admin.listTopics();
    if (!topics.includes(config.requestEventsTopic)) {
      return {
        queue: config.requestEventsTopic,
        backend: "kafka",
        topic: config.requestEventsTopic,
        groupId: config.riskWorkerGroupId,
        totalLag: 0,
        partitions: [],
      };
    }

    const topicOffsets = await admin.fetchTopicOffsets(config.requestEventsTopic);
    const groupOffsets = await admin
      .fetchOffsets({
        groupId: config.riskWorkerGroupId,
        topics: [config.requestEventsTopic],
      })
      .catch(() => []);

    const groupTopic = groupOffsets.find(
      (topic) => topic.topic === config.requestEventsTopic,
    );

    const partitions = topicOffsets.map((topicOffset) => {
      const rawCommittedOffset =
        groupTopic?.partitions.find(
          (partition) => partition.partition === topicOffset.partition,
        )?.offset ?? "0";
      const committedOffset = rawCommittedOffset === "-1" ? "0" : rawCommittedOffset;

      const highWatermark = topicOffset.high;
      const lag = Math.max(0, Number(highWatermark) - Number(committedOffset));

      return {
        partition: topicOffset.partition,
        highWatermark,
        committedOffset,
        lag,
      };
    });

    return {
      queue: config.requestEventsTopic,
      backend: "kafka",
      topic: config.requestEventsTopic,
      groupId: config.riskWorkerGroupId,
      totalLag: partitions.reduce((sum, partition) => sum + partition.lag, 0),
      partitions,
    };
  } finally {
    await admin.disconnect();
  }
};

let queueStatsProvider: QueueStatsProvider = getKafkaQueueStats;

export const getQueueStats = async () => queueStatsProvider();

export const setQueueStatsProviderForTests = (provider: QueueStatsProvider | null) => {
  queueStatsProvider = provider ?? getKafkaQueueStats;
};
