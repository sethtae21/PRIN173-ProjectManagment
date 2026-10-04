# Weights Validation Report — KAN-103 (links into KAN-83)

**Ticket:** KAN-103 · **Parent:** KAN-49 · **Feeds:** KAN-83 (Validation Algorithm Testing,
WBS 1.4.2) · **Spec:** SRS FR-7.2 · **Charter:** §8, OBJ-01/OBJ-05.
This report is the repo-side evidence bundle. The **final done-when item** is the joint run
with the adviser under KAN-83 (§Joint run) whose results are linked into KAN-83's own
validation report.

## Reproduce
```bash
# DB-free unit layer (runs even if Atlas hiccups):
python manage.py test recommendations.tests_weights.TestDeterminism \
                      recommendations.tests_weights.TestSensitivity \
                      recommendations.tests_weights.TestKnowledgeTableIntegrity \
                      recommendations.tests_weights.TestSuiteNonVacuous -v 2
# Full suite incl. the DB-tolerant endpoint smoke:
python manage.py test recommendations.tests_weights -v 2
```

## Results (captured 2026-09-25, Windows PowerShell, Django 6.0.8)

Core layer (11 tests, no DB):
```
Found 11 test(s).
Skipping setup of unused database(s): default.
System check identified no issues (0 silenced).
test_each_rule_points_is_zero_or_its_weight (...TestDeterminism...) ... ok
test_rank_is_repeatable (...TestDeterminism...) ... ok
test_tie_break_is_by_name (...TestDeterminism...) ... ok
test_total_equals_sum_of_rule_points (...TestDeterminism...) ... ok
test_plus_minus_one_does_not_invert (...TestSensitivity...) ... ok
test_precondition_gap_ge_two (...TestSensitivity...) ... ok
test_weights_are_positive_integers (...TestKnowledgeTableIntegrity...) ... ok
test_weights_has_exactly_the_four_rules (...TestKnowledgeTableIntegrity...) ... ok
test_weights_version_present (...TestKnowledgeTableIntegrity...) ... ok
test_at_least_two_profiles_built (...TestSuiteNonVacuous...) ... ok
test_sensitivity_actually_exercised (...TestSuiteNonVacuous...) ... ok
----------------------------------------------------------------------
Ran 11 tests in 0.138s
OK
```

Full layer (13 tests, incl. endpoint smoke + DB migration of test_fitfusion):
```
Found 13 test(s).
Creating test database for alias 'default' ('test_fitfusion')...
... Applying ratings.0001_initial... OK / ratings.0002_rating_vote_alter_rating_score... OK ...
System check identified no issues (0 silenced).
test_response_shape (...TestEndpointSmoke...) ... ok
test_each_rule_points_is_zero_or_its_weight (...TestDeterminism...) ... ok
test_rank_is_repeatable (...TestDeterminism...) ... ok
test_tie_break_is_by_name (...TestDeterminism...) ... ok
test_total_equals_sum_of_rule_points (...TestDeterminism...) ... ok
test_weights_are_positive_integers (...TestKnowledgeTableIntegrity...) ... ok
test_weights_has_exactly_the_four_rules (...TestKnowledgeTableIntegrity...) ... ok
test_weights_version_present (...TestKnowledgeTableIntegrity...) ... ok
test_exact_scores_and_order (...TestLiteralFreeze...) ... skipped 'Phase-2 literal freeze not captured yet...'
test_plus_minus_one_does_not_invert (...TestSensitivity...) ... ok
test_precondition_gap_ge_two (...TestSensitivity...) ... ok
test_at_least_two_profiles_built (...TestSuiteNonVacuous...) ... ok
test_sensitivity_actually_exercised (...TestSuiteNonVacuous...) ... ok
----------------------------------------------------------------------
Ran 13 tests in 1.354s
OK (skipped=1)
Destroying test database for alias 'default' ('test_fitfusion')...
```

### What each layer proves
| Layer | Asserts | Catches | Status |
|---|---|---|---|
| `TestDeterminism` | repeatable ranking, name tie-break, total=Σpoints, fixed rule order, points∈{0,w} | logic/wiring/tie-break regressions in `scoring.py` | ok |
| `TestSensitivity` | gap≥2 precondition + per-weight ±1 sweep keep top-1 | a weight/table edit that would invert a recommendation | ok (not skipped) |
| `TestKnowledgeTableIntegrity` | exactly the 4 rule keys, positive-int weights, version set | a malformed `knowledge_table.py` | ok |
| `TestSuiteNonVacuous` | ≥2 profiles built AND at least one gap≥2 | an empty/sparse table making the ±1 proof vacuous | ok |
| `TestLiteralFreeze` *(Phase 2)* | exact totals + full ordering per profile | an *accidental* numeric drift | skipped (opt-in, see §Capture) |
| `TestEndpointSmoke` | 200 + schema keys on `/api/recommendations/` | the pure core drifting out of the view | ok |

## ±1 sensitivity matrix summary
For every canonical profile actually built from the tables, each of the 4 weights was
nudged by +1 and −1 (8 perturbations/profile) and the top-1 item name was asserted
unchanged. Result: **zero inversions** — `test_plus_minus_one_does_not_invert` reported
`ok` (not `skipped`), and `test_precondition_gap_ge_two` reported `ok`, confirming every
built profile met the gap≥2 precondition required by the proof in `WEIGHTS_BASIS.md` §4.
(The number of profiles depends on table density; `TestSuiteNonVacuous` guarantees ≥2.)

## Capture (promote Phase 1 → Phase 2 literal freeze; OPTIONAL hardening)
Run this, then paste the printed dict into `LITERAL_FREEZE` in
`recommendations/tests_weights.py` (co-change rule step 2):
```bash
python manage.py shell -c "
from recommendations.tests_weights import CANONICAL_PROFILES
from recommendations.scoring import rank_items
out={}
for label,av,items,_ in CANONICAL_PROFILES:
    r=rank_items(av,items,limit=99)
    out[label]={'order':[b.item_name for b in r],'totals':{b.item_name:b.total for b in r}}
print(out)
"
```
After pasting, re-run the full suite: `TestLiteralFreeze` flips from SKIP to a hard numeric
guard. If it fails, you changed a weight/table — apply the full co-change rule (log row +
this capture + re-run) before merging. Not required to close KAN-103: Phase-1 invariants +
the ±1 sweep already constitute the FR-7.2 evidence above.

## Joint run with the adviser under KAN-83  ← FINAL done-when item
Once the suite is green here, schedule one execution **together with the adviser**, run
under **KAN-83**, and link the results into KAN-83's validation report.

| Field | Value |
|---|---|
| Date / time | _(fill at joint run)_ |
| Attendees | Carlos (backend) + adviser |
| Command run | `python manage.py test recommendations.tests_weights -v 2` |
| Outcome | _(pass / notes — expected: OK (skipped=1) until §Capture run)_ |
| Linked into KAN-83 report | _(URL / ticket link)_ |
| Adviser sign-off on weights (M4 gate) | _(pending M4)_ |

> Done-when cross-check: memo exists ✓ · regression passes (fixed combos) ✓ · ±1 does not
> invert ✓ · tuning log exists ✓ · results linked into KAN-83 report _(closes at the joint
> run above)_.