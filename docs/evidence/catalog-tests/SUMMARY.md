# Catalog & Browsing (CAT) Test Execution Summary

**Run date:** 2026-11-19 (UTC) — final clean run, all 9 cases in one serial pass  
**Test source:** `docs/Test Cases/FitFusionAI - Test Cases - CAT — Catalog & Browsing.csv`  
**Automation:** `frontend/e2e/catalog-tests.spec.ts` (Playwright, serial mode, STOP ON FAILURE)  
**Targets:** frontend `https://localhost:8443`, API `http://127.0.0.1:8000`  
**Command:** `npx playwright test e2e/catalog-tests.spec.ts` → **9 passed (1.4m)**

| Metric | Count |
| --- | ---: |
| Total tests | 9 |
| Passed | 9 |
| Failed | 0 |
| Not Run | 0 |

## Results

Ordered by CSV execution sequence.

| Test ID | Case | Status | Evidence |
| --- | --- | --- | --- |
| Catalog - 001 | Browse catalog — items, images, metadata | **PASS** | [CAT-001](CAT-001/) |
| Catalog - 002 | Filter catalog — category, size, price (KAN-120) | **PASS** | [CAT-002](CAT-002/) |
| Catalog - 003 | No-match message and clear-filters option | **PASS** | [CAT-003](CAT-003/) |
| Catalog - 004 | View item details | **PASS** | [CAT-004](CAT-004/) |
| Catalog - 005 | Per-seller store page | **PASS** | [CAT-005](CAT-005/) |
| Catalog - 006 | Empty catalog | **PASS** | [CAT-006](CAT-006/) |
| Catalog - 007 | Guest read-only access | **PASS** | [CAT-007](CAT-007/) |
| Catalog - 008 | Upload restriction | **PASS** | [CAT-008](CAT-008/) |
| Catalog - 009 | Cross-seller isolation | **PASS** | [CAT-009](CAT-009/) |

## Approved assertion adjustments

- **CAT-003 / CAT-006** — the CSV quotes `"No items match your filters"` and
  `"No items available"`. The UI renders the equivalent empty state
  `"No products found" / "Try another search term or clear your filters."` with
  a `Clear All Filters` button. Per approval, the assertions now accept either
  the CSV wording or the implemented wording. No application code was changed.
  Both cases still assert the empty state and the clear-filters action itself.
- **Colour filter** — colour/style parameters were deprecated under KAN-120;
  no colour-filter UI test was written. CAT-002 covers the three supported
  filters: Category, Size and Price.

## Key observations per case

| Test ID | Observed result |
| --- | --- |
| CAT-001 | 50 active API listings, 50 rendered cards; name, `₱2,499` price, store link and image/placeholder present. |
| CAT-002 | `tops` → 13 items, size `S` → 5 items, both matching API. KAN-120: `price_asc` starts ₱599, `price_desc` ₱2,499, `min_price=1000&max_price=2000` → 21 inclusive matches, invalid `sort` and `min_price > max_price` → HTTP 400. |
| CAT-003 | `tops` + `S` gives zero API matches; empty state and `Clear All Filters` shown; clearing restores the grid. |
| CAT-004 | `Navy Formal Blazer` detail page: name, description, price, store, metadata card, and front + rear image views. |
| CAT-005 | Store link from item detail → `/shopper/sellers/<id>`; 49 cards, all owned by `seth storeeee`, no foreign items. |
| CAT-006 | Catalog API stubbed to `[]` via Playwright route interception (no DB/app mutation); empty state displayed. |
| CAT-007 | Fresh guest context: 50 items browsable, filterable (`Dresses` + `S`), cart reads `Register to Add to Cart`, store link opens the registration gate. |
| CAT-008 | No upload UI for a shopper; `/seller/catalog-upload` redirects to `/shopper/dashboard`; `POST /catalog/upload/` → 403 with token, 401 anonymous. |
| CAT-009 | `seth storeeee` (49 items) and `Seed Store cbd72b57` (1 item) store pages show only their own listings. |

## Verification notes

- Every `CAT-XXX/` folder contains full-page screenshots plus `test-log.json`
  with `test_id`, `status: "PASS"`, `timestamp`, and `duration`. Stale
  `failure.png` files from earlier runs were removed.
- STOP ON FAILURE remained in force: the describe is `serial`; the first run
  genuinely stopped at CAT-003 and skipped all later cases until the approved
  assertion adjustment.
- No backend or frontend application source was modified. Changes were limited
  to `frontend/e2e/catalog-tests.spec.ts`, `docs/evidence/catalog-tests/**`,
  and the Status/Evidence Link cells of the CAT CSV.
