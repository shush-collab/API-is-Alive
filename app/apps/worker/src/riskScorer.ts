export const clampRisk = (score: number) => Math.max(0, Math.min(100, score));

export const riskDeltaFromReasons = (reasons: string[]) => {
  return reasons.reduce((sum, reason) => {
    if (reason === "login_failed") return sum + 25;
    if (reason === "login_failures_gt_5") return sum + 15;
    if (reason === "rate_above_70_percent") return sum + 20;
    if (reason === "rate_limit_hit") return sum + 25;
    if (reason === "user_agent_changed_gt_3") return sum + 15;
    if (reason === "scraper_like_search") return sum + 20;
    if (reason === "checkout_spam") return sum + 30;
    if (reason === "normal_behavior") return sum - 5;
    return sum;
  }, 0);
};
