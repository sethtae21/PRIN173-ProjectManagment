---
id: api-post-auth-token-refresh
title: POST /auth/token/refresh/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/utils/__init__.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/token/refresh/`. The route has no path parameters.

## Auth

Uses the refresh token in the request body. The route binds `CustomTokenRefreshView`; it does not bind the separately imported `TokenRefreshView` directly. Permission behavior is inherited from the SimpleJWT parent.

## Request

JSON `refresh`.

## Response

`200`: `success`, new `access`, and a rotated `refresh` when present in the parent response.

## Errors

`401`: the handler explicitly rejects a blacklisted or already-rotated token. Invalid token errors are also subject to the inherited SimpleJWT refresh serializer.

## Side Effects

On successful rotation, blacklists the consumed refresh token.

## Source

- Handler `CustomTokenRefreshView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L185) L185–215.
- Route `path('auth/token/refresh/', CustomTokenRefreshView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L31) L31.
- Blacklist implementation: [`accounts/utils/__init__.py`](../../../../backend/accounts/utils/__init__.py#L20) L20–56.

## Tests

- [`test_token_refresh_blacklist_rotation_and_logout_and_deactivate`](../../../../backend/accounts/tests.py#L643).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
