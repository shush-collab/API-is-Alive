import { createApp } from "./app";
import { config } from "./config";
import {
  connectEventProducer,
  disconnectEventProducer,
} from "./services/eventQueue";
import { connectMongo, disconnectMongo } from "./services/mongo";
import { connectRedis, redisClient } from "./services/redis";

const start = async () => {
  await connectMongo();
  await connectRedis();
  await connectEventProducer();

  const server = createApp().listen(config.port, () => {
    console.log(`Gateway running on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    console.log("[gateway] shutting down");

    server.close(async () => {
      await disconnectEventProducer();
      await disconnectMongo();
      redisClient.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((error) => {
  console.error("Failed to start gateway", error);
  process.exit(1);
});
