# Weights Tuning Log (append-only) — FR-7.2

**Rule (Charter §8 / co-change):** Every weight or firing-table change gets ONE dated row
here, with the **reason**, and MUST be accompanied by (a) updated expected scores in
`recommendations/tests_weights.py` → `LITERAL_FREEZE` (re-capture per
`WEIGHTS_VALIDATION_REPORT.md` §Capture) and (b) a green re-run of
`python manage.py test recommendations.tests_weights -v 2`. Before the freeze these three
move together; after the freeze they move together **and** the change is routed through the
CCB as a baselined change. Never edit a weight in `knowledge_table.py` without a row here —
the log and the tests are the pair that keeps the baseline honest.

**Freeze status:** the four baseline rows below are *candidates* until **KAN-103 → Done**,
at which point they become the official frozen baseline. The **adviser still gets a final
look at the weights during the M4 review**; any M4 adjustment is logged here like any other
tune.

| Date | Ticket | Dimension (rule key) | Old → New | Reason | CCB? (post-freeze) |
|---|---|---|---|---|---|
| 2026-09-25 | KAN-103 | `color_compatibility` | — → **3** | Baseline candidate: wrong undertone is the most visible failure, so it carries the dominant weight (FR-7.2). | n/a (pre-freeze) |
| 2026-09-25 | KAN-103 | `height_contrast` | — → **2** | Baseline candidate: contrast fighting frame reads as ill-fitting; second-order lever (FR-7.2). | n/a (pre-freeze) |
| 2026-09-25 | KAN-103 | `proportion_shading` | — → **1** | Baseline candidate: silhouette refinement per shape/category; subtler (FR-7.2). | n/a (pre-freeze) |
| 2026-09-25 | KAN-103 | `style_occasion` | — → **1** | Baseline candidate: preference tie-refiner once fit rules agree (FR-7.2). | n/a (pre-freeze) |
| _(template)_ | KAN-___ | `___` | `__ → __` | ___ | ___ |

> To add a tune: copy the template row, fill it, update `LITERAL_FREEZE` via the §Capture
> command in `WEIGHTS_VALIDATION_REPORT.md`, re-run the tests, then paste the captured
> output into the report. All in one change.