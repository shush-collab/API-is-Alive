import mongoose from "mongoose";
import { config } from "../config";
import { RequestEventModel } from "../models/RequestEvent";
import { RiskProfileModel } from "../models/RiskProfile";
import type { RequestEvent, RiskProfile } from "../types/shared";

let connected = false;

export const connectMongo = async () => {
  if (connected) return;

  await mongoose.connect(config.mongoUrl);
  connected = true;

  console.log("[mongo] connected");
};

export const disconnectMongo = async () => {
  if (!connected) return;

  await mongoose.disconnect();
  connected = false;
};

export const mongo = {
  async storeRequestEvent(event: RequestEvent) {
    await RequestEventModel.create(event);
  },

  async listRequestEvents(limit = 50) {
    return RequestEventModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async upsertRiskProfile(profile: RiskProfile) {
    await RiskProfileModel.findOneAndUpdate(
      {
        subjectType: profile.subjectType,
        subject: profile.subject,
      },
      {
        $set: profile,
      },
      {
        upsert: true,
        new: true,
      },
    );
  },

  async listRiskProfiles() {
    return RiskProfileModel.find()
      .sort({ score: -1 })
      .limit(50)
      .lean();
  },

  async getRiskProfile(subject: string) {
    return RiskProfileModel.findOne({
      $or: [
        { subjectType: "ip", subject },
        { subjectType: "apiKey", subject },
      ],
    }).lean();
  },

  async unblockRiskProfile(subject: string) {
    await RiskProfileModel.updateMany(
      {
        $or: [
          { subjectType: "ip", subject },
          { subjectType: "apiKey", subject },
        ],
      },
      {
        $unset: { blockedUntil: "" },
        $min: { score: 79 },
        $set: { lastUpdatedAt: new Date() },
      },
    );
  },

  async stats() {
    const totalRequests = await RequestEventModel.countDocuments();

    const allowed = await RequestEventModel.countDocuments({
      decision: { $in: ["ALLOW", "ALLOW_BUT_LOG"] },
    });

    const rateLimited = await RequestEventModel.countDocuments({
      decision: "RATE_LIMIT",
    });

    const blocked = await RequestEventModel.countDocuments({
      decision: "TEMP_BLOCK",
    });

    const latency = await RequestEventModel.aggregate([
      {
        $group: {
          _id: null,
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
    ]);

    const avgLatencyMs = Math.round(latency[0]?.avgLatencyMs ?? 0);

    return {
      totalRequests,
      allowed,
      rateLimited,
      blocked,
      avgLatencyMs,
    };
  },

  async reset() {
    await RequestEventModel.deleteMany({});
    await RiskProfileModel.deleteMany({});
  },
};
