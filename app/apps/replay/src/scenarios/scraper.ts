import { request, summarize } from "./client";

export const scraper = async () => {
  const results = [];
  for (let index = 0; index < 100; index += 1) {
    results.push(await request(`/search?q=keyboard-${index}`));
  }
  summarize("scraper", results);
};
