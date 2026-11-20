---
id: api-get-ratings-mine
title: GET /ratings/mine/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /ratings/mine/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: a serialized list of the caller's persisted ratings.

## Errors

Authentication failures follow the REST framework permission response.

## Side Effects

Read-only; results are filtered to the authenticated caller.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L18) L18; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Authentication, owner filter, and serialized list response: [`views.py`](../../../../backend/ratings/views.py#L200) L200–209.
- Rating response fields: [`serializers.py`](../../../../backend/ratings/serializers.py#L35) L35–54.

## Tests

- [`test_mine_returns_only_own_stars`](../../../../backend/ratings/tests.py#L280) checks that only the caller's rating is returned.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
