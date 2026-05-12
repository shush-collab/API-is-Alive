import { request, summarize } from "./client";

export const suspicious = async () => {
  const results = [];
  results.push(await request("/login", {
    method: "POST",
    body: JSON.stringify({ email: "user@example.com", password: "password123" }),
  }));

  for (let index = 0; index < 8; index += 1) {
    results.push(await request(`/search?q=phone-${index}`));
  }

  for (let index = 0; index < 2; index += 1) {
    results.push(await request("/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "wrong-password" }),
    }));
  }

  results.push(await request("/search?q=keyboard"));

  summarize("suspicious", results);
};
