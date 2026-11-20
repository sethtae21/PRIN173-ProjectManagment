---
id: docs-kb-api-accounts-index
title: Accounts API Routes
category: index
status: draft
source_of_truth: [backend/accounts/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

# Accounts API Routes

Sibling methods for each route will be adjacent.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/auth/check-registration/` | [Check registration contact](post-auth-check-registration.md) | Validate email, mobile, optional seller store name | [accounts/urls.py](../../../../backend/accounts/urls.py#L25) | [accounts tests](../../../../backend/accounts/tests.py#L476) | verified |
| POST | `/auth/register/` | [Register](post-auth-register.md) | Create a shopper or seller and issue tokens | [accounts/urls.py](../../../../backend/accounts/urls.py#L26) | [accounts tests](../../../../backend/accounts/tests.py#L257) | verified |
| POST | `/auth/login/` | [Login](post-auth-login.md) | Authenticate by email and password | [accounts/urls.py](../../../../backend/accounts/urls.py#L27) | [accounts tests](../../../../backend/accounts/tests.py#L521) | verified |
| POST | `/auth/logout/` | [Logout](post-auth-logout.md) | Blacklist an optional refresh token | [accounts/urls.py](../../../../backend/accounts/urls.py#L28) | [accounts tests](../../../../backend/accounts/tests.py#L643) | verified |
| POST | `/auth/token/refresh/` | [Refresh token](post-auth-token-refresh.md) | Validate and rotate a refresh token | [accounts/urls.py](../../../../backend/accounts/urls.py#L31) | [accounts tests](../../../../backend/accounts/tests.py#L643) | verified |
| POST | `/auth/change-password/` | [Change password](post-auth-change-password.md) | Verify current password and save a new one | [accounts/urls.py](../../../../backend/accounts/urls.py#L34) | [accounts tests](../../../../backend/accounts/tests.py#L153) | verified |
| POST | `/auth/deactivate/` | [Deactivate account](post-auth-deactivate.md) | Disable the account while retaining its records | [accounts/urls.py](../../../../backend/accounts/urls.py#L37) | [accounts tests](../../../../backend/accounts/tests.py#L643) | verified |
| GET | `/auth/user/profile/` | [Read checkout profile](get-auth-user-profile.md) | Return the authenticated user's profile | [accounts/urls.py](../../../../backend/accounts/urls.py#L41) | [accounts tests](../../../../backend/accounts/tests.py#L114) | verified |
| PUT | `/auth/user/profile/` | [Replace checkout profile](put-auth-user-profile.md) | Replace writable profile fields | [accounts/urls.py](../../../../backend/accounts/urls.py#L41) | [accounts tests](../../../../backend/accounts/tests.py#L129) | verified |
| PATCH | `/auth/user/profile/` | [Partially update checkout profile](patch-auth-user-profile.md) | Partially update writable profile fields | [accounts/urls.py](../../../../backend/accounts/urls.py#L41) | [accounts tests](../../../../backend/accounts/tests.py#L129) | verified |
| DELETE | `/auth/user/profile/` | [Archive checkout profile](delete-auth-user-profile.md) | Start the archive-retention window | [accounts/urls.py](../../../../backend/accounts/urls.py#L41) | [accounts tests](../../../../backend/accounts/tests.py#L188) | verified |
| GET | `/profile/` | [Read legacy profile](get-profile.md) | Return the authenticated user's profile on the legacy route | [accounts/urls.py](../../../../backend/accounts/urls.py#L44) | [accounts tests](../../../../backend/accounts/tests.py#L114) | verified |
| PUT | `/profile/` | [Replace legacy profile](put-profile.md) | Replace writable profile fields on the legacy route | [accounts/urls.py](../../../../backend/accounts/urls.py#L44) | [accounts tests](../../../../backend/accounts/tests.py#L129) | verified |
| PATCH | `/profile/` | [Partially update legacy profile](patch-profile.md) | Partially update writable profile fields on the legacy route | [accounts/urls.py](../../../../backend/accounts/urls.py#L44) | [accounts tests](../../../../backend/accounts/tests.py#L129) | verified |
| DELETE | `/profile/` | [Archive legacy profile](delete-profile.md) | Start the archive-retention window on the legacy route | [accounts/urls.py](../../../../backend/accounts/urls.py#L44) | [accounts tests](../../../../backend/accounts/tests.py#L188) | verified |
| GET | `/profile/fitting-studio-survey/` | [Read fitting-studio surveys](get-profile-fitting-studio-survey.md) | Return the caller's survey history and derived latest result | [accounts/urls.py](../../../../backend/accounts/urls.py#L48) | [survey tests](../../../../backend/accounts/tests_fitting_studio_survey.py#L159) | verified |
| POST | `/profile/fitting-studio-survey/` | [Submit fitting-studio survey](post-profile-fitting-studio-survey.md) | Create or merge one survey per caller and session | [accounts/urls.py](../../../../backend/accounts/urls.py#L48) | [survey tests](../../../../backend/accounts/tests_fitting_studio_survey.py#L88) | verified |
| GET | `/health/` | [Check service health](get-health.md) | Report application and database readiness | [accounts/urls.py](../../../../backend/accounts/urls.py#L51) | [accounts tests](../../../../backend/accounts/tests.py#L425) | draft |
| GET | `/presets/` | [List avatar presets](get-presets.md) | List the caller's presets | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts tests](../../../../backend/accounts/tests.py#L65) | verified |
| POST | `/presets/` | [Create avatar preset](post-presets.md) | Create a preset owned by the caller | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts tests](../../../../backend/accounts/tests.py#L55) | verified |
| GET | `/presets/{pk}/` | [Read avatar preset](get-presets-id.md) | Read one caller-owned preset | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts tests](../../../../backend/accounts/tests.py#L72) | verified |
| PUT | `/presets/{pk}/` | [Replace avatar preset](put-presets-id.md) | Replace a caller-owned preset | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts tests](../../../../backend/accounts/tests.py#L72) | verified |
| PATCH | `/presets/{pk}/` | [Partially update avatar preset](patch-presets-id.md) | Partially update a caller-owned preset | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts tests](../../../../backend/accounts/tests.py#L72) | verified |
| DELETE | `/presets/{pk}/` | [Delete avatar preset](delete-presets-id.md) | Delete a caller-owned preset | [accounts/urls.py](../../../../backend/accounts/urls.py#L20) | [accounts/tests.py](../../../../backend/accounts/tests.py#L72) | verified |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
