import { request, summarize } from "./client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const normal = async () => {
  const results = [];
  results.push(await request("/login", {
    method: "POST",
    body: JSON.stringify({ email: "user@example.com", password: "password123" }),
  }));

  for (const query of ["keyboard", "phone", "mouse", "keyboard", "phone"]) {
    results.push(await request(`/search?q=${query}`));
    await sleep(250);
  }

  results.push(await request("/checkout", {
    method: "POST",
    body: JSON.stringify({ items: [{ productId: "prod_keyboard", quantity: 1 }] }),
  }));

  summarize("normal", results);
};
