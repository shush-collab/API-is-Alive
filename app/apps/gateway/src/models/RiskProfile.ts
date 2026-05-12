import { Schema, model, models } from "mongoose";

const riskProfileSchema = new Schema(
  {
    subjectType: {
      type: String,
      enum: ["ip", "apiKey"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reasons: {
      type: [String],
      default: [],
    },
    lastUpdatedAt: {
      type: Date,
      required: true,
    },
    blockedUntil: {
      type: Date,
    },
  },
  { versionKey: false },
);

riskProfileSchema.index({ subjectType: 1, subject: 1 }, { unique: true });
riskProfileSchema.index({ score: -1 });

export const RiskProfileModel = models.RiskProfile ?? model("RiskProfile", riskProfileSchema);
