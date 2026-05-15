# API is Alive

API is Alive is a TypeScript monorepo for a defensive API gateway demo. It shows how an API gateway can authenticate API keys, rate limit traffic, make risk-based decisions from cached state, log request events, and push async risk updates to a background worker.

The application source lives in `app/`.

## What Runs

- `apps/gateway`: Express gateway on port `4000`.
- `apps/fake-api`: Small upstream API on port `5000`.
- `apps/worker`: Kafka consumer that updates Redis risk state and Mongo risk profiles.
- `apps/dashboard`: Vite/React dashboard on port `3000`.
- `apps/replay`: Traffic scenario runner.
- `packages/shared`: Shared TypeScript event and risk types.

## Architecture

```text
Client
  -> Gateway
      -> validates x-api-key against MongoDB
      -> reads Redis cooldown and cached risk
      -> applies Redis token bucket and sliding-window limits
      -> proxies or blocks the request
      -> stores RequestEvent in MongoDB
      -> publishes RequestEvent to Kafka topic request-events
          -> Worker
              -> consumes request-events as consumer group risk-worker
              -> skips duplicate request IDs using Redis
              -> applies risk delta atomically in Redis
              -> sets Redis cooldown when risk reaches block threshold
              -> upserts MongoDB RiskProfile
```

MongoDB stores API keys, request events, and risk profiles. Redis stores live rate-limit state, cooldowns, user-agent sets, cached risk scores, and idempotency keys. Kafka stores the request-events stream consumed by the risk worker.

## Run With Docker

Requirements:

- Docker
- Docker Compose

Start the full stack:

```bash
cd app
docker compose up --build
```

Docker builds the TypeScript services, starts MongoDB, Redis, and Kafka with health checks, runs a one-shot `seed` service for demo API keys, and then starts the gateway and worker.

Open:

- Dashboard: `http://localhost:3000`
- Gateway: `http://localhost:4000`
- Fake API: `http://localhost:5000`

Stop the stack cleanly:

```bash
cd app
docker compose down
```

Reset containers and local Mongo/Redis data:

```bash
cd app
docker compose down -v
```

## Run Locally

Requirements:

- Node.js 20 or newer
- npm
- MongoDB on `localhost:27017`
- Redis on `localhost:6379`
- Kafka on `localhost:9092`

Install dependencies and create the local env file:

```bash
cd app
npm install
cp .env.example .env
```

Default local env:

```bash
GATEWAY_PORT=4000
FAKE_API_PORT=5000
UPSTREAM_URL=http://localhost:5000
MONGO_URL=mongodb://localhost:27017/sentinel
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
KAFKA_REQUEST_EVENTS_TOPIC=request-events
KAFKA_RISK_WORKER_GROUP_ID=risk-worker
KAFKA_CLIENT_ID=api-is-alive
ADMIN_TOKEN=dev-admin-token
API_KEY_PEPPER=dev-api-key-pepper
```

`dev-admin-token` and `dev-api-key-pepper` are local development defaults only. Set strong `ADMIN_TOKEN` and `API_KEY_PEPPER` values before using this outside a local demo.

Start services in separate terminals from `app/`:

```bash
npm run fake-api:dev
npm run gateway:dev
npm run worker:dev
npm --workspace apps/dashboard run dev
```

Seed API keys:

```bash
npm run seed
```

Demo keys:

- `demo-free-key`
- `demo-pro-key`

## Replay Traffic

Run replay scenarios after the gateway, fake API, worker, MongoDB, Redis, and Kafka are running:

```bash
cd app
npm install
npm run replay:normal
npm run replay:scraper
npm run replay:credential-stuffing
npm run replay:suspicious
```

Replay uses `demo-free-key` by default. Override with:

```bash
API_KEY=demo-pro-key npm run replay:normal
```

## Manual Checks

Gateway traffic requires `x-api-key`:

```bash
curl -i "http://localhost:4000/search?q=keyboard" \
  -H "x-api-key: demo-free-key"
```

Expected gateway headers include:

```text
X-Gateway-Decision
X-Risk-Score
X-RateLimit-Remaining
```

Admin routes require `x-admin-token`:

```bash
curl http://localhost:4000/admin/stats \
  -H "x-admin-token: dev-admin-token"

curl http://localhost:4000/admin/events?limit=5 \
  -H "x-admin-token: dev-admin-token"

curl http://localhost:4000/admin/risk-profiles \
  -H "x-admin-token: dev-admin-token"

curl http://localhost:4000/admin/queue \
  -H "x-admin-token: dev-admin-token"
```

## Localhost Validation

The stack has been validated with curl against `127.0.0.1` only.

Functional checks:

```bash
curl -i "http://127.0.0.1:4000/search?q=keyboard"
curl -i "http://127.0.0.1:4000/search?q=keyboard" \
  -H "x-api-key: invalid-local-key"
curl -i "http://127.0.0.1:4000/search?q=keyboard" \
  -H "x-api-key: demo-free-key" \
  -H "x-forwarded-for: 127.0.0.1"
curl -i "http://127.0.0.1:4000/checkout" \
  -H "x-api-key: demo-free-key" \
  -H "content-type: application/json" \
  --data '{"items":[{"productId":"prod_keyboard","quantity":1}]}'
curl -i "http://127.0.0.1:4000/login" \
  -H "x-api-key: demo-free-key" \
  -H "content-type: application/json" \
  --data '{"email":"bot@example.com","password":"wrong"}'
```

Expected behavior:

- missing API key returns `401` with `X-Gateway-Decision: AUTH_MISSING`
- invalid API key returns `401` with `X-Gateway-Decision: AUTH_INVALID`
- normal search returns `200` with `X-Gateway-Decision: ALLOW`
- checkout returns `201` until the checkout rate limit is hit
- failed login is stored as a request event and the worker later writes `riskScoreAfterWorker`
- `/admin/queue` reports Kafka `totalLag: 0` once the worker catches up

Controlled localhost burst used for validation:

```bash
seq 1 120 | xargs -P 30 -I{} curl -sS -o /dev/null -D - \
  "http://127.0.0.1:4000/search?q=burst-{}" \
  -H "x-api-key: demo-pro-key" \
  -H "x-forwarded-for: 127.0.10.10" \
  -H "user-agent: curl-local-burst"
```

Observed result:

```text
30  -> 200 ALLOW
18  -> 429 RATE_LIMIT
72  -> 429 TEMP_BLOCK
Kafka high watermark = committed offset
Kafka lag = 0
RiskProfile demo-pro-key score = 100
```

## Tests

The test command uses isolated local test stores:

```bash
cd app
npm test
```

It targets:

```text
MONGO_URL=mongodb://localhost:27017/sentinel_test
REDIS_URL=redis://localhost:6379/15
```

Start local MongoDB, Redis, and Kafka first, or run only infrastructure from Compose:

```bash
cd app
docker compose up -d mongo redis kafka
npm test
docker compose down
```

## More Docs

- `app/README.md`: app-level command reference.
- `app/docs/architecture.md`: runtime flow and service responsibilities.
- `app/docs/rate-limiting.md`: token bucket and sliding-window behavior.
- `app/docs/risk-scoring.md`: async worker scoring model.
- `app/docs/failure-modes.md`: failure behavior and operational notes.
- `app/docs/demo-script.md`: short demo flow.
