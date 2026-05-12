import { Router } from "express";

export const loginRouter = Router();

loginRouter.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "user@example.com" && password === "password123") {
    return res.json({
      token: "fake-jwt-token",
      user: {
        id: "user_1",
        email,
      },
    });
  }

  return res.status(401).json({ error: "Invalid email or password" });
});
