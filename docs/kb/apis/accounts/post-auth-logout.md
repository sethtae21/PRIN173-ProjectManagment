---
id: api-post-auth-logout
title: POST /auth/logout/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/utils/__init__.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/logout/`. The route has no path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON may contain the refresh token in `refresh`.

## Response

`200`: `success` and a logout message.

## Errors

Authentication failures follow the configured JWT authentication behavior. Invalid refresh-token parsing is ignored by this handler.

## Side Effects

When a refresh token is supplied and valid, writes its identifier to the MongoDB token blacklist.

## Source

- Handler `LogoutView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L218) L218–240.
- Route `path('auth/logout/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L28) L28.
- Blacklist implementation: [`accounts/utils/__init__.py`](../../../../backend/accounts/utils/__init__.py#L20) L20–56.

## Tests

- [`test_token_refresh_blacklist_rotation_and_logout_and_deactivate`](../../../../backend/accounts/tests.py#L643).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
