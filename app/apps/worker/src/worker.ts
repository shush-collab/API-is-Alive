import { scoreRisk } from "./riskScorer";

console.log("Worker started", scoreRisk({ requests: 1 }));
