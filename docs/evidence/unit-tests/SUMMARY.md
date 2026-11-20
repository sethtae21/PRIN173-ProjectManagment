# KAN-82 — Isolated Unit Suite Evidence Summary

**Authoritative run:** 2026-11-20 (UTC), **post-fix** — see `run-log.txt` and
`measurement.json`. The earlier same-day run (4 failures) is retained as
`run1-*` history and described under "Pre-fix history" below. The 2026-11-18
KAN-82 run (267 tests, exit 0, 84%; Atlas-backed) in `../KAN-82/` is historical
evidence only and is **not** used as a current status source. All current
statuses live in [`../TRACEABILITY.md`](../TRACEABILITY.md) and this SUMMARY.

**Command:**
`C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\.venv\Scripts\python.exe -m coverage run --source=accounts,catalog,commerce,outfits,recommendations,ratings manage.py test accounts catalog commerce outfits recommendations ratings --noinput --verbosity 1`

**Isolation:** real local MongoDB 7.0.14 on `127.0.0.1:27018`; Atlas/network DB
unused; rembg and GridFS patched in test code. Serial STOP ON FAILURE retained.
**Suite:** accounts,catalog,commerce,outfits,recommendations,ratings.

| Metric | Measured |
|---|---:|
| Total tests | 284 |
| Passed | 283 |
| Failed | 0 |
| Skipped | 1 |
| Runner duration (s) | 277.860 |
| Wall-clock duration (s, `measurement.json`) | 290.636 |
| `coverage_core_pct` | 86.34% (> 80% target — MET) |
| Overall coverage (all six apps) | 84.83374950716257% |
| Process exit code | 0 |

Core modules measured for `coverage_core_pct`:
- `accounts/serializers/auth_serializers.py`: 97.29729729729729% (108/111 statements)
- `accounts/serializers/preset_serializers.py`: 100.0% (50/50 statements)
- `accounts/validators.py`: 100.0% (10/10 statements)
- `accounts/views/auth_views.py`: 86.16352201257861% (137/159 statements)
- `accounts/views/preset_views.py`: 88.23529411764706% (15/17 statements)
- `catalog/validators.py`: 99.01960784313725% (101/102 statements)
- `catalog/views/core.py`: 82.20779220779221% (633/770 statements)
- `commerce/services.py`: 100.0% (7/7 statements)
- `commerce/views.py`: 80.44692737430168% (144/179 statements)
- `recommendations/scoring.py`: 97.29729729729729% (72/74 statements)

Core threshold from plan §1.2 is **>80%**. Actual measured value is recorded
above; no value was estimated or fabricated.

## Post-fix outcome

The authorized fixes were applied in commit `98d988e7a1b07c36d71b422d9ee40eab1ef9b02e`
(`98d988e`). With those changes the full isolated suite completes with
**zero failures** (1 pre-existing skip). Per the approved regression gate:

1. Unit suite above — PASS (284 total / 283 passed / 0 failed / 1 skipped).
2. SEL suite — 19/19 PASS against the lean staging proxy:
   [`../regression-gates/SEL-19-pass.log`](../regression-gates/SEL-19-pass.log).
3. AV suite — 11/11 PASS:
   [`../regression-gates/AV-11-pass.log`](../regression-gates/AV-11-pass.log).

Details, original severities and gate links are in
[`DEFECT_RECORD.md`](DEFECT_RECORD.md).

## Pre-fix history (superseded)

`run1-run-log.txt`, `run1-measurement.json`, `run1-SUMMARY.md` and
`run1-coverage-summary.txt` preserve the first 2026-11-20
run: 284 tests / 279 passed / 4 failed / 1 skipped, runner 249.436 s,
wall 258.925 s, core coverage 86.3%, exit 1. The four failures were
DEF-UT-14, DEF-UT-15 and the two DEF-TE-01 stale assertions; all are now fixed
as described above. This run is **not** the current status source.

## Open gap

**GAP-DUR-01** — the `< 2 min` unit-suite target is still missed: 277.860 s
runner / 290.636 s wall clock. No threshold was relaxed and no parallelisation
or masking was introduced. See [`DEFECT_RECORD.md`](DEFECT_RECORD.md).

## Artifacts

- `run-log.txt` — verbatim stdout/stderr of the authoritative post-fix run.
- `measurement.json` — machine-readable totals and coverage measurement.
- `coverage-summary.txt` — per-file coverage report.
- `coverage.json`, `coverage.xml`, `htmlcov/index.html` — coverage data/exports.
- `DEFECT_RECORD.md` — defect classification, fixes, gate evidence and gaps.
