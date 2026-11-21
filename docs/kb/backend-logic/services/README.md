---
id: docs-kb-services-index
title: Service and Contract Catalog
category: index
status: draft
source_of_truth: []
related: [docs-kb-backend-logic-index, docs-kb-home]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Service and Contract Catalog

Services document interfaces, contracts, side effects, and failure modes; they use the service template rather than the formula template. This catalog contains 6 service items.

| Service or contract | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [JWT refresh-token blacklist](jwt-token-blacklist.md) | Raw PyMongo storage and refresh-token revocation behavior. | [`backend/accounts/utils/__init__.py`](../../../../backend/accounts/utils/__init__.py#L20) | [`accounts/tests.py`](../../../../backend/accounts/tests.py#L643) | verified |
| [MongoDB health target resolver](health-target-resolver.md) | Shared local-host guard and bounded MongoDB ping for HTTP/CLI probes. | [`backend/accounts/health_utils.py`](../../../../backend/accounts/health_utils.py#L31) | [`accounts/tests.py`](../../../../backend/accounts/tests.py#L424) | verified |
| [Public GridFS media serving](gridfs-media-serving.md) | Public media response contract for files stored in GridFS. | [`backend/catalog/views/page_views.py`](../../../../backend/catalog/views/page_views.py#L36) | none found | verified |
| [Archived-user retention lifecycle](archive-retention-lifecycle.md) | Grace-window selection, sanitization, cold copy, and live-account deletion. | [`backend/accounts/archive.py`](../../../../backend/accounts/archive.py#L68) | [`accounts/tests_archive_retention.py`](../../../../backend/accounts/tests_archive_retention.py#L189) | verified |
| [Archived-user pseudonymization](archived-user-pseudonymization.md) | HMAC-derived identifier tokens and idempotent cold-row backfill. | [`backend/accounts/pseudonymization.py`](../../../../backend/accounts/pseudonymization.py#L55) | [`accounts/tests_archive_retention.py`](../../../../backend/accounts/tests_archive_retention.py#L291) | verified |
| [Backend/frontend UAT mirror contract](uat-mirror-contract.md) | Paired questionnaire values and answer-range synchronization rules. | [`backend/ratings/uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L56); [`Frontend/src/services/uat.js`](../../../../Frontend/src/services/uat.js#L1) | [`ratings/tests.py`](../../../../backend/ratings/tests.py#L296) | verified |

## Back to index

- [Backend logic catalog](../README.md)
- [Knowledge-base home](../../README.md)
