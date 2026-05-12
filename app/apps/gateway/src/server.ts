import { createApp } from "./app";
import { config } from "./config";
import { connectMongo } from "./services/mongo";

const start = async () => {
  await connectMongo();

  createApp().listen(config.port, () => {
    console.log(`Gateway running on http://localhost:${config.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start gateway", error);
  process.exit(1);
});
