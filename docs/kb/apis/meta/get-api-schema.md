---
id: api-get-api-schema
title: GET /api/schema/
category: api
status: verified
source_of_truth: [backend/fitfusion/urls.py, backend/fitfusion/settings.py]
related: [api-get-api-docs]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /api/schema/`. The route has no path parameters.

## Auth

Authentication policy is not specified at the project URL binding; the route delegates to `SpectacularAPIView`.

## Request

No request body.

## Response

`200`: generated OpenAPI schema for the configured FitFusion AI API.

## Errors

No endpoint-specific error handling is declared in the project URL configuration.

## Side Effects

The route delegates schema generation to `SpectacularAPIView`; no project-side write side effect is declared.

## Source

- View binding: [`urls.py`](../../../../backend/fitfusion/urls.py#L21) L21.
- Schema title and version configuration: [`settings.py`](../../../../backend/fitfusion/settings.py#L251) L251–255.

## Tests

none found for `GET /api/schema/`.

## Related

- Sibling documentation endpoint: [GET /api/docs/](get-api-docs.md).

## Back to index

- [Schema and API documentation routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
