---
id: script-command-measure-upload
title: Measure Catalog Upload Performance
category: script
status: verified
source_of_truth: [backend/catalog/management/commands/measure_upload.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Default mode measures the synchronous processing time of a 10-item catalog upload against the 60-second OBJ-08 budget. Optional sweep mode measures 1–10-item batches with distinct images, checks the configured batch-size cap through the real upload view, and writes CSV evidence. Temporary seller/listing/batch fixtures are deleted unless `--keep-data` is set ([command and timing constants](../../../../backend/catalog/management/commands/measure_upload.py#L52)).

## Prerequisites

Use a disposable development/test database with GridFS, the rembg/image-processing dependencies, and Django upload settings configured. The command creates upload fixtures and may process images in the background ([fixture and processing flow](../../../../backend/catalog/management/commands/measure_upload.py#L479)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py measure_upload
python .\manage.py measure_upload --sweep --repeats 3
python .\manage.py measure_upload --sweep --csv-out '.\upload-timing.csv'
```

## Inputs/Env Vars

- `--keep-data`: leave test fixtures in the database/catalog.
- `--sweep`: run the 1–10 item distinct-image sweep and batch-cap probe.
- `--repeats`: sweep runs per item count; defaults to `1`, clamped to at least `1`, maximum `50`.
- `--csv-out`: sweep CSV path; defaults to `<BASE_DIR>\upload_timing_results.csv`.
- Reads upload limits and image-processing values from Django settings, including `MAX_BATCH_ITEMS`, `REMBG_WORKING_SIZE`, `REMBG_OUTPUT_CAP`, and `IMAGE_WORKERS`; no command-specific environment variables are read ([arguments and sweep](../../../../backend/catalog/management/commands/measure_upload.py#L77)).

## Outputs & Reports

Default mode prints status/counts, elapsed time, and the budget verdict. Sweep mode prints per-run summaries and writes timestamped measurement rows to CSV when possible ([sweep report](../../../../backend/catalog/management/commands/measure_upload.py#L396)).

## Exit Codes

Exits `0` on a passing measurement and `1` when the batch fails, exceeds the time budget, or the sweep/cap check fails. A sweep CSV write error is printed but does not by itself add a failure to the exit verdict ([default and sweep verdicts](../../../../backend/catalog/management/commands/measure_upload.py#L471)).

## Source

- [`backend/catalog/management/commands/measure_upload.py` lines 52–556](../../../../backend/catalog/management/commands/measure_upload.py#L52): timing constants, options, fixture cleanup, sweep, and default verdict.

## Related

- No sibling script dependency is documented.

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
