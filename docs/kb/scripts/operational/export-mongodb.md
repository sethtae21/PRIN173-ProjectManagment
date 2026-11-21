---
id: script-operational-export-mongodb
title: MongoDB Collection JSON Export
category: script
status: verified
source_of_truth: [backend/scripts/export_mongodb.py]
related: [docs-kb-scripts-operational-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Loads the backend environment, initializes Django and PyMongo, and exports the configured three collections as JSON arrays. `serialize_value` recursively converts BSON `ObjectId`, datetimes, bytes, embedded documents, and arrays into JSON-safe values ([serialization and `main()`](../../../../backend/scripts/export_mongodb.py#L46)).

## Prerequisites

- The backend Python environment with Django and PyMongo/BSON available.
- `python-dotenv` is optional; without it, ambient environment variables are used.
- MongoDB read access for the configured database.

## Command (PowerShell)

From the repository root:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\scripts\export_mongodb.py
```

## Inputs/Env Vars

Reads `MONGODB_URI` through Django settings after loading `backend\.env` with `override=True` when `python-dotenv` is installed. It takes no CLI arguments. The database is fixed to `fitfusion`; the collection list is `accounts_rating`, `accounts_fittingstudiosurvey`, and `accounts_user` ([environment and export configuration](../../../../backend/scripts/export_mongodb.py#L18)).

## Outputs & Reports

Writes one JSON file per collection under `backend\mongodb_export\`, and prints connection information with URI credentials masked plus per-collection counts ([output path and reporting](../../../../backend/scripts/export_mongodb.py#L36)).

## Exit Codes

Exits `1` when `MONGODB_URI` is empty or the MongoDB connection fails. Per-collection export errors are printed and assigned a zero total, but the script continues to its completion message without setting a failure exit code ([`main()`](../../../../backend/scripts/export_mongodb.py#L105)).

## Source

- [`backend/scripts/export_mongodb.py` lines 18–139](../../../../backend/scripts/export_mongodb.py#L18): environment loading, recursive serialization, collection export, and `main()`.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): operational bucket description.

## Related

- No sibling script dependency is documented.

## Back to index

- [Operational Script Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
