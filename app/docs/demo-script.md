# Demo Script

Use this when recording or presenting the project.

## 1. Start Clean

```bash
cd app
docker compose down -v
docker compose up --build
```

Expected logs:

```text
[mongo] connected
[redis] ready
Gateway running on http://localhost:4000
[worker] started
```

## 2. Seed API Keys

In another terminal:

```bash
cd app
docker compose exec gateway npm run seed
```

Demo keys:

```text
demo-free-key
demo-pro-key
```

## 3. Show Auth

Missing key:

```bash
curl -i "http://localhost:4000/search?q=keyboard"
```

Expected:

```text
401 Missing API key
```

Valid key:

```bash
curl -i "http://localhost:4000/search?q=keyboard" \
  -H "x-api-key: demo-free-key"
```

Expected:

```text
200
X-Gateway-Decision: ALLOW
X-Risk-Score: 0
```

## 4. Show Live Dashboard

Open:

```text
http://localhost:3000
```

The dashboard polls:

```text
GET /admin/stats
GET /admin/events
GET /admin/risk-profiles
GET /admin/queue
```

It sends:

```text
x-admin-token: dev-admin-token
```

## 5. Replay Attacks

```bash
npm run replay:credential-stuffing
```

Expected replay summary includes rising block decisions:

```text
ALLOW
ALLOW_BUT_LOG
REQUIRE_STEP_UP
TEMP_BLOCK
```

Worker logs should show processed jobs:

```text
[worker] processed event ...
[worker] completed ...
```

## 6. Inspect Admin State

```bash
curl http://localhost:4000/admin/stats \
  -H "x-admin-token: dev-admin-token"

curl http://localhost:4000/admin/queue \
  -H "x-admin-token: dev-admin-token"

curl http://localhost:4000/admin/risk-profiles \
  -H "x-admin-token: dev-admin-token"
```

Expected:

- request counts increase
- queue `completed` increases
- queue lag stays near `0`
- risk profile score rises toward `100`

## 7. Stop Cleanly

```bash
docker compose down
```

Containers should stop without leaving gateway or worker processes running.
