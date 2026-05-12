import { request, summarize } from "./client";

export const credentialStuffing = async () => {
  const results = [];
  for (let index = 0; index < 50; index += 1) {
    results.push(await request("/login", {
      method: "POST",
      body: JSON.stringify({ email: `user${index}@example.com`, password: "wrong-password" }),
    }));
  }
  summarize("credentialStuffing", results);
};
