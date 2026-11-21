---
id: script-command-clean-legacy-survey-fields
title: Clean Legacy Survey and Rating Fields
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/clean_legacy_survey_fields.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Scans raw MongoDB documents in `accounts_user`, `accounts_fittingstudiosurvey`, and `accounts_rating`, recursively removing legacy `fit_like_dislike`, `vote`, and `user_type` keys. Default mode is preview-only. An optional untagged-rating purge lists rows with a blank/unsupported source and deletes them only when combined with `--apply` ([`Command.handle()`](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L93)).

## Prerequisites

Django project settings and MongoDB access; write permission is required for `--apply`. The database name is fixed as `fitfusion` in the command ([connection and collection list](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L16)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py clean_legacy_survey_fields
python .\manage.py clean_legacy_survey_fields --apply
python .\manage.py clean_legacy_survey_fields --apply --purge-untagged-ratings
```

## Inputs/Env Vars

- Django setting `MONGODB_URI` supplies the raw MongoDB connection.
- `--apply` enables writes; without it, keys are only counted/reported.
- `--purge-untagged-ratings` adds the unsupported-source rating scan; deletion requires both flags ([arguments and handler](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L78)).

## Outputs & Reports

Prints per-collection key/document counts and a final summary. Purge mode lists matching rating identifiers and reports how many would be or were deleted ([handler](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L93)).

## Exit Codes

No explicit exit code is set. If `MONGODB_URI` is missing, the command prints an error and returns without raising; normal completion also returns normally. Database exceptions are not converted to a command-specific status ([missing-setting and command flow](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L93)).

## Source

- [`backend/accounts/management/commands/clean_legacy_survey_fields.py` lines 16–168](../../../../backend/accounts/management/commands/clean_legacy_survey_fields.py#L16): collections, recursive stripping, arguments, and `Command.handle()`.

## Related

- No sibling script dependency is documented.

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
