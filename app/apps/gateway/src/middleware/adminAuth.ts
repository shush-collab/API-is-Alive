import { timingSafeEqual } from "crypto";
import type { RequestHandler } from "express";
import { config } from "../config";

const safeTokenEqual = (incoming: string, expected: string) => {
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
};

export const adminAuth: RequestHandler = (req, res, next) => {
  const token = req.header("x-admin-token");

  if (!token || !safeTokenEqual(token, config.adminToken)) {
    res.status(401).json({
      error: "Invalid admin token",
    });
    return;
  }

  next();
};
