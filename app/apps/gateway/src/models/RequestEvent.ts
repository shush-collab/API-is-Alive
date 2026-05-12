import { Schema, model } from "mongoose";

const requestEventSchema = new Schema(
  {
    requestId: { type: String, required: true, index: true },
    ip: { type: String, required: true, index: true },
    apiKey: { type: String },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    decision: { type: String, required: true, index: true },
    riskScoreBefore: { type: Number, required: true },
    riskScoreAfter: { type: Number },
    userAgent: { type: String },
    latencyMs: { type: Number, required: true },
    createdAt: { type: Date, required: true, index: true },
  },
  { versionKey: false },
);

export const RequestEventModel = model("RequestEvent", requestEventSchema);
