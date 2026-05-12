import { Router } from "express";

export const checkoutRouter = Router();

checkoutRouter.post("/checkout", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  res.status(201).json({
    orderId: "order_fake_123",
    status: "confirmed",
    itemCount: items.length,
    total: 149.99,
  });
});
