import { Router } from "express";
import { products } from "../data/products";

export const searchRouter = Router();

searchRouter.get("/search", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const results = q
    ? products.filter((product) => product.name.toLowerCase().includes(q))
    : products;

  res.json({ q, results });
});
