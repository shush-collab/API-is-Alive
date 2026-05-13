# Risk Scoring

Risk scoring runs in the worker, not in the gateway request path.

## Decision Model

The gateway reads the cached Redis risk score and maps it to a decision:

```text
0-39    ALLOW
40-59   ALLOW_BUT_LOG
60-79   REQUIRE_STEP_UP
80-100  TEMP_BLOCK
```

If a rate limit is hit, the gateway returns `RATE_LIMIT`.

## Event Reasons

The gateway labels request events with reasons such as:

```text
normal_behavior
missing_api_key
invalid_api_key
login_failed
login_failures_gt_5
rate_above_70_percent
rate_limit_hit
user_agent_changed_gt_3
scraper_like_search
checkout_spam
```

These are event labels, not direct risk writes.

## Worker Deltas

`apps/worker/src/riskScorer.ts` converts reasons to deltas:

```text
login_failed             +25
login_failures_gt_5      +15
rate_above_70_percent    +20
rate_limit_hit           +25
user_agent_changed_gt_3  +15
scraper_like_search      +20
checkout_spam            +30
normal_behavior           -5
```

The worker applies the delta with `redis.addClamped()`, which uses a Redis Lua script to atomically add the delta and clamp the score between `0` and `100`.

## Cooldowns

When the worker raises a subject to score `>= 80`, it writes:

```text
cooldown:key:<apiKey>
cooldown:ip:<ip>
```

The default cooldown is `10` minutes.

The gateway checks cooldown before proxying future requests. A subject in cooldown receives `TEMP_BLOCK`.

## MongoDB Risk Profiles

After processing an event, the worker upserts a `RiskProfile` document:

```text
subjectType
subject
score
reasons
lastUpdatedAt
blockedUntil
```

The dashboard and `/admin/risk-profiles` read these documents.

## Event Risk Fields

Request events store:

```text
riskScoreAtDecision
riskScoreAfterWorker
```

`riskScoreAtDecision` is the cached score the gateway used when making the response decision. `riskScoreAfterWorker` is filled by the worker after async scoring completes.
