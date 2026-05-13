import cors from "cors";
import express from "express";
import { adminAuth } from "./middleware/adminAuth";
import { auth } from "./middleware/auth";
import { decision } from "./middleware/decision";
import { rateLimit } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/requestLogger";
import { riskCheck } from "./middleware/riskCheck";
import { adminRouter } from "./routes/admin.routes";
import { proxyRouter } from "./routes/proxy.routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use((req, res, next) => {
    res.setHeader("X-Gateway-Decision", req.gateway.decision);
    res.setHeader("X-Risk-Score", String(req.gateway.riskScoreBefore));
    res.setHeader("X-RateLimit-Remaining", String(req.gateway.rateLimitRemaining));
    next();
  });

  app.use("/admin", adminAuth, adminRouter);
  app.use(auth, riskCheck, rateLimit, decision, proxyRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[gateway] unhandled error", error);

    res.status(500).json({
      error: "Internal gateway error",
    });
  });

  return app;
};
