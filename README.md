# API is Alive

API is Alive is a TypeScript monorepo for a defensive API gateway demo. It includes:

- `gateway`: Express gateway with request logging, authentication, rate limiting, risk checks, and upstream proxying.
- `fake-api`: Small demo upstream API with `health`, `login`, `search`, and `checkout` routes.
- `worker`: Background risk-scoring worker.
- `dashboard`: Vite/React dashboard.
- `replay`: Scenario runner for normal and suspicious traffic patterns.

The application source lives in the `app/` directory.

## Run With Docker

Requirements:

- Docker
- Docker Compose

Start the full stack:

```bash
cd app
docker compose up --build
```

Services:

- Gateway: `http://localhost:4000`
- Fake API: `http://localhost:5000`
- Dashboard: `http://localhost:3000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

Stop the stack:

```bash
docker compose down
```

Remove containers and local database/cache volumes:

```bash
docker compose down -v
```

## Run Normally

Requirements:

- Node.js 20 or newer
- npm
- MongoDB running locally
- Redis running locally

Install dependencies:

```bash
cd app
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

For local development, use these environment values:

```bash
GATEWAY_PORT=4000
FAKE_API_PORT=5000
UPSTREAM_URL=http://localhost:5000
MONGO_URL=mongodb://localhost:27017/sentinel
REDIS_URL=redis://localhost:6379
```

Start the services in separate terminals from the `app/` directory:

```bash
npm run fake-api:dev
```

```bash
npm run gateway:dev
```

```bash
npm run worker:dev
```

```bash
npm --workspace apps/dashboard run dev
```

The dashboard runs at `http://localhost:3000`, the gateway at `http://localhost:4000`, and the fake API at `http://localhost:5000`.

## Replay Traffic

After the fake API and gateway are running, replay demo scenarios:

```bash
npm run replay:normal
npm run replay:scraper
npm run replay:credential-stuffing
npm run replay:suspicious
```

## Tests

Run the test suite:

```bash
cd app
npm test
```

## Project Docs

More detail is available under `app/docs/`:

- `architecture.md`
- `rate-limiting.md`
- `risk-scoring.md`
- `failure-modes.md`
- `demo-script.md`
