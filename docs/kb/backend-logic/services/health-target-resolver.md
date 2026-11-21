---
id: service-health-target-resolver
title: MongoDB Health Target Resolver
category: service
status: verified
source_of_truth: [backend/accounts/health_utils.py, backend/accounts/views/health.py, backend/accounts/management/commands/db_ping.py]
related: [docs-kb-services-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

`accounts.health_utils` resolves the MongoDB target used by both the HTTP health probe and the `db_ping` management command. Its localhost guard prevents a local development database from being reported as the configured live-cluster target by default ([resolver](../../../../backend/accounts/health_utils.py#L45), [HTTP view](../../../../backend/accounts/views/health.py#L31), [command](../../../../backend/accounts/management/commands/db_ping.py#L15)).

## Interface/Contract

- `_configured_uri()` reads the default database's configured Mongo URI or falls back to the `MONGODB_URI` environment variable ([configuration resolver](../../../../backend/accounts/health_utils.py#L45)).
- `resolve_target(allow_local=False)` parses and sanitizes target metadata; local hosts are rejected unless explicitly allowed ([target resolver](../../../../backend/accounts/health_utils.py#L110)).
- `ping(allow_local=False, timeouts=None)` connects with bounded timeouts and returns a structured success or failure result ([ping implementation](../../../../backend/accounts/health_utils.py#L141)).
- `health_check` exposes the probe at `/health/`; `db_ping` supports human-readable and JSON output plus `--allow-local` ([view](../../../../backend/accounts/views/health.py#L31), [command](../../../../backend/accounts/management/commands/db_ping.py#L15)).

## Inputs

The default Django database settings or `MONGODB_URI`, the `allow_local` flag, and optional timeout overrides. The health endpoint uses `HEALTH_TIMEOUTS`; `db_ping` uses the longer `PING_TIMEOUTS` profile ([timeouts and resolver](../../../../backend/accounts/health_utils.py#L31), [command](../../../../backend/accounts/management/commands/db_ping.py#L15)).

## Outputs

`resolve_target` returns internal connection details including the raw URI, plus sanitized cluster/database labels and flags such as local/Atlas/TLS status. `ping` omits the raw URI from its result. The HTTP probe returns `200` with `status: ok` or `503` with `status: degraded`; the command exits `0` on success and `1` on failure ([resolver and ping](../../../../backend/accounts/health_utils.py#L110), [HTTP response](../../../../backend/accounts/views/health.py#L31), [command exit handling](../../../../backend/accounts/management/commands/db_ping.py#L15)).

## Failure Modes

Missing or unusable Mongo configuration and a local target with `allow_local=False` fail during resolution. Connection/server-selection errors produce a structured failed ping with stage, error, and hint fields; the HTTP probe maps that result to `503` ([resolver and ping](../../../../backend/accounts/health_utils.py#L110), [HTTP view](../../../../backend/accounts/views/health.py#L31)).

## Security & Privacy Notes

`resolve_target` includes the credential-bearing URI for internal connection use. Callers must not expose that object: `ping` omits it, the HTTP view constructs a credential-free response, and the command filters it from JSON output. The health view is intentionally callable without an authentication token, so its response contains only sanitized target metadata ([resolver and ping](../../../../backend/accounts/health_utils.py#L110), [HTTP view](../../../../backend/accounts/views/health.py#L31), [command](../../../../backend/accounts/management/commands/db_ping.py#L15)).

## Source

- [`backend/accounts/health_utils.py` lines 31–195](../../../../backend/accounts/health_utils.py#L31)
- [`backend/accounts/views/health.py` lines 31–68](../../../../backend/accounts/views/health.py#L31)
- [`backend/accounts/management/commands/db_ping.py` lines 15–61](../../../../backend/accounts/management/commands/db_ping.py#L15)

## Tests

- [`backend/accounts/tests.py` lines 424–446](../../../../backend/accounts/tests.py#L424) checks that the ping result omits the connection URI. No direct tests of `resolve_target` were located.

## Related

- [MongoDB target ping command](../../scripts/commands/db-ping.md)

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
