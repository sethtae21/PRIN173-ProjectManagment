# KAN-82 — Isolated Unit Suite Evidence Summary

**Evidence date:** 2026-11-20 (UTC)
**Command:** `C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\.venv\Scripts\python.exe -m coverage run --source=accounts,catalog,commerce,outfits,recommendations,ratings manage.py test accounts catalog commerce outfits recommendations ratings --noinput --verbosity 1`
**Isolation:** local MongoDB on 127.0.0.1:27018; Atlas/network unused; rembg and GridFS patched in test code
**Suite:** accounts,catalog,commerce,outfits,recommendations,ratings

This is the authoritative **2026-11-20** packaged run. The earlier 2026-11-18
KAN-82 run (267 tests, exit 0, 84%; Atlas-backed) is historical evidence only —
retained in `../KAN-82/` and **not** used as a current status source. All current
statuses live in `../TRACEABILITY.md` and this SUMMARY.

| Metric | Measured |
|---|---:|
| Total tests | 284 |
| Passed | 279 |
| Failed | 4 |
| Skipped | 1 |
| Duration (s) | 258.925 (wall clock); 249.436 (runner) |
| `coverage_core_pct` | 86.3% (> 80% target — MET) |
| Overall coverage (all six apps) | 84.74% |
| Process exit code | 1 |

**Targets:** coverage target **MET** (86.3% > 80%). Duration target
**NOT MET** — 249.436 s exceeds the `< 2 min` requirement; recorded as
[GAP-DUR-01](DEFECT_RECORD.md) with no estimation or harness change to mask it.
Isolation removed Atlas network latency (previous Atlas-backed run: 732.216 s).

Core modules measured for `coverage_core_pct`:
- `accounts/serializers/auth_serializers.py`: 97.29729729729729% (108/111 statements)
- `accounts/serializers/preset_serializers.py`: 100.0% (50/50 statements)
- `accounts/validators.py`: 100.0% (10/10 statements)
- `accounts/views/auth_views.py`: 86.16352201257861% (137/159 statements)
- `accounts/views/preset_views.py`: 88.23529411764706% (15/17 statements)
- `catalog/validators.py`: 99.01960784313725% (101/102 statements)
- `catalog/views/core.py`: 82.09150326797386% (628/765 statements)
- `commerce/services.py`: 100.0% (7/7 statements)
- `commerce/views.py`: 80.44692737430168% (144/179 statements)
- `recommendations/scoring.py`: 97.29729729729729% (72/74 statements)

Core threshold from plan §1.2 is **>80%**. Actual measured value is recorded
above; no value was estimated or fabricated.

## Artifacts

- `run-log.txt` — verbatim stdout/stderr of the authoritative run.
- `measurement.json` — machine-readable totals and coverage measurement.
- `coverage-summary.txt` — per-file coverage report.
- `coverage.json`, `coverage.xml`, `htmlcov/index.html` — coverage data/exports.

## Outcome and open defects

STOP ON FAILURE was applied: all four failures were recorded, none were fixed.
Two are application defects exposed by the new test-only files:

- **DEF-UT-14 (P3 – Medium):** backend preset serializer accepts height 221 cm
  although the documented global ceiling is 220 cm.
- **DEF-UT-15 (P2 – High):** `POST /catalog/upload/` does not enforce the
  documented `File must be a CSV` guard (serializer is documentation-only);
  `.xlsx` upload returned 202 and created a batch.

Two are stale assertions in a pre-existing test file (**not** application
defects — the application correctly stores keyed `STORE-`/`MOB-` pseudonyms per
`accounts/pseudonymization.py` and `accounts/tests_archive_retention.py:415`):

- **DEF-TE-01 (P4 – Low):** `ratings.tests_uat_charter.ColdCopyTests`
  (`test_seller_store_identity_is_cleared`, `test_from_user_heals_a_legacy_intact_row`)
  still assert `None` for fields the current contract defines as tokens.

Rationale, severity matrix mapping and authorization requirements:
[`DEFECT_RECORD.md`](DEFECT_RECORD.md). No application or test source was
modified. Full case-to-evidence mapping: [`../TRACEABILITY.md`](../TRACEABILITY.md).
