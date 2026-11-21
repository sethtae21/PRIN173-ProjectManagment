---
id: script-command-dedupe-fitting-surveys
title: Deduplicate Fitting Studio Surveys
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/dedupe_fitting_surveys.py, backend/accounts/survey_dedupe.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Invokes `dedupe_fitting_studio_surveys` to merge duplicate survey rows keyed by `(user, session_id)`. The newest row is retained; null payload fields may be filled from older duplicates before deletion. Without `--apply`, the helper computes preview statistics without saving or deleting ([command](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L15), [helper](../../../../backend/accounts/survey_dedupe.py#L49)).

## Prerequisites

The configured Django database must be available. Review the preview before applying changes; application mode writes merged values and deletes duplicate rows ([helper contract](../../../../backend/accounts/survey_dedupe.py#L49)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py dedupe_fitting_surveys
python .\manage.py dedupe_fitting_surveys --apply
```

## Inputs/Env Vars

Uses Django's configured database and accepts `--apply`; there are no command-specific environment variables ([arguments](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L18)).

## Outputs & Reports

Prints `PREVIEW` or `APPLIED` plus the helper summary (`scanned`, `duplicate_groups`, `merged_fields`, `deleted`, and `applied`) ([handler](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L22), [stats](../../../../backend/accounts/survey_dedupe.py#L55)).

## Exit Codes

Successful preview/application returns normally. A `ValueError` from the helper is converted to Django `CommandError`, which makes the management command fail ([handler](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L22)).

## Source

- [`backend/accounts/management/commands/dedupe_fitting_surveys.py` lines 15–28](../../../../backend/accounts/management/commands/dedupe_fitting_surveys.py#L15): command arguments and `handle()`.
- [`backend/accounts/survey_dedupe.py` lines 49–94](../../../../backend/accounts/survey_dedupe.py#L49): merge ordering, preservation, and apply/preview behavior.

## Related

- No sibling script dependency is documented.

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
