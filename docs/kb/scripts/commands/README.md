---
id: docs-kb-scripts-commands-index
title: Django Management Command Catalog
category: index
status: draft
source_of_truth: []
related: [docs-kb-scripts-index, docs-kb-home]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Django Management Command Catalog

These are in-process Django management commands, organized by their application module as required by the three-bucket contract in [`backend/diagnostics/README.md`](../../../../backend/diagnostics/README.md#L1).

| Script | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Clean legacy survey fields](clean-legacy-survey-fields.md) | Preview/apply recursive legacy-field stripping and optional unsupported-source rating purge. | [`clean_legacy_survey_fields.py`](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L72) | none found | verified |
| [MongoDB target ping](db-ping.md) | Resolve configured Mongo target, guard localhost, and report ping result. | [`db_ping.py`](../../../../backend/accounts/management/commands/db_ping.py#L19) | none found | verified |
| [Dedupe fitting surveys](dedupe-fitting-surveys.md) | Preview/apply duplicate `(user, session_id)` merge. | [`dedupe_fitting_surveys.py`](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L15) | [`tests_fitting_studio_survey.py`](../../../../backend/accounts/tests_fitting_studio_survey.py#L315) | verified |
| [Measure API performance](measure-api-performance.md) | Measure API p50/p95 latency with temporary fixtures. | [`measure_api_performance.py`](../../../../backend/accounts/management/commands/measure_api_performance.py#L14) | none found | verified |
| [Prune archived users](prune-archived-users.md) | Preview or run archive retention and optional cold-row sanitation. | [`prune_archived_users.py`](../../../../backend/accounts/management/commands/prune_archived_users.py#L37) | [`tests_archive_retention.py`](../../../../backend/accounts/tests_archive_retention.py#L540) | verified |
| [Pseudonymize archived users](pseudonymize-archived-users.md) | Apply or dry-run existing archived-row pseudonymization. | [`pseudonymize_archived_users.py`](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L25) | [`tests_archive_retention.py`](../../../../backend/accounts/tests_archive_retention.py#L540) | verified |
| [Backup or restore GridFS orphans](backup-gridfs-orphans.md) | Save or restore orphan `fs.files` and `fs.chunks` documents as BSON frames. | [`backup_gridfs_orphans.py`](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L77) | [`catalog/tests.py`](../../../../backend/catalog/tests.py#L1363) | verified |
| [Measure GridFS stability](measure-gridfs-stability.md) | Replace/delete probe images and compare logical GridFS counters. | [`measure_gridfs_stability.py`](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L72) | none found | verified |
| [Measure upload performance](measure-upload.md) | Measure upload budget and optionally produce a 1–10 item timing sweep. | [`measure_upload.py`](../../../../backend/catalog/management/commands/measure_upload.py#L77) | none found | verified |
| [Sweep orphan GridFS](sweep-orphan-gridfs.md) | Preview or delete unreferenced catalog GridFS files and chunks. | [`sweep_orphan_gridfs.py`](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L83) | [`catalog/tests.py`](../../../../backend/catalog/tests.py#L1289) | verified |
| [Export UAT workbook rows](export-uat-workbook.md) | Write calculated UAT KPI rows to CSV. | [`export_uat_workbook.py`](../../../../backend/ratings/management/commands/export_uat_workbook.py#L8) | none found | verified |

## Back to index

- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
