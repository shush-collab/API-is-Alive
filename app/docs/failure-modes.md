# Failure Modes

This project separates request-path safety from async telemetry and risk updates.

## Startup

Gateway and worker depend on MongoDB and Redis.

Docker handles this with:

- MongoDB health check using `mongosh`.
- Redis health check using `redis-cli ping`.
- `depends_on` conditions for gateway and worker.
- Mongo connection retry in gateway and worker.
- Redis readiness check in gateway.

Expected Docker startup markers:

```text
[mongo] connected
[redis] ready
Gateway running on http://localhost:4000
[worker] started
```

## Shutdown

Use:

```bash
docker compose down
```

Gateway handles `SIGINT` and `SIGTERM`, closes the HTTP server, disconnects MongoDB, and disconnects Redis.

Worker handles `SIGINT` and `SIGTERM`, closes the BullMQ worker, disconnects MongoDB, and disconnects Redis.

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

## Queue Failures

The gateway stores the MongoDB request event before enqueueing the BullMQ job.

If enqueue fails after the upstream response is ready, the gateway logs the enqueue error but still returns the upstream response. This avoids turning a successful upstream checkout into a gateway `500` only because async risk processing failed.

The event is still available in MongoDB for future reprocessing.

## Test Isolation

`npm test` uses:

```text
MONGO_URL=mongodb://localhost:27017/sentinel_test
REDIS_URL=redis://localhost:6379/15
```

This prevents tests from flushing Redis DB `0`, where Docker/BullMQ development queues run by default.
