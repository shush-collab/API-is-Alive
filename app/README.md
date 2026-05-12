# Sentinel Gateway

Monorepo scaffold for an API gateway demo. The fake API is intentionally simple and exposes only:

```text
GET /health
POST /login
GET /search?q=keyboard
POST /checkout
```

## Setup

```bash
npm install
cp .env.example .env
```

## Run Fake API

```bash
npm run fake-api:dev
```

## Run Gateway

```bash
npm run gateway:dev
```

See `docs/architecture.md` for the repo layout.
