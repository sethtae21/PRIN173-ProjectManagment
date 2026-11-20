# Traceability Crosswalk — Plan Cases → Evidence → Criteria

**Project:** FitFusion AI — Virtual Try-On & Outfit Simulation System
**Plan reference:** Software Testing & QA Plan v1.0 (2026-10-23), §3.3 / §4.3 / §5.3
**Evidence date:** 2026-11-20 (UTC)
**Status source:** This file and evidence SUMMARYs only — the baselined Testing Plan is not edited.
**Authoritative unit run:** [`unit-tests/measurement.json`](unit-tests/measurement.json), [`unit-tests/run-log.txt`](unit-tests/run-log.txt)
**Criteria attainment source:** [`method-of-measurement/SUMMARY.md`](method-of-measurement/SUMMARY.md) §4 (MOM SUMMARY)

## Status legend

- **PASS** — evidenced by a passing packaged run / retained evidence artifact. "PASS (this run)" means the case passed in the authoritative post-fix `unit-tests/run-log.txt`.
- **PASS post-fix** — failed in the pre-fix run, fixed under explicit authorization (commit `98d988e`) and passing in the authoritative post-fix run; see [`unit-tests/DEFECT_RECORD.md`](unit-tests/DEFECT_RECORD.md).
- **OPEN DEFECT / STALE TEST** — historic pre-fix states only. Both application defects (DEF-UT-14, DEF-UT-15) and the stale assertions (DEF-TE-01) are now FIXED; original severity classifications remain in `unit-tests/DEFECT_RECORD.md`.
- **Functional PASS; KPI deferred** — Semester 1 functional check passes; statistical KPI is post-deployment per plan §1.2/§5.2.
- **PENDING SIGN-OFF** — walkthrough pack prepared; live observation/signature collected at defense.

---

## 1. Unit cases UT-01 … UT-15

| Case | Plan target | Evidence | Status | Criteria 1–11 attainment (MOM SUMMARY) |
|---|---|---|---|---|
| UT-01 | `recommendations/scoring.score_item` — total 7, deterministic order | `unit-tests/run-log.txt`; KAN-103 (`KAN-103/`, `_runs/20261117T095514Z-recommendations.log`) | PASS | Criteria 10 (match reasons/score audit) |
| UT-02 | Scoring weights ±1 sensitivity | `unit-tests/run-log.txt`; KAN-103 | PASS | Criteria 10 |
| UT-03 | Recommendation endpoint input hardening | `unit-tests/run-log.txt`; KAN-117 | PASS | Criteria 1, 10 |
| UT-04 | Image < 800×800 / > 5 MB rejection | `unit-tests/run-log.txt`; KAN-64 | PASS | Criteria 4, 5 |
| UT-05 | Opaque PNG / alpha-channel rejection | `unit-tests/run-log.txt`; KAN-64 | PASS | Criteria 4, 5 |
| UT-06 | CSV→image filename mapping rejection | `unit-tests/run-log.txt`; KAN-64 | PASS | Criteria 4, 5 |
| UT-07 | Image–text colour mismatch rejection | `unit-tests/run-log.txt`; KAN-64; SEL-006 | PASS | Criteria 5 |
| UT-08 | `color_family="red"` → palette tags from knowledge table | [`unit-tests/run-log.txt`](unit-tests/run-log.txt) (`catalog.tests_ut_cases.UT08PaletteDerivationTests`); KAN-86; SEL-017 | **PASS (this run)** | Criteria 5, 10 |
| UT-09 | Preset height/Body Build out-of-range rejection | `unit-tests/run-log.txt`; KAN-58 | PASS | Criteria 6, 7 |
| UT-10 | Cup size female-only guard | `unit-tests/run-log.txt`; KAN-58 | PASS | Criteria 6, 7 |
| UT-11 | Commerce RBAC / owner-only reads | `unit-tests/run-log.txt`; KAN-118 | PASS | Criteria 7, 8 |
| UT-12 | Mock gateway decline → no order, cart intact | `unit-tests/run-log.txt`; KAN-118 | PASS | Criteria 8 |
| UT-13 | Replace image + delete listing → old GridFS ObjectIds absent from `fs.files`/`fs.chunks` | [`unit-tests/run-log.txt`](unit-tests/run-log.txt) (`catalog.tests_ut_cases.UT13GridFSCleanupTests`); KAN-119 | **PASS (this run)** | Criteria 4, 5 |
| UT-14 | Size-compatible guardrails: UI cap + message (AV-011 E2E) and backend global 120–220 / 86–112 | UI portion: [`avatar-tests/AV-011/`](avatar-tests/AV-011/); backend portion: [`unit-tests/run-log.txt`](unit-tests/run-log.txt) (`accounts.tests_ut14_guardrails`); [`regression-gates/AV-11-pass.log`](regression-gates/AV-11-pass.log) | **PASS post-fix** (DEF-UT-14 fixed in `98d988e`; UI portion PASS) | Criteria 6, 7 |
| UT-15 | Spreadsheet upload → "File must be a CSV", no batch | [`unit-tests/run-log.txt`](unit-tests/run-log.txt) (`catalog.tests_ut_cases.UT15CSVFileTypeGuardTests`); SEL-018; [`regression-gates/SEL-19-pass.log`](regression-gates/SEL-19-pass.log) | **PASS post-fix** (DEF-UT-15 fixed in `98d988e`; serializer guard and endpoint both pass) | Criteria 4, 5 |

**Unit suite scope note:** the authoritative run covers `accounts, catalog,
commerce, outfits, recommendations, ratings` against a real local MongoDB
(7.0.14 on 127.0.0.1:27018) with mocks/fakes for GridFS and rembg — no Atlas or
network database access. Authoritative post-fix result: **284 tests / 283 passed
/ 0 failed / 1 skipped**, exit 0; coverage core = **86.34%** (target >80% MET),
duration **277.860 s** runner / **290.636 s** wall (target <2 min NOT MET —
GAP-DUR-01). Ten core modules were measured; full per-file values are in
`unit-tests/measurement.json` and `unit-tests/coverage-summary.txt`. No value
is estimated. The pre-fix run (284 / 279 / 4 / 1, 86.3%, 249.436 s) is retained
as `unit-tests/run1-*` history; its four failures were DEF-UT-14, DEF-UT-15 and
the two DEF-TE-01 stale assertions. All are fixed in commit `98d988e`; see
`unit-tests/DEFECT_RECORD.md` and the gate logs in `regression-gates/`.

---

## 2. End-to-end cases E2E-01 … E2E-12

| Case | Plan scenario | Required evidence crosswalk | Status | Criteria 1–11 attainment (MOM SUMMARY) |
|---|---|---|---|---|
| E2E-01 | Guest first try-on | MOM-04 (`method-of-measurement/MOM-04/`); AM-012, AM-015 (`account-tests/`) | PASS | Criterion 6 PASS (2.40 s) |
| E2E-02 | Registration, login, preset persistence | AM-001, AM-002 (`account-tests/`); AV presets AV-005–AV-008 (`avatar-tests/`) | PASS | Criteria 6, 7 |
| E2E-03 | Seller upload happy path | SEL-001…SEL-005, SEL-014, SEL-015 (`seller-tests/`) | PASS | Criteria 4 PASS (4.48 s), 5 PASS (10/10) |
| E2E-04 | Rejection → fix → republish | SEL rejection cases SEL-003…SEL-008, SEL-011, SEL-012 (`seller-tests/`); UT-13 (`unit-tests/run-log.txt`) | PASS | Criteria 4, 5 |
| E2E-05 | Cart → mock checkout → order history | EC-001…EC-009 (`ecommerce-tests/`) | PASS | Criterion 8 functional PASS; population KPI deferred |
| E2E-06 | RBAC negative paths | AM-012, AM-013, AM-015 (`account-tests/`); EC-002 (`ecommerce-tests/`); CAT-008 (`catalog-tests/`) | PASS | Criterion 7 PASS |
| E2E-07 | Recommendations, match reasons, in-app ratings | REC-001…REC-007 (`rec-tests/`) | Functional PASS; approval KPI deferred | Criteria 9, 10 functional PASS; KPI deferred |
| E2E-08 | Canvas performance | MOM-02 (`method-of-measurement/MOM-02/`); TO-001…TO-006 (`tryon-tests/`) | PASS | Criterion 2 PASS (299 ms worst) |
| E2E-09 | API performance sweep | EC-011 (`ecommerce-tests/`); MOM-01 | PASS | Criterion 1 PASS (406 ms worst p95) |
| E2E-10 | Account deletion / RA 10173 | AM-010 (`account-tests/`) | PASS | Criterion 7 PASS |
| E2E-11 | Saved outfit CRUD | TO-007…TO-010 (`tryon-tests/`) | PASS | Criteria 6, 8 supporting |
| E2E-12 | Catalog browsing, filters, Store page | CAT-001…CAT-009 (`catalog-tests/`) | PASS | Criteria 1, 5 supporting |

---

## 3. UAT cases UAT-01 … UAT-07

| Case | Plan walkthrough | Required evidence crosswalk | Status | Criteria 1–11 attainment (MOM SUMMARY) |
|---|---|---|---|---|
| UAT-01 | Guest try-on ≤ 2 min | MOM-04 (`method-of-measurement/MOM-04/`); walkthrough `uat-pack/UAT-WALKTHROUGH.md` | PENDING SIGN-OFF | Criterion 6 PASS |
| UAT-02 | Fit-accuracy comparison + Fit-Accuracy Rating | EC-006 (`ecommerce-tests/`); MOM-08 (`method-of-measurement/MOM-08/`) | PENDING SIGN-OFF | Criterion 9 functional PASS; KPI deferred |
| UAT-03 | Recommendation trust / rating control | REC-002, REC-004, REC-005 (`rec-tests/`) | PENDING SIGN-OFF | Criterion 10 functional PASS; KPI deferred |
| UAT-04 | Purchase-decision confidence prompts | EC-006 (`ecommerce-tests/`); MOM-08 | PENDING SIGN-OFF | Criterion 11 functional PASS; KPI deferred |
| UAT-05 | Seller 10-item CSV upload | SEL-014, SEL-015 (`seller-tests/`) | PENDING SIGN-OFF | Criteria 4, 5 PASS |
| UAT-06 | End-to-end mock purchase | EC-006, EC-007 (`ecommerce-tests/`); MOM-08 | PENDING SIGN-OFF | Criterion 8 functional PASS; population KPI deferred |
| UAT-07 | Security & privacy walkthrough | AM-010…AM-015 (`account-tests/`); MOM-05 (`method-of-measurement/MOM-05/`) | PENDING SIGN-OFF | Criterion 7 PASS |

UAT execution model, steps, business expectations and blank sign-off lines are
in [`uat-pack/UAT-WALKTHROUGH.md`](uat-pack/UAT-WALKTHROUGH.md) and
[`uat-pack/UAT-SIGNOFF-FORM.md`](uat-pack/UAT-SIGNOFF-FORM.md). No participant
data is fabricated. Criteria 9–11 statistical KPIs remain post-deployment.

---

## 4. Outstanding items and plan status

| Item | Disposition |
|---|---|
| KAN-82 / packaged unit evidence | Authoritative post-fix suite under `unit-tests/`: 284 / 283 passed / 0 failed / 1 skipped; coverage target MET (86.34%); duration target NOT MET (277.860 s runner / 290.636 s wall — GAP-DUR-01). Pre-fix run retained as `unit-tests/run1-*`. |
| UT-14 backend global height ceiling | **FIXED (P3, DEF-UT-14)** — serializer bound 230→220 cm in commit `98d988e`; unit suite 0 failures and AV 11/11 PASS. |
| UT-15 endpoint CSV extension guard | **FIXED (P2, DEF-UT-15)** — `CSVUploadSerializer` guard invoked in upload view in commit `98d988e`; unit suite 0 failures and SEL 19/19 PASS. |
| Stale ratings cold-copy assertions | **FIXED (P4 test-only, DEF-TE-01)** — assertions aligned to keyed `STORE-`/`MOB-` token contract in commit `98d988e`; application behaviour unchanged. |
| Regression gates | All three green in approved order: unit 0 failures; SEL 19/19; AV 11/11 — [`regression-gates/SUMMARY.md`](regression-gates/SUMMARY.md). |
| KAN-87/88/89 UAT walkthrough pack | Pack prepared (this crosswalk + `uat-pack/`); live panel observation and signatures at defense. |
| Criteria 9–11 statistical KPIs | Post-deployment per plan §1.2/§5.2; not claimed as attained in Semester 1. |
| Severity matrix | Plan §6; defect severity rationale in `unit-tests/DEFECT_RECORD.md`. |
