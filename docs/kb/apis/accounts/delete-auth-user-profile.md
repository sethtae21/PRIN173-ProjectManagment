---
id: api-delete-auth-user-profile
title: DELETE /auth/user/profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/archive.py]
related: [api-get-auth-user-profile, api-put-auth-user-profile, api-patch-auth-user-profile, api-delete-profile, service-archive-retention]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`DELETE /auth/user/profile/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

Optional JSON `refresh` token for server-side invalidation.

## Response

`204 No Content`.

## Errors

Authentication failures follow configured JWT behavior. A malformed supplied refresh token is ignored by the deletion handler.

## Side Effects

Archives the caller (`status='archive'`, `is_active=False`, `archived_at=now`) and blacklists a valid supplied refresh token. It does not immediately remove the profile; the retention sweep later performs cold relocation and pseudonymization.

## Source

- Handler `ProfileView.destroy`, [`core.py`](../../../../backend/accounts/views/core.py#L54) L54–70.
- Route `path('auth/user/profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L41) L41; the view is re-exported by [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Retention behavior: [`archive.py`](../../../../backend/accounts/archive.py#L1) L1–60.

## Tests

- [`test_delete_account_archives_and_blocks_login`](../../../../backend/accounts/tests.py#L188).

## Related

- Siblings: [GET](get-auth-user-profile.md), [PUT](put-auth-user-profile.md), [PATCH](patch-auth-user-profile.md).
- Removal counterpart: [POST /auth/deactivate/](post-auth-deactivate.md).
- Legacy equivalent: [DELETE /profile/](delete-profile.md).
- Archive service doc is scheduled for P3; source: [`archive.py`](../../../../backend/accounts/archive.py#L1).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
