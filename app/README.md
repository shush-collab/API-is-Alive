# Sentinel Gateway App

This directory contains the runnable monorepo for API is Alive.

## Workspaces

```text
apps/gateway     Express gateway and admin API
apps/fake-api    Demo upstream API
apps/worker      Kafka risk scoring consumer
apps/dashboard   React dashboard backed by live admin endpoints
apps/replay      Traffic replay scenarios
packages/shared  Shared TypeScript types
```

## Docker Flow

Run everything:

```bash
docker compose up --build
```

Compose includes a one-shot `seed` service. Demo API keys are created automatically before the gateway starts.

Stop cleanly:

```bash
docker compose down
```

Reset local Docker data:

```bash
docker compose down -v
```

Docker starts MongoDB, Redis, and Kafka with health checks. The gateway and worker wait for healthy infrastructure before starting.

## Local Flow

Install:

```bash
npm install
cp .env.example .env
```

Start these in separate terminals:

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

## Default Credentials

Gateway requests:

```text
x-api-key: demo-free-key
```

Admin requests:

```text
x-admin-token: dev-admin-token
```

Dashboard env:

```text
VITE_GATEWAY_URL=http://localhost:4000
VITE_ADMIN_TOKEN=dev-admin-token
```

The default admin token and API key pepper are for local development only. Set strong values before deployment.

## Scripts

```bash
npm run fake-api:dev
npm run fake-api:build
npm run gateway:dev
npm run gateway:build
npm run worker:dev
npm run seed
npm run replay:normal
npm run replay:scraper
npm run replay:credential-stuffing
npm run replay:suspicious
npm test
```

`npm test` uses `sentinel_test` and Redis DB `15` so it does not wipe development data. Kafka integration is covered by the Docker demo/manual checks; the default unit/integration tests mock the gateway publisher.

## Useful Admin Calls

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

## Local Curl Smoke Test

Keep manual load checks on localhost:

```bash
curl -i "http://127.0.0.1:4000/search?q=keyboard" \
  -H "x-api-key: demo-free-key"

curl "http://127.0.0.1:4000/admin/queue" \
  -H "x-admin-token: dev-admin-token"
```

A healthy Kafka path returns queue stats shaped like:

```json
{
  "queue": "request-events",
  "backend": "kafka",
  "topic": "request-events",
  "groupId": "risk-worker",
  "totalLag": 0,
  "partitions": [
    {
      "partition": 0,
      "highWatermark": "154",
      "committedOffset": "154",
      "lag": 0
    }
  ]
}
```

Validated localhost burst behavior:

```text
120 search requests with xargs -P 30:
30 allowed
18 rate-limited
72 temp-blocked after async risk scoring caught up
Kafka lag returned to 0
```

See `docs/architecture.md` for the request path and service boundaries.
