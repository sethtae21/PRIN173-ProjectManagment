---
id: api-get-api-docs
title: GET /api/docs/
category: api
status: verified
source_of_truth: [backend/fitfusion/urls.py]
related: [api-get-api-schema]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /api/docs/`. The route has no path parameters.

## Auth

Authentication policy is not specified at the project URL binding; the route delegates to `SpectacularSwaggerView`.

## Request

No request body.

## Response

`200`: Swagger UI configured to load the schema registered under the `schema` URL name.

## Errors

No endpoint-specific error handling is declared in the project URL configuration.

## Side Effects

The route delegates documentation rendering to `SpectacularSwaggerView`; no project-side write side effect is declared.

## Source

- Swagger view binding and schema URL name: [`urls.py`](../../../../backend/fitfusion/urls.py#L22) L22.
- Sibling schema route: [`urls.py`](../../../../backend/fitfusion/urls.py#L21) L21.

## Tests

none found for `GET /api/docs/`.

## Related

- Sibling schema endpoint: [GET /api/schema/](get-api-schema.md).

## Back to index

- [Schema and API documentation routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
