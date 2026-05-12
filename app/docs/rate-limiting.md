# Rate Limiting

The gateway uses Redis-backed rate limiting. State is shared across gateway requests and survives inside Redis until its TTL expires.

## Global Limits

Configured in `apps/gateway/src/config.ts`:

```text
IP global:          100 requests / 60 seconds
API key global:    200 requests / 60 seconds
Login by IP:        10 requests / 60 seconds
Search by IP:       30 requests / 60 seconds
Checkout by key:     5 requests / 60 seconds
```

## Token Bucket

`apps/gateway/src/services/tokenBucket.ts` implements a real Redis token bucket with:

- `tokens`
- `lastRefillAt`
- `capacity`
- `refillRate`

The update runs inside a Redis Lua script, so consume/refill is atomic for each key.

Used for:

- `rate:ip:<ip>:global`
- `rate:key:<apiKey>:global`

## Sliding Window

`apps/gateway/src/services/slidingWindow.ts` uses Redis sorted sets:

- remove entries older than the window
- add the current request with a unique member
- count the set
- expire the set

Used for:

- login attempts by IP
- search requests by IP
- checkout requests by API key
- login failure labeling

## Risk Labels From Rate Limits

Rate limiting can add reasons to the request event:

```text
rate_above_70_percent
rate_limit_hit
checkout_spam
```

The gateway labels the event. The worker later converts those reasons into risk score changes.

## Response Headers

Gateway responses include:

```text
X-Gateway-Decision
X-Risk-Score
X-RateLimit-Remaining
```

`X-Risk-Score` is the decision-time cached score. The worker may update the score after the response.
