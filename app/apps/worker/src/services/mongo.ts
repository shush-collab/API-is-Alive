import mongoose from "mongoose";
import { config } from "../config";

let connected = false;

export const connectMongo = async () => {
  if (connected) return;

  const maxAttempts = 20;
  const delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUrl);
      connected = true;
      console.log("[worker mongo] connected");
      return;
    } catch (error) {
      console.error(`[worker mongo] connection attempt ${attempt}/${maxAttempts} failed`);

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export const disconnectMongo = async () => {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
};
