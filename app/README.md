# Sentinel Gateway App

This directory contains the runnable monorepo for API is Alive.

## Workspaces

```text
apps/gateway     Express gateway and admin API
apps/fake-api    Demo upstream API
apps/worker      BullMQ risk scoring worker
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

Docker starts MongoDB and Redis with health checks. The gateway and worker wait for healthy infrastructure before starting.

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

`npm test` uses `sentinel_test` and Redis DB `15` so it does not wipe the development or Docker queue state.

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

See `docs/architecture.md` for the request path and service boundaries.
