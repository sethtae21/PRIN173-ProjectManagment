"""
KAN-103 — Weights basis validation: deterministic regression + ±1 sensitivity.

Traceability: SRS FR-7.2 (basis of weights; validation & testing), WBS 1.3.5 &
1.4.2, Charter §8 (baseline freeze / CCB), panel review comment.
Parent: KAN-49 (rule-based recommender). Feeds: KAN-83 (Validation Algorithm
Testing) — see docs/WEIGHTS_VALIDATION_REPORT.md §Joint run.

WHY THIS FILE IS DB-FREE (mostly): score_item/rank_items are pure functions, so
every test except TestEndpointSmoke runs with NO MongoDB connection. An Atlas
network reset (WinError 10054) therefore cannot block KAN-103 validation.

TABLE-DRIVEN FIXTURES (the important design decision): we do NOT hardcode which
color/contrast/shade values fire, because firing is defined by knowledge_table.py
and a hardcoded guess can silently collapse a profile to gap=0. Instead the
fixtures below READ the real tables at import time and build each winner/runner
pair from actual table members, so the top1-top2 margin is correct by
construction regardless of table contents. If a lever has no data in your table,
that profile is omitted and TestSuiteNonVacuous fails with the exact dump command
to run — never a silent pass, never a wrong assertion.

±1 PROOF (why gap>=2 is sufficient): inside a profile the runner's fired-rule set
is a SUBSET of the winner's, so gap = sum of weights over winner-only rules. A
single +/-1 change to any one weight moves that gap by at most 1 (only a -1 on a
winner-only weight shrinks it). Hence gap>=2 => post-perturbation gap>=1>0 =>
top-1 cannot invert (name tie-break moot). Color(+3)/contrast(+2) isolate cleanly;
the +1 levers (shading/style) are stacked with color to clear the >=2 bar — an
honest consequence of weight-1 rules, noted per profile.

CO-CHANGE RULE (Charter §8) — before editing ANY weight or knowledge table, do
three things TOGETHER in one change or the suite is invalid:
  (1) add a dated line with the REASON in docs/TUNING_LOG.md
  (2) re-capture expected scores (see docs/WEIGHTS_VALIDATION_REPORT.md §Capture)
      and paste into LITERAL_FREEZE below
  (3) re-run: python manage.py test recommendations.tests_weights -v 2
After the freeze (KAN-103 -> Done; adviser confirms at M4) the same three steps
apply PLUS CCB routing as a baselined change.
"""
import unittest

from recommendations.knowledge_table import (
    CATEGORY_GROUPS, COLOR_COMPATIBILITY, CONTRAST_BY_HEIGHT,
    PROPORTION_SHADING, WEIGHTS, WEIGHTS_VERSION, height_band,
)
from recommendations.scoring import (
    AvatarProfile, ItemProfile, score_item, rank_items, RULE_ORDER,
)

# Explicit sentinels that are NOT members of any sane FR-7.2 recommendation set,
# used to FORCE a rule OFF deterministically (the scorer uses the explicit field
# and skips text inference whenever it is non-empty, so these never surprise us).
_OFF_CONTRAST = "zzz-no-contrast"
_OFF_SHADE = "zzz-no-shade"
_NONMEMBER_CANDIDATES = ("zzz-no-1", "zzz-no-2", "zzz-no-3", "zzz-no-4", "zzz-no-5")


def _nonmember(mapping_set):
    """Return a sentinel string guaranteed absent from mapping_set."""
    s = set(mapping_set or ())
    for cand in _NONMEMBER_CANDIDATES:
        if cand not in s:
            return cand
    return "zzz-no-x"


def _pick_color():
    """(undertone, winning_color, losing_color) from COLOR_COMPATIBILITY, or Nones."""
    try:
        for ut in sorted(COLOR_COMPATIBILITY):
            compat = COLOR_COMPATIBILITY[ut]
            if compat:
                win = sorted(compat)[0]
                lose = _nonmember(compat)
                return ut, win, lose
    except Exception:
        pass
    return None, None, None


def _pick_contrast():
    """(height_cm, band, winning_contrast, losing_contrast) or Nones."""
    try:
        for h in (150.0, 160.0, 170.0, 180.0, 190.0):
            band = height_band(h)
            rec = CONTRAST_BY_HEIGHT.get(band, set())
            if rec:
                return h, band, sorted(rec)[0], _nonmember(rec)
    except Exception:
        pass
    return None, None, None, None


def _pick_shading():
    """(body_shape, category, winning_shade, losing_shade) or Nones."""
    try:
        for shape in sorted(PROPORTION_SHADING):
            by_group = PROPORTION_SHADING[shape]
            for grp in sorted(by_group):
                allowed = by_group[grp]
                if not allowed:
                    continue
                cat = None
                for gname, cats in CATEGORY_GROUPS.items():
                    if gname == grp and cats:
                        cat = sorted(cats)[0]
                        break
                if cat:
                    return shape, cat, sorted(allowed)[0], _nonmember(allowed)
    except Exception:
        pass
    return None, None, None, None


def _off_item(name, *, style=(), occasion=()):
    """A candidate that fires ONLY style_occasion (and only on tag overlap)."""
    return ItemProfile(
        name=name, category="tops", color_family=(), color_description="",
        style_tags=tuple(style), occasion_tags=tuple(occasion),
        contrast_level=_OFF_CONTRAST, shade=_OFF_SHADE,
    )


# ---------------------------------------------------------------------------
# Build canonical profiles FROM THE REAL TABLES. Each entry:
#   (label, avatar, [winner, runner, decoy], expected_winner_name)
# Winner/runner are assembled so runner's fired-set is a subset of winner's and
# the winner-only weight sum is >= 2 (see module docstring for the proof).
# Profiles whose lever has no table data are skipped (guarded), never faked.
# ---------------------------------------------------------------------------
def _build_canonical_profiles():
    profiles = []
    ut, win_color, lose_color = _pick_color()
    h_c, _band_c, win_contrast, lose_contrast = _pick_contrast()
    sh_shape, sh_cat, win_shade, lose_shade = _pick_shading()

    if ut is not None:  # color lever has data -> P1 (isolates color, gap=+3)
        profiles.append((
            "P1_color_focus",
            AvatarProfile(undertone=ut, height_cm=170.0, body_shape="balanced",
                          style_tags=("casual",), occasion_tags=("everyday",)),
            [
                ItemProfile("P1 Winner", "tops", (win_color,), "", ("casual",),
                            ("everyday",), contrast_level=_OFF_CONTRAST, shade=_OFF_SHADE),
                ItemProfile("P1 Runner", "tops", (lose_color,), "", ("casual",),
                            ("everyday",), contrast_level=_OFF_CONTRAST, shade=_OFF_SHADE),
                _off_item("P1 Decoy"),
            ],
            "P1 Winner",
        ))
        # P4 isolates style but style=+1 alone is too tight, so stack color:
        # winner fires color+style, runner fires nothing -> winner-only={color,style}=+4
        profiles.append((
            "P4_style_focus",
            AvatarProfile(undertone=ut, height_cm=170.0, body_shape="balanced",
                          style_tags=("streetwear", "bold"), occasion_tags=("party",)),
            [
                ItemProfile("P4 Winner", "tops", (win_color,), "", ("streetwear", "bold"),
                            ("party",), contrast_level=_OFF_CONTRAST, shade=_OFF_SHADE),
                ItemProfile("P4 Runner", "tops", (lose_color,), "", ("office",),
                            ("work",), contrast_level=_OFF_CONTRAST, shade=_OFF_SHADE),
                _off_item("P4 Decoy"),
            ],
            "P4 Winner",
        ))

    if ut is not None and win_contrast is not None:  # P2 isolates contrast, gap=+2
        profiles.append((
            "P2_contrast_focus",
            AvatarProfile(undertone=ut, height_cm=h_c, body_shape="balanced",
                          style_tags=("smart",), occasion_tags=("work",)),
            [
                ItemProfile("P2 Winner", "tops", (win_color,), "", ("smart",),
                            ("work",), contrast_level=win_contrast, shade=_OFF_SHADE),
                ItemProfile("P2 Runner", "tops", (win_color,), "", ("smart",),
                            ("work",), contrast_level=lose_contrast, shade=_OFF_SHADE),
                _off_item("P2 Decoy"),
            ],
            "P2 Winner",
        ))

    if ut is not None and win_shade is not None:  # P3 shading=+1 stacked w/ color -> +4
        profiles.append((
            "P3_shading_focus",
            AvatarProfile(undertone=ut, height_cm=170.0, body_shape=sh_shape,
                          style_tags=("minimalist",), occasion_tags=("everyday",)),
            [
                ItemProfile("P3 Winner", sh_cat, (win_color,), "", ("minimalist",),
                            ("everyday",), contrast_level=_OFF_CONTRAST, shade=win_shade),
                ItemProfile("P3 Runner", sh_cat, (lose_color,), "", ("minimalist",),
                            ("everyday",), contrast_level=_OFF_CONTRAST, shade=lose_shade),
                _off_item("P3 Decoy"),
            ],
            "P3 Winner",
        ))
    return profiles


CANONICAL_PROFILES = _build_canonical_profiles()

# PHASE 2 — literal freeze (optional hardening). None => self-skips. To activate,
# run the §Capture command in docs/WEIGHTS_VALIDATION_REPORT.md and paste the dict.
LITERAL_FREEZE = None  # type: dict[str, dict] | None


class TestDeterminism(unittest.TestCase):
    """Charter OBJ-05 / FR-7.2 auditability: identical inputs -> identical outputs."""

    def test_rank_is_repeatable(self):
        for label, avatar, items, _ in CANONICAL_PROFILES:
            a = [b.item_name for b in rank_items(avatar, items, limit=99)]
            b = [b.item_name for b in rank_items(avatar, items, limit=99)]
            self.assertEqual(a, b, f"{label}: ranking not deterministic")

    def test_tie_break_is_by_name(self):
        avatar = AvatarProfile(undertone="warm", height_cm=170.0)
        items = [_off_item("Zeta"), _off_item("Alpha")]
        order = [b.item_name for b in rank_items(avatar, items, limit=99)]
        self.assertEqual(order, ["Alpha", "Zeta"])

    def test_total_equals_sum_of_rule_points(self):
        for _, avatar, items, _ in CANONICAL_PROFILES:
            for it in items:
                bd = score_item(avatar, it)
                self.assertEqual(bd.total, sum(r.points for r in bd.rules))
                self.assertEqual(tuple(r.rule_id for r in bd.rules), RULE_ORDER,
                                 "rule order must be fixed for auditability")

    def test_each_rule_points_is_zero_or_its_weight(self):
        for _, avatar, items, _ in CANONICAL_PROFILES:
            for it in items:
                for r in score_item(avatar, it).rules:
                    self.assertIn(r.points, (0, WEIGHTS[r.rule_id]),
                                  f"{r.rule_id} awarded {r.points}, expected 0 or "
                                  f"{WEIGHTS[r.rule_id]}")


class TestSensitivity(unittest.TestCase):
    """FR-7.2 ±1 check on the table-built canonical profiles (see module docstring)."""

    def _baseline(self, avatar, items):
        ranked = rank_items(avatar, items, limit=99)
        self.assertGreaterEqual(len(ranked), 2, "need >=2 items to measure a gap")
        return ranked[0].total - ranked[1].total, ranked[0].item_name

    def test_precondition_gap_ge_two(self):
        for label, avatar, items, winner in CANONICAL_PROFILES:
            gap, top = self._baseline(avatar, items)
            self.assertEqual(top, winner, f"{label}: unexpected baseline winner")
            self.assertGreaterEqual(
                gap, 2,
                f"{label}: baseline gap={gap} (<2). Table-built fixture should "
                f"guarantee >=2 by construction; if you see this, a knowledge table "
                f"changed shape unexpectedly — run the dump command in "
                f"docs/WEIGHTS_VALIDATION_REPORT.md and report it.")

    def test_plus_minus_one_does_not_invert(self):
        for label, avatar, items, winner in CANONICAL_PROFILES:
            gap, base_top = self._baseline(avatar, items)
            if gap < 2:
                self.skipTest(f"{label}: gap<2, see precondition test")
            for wkey in WEIGHTS:
                for delta in (+1, -1):
                    w = dict(WEIGHTS)
                    w[wkey] = w[wkey] + delta
                    top = rank_items(avatar, items, limit=99, weights=w)[0].item_name
                    self.assertEqual(
                        top, base_top,
                        f"{label}: top-1 INVERTED under {wkey}{delta:+d} "
                        f"(base={base_top}, now={top})")


@unittest.skipIf(LITERAL_FREEZE is None,
                 "Phase-2 literal freeze not captured yet — run the §Capture command "
                 "in docs/WEIGHTS_VALIDATION_REPORT.md, then paste into LITERAL_FREEZE. "
                 "Phase-1 invariants + ±1 sweep already cover FR-7.2.")
class TestLiteralFreeze(unittest.TestCase):
    """Hard numeric regression: exact totals + full ordering per profile."""

    def test_exact_scores_and_order(self):
        for label, avatar, items, _ in CANONICAL_PROFILES:
            exp = LITERAL_FREEZE[label]
            ranked = rank_items(avatar, items, limit=99)
            self.assertEqual([b.item_name for b in ranked], exp["order"],
                             f"{label}: ordering drifted")
            self.assertEqual({b.item_name: b.total for b in ranked}, exp["totals"],
                             f"{label}: totals drifted (apply co-change rule)")


class TestKnowledgeTableIntegrity(unittest.TestCase):
    """Guard the assumptions the ±1 proof relies on, independent of table values."""

    def test_weights_has_exactly_the_four_rules(self):
        self.assertEqual(set(WEIGHTS.keys()), set(RULE_ORDER))

    def test_weights_are_positive_integers(self):
        for k, v in WEIGHTS.items():
            self.assertIsInstance(v, int)
            self.assertGreater(v, 0, f"{k} weight must be > 0")

    def test_weights_version_present(self):
        self.assertTrue(WEIGHTS_VERSION)


class TestSuiteNonVacuous(unittest.TestCase):
    """The suite must actually validate something — fail loudly if tables are sparse."""

    def test_at_least_two_profiles_built(self):
        self.assertGreaterEqual(
            len(CANONICAL_PROFILES), 2,
            "Fewer than 2 canonical profiles could be built from knowledge_table.py. "
            "Run this and paste the output to your lead:\n"
            "python manage.py shell -c \"from recommendations.knowledge_table import "
            "COLOR_COMPATIBILITY as C, CONTRAST_BY_HEIGHT as H, PROPORTION_SHADING as P, "
            "CATEGORY_GROUPS as G; print('COLOR', {k: len(v) for k,v in C.items()}); "
            "print('CONTRAST', {k: len(v) for k,v in H.items()}); print('SHADE_SHAPES', "
            "list(P)); print('GROUPS', list(G))\"")

    def test_sensitivity_actually_exercised(self):
        gaps = []
        for _label, avatar, items, _w in CANONICAL_PROFILES:
            r = rank_items(avatar, items, limit=99)
            if len(r) >= 2:
                gaps.append(r[0].total - r[1].total)
        self.assertTrue(any(g >= 2 for g in gaps),
                        f"No profile reached gap>=2 (gaps={gaps}); the ±1 proof is vacuous.")


# --- integration (needs DB; tolerant of empty catalog) ----------------------
from django.test import TestCase  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402


class TestEndpointSmoke(TestCase):
    """Proves the pure core is wired into GET /api/recommendations/. Schema-only so
    it passes on an empty catalog and does NOT depend on the active-items TODO
    (that hygiene fix is the KAN-49 sub-task, not here)."""

    def test_response_shape(self):
        res = APIClient().get("/api/recommendations/",
                              {"undertone": "warm", "height_cm": 175, "limit": 5})
        self.assertEqual(res.status_code, 200)
        self.assertIn("weights_version", res.data)
        self.assertEqual(res.data["weights_version"], WEIGHTS_VERSION)
        self.assertEqual(set(res.data["weights"].keys()), set(RULE_ORDER))
        self.assertIsInstance(res.data["recommendations"], list)