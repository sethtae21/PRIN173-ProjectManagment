---
id: api-post-auth-deactivate
title: POST /auth/deactivate/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py]
related: [service-archive-retention, api-delete-profile, api-delete-auth-user-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/deactivate/`. The route has no path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON may contain `reason` and `refresh`.

## Response

`200`: success and a message that records are retained.

## Errors

Authentication failures follow the configured JWT authentication behavior.

## Side Effects

Sets only `is_active=False`, logs the request, and blacklists a valid supplied refresh token. It does not set archive status or `archived_at`; this differs from profile DELETE.

## Source

- Handler `DeactivateAccountView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L257) L257–292.
- Route `path('auth/deactivate/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L37) L37.

## Tests

- [`test_token_refresh_blacklist_rotation_and_logout_and_deactivate`](../../../../backend/accounts/tests.py#L643).

## Related

- Archive service documentation will be added in P3. See the [Accounts API routes](README.md).
- Profile removal uses a separate archive path: [DELETE /profile/](delete-profile.md) and [DELETE /auth/user/profile/](delete-auth-user-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
