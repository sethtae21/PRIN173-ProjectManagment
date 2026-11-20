**Verification evidence — KAN-82 (1.4.1 Unit & Integration Testing)**

- Requirement: 1.4.1 Unit & Integration Testing
- Method: coverage run over accounts, catalog, commerce, outfits, recommendations, ratings
- Historical result (2026-11-18): PASS — 267 tests exit 0, 1 skipped; overall 84% coverage; every core file 82–100%
- Current result (2026-11-20, authoritative post-fix): PASS — 284 tests, 283 passed, 0 failed, 1 skipped, exit 0; core coverage 86.34% (>80% target MET)
- Tests proving this ticket: 284 tests across 6 suites
- Test-only additions for UT-08, UT-13, UT-14, UT-15
- Isolation: real local MongoDB 7.0.14 on 127.0.0.1:27018; Atlas/network DB unused; rembg/GridFS patched
- Commits: `64614ab` (2026-11-18 historical run), `98d988e7a1b07c36d71b422d9ee40eab1ef9b02e` (`98d988e`, fixes)
- Verified: 2026-11-20

**Defect and fix log (original severity classifications retained)**

| ID | Severity | Disposition | Fix / verification |
|---|---|---|---|
| DEF-UT-14 | P3 – Medium | FIXED | `AvatarPresetSerializer` height bound 230→220 cm (120–220 cm, Body Build 86–112 cm unchanged); unit suite 0 failures + AV 11/11 PASS (`regression-gates/AV-11-pass.log`). |
| DEF-UT-15 | P2 – High | FIXED | `POST /catalog/upload/` now invokes `CSVUploadSerializer.validate_csv_file`; `.xlsx/.xls/.ods` → 400 `File must be a CSV.` with no batch; valid `.csv` path unchanged; unit suite 0 failures + SEL 19/19 PASS (`regression-gates/SEL-19-pass.log`). |
| DEF-TE-01 | P4 – Low (test-only) | FIXED | Two `ratings.tests_uat_charter.ColdCopyTests` assertions updated from nulls to keyed `STORE-`/`MOB-` tokens; application behaviour not changed; unit suite 0 failures. |

All fixes are in commit `98d988e`. Pre-fix evidence is retained as
`docs/evidence/unit-tests/run1-*` and is not a current status source.

- Artifact: docs/evidence/KAN-82/COVERAGE_SUMMARY.md; docs/evidence/KAN-82/coverage.xml; docs/evidence/KAN-82/20261118T135032Z-six-suites-coverage-final.log; docs/evidence/KAN-82/20261118T140756Z-playwright-evidence-screens.log; docs/evidence/KAN-82/JIRA_COMMENT.md; docs/evidence/unit-tests/SUMMARY.md; docs/evidence/unit-tests/run-log.txt; docs/evidence/unit-tests/measurement.json; docs/evidence/unit-tests/DEFECT_RECORD.md; docs/evidence/TRACEABILITY.md; docs/evidence/regression-gates/SUMMARY.md; docs/evidence/regression-gates/SEL-19-pass.log; docs/evidence/regression-gates/AV-11-pass.log

- Limitations: GAP-DUR-01 — suite duration 277.860 s runner / 290.636 s wall exceeds the <2 min target; no threshold relaxed. Live participant UAT tracked separately under KAN-87/88/89; Criteria 9–11 statistical KPIs post-deployment.
