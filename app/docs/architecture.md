# Architecture

API is Alive is a small defensive API gateway system. It is intentionally compact, but the runtime path uses real services instead of in-memory placeholders.

## Services

```text
apps/gateway
  Express gateway, API key auth, admin API, rate limits, request logging, proxying.

apps/fake-api
  Demo upstream API used by the gateway.

apps/worker
  BullMQ worker that consumes request events and updates risk state.

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
  -> BullMQ request-events enqueue
  -> response to client
```

The gateway does not calculate the new risk score inside the request path. It reads the current cached score from Redis, decides what to do, stores an event, and returns the response.

## Worker Flow

```text
BullMQ request-events job
  -> worker processEvent()
  -> calculate risk delta from event reasons
  -> atomically add and clamp Redis risk score
  -> set Redis cooldown when score >= 80
  -> upsert MongoDB RiskProfile
```

Risk updates are asynchronous. The next request from the same API key or IP sees the updated cached score.

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
- BullMQ queue state.

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

`docker-compose.yml` starts MongoDB and Redis with health checks. Gateway and worker wait for healthy infrastructure before starting.

Compose also runs a one-shot `seed` service that creates demo API keys before the gateway starts. This makes `docker compose up --build` enough for the replay scripts to authenticate with `demo-free-key`.

The TypeScript services are built in their images and run compiled JavaScript with `npm run start`, not `tsx` dev mode. This avoids runtime dev-server behavior inside containers and makes shutdown cleaner.
