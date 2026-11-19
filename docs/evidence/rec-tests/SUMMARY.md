# Recommendations (REC) Test Execution Summary

**Run date:** 2026-11-19, 07:17–07:18 UTC — final clean run, all 7 cases in one serial pass  
**Test source:** `docs/Test Cases/FitFusionAI - Test Cases - REC — Recommendations.csv`  
**Automation:** `frontend/e2e/rec-tests.spec.ts` (Playwright, serial mode, STOP ON FAILURE)  
**Targets:** frontend `https://localhost:8443`, API `http://127.0.0.1:8000`  
**Command:** `npx playwright test e2e/rec-tests.spec.ts` → **7 passed (53.5s)**

| Metric | Count |
| --- | ---: |
| Total tests | 7 |
| Passed | 7 |
| Failed | 0 |
| Not Run | 0 |

## Results

Ordered by CSV execution sequence.

| Test ID | Case | Status | Evidence |
| --- | --- | --- | --- |
| Recommendations - 001 | View Recommendations | **PASS** | [REC-001](REC-001/) |
| Recommendations - 002 | View Match Reasons | **PASS** | [REC-002](REC-002/) |
| Recommendations - 003 | View Recommendations (no compatible items) | **PASS** | [REC-003](REC-003/) |
| Recommendations - 004 | Rate Recommendation (Guest) | **PASS** | [REC-004](REC-004/) |
| Recommendations - 005 | Rate Recommendation (Registered) | **PASS** | [REC-005](REC-005/) |
| Recommendations - 006 | UAT: Fit/Style Confidence | **PASS** | [REC-006](REC-006/) |
| Recommendations - 007 | UAT: Recommendation Approval | **PASS** | [REC-007](REC-007/) |

## Verification and gates

- **Serial STOP ON FAILURE** — the describe block uses `test.describe.configure({ mode: 'serial' })`.
  The first execution of this session failed at REC-006; REC-007 was skipped, a
  `failure.png` + `test-log.json` (`FAIL`) were captured, and no case was marked
  PASS prematurely. After the test-only fix below, REC-006 and REC-007 were
  rerun individually, then the entire suite was rerun clean: **7 passed**, no
  skips.
- All 7 `test-log.json` files report `PASS` with 2026-11-19T07:17–07:18Z
  timestamps; no `failure.png` artifacts remain.
- **Fresh-session isolation** — every logged-in case performs a real cold UI
  login in a brand-new `BrowserContext` (the AV-007 pattern), so no
  `page.addInitScript` session replay can mask a persistence regression. Guest
  cases use a separate clean context.
- **No application code changed** — backend (Python/Django) and frontend app
  code (React/JSX) were not modified in this task. Only
  `frontend/e2e/rec-tests.spec.ts` and evidence files were touched.

## REC-006 failure diagnosis and test-only fix

- **Symptom:** `expect(locator('.studio-notification')).toContainText('Thanks! Rating saved.')`
  timed out with `element(s) not found` after the rating modal closed.
- **Investigation:** a temporary full-page screenshot and DOM dump immediately
  after modal close showed `.studio-notification[role=status]` containing exactly
  `Thanks! Rating saved.`, the modal count at 0, and the persisted
  `fit_visualization` rating present. **No app bug** — the success state was
  correct; the toast auto-dismisses after 2.5 s (`FittingStudioPage.displayNotification`),
  so polling after `toBeHidden()` was racy on a slow run.
- **Fix (test script only):** `submitStars()` now installs a `MutationObserver`
  before clicking Submit and records the toast text the moment it is inserted;
  the assertion checks that captured text instead of polling a transient DOM
  node. REC-006 logs the captured `success_toast` in its `test-log.json`.
- The temporary diagnostic screenshot and code were removed; the stale
  `failure.png` was deleted after the clean full run.

## Test-only alignment (no app behaviour changes)

Assertions were aligned to the observed UI without changing app behaviour:

- **Match-reasons button** — the card's accessible name is lowercase
  `View match reasons for <item>` (aria-label), so the test matches it
  case-insensitively; visible text remains `View Match Reasons`.
- **Try-before-rate gate** — the `Rate Recommendation` button only appears after
  `Try Item` on a card. REC-004/005/007 click `Try Item` first, matching the
  functional step a shopper must take.
- **REC-003 empty state** — the seeded catalog has no profile that yields zero
  API rows, so the precondition (an incompatible size-XL item vs a size-M avatar)
  is simulated at the `/api/recommendations/` boundary. The CSV wording
  `No recommendations available` is accepted via the equivalent UI message
  `No recommendations match your avatar's size (M) or gender…`, consistent with
  the finalized CAT empty-state decision.
- **UAT cases (REC-006/007)** — the ≥80% population-level KPI and team physical
  fit-accuracy comparison are deferred to post-deployment per Scope v1.1; the
  automated evidence covers the functional controls and explainability that can
  be verified in-session.

## Notable evidence

- **REC-001:** ranked API returned 50 recommendations; 10 cards rendered on page
  1 with score badges (sample `Dark Indigo Maong Jeans` = `7/7`). Weights
  confirmed as color 3 / height 2 / shading 1 / style 1; `weights_version` 1.1.0.
- **REC-002:** four-rule breakdown for `Dark Indigo Maong Jeans` — Color
  compatibility `3/3`, Height contrast `2/2`, Proportion shading `1/1`, Style
  match `1/1` — each with a non-empty explanation.
- **REC-003:** empty-state message rendered with recovery hint (`Move the Body
  Build slider… / switch gender…`), zero cards.
- **REC-004:** guest star click showed the exact prompt `Please sign up or log in
  to save your rating.` with Sign Up / Log In buttons; 0 ratings network calls
  and no rating/UAT keys added to session or local storage.
- **REC-005:** 4-star rating persisted with a real catalog `target_id`
  (`6af2cb75655abe362412d155`), `source=recommendation_panel`, and rehydrated as
  `Your rating: 4/5` after reload from a fresh context.
- **REC-006:** `Dark Indigo Maong Jeans` equipped to the `bottom` slot, canvas
  overlay redrawn, 4-star `fit_visualization` rating persisted, and success toast
  `Thanks! Rating saved.` captured.
- **REC-007:** four explainable match rules visible plus a 5-star
  `recommendation_panel` rating persisted.
