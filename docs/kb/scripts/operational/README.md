---
id: docs-kb-scripts-operational-index
title: Operational Script Catalog
category: index
status: draft
source_of_truth: []
related: [docs-kb-scripts-index, docs-kb-home]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Operational Script Catalog

The operational bucket follows the backup/export/staging tools listed in [`backend/diagnostics/README.md`](../../../../backend/diagnostics/README.md#L1). Backup and restore commands require particular care with the configured MongoDB target.

| Script | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Atlas database backup](backup-atlas.md) | Writes a timestamped gzip `mongodump` archive. | [`backend/scripts/backup_atlas.ps1`](../../../../backend/scripts/backup_atlas.ps1#L1) | none found | verified |
| [MongoDB collection JSON export](export-mongodb.md) | Exports three configured collections to JSON. | [`backend/scripts/export_mongodb.py`](../../../../backend/scripts/export_mongodb.py#L105) | none found | verified |
| [Local HTTPS staging server](local-staging-server.md) | Serves the built frontend and proxies backend routes on loopback HTTPS. | [`backend/scripts/local_staging_server.mjs`](../../../../backend/scripts/local_staging_server.mjs#L105) | none found | verified |
| [Backup/restore verification](verify-backup-restore.md) | Backs up, restores the migrations collection to a temporary database, and validates it. | [`backend/scripts/verify_backup_restore.ps1`](../../../../backend/scripts/verify_backup_restore.ps1#L1) | none found | verified |

## Back to index

- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
