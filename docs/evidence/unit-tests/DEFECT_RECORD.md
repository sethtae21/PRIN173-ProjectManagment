# Defect Record — Unit evidence gaps closure (KAN-82)

**Date:** 2026-11-20 (UTC)
**Policy:** STOP ON FAILURE. Severity classification follows Software Testing &
QA Plan §6 (Defect Management & Severity Matrix). The initial run exposed two
application defects via new **test-only** files
(`backend/accounts/tests_ut14_guardrails.py`, `backend/catalog/tests_ut_cases.py`)
plus two stale assertions in a pre-existing test file (test defects, not
application defects). No fix was applied until explicitly authorized. The
authorized fixes were applied in commit
`98d988e7a1b07c36d71b422d9ee40eab1ef9b02e` (`98d988e`) and verified by the
regression gates linked below. Original severities are unchanged.

**Authoritative run (post-fix):** 284 tests / 283 passed / 0 failed / 1 skipped /
277.860 s (runner) — [`run-log.txt`](run-log.txt),
[`measurement.json`](measurement.json).
**Pre-fix run (superseded):** 284 tests / 279 passed / 4 failed / 1 skipped /
249.436 s (runner) — [`run1-run-log.txt`](run1-run-log.txt),
[`run1-measurement.json`](run1-measurement.json).

---

## DEF-UT-14 — Backend accepts avatar height above the documented 220 cm ceiling

| Field | Value |
|---|---|
| Severity | **P3 – Medium** |
| Definition match | Minor/defensive validation bug; core functionality unaffected. UI path is already bounded (Fitting Studio height control) and no data loss, RBAC bypass or security breach occurs. |
| Response window | Next planning cycle |
| Resolution target | Within current sprint (authorized 2026-11-20) |
| Status | **FIXED** — commit `98d988e` (original P3 severity retained) |

**Failing assertion (UT-14, backend portion):**
```
accounts.tests_ut14_guardrails.UT14BackendGlobalRangeTests.test_ut14_backend_rejects_height_beyond_220
AssertionError: True is not false
```

**Observed:** `AvatarPresetSerializer` validates `120 <= height <= 230`
(`backend/accounts/serializers/preset_serializers.py:63`), so a preset with
`height=221` is accepted. Scope Baseline §1.2 and plan §3.3/UT-14 specify the
global supported range **120–220 cm** (`120/220` boundary cases are also named
in plan §3.2 rule 2). There is no other server-side 220 cm guard in the
request path (`accounts/views/preset_views.py` uses this serializer directly).

**Expected:** `height=221` rejected with a descriptive range error.

**Impact:** API-level clients can persist an avatar height outside the
validated design range; the normal UI path is unaffected because the client
control is capped. Frontend/size-compatible control stop and allowed-range
message are covered separately by AV-011 E2E evidence
(`../avatar-tests/AV-011/`), not by this unit case.

**Fix (authorized):** `validate_height` now enforces `120 <= height <= 220`
with message `Height must be between 120 and 220 cm.`; Body Build remains
86–112 cm. Regression assertion retained in `tests_ut14_guardrails.py`.

**Fix verification:** post-fix unit suite 0 failures (`run-log.txt`);
AV suite 11/11 PASS with AV-002 (height out of range) and AV-010 (boundary
limits) — [`../regression-gates/AV-11-pass.log`](../regression-gates/AV-11-pass.log).

---

## DEF-UT-15 — Upload endpoint does not enforce the documented "File must be a CSV" guard

| Field | Value |
|---|---|
| Severity | **P2 – High** |
| Definition match | Major feature/defensive control broken with a partial client-side workaround (`accept=".csv,text/csv"` in `SellerCatalogUploadPage.jsx:1051`). No data loss or security breach. |
| Response window | < 4 hours |
| Resolution target | Within current sprint (authorized 2026-11-20) |
| Status | **FIXED** — commit `98d988e` (original P2 severity retained) |

**Failing assertion (UT-15, endpoint portion):**
```
catalog.tests_ut_cases.UT15CSVFileTypeGuardTests.test_ut15_upload_endpoint_rejects_spreadsheet_and_creates_no_batch
AssertionError: 202 != 400
```

**Observed:** Posting `items.xlsx` (CSV-shaped content, spreadsheet extension)
to `POST /catalog/upload/` returns **202 Accepted** and creates an
`UploadBatch`. The guard string exists in
`CSVUploadSerializer.validate_csv_file()`
(`backend/catalog/serializers.py:64-66`), but that serializer is referenced
only in the endpoint's `@extend_schema` request documentation
(`backend/catalog/views/core.py:797`); the view reads `request.FILES`
directly and never invokes serializer validation. A binary `.xlsx`/`.xls`/
`.ods` payload may additionally fail at `csv_file.read().decode('utf-8')`
with an unhandled decode error.

**Expected:** HTTP 400 containing `File must be a CSV` and no batch created.

**Passing sub-case:** the serializer-level guard itself is correct —
`test_ut15_serializer_rejects_spreadsheet_extensions` PASSES for `.xlsx`,
`.xls` and `.ods`. The gap is endpoint enforcement only.

**Fix (authorized):** `CatalogViewSet.upload` now calls
`CSVUploadSerializer().validate_csv_file(csv_file)` before reading image files
or creating an `UploadBatch`; a `ValidationError` is returned as HTTP 400 with
`File must be a CSV.` The valid `.csv` multipart path is unchanged.

**Fix verification:** post-fix unit suite 0 failures (`run-log.txt`);
SEL suite 19/19 PASS including SEL-018 (non-CSV rejected, no batch) —
[`../regression-gates/SEL-19-pass.log`](../regression-gates/SEL-19-pass.log).

---

## DEF-TE-01 — Stale `assertIsNone` expectations in ratings cold-copy tests (test defect, NOT an application defect)

| Field | Value |
|---|---|
| Severity | **P4 – Low** (test-only; no product impact) |
| Definition match | Existing test assertions were not updated when the documented pseudonym contract changed from nulls to keyed tokens. Application behaviour is correct and is independently verified by `accounts/tests_archive_retention.py:13-15,415`. |
| Response window | Next planning cycle |
| Resolution target | Updated to the token contract 2026-11-20 (authorized) |
| Status | **FIXED (test-only)** — commit `98d988e` (original P4 severity retained) |

**Failing assertions (pre-existing file `backend/ratings/tests_uat_charter.py`):**
```
ratings.tests_uat_charter.ColdCopyTests.test_seller_store_identity_is_cleared
AssertionError: 'STORE-…' is not None

ratings.tests_uat_charter.ColdCopyTests.test_from_user_heals_a_legacy_intact_row
AssertionError: 'MOB-…' is not None
```

**Observed:** `ArchivedUser.from_user()` correctly stores field-specific keyed
pseudonyms (`STORE-<32hex>`, `MOB-<32hex>`). `accounts/pseudonymization.py:14-26`
explicitly specifies "tokenized identifiers — no placeholders, no nulls" and
`store_name -> STORE-<field token> (tokenized for ALL roles, never null)`.
`accounts/tests_archive_retention.py:415` confirms "must become a STORE- token
(not null, not the original)". No direct identifier is retained, so FR-1.4 is
satisfied. The two ratings tests still expect `None` from the superseded
null-the-fields scheme.

**Verification:** both tests were re-run alone against a fresh test database
(`ratings.tests_uat_charter.ColdCopyTests`) and failed identically — not a
test-order or isolation artefact.

**Fix (authorized, test-only):** both assertions now compare the cold-copy
fields with `pseudonymous_profile_fields(str(user.pk), role=...)` and assert
the original store/mobile values are absent. No application change was needed.

**Fix verification:** post-fix unit suite 0 failures (`run-log.txt`);
`ratings.tests_uat_charter.ColdCopyTests` passes in the full run.

---

## GAP-DUR-01 — Suite duration exceeds the < 2 minute requirement (process gap, not a defect)

| Field | Value |
|---|---|
| Requirement | Unit suite `< 2 min` (Software Testing & QA Plan / KAN-82 packaging rule) |
| Actual | **277.860 s** (runner) / **290.636 s** (wall clock incl. coverage startup) in the authoritative post-fix `measurement.json`; pre-fix run: 249.436 s / 258.925 s |
| Disposition | **GAP — recorded, not estimated away; target not relaxed** |

Isolation removed Atlas network latency (prior Atlas-backed run: 732.216 s),
but the 284-test suite with image processing and coverage instrumentation still
exceeds the 120 s target. No application, test or harness change was made to
mask this. Parallelisation was not introduced because the plan requires serial
STOP-ON-FAILURE execution. Coverage target **was met**: `coverage_core_pct` =
**86.34%** (> 80%), with per-file values in `measurement.json` and
`coverage-summary.txt`.

---

## Regression gate summary (post-fix, in approved order)

| Gate | Command | Result | Evidence |
|---|---|---|---|
| 1. Full unit suite | `python -m coverage run ... manage.py test accounts catalog commerce outfits recommendations ratings` | 284 total / 283 passed / 0 failed / 1 skipped, exit 0 | [`run-log.txt`](run-log.txt), [`measurement.json`](measurement.json) |
| 2. SEL suite | `npx playwright test e2e/seller-tests.spec.ts --reporter=line --workers=1` | 19/19 passed | [`../regression-gates/SEL-19-pass.log`](../regression-gates/SEL-19-pass.log) |
| 3. AV suite | `npx playwright test e2e/avatar-tests.spec.ts --reporter=line --workers=1` | 11/11 passed | [`../regression-gates/AV-11-pass.log`](../regression-gates/AV-11-pass.log) |

All three fixes are in commit `98d988e7a1b07c36d71b422d9ee40eab1ef9b02e`.
Gates 2 and 3 ran on the lean staging proxy (`https://localhost:8443` →
Waitress `:8000` → local MongoDB `:27018`), with build and environment details
in [`../regression-gates/SUMMARY.md`](../regression-gates/SUMMARY.md).

---

## Not defects (isolated infrastructure attempts)

The first isolation experiment used `mongomock` behind `django-mongodb-backend`.
It produced 7 failures / 64 errors (unsupported aggregation stages and
collection APIs) and took 275 s. Those results are **not** application defects
and are retained only as a rejected infrastructure probe in the run notes; the
authoritative packaged unit run uses a real local MongoDB instance with no
Atlas/network access.
