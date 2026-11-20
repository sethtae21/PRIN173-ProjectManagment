---
id: api-get-profile-fitting-studio-survey
title: GET /profile/fitting-studio-survey/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/core.py, backend/accounts/models]
related: [api-post-profile-fitting-studio-survey]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /profile/fitting-studio-survey/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: `success`, survey `count`, derived `latest` (or `null`), and the caller's `surveys` ordered newest first.

## Errors

Authentication failures follow configured JWT authentication behavior.

## Side Effects

Read-only. `latest` is derived from the survey collection; no user-document mirror is written.

## Source

- Handler `FittingStudioSurveyView.get`, [`core.py`](../../../../backend/accounts/views/core.py#L180) L180–194.
- Route `path('profile/fitting-studio-survey/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L48) L48.
- Response serialization: [`core.py`](../../../../backend/accounts/views/core.py#L142) L142–160.

## Tests

- [`test_get_returns_own_rows_and_derived_latest`](../../../../backend/accounts/tests_fitting_studio_survey.py#L159).
- [`test_get_empty_history_returns_null_latest`](../../../../backend/accounts/tests_fitting_studio_survey.py#L193).

## Related

- Sibling: [POST](post-profile-fitting-studio-survey.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
