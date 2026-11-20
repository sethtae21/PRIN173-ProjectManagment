---
id: api-post-profile-fitting-studio-survey
title: POST /profile/fitting-studio-survey/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/core.py, backend/accounts/models]
related: [api-get-profile-fitting-studio-survey]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /profile/fitting-studio-survey/`. No path parameters.

## Auth

Authenticated; the handler additionally requires the caller's role to be `shopper`.

## Request

JSON object containing `survey`; supported fields include session ID, pre/post confidence and return-intent scores, fit rating, equipped item IDs, and avatar context.

## Response

`201` for a new `(user, session_id)` record; `200` when an existing record is merged. Response includes `success`, `created`, message, and `survey_id`.

## Errors

`400`: missing/non-object survey, legacy reaction keys, invalid star types/range, or no rating data. `403`: authenticated non-shopper.

## Side Effects

Creates or merges the caller's survey. The server computes confidence gain from persisted pre/post values.

## Source

- Handler `FittingStudioSurveyView.post`, [`core.py`](../../../../backend/accounts/views/core.py#L197) L197–294.
- Route `path('profile/fitting-studio-survey/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L48) L48.
- Survey field/range and merge behavior: [`core.py`](../../../../backend/accounts/views/core.py#L111) L111–294.

## Tests

- [`test_two_phase_upsert_one_row_and_gain`](../../../../backend/accounts/tests_fitting_studio_survey.py#L88).
- [`test_strict_star_types_rejected`](../../../../backend/accounts/tests_fitting_studio_survey.py#L119).
- [`test_seller_rejected_and_no_row_written`](../../../../backend/accounts/tests_fitting_studio_survey.py#L82).

## Related

- Sibling: [GET](get-profile-fitting-studio-survey.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
