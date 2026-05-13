import { Schema, model } from "mongoose";

const requestEventSchema = new Schema(
  {
    requestId: { type: String, required: true, index: true },
    ip: { type: String, required: true, index: true },
    apiKey: { type: String },
    subjectType: {
      type: String,
      enum: ["ip", "apiKey"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    decision: { type: String, required: true, index: true },
    riskScoreAtDecision: { type: Number, required: true },
    riskScoreAfterWorker: { type: Number },
    userAgent: { type: String },
    latencyMs: { type: Number, required: true },
    reasons: { type: [String], default: [] },
    createdAt: { type: Date, required: true, index: true },
  },
  { versionKey: false },
);

export const RequestEventModel = model("RequestEvent", requestEventSchema);
