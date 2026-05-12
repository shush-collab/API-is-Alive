import cors from "cors";
import "dotenv/config";
import express from "express";
import { checkoutRouter } from "./routes/checkout";
import { loginRouter } from "./routes/login";
import { searchRouter } from "./routes/search";

const app = express();
const port = Number(process.env.FAKE_API_PORT ?? process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(loginRouter);
app.use(searchRouter);
app.use(checkoutRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(port, () => {
  console.log(`Fake API running on http://localhost:${port}`);
});
