import { Schema, model, models } from "mongoose";

const requestEventSchema = new Schema(
  {
    requestId: { type: String, required: true, index: true },
    riskScoreAfterWorker: { type: Number },
  },
  {
    strict: false,
    versionKey: false,
  },
);

export const RequestEventModel = models.RequestEvent ?? model("RequestEvent", requestEventSchema);
