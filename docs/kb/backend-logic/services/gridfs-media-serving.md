---
id: service-gridfs-media-serving
title: Public GridFS Media Serving
category: service
status: verified
source_of_truth: [backend/catalog/views/page_views.py, backend/catalog/urls.py]
related: [docs-kb-services-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

`serve_gridfs_media` serves catalog media stored in MongoDB GridFS because Django's filesystem media handler cannot read those objects ([view contract](../../../../backend/catalog/views/page_views.py#L1)).

## Interface/Contract

The `media/<path:name>` URL passes the path value to `serve_gridfs_media(request, name)`. The view opens the named object through `gridfs_storage`, reads it into memory, and returns an `HttpResponse`. The view has no authentication decorator; its source describes published images as public ([route](../../../../backend/catalog/urls.py#L13), [view](../../../../backend/catalog/views/page_views.py#L36)).

## Inputs

The `name` path captured by the catalog URL pattern and the configured `gridfs_storage` backend ([route and handler](../../../../backend/catalog/urls.py#L13)).

## Outputs

- `200` with the stored bytes, a MIME type guessed from the name (or `image/png` fallback), and `Cache-Control: public, max-age=86400` ([response construction](../../../../backend/catalog/views/page_views.py#L36)).
- `404` when GridFS is available but the requested object is missing ([missing-file branch](../../../../backend/catalog/views/page_views.py#L48)).
- `503` when GridFS is unavailable or an unexpected storage/driver error occurs ([error branches](../../../../backend/catalog/views/page_views.py#L48)).

## Failure Modes

A `FileNotFoundError` is distinguished using the storage backend's `_fs` state: unavailable storage returns `503`, while a genuine miss raises `Http404`. Other exceptions are logged and return `503`. Despite the view docstring's “streams” wording, the implementation reads the complete object before constructing the response ([handler](../../../../backend/catalog/views/page_views.py#L36)).

## Security & Privacy Notes

The route is public and the response is explicitly marked publicly cacheable for one day. Only media intended for public catalog display should be stored under names served by this endpoint. The implementation does not add an authorization check ([view and cache policy](../../../../backend/catalog/views/page_views.py#L1)).

## Source

- [`backend/catalog/views/page_views.py` lines 1–66](../../../../backend/catalog/views/page_views.py#L1)
- [`backend/catalog/urls.py` lines 13–13](../../../../backend/catalog/urls.py#L13)

## Tests

No direct tests of the `serve_gridfs_media` route or its 404/503 response contract were located. Existing media-serving test coverage remains listed in [UNVERIFIED](../../ASSUMPTIONS.md#unverified).

## Related

- No sibling service dependency is documented.

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
