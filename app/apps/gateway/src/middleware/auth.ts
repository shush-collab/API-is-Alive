import type { RequestHandler } from "express";

export const auth: RequestHandler = (_req, _res, next) => {
  next();
};
