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
[seed] Demo Free Key: demo-free-key
[mongo] connected
[redis] ready
[kafka] producer connected
Gateway running on http://localhost:4000
[ConsumerGroup] Consumer has joined the group
[worker] started
```

The one-shot Compose seed service creates demo keys automatically.

Demo keys:

```text
demo-free-key
demo-pro-key
```

## 2. Show Auth

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

## 3. Show Live Dashboard

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

## 4. Replay Attacks

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

Worker logs should show consumed Kafka events:

```text
[worker] processed event ...
[worker] consumed kafka event ...
```

## 5. Inspect Admin State

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
- Kafka total lag briefly rises, then stays near `0`
- risk profile score rises toward `100`

## 6. Show Local Burst Protection

Run this only against localhost:

```bash
seq 1 120 | xargs -P 30 -I{} curl -sS -o /dev/null -D - \
  "http://127.0.0.1:4000/search?q=burst-{}" \
  -H "x-api-key: demo-pro-key" \
  -H "x-forwarded-for: 127.0.10.10" \
  -H "user-agent: curl-local-burst"
```

The validated run produced:

```text
30 200 ALLOW
18 429 RATE_LIMIT
72 429 TEMP_BLOCK
```

Then show Kafka catch-up:

```bash
curl http://127.0.0.1:4000/admin/queue \
  -H "x-admin-token: dev-admin-token"
```

Expected:

```text
backend = kafka
topic = request-events
groupId = risk-worker
totalLag = 0
highWatermark = committedOffset
```

## 7. Stop Cleanly

```bash
docker compose down
```

Containers should stop without leaving gateway or worker processes running.
