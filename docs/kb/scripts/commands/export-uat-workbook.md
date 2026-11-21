---
id: script-command-export-uat-workbook
title: Export UAT KPI Workbook Rows
category: script
status: verified
source_of_truth: [backend/ratings/management/commands/export_uat_workbook.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, service-uat-mirror-contract]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Calls `build_uat_workbook_rows()` and writes the calculated KPI rows from saved responses and tracked events to a CSV file ([`Command.handle()`](../../../../backend/ratings/management/commands/export_uat_workbook.py#L8)).

## Prerequisites

Run with the configured Django database and ratings application available ([command imports and handler](../../../../backend/ratings/management/commands/export_uat_workbook.py#L1)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py export_uat_workbook
```

## Inputs/Env Vars

Takes no command arguments or command-specific environment variables. Reads UAT data through Django settings and `build_uat_workbook_rows()` ([handler](../../../../backend/ratings/management/commands/export_uat_workbook.py#L8)).

## Outputs & Reports

Writes `fitfusion_uat_results.csv` in the current working directory, with KPI, objective, target, result, sample size, status, evidence reference, numerator, and denominator columns. Prints the number of KPI rows exported ([CSV construction](../../../../backend/ratings/management/commands/export_uat_workbook.py#L11)).

## Exit Codes

No explicit exit code is set. A normal export returns successfully; database, row-generation, or file errors propagate from the command ([`handle()`](../../../../backend/ratings/management/commands/export_uat_workbook.py#L11)).

## Source

- [`backend/ratings/management/commands/export_uat_workbook.py` lines 8–34](../../../../backend/ratings/management/commands/export_uat_workbook.py#L8): command class, row columns, CSV output, and success report.
- [Backend/frontend UAT Mirror Contract](../../backend-logic/services/uat-mirror-contract.md): related UAT question contract.

## Related

- [Backend/frontend UAT Mirror Contract](../../backend-logic/services/uat-mirror-contract.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
