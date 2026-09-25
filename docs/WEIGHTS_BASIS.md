# Weights Basis Memo — FR-7.2 Rule-Based Scoring

**Ticket:** KAN-103 (child of KAN-49, WBS 1.3.5 Rule-Based Recommender)
**Traceability:** SRS FR-7.2 (basis of weights; validation & testing) · Scope Baseline
WBS 1.3.5 & 1.4.2 · Charter §8 (baseline freeze / CCB) · Panel review comment
("validate weights during implementation & testing") · Feeds KAN-83 (Validation
Algorithm Testing).
**Source of truth for values:** `recommendations/knowledge_table.py` → `WEIGHTS`,
mirrored here for human review. Executable spec: `recommendations/tests_weights.py`.
Evidence bundle: `docs/WEIGHTS_VALIDATION_REPORT.md`. Tuning history: `docs/TUNING_LOG.md`.

## 1. The scoring model (additive, deterministic)

```
score(item | avatar) = Σ_rule  weight(rule) · fired(rule, item, avatar)
ranking = sort by score DESC, ties broken by item NAME ASC   (determinism)
```

`fired(...)` ∈ {0,1}. Fixed rule evaluation order (`RULE_ORDER` in `scoring.py`) so any
two runs on identical inputs produce byte-identical output — required for auditability
(Charter OBJ-05) and for the regression freeze below. No randomness, no network, no DB
inside the scorer.

## 2. Basis of each weight (the rationale the panel asked for)

| Rule (key) | Weight | SRS clause | Rationale (why this magnitude) | Inputs (avatar ← item) |
|---|---|---|---|---|
| `color_compatibility` | **3** | FR-7.2 | Highest lever: wrong undertone is the most visible, hardest-to-style-with failure, so it dominates the ranking. | `undertone` ← `color_family` via `COLOR_COMPATIBILITY` |
| `height_contrast` | **2** | FR-7.2 | Second-order but strongly garment-relative: contrast that fights a petite/tall frame reads as ill-fitting even when color is fine. | `height_cm`→band ← `contrast_level`/inferred via `CONTRAST_BY_HEIGHT` |
| `proportion_shading` | **1** | FR-7.2 | Refines silhouette per body shape & category group; real but subtler than color/contrast. | `body_shape` ← `shade`/inferred per `CATEGORY_GROUPS`/`PROPORTION_SHADING` |
| `style_occasion` | **1** | FR-7.2 | Preference match on tags; additive tie-refiner once the three fit rules agree. | `style_tags`+`occasion_tags` ← same (set overlap) |

`MAX_SCORE` (the denominator shown to users) = sum of the four weights, exported from
`knowledge_table.py`.

## 3. Determinism guarantees (what the tests lock)

1. Pure functions — same inputs ⇒ same `ScoreBreakdown`
   (`TestDeterminism.test_rank_is_repeatable`).
2. Stable tie-break on item name (`test_tie_break_is_by_name`).
3. Fixed rule order + `total == Σ points` + each rule ∈ {0, weight}
   (`test_total_equals_sum_of_rule_points`, `test_each_rule_points_is_zero_or_its_weight`).

### 3.1 Fixture construction (table-driven, not hardcoded)
The canonical profiles in `tests_weights.py` are **built at import time from the real
knowledge tables** (`_pick_color/_pick_contrast/_pick_shading` read
`COLOR_COMPATIBILITY`/`CONTRAST_BY_HEIGHT`/`PROPORTION_SHADING`). Within each profile the
runner's fired-rule set is a **subset** of the winner's, so the baseline top1−top2 gap
equals the sum of the winner-only weights and is ≥ 2 by construction. This is deliberate:
a hardcoded guess about which values fire can silently collapse a profile to gap 0 (it did
during development), whereas a table-built fixture stays correct across any legitimate
table edit. If a lever has no data, that profile is omitted and
`TestSuiteNonVacuous.test_at_least_two_profiles_built` fails loudly with the exact dump
command to run — never a silent pass, never a wrong assertion.

## 4. ±1 sensitivity property (FR-7.2 validation)

A signed ±1 change to **one** weight moves the gap between rank-1 and rank-2 by **at most
1** (only a −1 on a winner-only weight shrinks it; a non-deciding-weight nudge moves both
items identically). Therefore any profile engineered to a baseline gap ≥ 2 keeps a
post-perturbation gap ≥ 1 > 0 ⇒ **top-1 cannot invert**, name tie-break irrelevant.
`TestSensitivity` (a) asserts the gap ≥ 2 precondition per profile and (b) sweeps all
perturbations (each weight × {+1,−1}) asserting the winner name is unchanged. This is a
constructed proof, not a lucky sample. Note the honest consequence of weight-1 levers:
`proportion_shading` and `style_occasion` are stacked with `color_compatibility` in their
profiles so the margin clears ≥ 2 — visible in the per-profile comments in the test file.

## 5. Baseline freeze & CCB (Charter §8)

> **The four weights above become the official frozen baseline the moment KAN-103 moves to
> Done.** From that point any change to a weight (or to a knowledge table that alters
> firing) is a *baselined change* and must be routed through the **CCB** before merge.

**Adviser gate:** freezing on Done makes the values *official for development*, but **the
adviser retains a final look at the weights during the M4 milestone review.** The M4
sign-off is the last authority; if the adviser adjusts a weight at M4, that adjustment is
itself logged + re-frozen via the co-change rule below.

### Co-change rule (apply BEFORE the freeze too)
If you change a weight **before** the freeze, you must do **three things together in the
same change**, or the validation suite is considered invalid:
1. Add a dated line **with the reason** to `docs/TUNING_LOG.md`.
2. Re-capture expected scores (run the §Capture command in
   `docs/WEIGHTS_VALIDATION_REPORT.md`) and paste into `LITERAL_FREEZE` in
   `recommendations/tests_weights.py`.
3. Re-run `python manage.py test recommendations.tests_weights -v 2` and confirm green.

The log and the tests are kept in lock-step on purpose: a weight edit that doesn't move
both is silently wrong. (After the freeze, the same three steps apply *plus* CCB routing.)

## 6. Known adjacent gaps (NOT in this ticket — tracked separately)
- Recommendations currently read `CatalogItem.objects.all()` (the `views.py` TODO), so
  non-active items can rank. Tracked as the **KAN-49 sub-task** "restrict recommendations
  to active items" — a queryset hygiene fix, *not* a weights change; out of KAN-103 scope
  by design (do not touch `views.py`/`scoring.py` here).
- Endpoint input validation (negative/huge `limit`, misspelled `undertone`/`body_shape`,
  non-numeric `height_cm`) is tracked as a separate backlog ticket.

## 7. Pointers
- Tuning history: `docs/TUNING_LOG.md`
- Validation evidence + joint KAN-83 run: `docs/WEIGHTS_VALIDATION_REPORT.md`
- Executable spec: `recommendations/tests_weights.py`