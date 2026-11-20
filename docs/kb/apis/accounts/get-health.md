---
id: api-get-health
title: GET /health/
category: api
status: draft
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/health.py, backend/accounts/health_utils.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /health/`. No path parameters.

## Auth

No DRF authentication; this is a plain Django JSON view intended for probes.

## Request

No request body.

## Response

`200`: `status: ok` plus database and application metadata when the database ping succeeds. `503`: `status: degraded`, sanitized target/error details, and elapsed time when target resolution or ping fails.

## Errors

Database degradation and target-resolution failure are represented by `503`, not an uncaught API error.

## Side Effects

Performs a bounded database readiness probe. The handler itself does not restrict the HTTP method; this catalog entry documents the GET health-probe use.

## Source

- Handler `health_check`, [`health.py`](../../../../backend/accounts/views/health.py#L31) L31–66.
- Route `path('health/', health_check, ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L51) L51.
- Health target and ping behavior: [`health_utils.py`](../../../../backend/accounts/health_utils.py#L110) L110–179.

## Tests

- [`test_ping_result_never_contains_the_connection_uri`](../../../../backend/accounts/tests.py#L425) covers ping redaction; a route-level health test was not located.

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
