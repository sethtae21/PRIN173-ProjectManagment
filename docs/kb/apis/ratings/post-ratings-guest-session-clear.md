---
id: api-post-ratings-guest-session-clear
title: POST /ratings/guest-session/clear/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /ratings/guest-session/clear/`. The route has no path parameters.

## Auth

Public (`AllowAny`).

## Request

No request body.

## Response

`200`: `cleared` is `true` for a guest cleanup request; an authenticated caller receives `cleared: false`.

## Errors

No endpoint-specific error response is declared.

## Side Effects

For a guest, removes legacy guest-rating cache keys if present and flushes the session. It does not write rating data.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L17) L17; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Guest cleanup, authenticated no-op, and session flush behavior: [`views.py`](../../../../backend/ratings/views.py#L182) L182–198.

## Tests

- [`test_guest_session_clear_still_safe`](../../../../backend/ratings/tests.py#L243) checks the guest response and absence of persisted rating/session rows.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
