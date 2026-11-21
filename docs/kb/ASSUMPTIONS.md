---
id: docs-kb-assumptions
title: Assumptions and Verification Gaps
category: index
status: draft
source_of_truth: []
related: [docs-kb-home, docs-kb-traceability]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

# Assumptions and Verification Gaps

## Source Inputs

- The `_generated/` directory holds scratch route dumps and is excluded from the documentation link gate.
- The three chat-provided `.txt` dumps (`Updated Docs.txt`, `Frontend.txt`, and `Backend.txt`) are stale and are not citation sources. This is evidenced by the repository's API-base-variable and QA-plan filename differences. Documentation will cite repository files and verified repository documentation instead.
- The requested `Software Testing Strategy & Plan Document.md` filename was not found. The repository has [`Software testing plan.md`](../Papers/Software%20testing%20plan.md), which contains canonical test IDs; its correspondence to the requested document name remains an assumption.

## Verification Gaps

- Repository metadata captured for this documentation run: `source_sha` `8725ef0334dbf121e134006aeb1b71be813cf347`, branch `main`.
- Test-ID-to-suite mapping, including canonical E2E IDs and RT-01, is pending the required two-way reconciliation before P4 test docs are drafted.
- Runtime test and script commands are pending inspection of the frontend Playwright configuration, package scripts, and backend test settings.
- `VITE_API_URL` was not found in `frontend/src/services/session.js`; `frontend/src/services/api.js` uses `VITE_API_BASE_URL` in production and `VITE_API_BASE` in development.
- `backend/verify_auth.py` is a runnable verification utility but uses Django model operations, so its placement in the diagnostics bucket needs an explicit caveat.
- The existing `backend/diagnostics/README.md` documents `verify_session_identity.py`; the tracked filename is `verifiy_session_identity.py`. The source filename will not be renamed.
- The catalog compatibility module `backend/catalog/validators.py` says the validator wired into upload/edit views is `backend/catalog/views/core.py`; the docs will distinguish the active implementation from the compatibility implementation.

## UNVERIFIED

- `/health/` has no route-level test and no HTTP-method restriction was located: [`accounts/urls.py`](../../backend/accounts/urls.py#L51); [`tests.py`](../../backend/accounts/tests.py#L425).
- Preset-detail `GET` and successful `PUT` tests were not located: [`accounts/urls.py`](../../backend/accounts/urls.py#L20); [`tests.py`](../../backend/accounts/tests.py#L55).
- The archive-retention service documentation is deferred to P3: [`archive.py`](../../backend/accounts/archive.py#L1).
- Seller assignment for `POST /catalog/` remains unverified: [`core.py`](../../backend/catalog/views/core.py#L717); [`serializers.py`](../../backend/catalog/serializers.py#L8).
- Direct tests were not located for catalog detail CRUD, the `my_listings` underscore alias, media serving, or successful listing `PUT`: [`catalog/urls.py`](../../backend/catalog/urls.py#L7); [`catalog/urls.py`](../../backend/catalog/urls.py#L13); [`catalog/urls.py`](../../backend/catalog/urls.py#L22); [`core.py`](../../backend/catalog/views/core.py#L972); [`tests.py`](../../backend/catalog/tests.py#L497).
- Successful `PUT /cart/update_quantity/`, `POST /cart/clear/`, and `DELETE /cart/remove_item/` tests were not located; `POST /orders/{pk}/cancel/` has no direct Commerce test: [`commerce/urls.py`](../../backend/commerce/urls.py#L10); [`commerce/tests.py`](../../backend/commerce/tests.py#L1).
- A successful owner `PATCH /ratings/{pk}/`, successful shopper `POST /ratings/uat/response/`, and successful staff `GET /ratings/uat/export/` test were not located: [`ratings/urls.py`](../../backend/ratings/urls.py#L20); [`ratings/urls.py`](../../backend/ratings/urls.py#L21); [`ratings/tests.py`](../../backend/ratings/tests.py#L251); [`ratings/tests.py`](../../backend/ratings/tests.py#L332); [`ratings/tests.py`](../../backend/ratings/tests.py#L464).

## Back to index

- [Knowledge-base home](README.md)
- [Traceability matrix](traceability.md)
