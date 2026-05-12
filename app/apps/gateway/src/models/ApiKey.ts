import { Schema, model, models } from "mongoose";

const apiKeySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      required: true,
      default: "free",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { versionKey: false },
);

export const ApiKeyModel = models.ApiKey ?? model("ApiKey", apiKeySchema);
