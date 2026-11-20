---
id: api-get-media-name
title: GET /media/{name}
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/page_views.py, backend/accounts/storage.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /media/<path:name>`. `name` is a path converter and may contain nested path segments; the route has no required trailing slash.

## Auth

Public; published catalog images are served without authentication.

## Request

No request body. Path value `name` identifies the GridFS file.

## Response

`200`: streamed file bytes with a MIME type inferred from the name (default `image/png`) and a one-day public cache header.

## Errors

`404`: file is absent. `503`: GridFS is unreachable or another storage error occurs.

## Side Effects

Reads and closes a GridFS file handle; does not mutate stored media.

## Source

- Handler `serve_gridfs_media`, [`page_views.py`](../../../../backend/catalog/views/page_views.py#L36) L36–66.
- Route `path('media/<path:name>', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L13) L13; root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- GridFS storage interface: [`storage.py`](../../../../backend/accounts/storage.py#L1).

## Tests

none found for the media-serving route.

## Related

- [Catalog API routes](README.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
