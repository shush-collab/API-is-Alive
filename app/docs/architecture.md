# Architecture

API is Alive is a small defensive API gateway system. It is intentionally compact, but the runtime path uses real services instead of in-memory placeholders.

## Services

```text
apps/gateway
  Express gateway, API key auth, admin API, rate limits, request logging, proxying.

apps/fake-api
  Demo upstream API used by the gateway.

apps/worker
  Kafka consumer that consumes request events and updates risk state.

apps/dashboard
  React dashboard that polls live admin endpoints.

apps/replay
  Scenario runner for normal, scraper, credential-stuffing, and suspicious traffic.

packages/shared
  Shared RequestEvent and RiskProfile types.
```

## Request Flow

```text
Client
  -> Gateway request logger
  -> API key auth
  -> cooldown and lightweight risk checks
  -> rate limiting
  -> decision from cached Redis risk score
  -> proxy, block, or step-up response
  -> MongoDB RequestEvent insert
  -> Kafka request-events publish
  -> response to client
```

The gateway does not calculate the new risk score inside the request path. It reads the current cached score from Redis, decides what to do, stores an event, and returns the response.

## Worker Flow

```text
Kafka request-events topic
  -> risk-worker consumer group
  -> Redis idempotency guard for requestId
  -> worker processEvent()
  -> calculate risk delta from event reasons
  -> atomically add and clamp Redis risk score
  -> set Redis cooldown when score >= 80
  -> upsert MongoDB RiskProfile
  -> update RequestEvent.riskScoreAfterWorker
```

Risk updates are asynchronous. The next request from the same API key or IP sees the updated cached score.

## Kafka Event Stream

The gateway publishes each stored `RequestEvent` to Kafka topic `request-events`.
Messages are keyed by `subject`, so authenticated abuse is grouped by API key
and unauthenticated abuse is grouped by IP. The worker consumes the topic as
consumer group `risk-worker`.

On startup, the worker checks whether `request-events` exists and creates it if
needed before subscribing. This avoids a cold-start race where the consumer
subscribes before the producer has auto-created the topic.

Why Kafka:

- durable event stream
- consumer group model
- replayable events
- partitioning by subject
- better fit for event-driven systems than a simple job queue

Tradeoffs:

- more infrastructure than a Redis-backed queue
- retries and backoff must be handled differently
- duplicate delivery must be expected
- lag must be monitored through offsets

## Data Stores

MongoDB:

- API keys, stored as SHA-256 hashes with an application pepper.
- Request events.
- Risk profiles.

Redis:

- Token bucket state.
- Sliding-window sorted sets.
- Cooldown keys.
- Cached risk scores.
- User-agent sets.
- Idempotency keys such as `processed:event:<requestId>`.

Kafka:

- Durable `request-events` stream.
- Consumer group offsets for `risk-worker`.

## Auth Boundaries

Gateway traffic requires:

```text
x-api-key: <active seeded API key>
```

Admin traffic requires:

```text
x-admin-token: <ADMIN_TOKEN>
```

`/admin` is mounted before gateway API key auth and protected by separate admin-token middleware.

## Docker Startup

`docker-compose.yml` starts MongoDB, Redis, and Kafka with health checks. Gateway and worker wait for healthy infrastructure before starting.

Compose also runs a one-shot `seed` service that creates demo API keys before the gateway starts. This makes `docker compose up --build` enough for the replay scripts to authenticate with `demo-free-key`.

The TypeScript services are built in their images and run compiled JavaScript with `npm run start`, not `tsx` dev mode. This avoids runtime dev-server behavior inside containers and makes shutdown cleaner.

## Verified Local Behavior

The Docker stack was exercised with curl against `127.0.0.1` only:

- admin stats and queue endpoints returned `200`
- missing and invalid API keys returned `401`
- normal search returned `200 ALLOW`
- checkout returned `201 ALLOW` until the checkout limit was exceeded
- failed login events were written to MongoDB and later updated with `riskScoreAfterWorker`
- a 120-request local search burst produced `30` allows, `18` rate limits, and `72` temporary blocks
- Kafka `highWatermark` and `committedOffset` both reached `154`, with `totalLag: 0`
