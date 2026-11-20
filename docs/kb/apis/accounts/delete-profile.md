---
id: api-delete-profile
title: DELETE /profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/archive.py]
related: [api-get-profile, api-put-profile, api-patch-profile, api-delete-auth-user-profile, service-archive-retention]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`DELETE /profile/` (legacy profile path). No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

Optional JSON `refresh` token for server-side invalidation.

## Response

`204 No Content`.

## Errors

Authentication failures follow configured JWT behavior. A malformed supplied refresh token is ignored by the deletion handler.

## Side Effects

Archives the caller and stamps `archived_at`; it does not immediately delete the profile. A later retention sweep relocates and pseudonymizes the archived account.

## Source

- Handler `ProfileView.destroy`, [`core.py`](../../../../backend/accounts/views/core.py#L54) L54–70.
- Route `path('profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L44) L44; the import resolves through [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Retention behavior: [`archive.py`](../../../../backend/accounts/archive.py#L1) L1–60.

## Tests

- [`test_delete_account_archives_and_blocks_login`](../../../../backend/accounts/tests.py#L188).
- [`test_legacy_profile_view_crud`](../../../../backend/accounts/tests.py#L616).

## Related

- Siblings: [GET](get-profile.md), [PUT](put-profile.md), [PATCH](patch-profile.md).
- Removal counterpart: [DELETE /auth/user/profile/](delete-auth-user-profile.md).
- Separate deactivation behavior: [POST /auth/deactivate/](post-auth-deactivate.md).
- Archive service doc is scheduled for P3; source: [`archive.py`](../../../../backend/accounts/archive.py#L1).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
