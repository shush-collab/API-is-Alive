import { Router } from "express";
import { mongo } from "../services/mongo";
import { redis } from "../services/redis";

export const adminRouter = Router();

adminRouter.get("/stats", async (_req, res) => {
  res.json({ ...(await mongo.stats()), queueLag: await redis.queueLength("events:queue") });
});

adminRouter.get("/events", async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json({ data: await mongo.listRequestEvents(limit) });
});

adminRouter.get("/risk-profiles", async (_req, res) => {
  res.json({ data: await mongo.listRiskProfiles() });
});

adminRouter.get("/risk-profiles/:subject", async (req, res) => {
  const profile = await mongo.getRiskProfile(req.params.subject);
  if (!profile) return res.status(404).json({ error: "Risk profile not found" });
  return res.json(profile);
});

adminRouter.post("/risk-profiles/:subject/unblock", async (req, res) => {
  await mongo.unblockRiskProfile(req.params.subject);
  res.json({ unblocked: true, subject: req.params.subject });
});

adminRouter.get("/queue", async (_req, res) => {
  res.json({ queue: "events:queue", lag: await redis.queueLength("events:queue") });
});
