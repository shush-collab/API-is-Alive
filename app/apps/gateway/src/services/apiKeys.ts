import { createHash, timingSafeEqual } from "crypto";
import { config } from "../config";
import { ApiKeyModel } from "../models/ApiKey";

export const hashApiKey = (apiKey: string) => {
  return createHash("sha256")
    .update(`${config.apiKeyPepper}:${apiKey}`)
    .digest("hex");
};

export const safeEqual = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
};

export const findActiveApiKey = async (rawApiKey: string) => {
  const keyHash = hashApiKey(rawApiKey);
  const apiKey = await ApiKeyModel.findOne({ keyHash, isActive: true }).lean<{ keyHash: string }>();

  if (!apiKey) {
    return null;
  }

  if (!safeEqual(apiKey.keyHash, keyHash)) {
    return null;
  }

  return apiKey;
};
