# Failure Modes

This project separates request-path safety from async telemetry and risk updates.

## Startup

Gateway and worker depend on MongoDB, Redis, and Kafka.

Docker handles this with:

- MongoDB health check using `mongosh`.
- Redis health check using `redis-cli ping`.
- Kafka health check using `kafka-topics.sh --list`.
- One-shot seed service for demo API keys.
- `depends_on` conditions for gateway and worker.
- Mongo connection retry in gateway and worker.
- Redis readiness check in gateway and worker.

Expected Docker startup markers:

```text
[mongo] connected
[redis] ready
[kafka] producer connected
Gateway running on http://localhost:4000
[ConsumerGroup] Consumer has joined the group
[worker] started
```

The worker creates the `request-events` topic if it is missing before it
subscribes. This prevents a startup failure when Kafka is healthy but no event
has been published yet.

## Shutdown

Use:

```bash
docker compose down
```

Gateway handles `SIGINT` and `SIGTERM`, closes the HTTP server, disconnects the Kafka producer, disconnects MongoDB, and disconnects Redis.

Worker handles `SIGINT` and `SIGTERM`, disconnects the Kafka consumer, disconnects MongoDB, and disconnects Redis.

## Auth Failures

Gateway API routes fail closed:

```text
Missing x-api-key -> 401
Invalid or inactive x-api-key -> 401
```

Admin routes fail closed:

```text
Missing or invalid x-admin-token -> 401
```

## Event Transport Failures

The gateway stores the MongoDB request event before publishing to Kafka.

If publish fails after the upstream response is ready, the gateway logs the publish error but still returns the upstream response. This avoids turning a successful upstream checkout into a gateway `500` only because async risk processing failed.

The event is still available in MongoDB for future reprocessing.

Worker invalid JSON behavior:

- log the bad message
- commit the original offset
- optionally send the payload to a dead-letter topic in a later version

Worker MongoDB or Redis transient failure behavior:

- do not commit the Kafka offset
- allow the consumer to retry the message
- rely on the Redis idempotency guard to prevent double-scoring duplicates

Duplicate message behavior:

- `processed:event:<requestId>` skips duplicate scoring
- the worker still commits the duplicate message offset

Kafka tradeoffs:

- durable event stream, consumer groups, replayable events, and partitioning by subject
- more infrastructure than a simple queue
- retries and backoff must be handled differently
- duplicate delivery must be expected
- lag must be monitored through offsets

## Local Load Behavior

Manual localhost curl validation used a bounded burst against
`http://127.0.0.1:4000`, not an external target.

Observed behavior for 120 concurrent-ish `/search` requests using one API key:

```text
30  -> 200 ALLOW
18  -> 429 RATE_LIMIT
72  -> 429 TEMP_BLOCK
```

After the burst, `/admin/queue` reported Kafka `totalLag: 0`, and the abusive
API key had a risk score of `100` with a cooldown. This is the expected failure
mode under local burst traffic: the request path degrades to rate limiting and
temporary blocking while Kafka catches up.

## Test Isolation

`npm test` uses:

```text
MONGO_URL=mongodb://localhost:27017/sentinel_test
REDIS_URL=redis://localhost:6379/15
```

This prevents tests from flushing Redis DB `0`, where Docker development state runs by default. Default tests mock the Kafka publisher and queue stats; Kafka behavior is covered by the Docker demo/manual checks.
