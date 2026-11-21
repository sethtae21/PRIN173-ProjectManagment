---
id: service-uat-mirror-contract
title: Backend and Frontend UAT Mirror Contract
category: service
status: verified
source_of_truth: [backend/ratings/uat_kpis.py, backend/ratings/models.py, Frontend/src/services/uat.js]
related: [docs-kb-services-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

The backend KPI module and frontend UAT service declare a manually synchronized questionnaire contract. Both source files state that their questionnaire definitions mirror one another and must be updated together ([backend](../../../../backend/ratings/uat_kpis.py#L56), [frontend](../../../../Frontend/src/services/uat.js#L1)).

## Interface/Contract

- Both sides use the phases `before`, `after`, and `supplementary` ([backend](../../../../backend/ratings/uat_kpis.py#L72), [frontend](../../../../Frontend/src/services/uat.js#L8)).
- Both sides use four paired question keys: `fit_confidence`, `style_confidence`, `purchase_confidence`, and `return_intent` ([backend](../../../../backend/ratings/uat_kpis.py#L76), [frontend](../../../../Frontend/src/services/uat.js#L14)).
- Both sides use six supplementary keys: `privacy_comfort`, `responsiveness`, `match_helpfulness`, `style_discovery`, `checkout_frustration`, and `seller_validation_clarity` ([backend](../../../../backend/ratings/uat_kpis.py#L82), [frontend](../../../../Frontend/src/services/uat.js#L21)).
- The backend identifies `style_discovery` as yes/no, with `1` as Yes; the frontend treats `0` as a valid No answer. The frontend and `UATResponse` model use the inclusive value range `0..5` ([backend](../../../../backend/ratings/uat_kpis.py#L67), [model](../../../../backend/ratings/models.py#L10), [frontend](../../../../Frontend/src/services/uat.js#L26)).
- The frontend exposes the four rating source choices from the backend `Rating` model. `uat_kpis.py` names the three surfaces it consumes for KPI calculations; `order_history` remains a model/frontend source choice but is not a KPI-source constant in that module ([KPI constants](../../../../backend/ratings/uat_kpis.py#L94), [model choices](../../../../backend/ratings/models.py#L20), [frontend](../../../../Frontend/src/services/uat.js#L30)).

## Inputs

Frontend phase, question-key, answer, and rating-surface constants; backend `UATResponse` rows and KPI question/source constants. UI prompt text is defined in the frontend and is not duplicated as backend prompt text ([frontend contract](../../../../Frontend/src/services/uat.js#L8), [backend constants](../../../../backend/ratings/uat_kpis.py#L72)).

## Outputs

The frontend renders/submits the declared question keys and phases. The backend filters and calculates KPIs using its corresponding key, phase, answer-encoding, and rating-surface constants ([frontend](../../../../Frontend/src/services/uat.js#L8), [backend](../../../../backend/ratings/uat_kpis.py#L72)).

## Failure Modes

Changing one side without the other can leave the UI submitting keys that the KPI module does not recognize, or cause KPI calculations to target keys the UI no longer emits. Current phase/key sets and answer bounds match when compared across the source files; no automated cross-language parity test was located ([backend contract](../../../../backend/ratings/uat_kpis.py#L72), [frontend contract](../../../../Frontend/src/services/uat.js#L8), [answer bounds](../../../../backend/ratings/models.py#L10)).

## Security & Privacy Notes

The frontend constants are not an authorization boundary. Server-side validation and UAT endpoint permissions remain authoritative; the endpoint role checks are covered by the backend UAT RBAC tests ([backend model](../../../../backend/ratings/models.py#L99), [RBAC tests](../../../../backend/ratings/tests.py#L296)).

## Source

- [`backend/ratings/uat_kpis.py` lines 56–100](../../../../backend/ratings/uat_kpis.py#L56)
- [`backend/ratings/models.py` lines 10–17 and 99–108](../../../../backend/ratings/models.py#L10)
- [`Frontend/src/services/uat.js` lines 1–34 and 70–76](../../../../Frontend/src/services/uat.js#L1)

## Tests

- [`backend/ratings/tests.py` lines 296–356](../../../../backend/ratings/tests.py#L296) covers UAT endpoint role permissions. No direct frontend/backend contract-parity test was located.

## Related

- [Export UAT workbook command](../../scripts/commands/export-uat-workbook.md)

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
