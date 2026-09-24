from django.test import TestCase

from .knowledge_table import WEIGHTS, height_band, infer_contrast, infer_shade
from .scoring import AvatarProfile, ItemProfile, rank_items, score_item

WARM_PETITE = AvatarProfile(undertone="warm", height_cm=158,
                            body_shape="bottom-heavy",
                            style_tags=("casual",), occasion_tags=("everyday",))


def make_item(**overrides):
    base = dict(name="base item", category="tops", color_family=("red",),
                color_description="dark brick red",
                style_tags=("casual",), occasion_tags=("everyday",))
    base.update(overrides)
    return ItemProfile(**base)


class KnowledgeTableTests(TestCase):
    def test_height_bands(self):
        self.assertEqual(height_band(159.9), "petite")
        self.assertEqual(height_band(160.0), "average")
        self.assertEqual(height_band(175.0), "tall")

    def test_keyword_inference(self):
        self.assertEqual(infer_contrast("high contrast color-block"), "high")
        self.assertEqual(infer_contrast("tonal look"), "low")
        self.assertEqual(infer_contrast("plain red"), "medium")
        self.assertEqual(infer_shade("deep navy"), "dark")
        self.assertEqual(infer_shade("pastel pink"), "light")


class ScoringRuleTests(TestCase):
    def _rule(self, breakdown, rule_id):
        return next(r for r in breakdown.rules if r.rule_id == rule_id)

    def test_color_rule_fires_for_compatible_family(self):
        b = score_item(WARM_PETITE, make_item(color_family=("red",)))
        r = self._rule(b, "color_compatibility")
        self.assertTrue(r.fired)
        self.assertEqual(r.points, 3)

    def test_color_rule_misses_for_clashing_family(self):
        b = score_item(WARM_PETITE, make_item(color_family=("blue",)))
        r = self._rule(b, "color_compatibility")
        self.assertFalse(r.fired)
        self.assertEqual(r.points, 0)

    def test_height_contrast_petite(self):
        low = score_item(WARM_PETITE, make_item(color_description="tonal dark brick"))
        high = score_item(WARM_PETITE, make_item(color_description="high contrast block, dark"))
        self.assertTrue(self._rule(low, "height_contrast").fired)
        self.assertFalse(self._rule(high, "height_contrast").fired)

    def test_proportion_shading_bottom_heavy(self):
        dark_bottom = score_item(WARM_PETITE, make_item(category="bottoms",
                                                       color_description="deep navy"))
        light_bottom = score_item(WARM_PETITE, make_item(category="bottoms",
                                                         color_description="pastel beige"))
        self.assertTrue(self._rule(dark_bottom, "proportion_shading").fired)
        self.assertFalse(self._rule(light_bottom, "proportion_shading").fired)

    def test_style_occasion_overlap(self):
        hit = score_item(WARM_PETITE, make_item(style_tags=("casual",)))
        miss = score_item(WARM_PETITE, make_item(style_tags=("formal",),
                                                 occasion_tags=("wedding",)))
        self.assertTrue(self._rule(hit, "style_occasion").fired)
        self.assertFalse(self._rule(miss, "style_occasion").fired)

    def test_perfect_match_scores_max(self):
        b = score_item(WARM_PETITE, make_item(category="bottoms",
                                              color_family=("red",),
                                              color_description="tonal deep ruby",
                                              style_tags=("casual",),
                                              occasion_tags=("everyday",)))
        self.assertEqual(b.total, 7)
        self.assertEqual(b.total, sum(r.points for r in b.rules))


class RankingTests(TestCase):
    ITEMS = [
        make_item(name="style only", color_family=("blue",),
                  color_description="high contrast pastel", style_tags=("casual",)),
        make_item(name="color only", color_family=("red",),
                  color_description="high contrast pastel", style_tags=("formal",)),
        make_item(name="perfect", category="bottoms", color_family=("red",),
                  color_description="tonal deep ruby", style_tags=("casual",)),
    ]

    def test_ranking_order(self):
        ranked = rank_items(WARM_PETITE, self.ITEMS)
        self.assertEqual([b.item_name for b in ranked],
                         ["perfect", "color only", "style only"])

    def test_determinism(self):
        first = [b.as_dict() for b in rank_items(WARM_PETITE, self.ITEMS)]
        second = [b.as_dict() for b in rank_items(WARM_PETITE, self.ITEMS)]
        self.assertEqual(first, second)

    def test_plus_minus_one_sensitivity_does_not_flip_top1(self):
        """Basic version of the KAN-103/KAN-107 suite: perturbing any single
        weight by +/-1 must not change the top-1 item for this canonical case."""
        for rule_id in WEIGHTS:
            for delta in (+1, -1):
                w = dict(WEIGHTS)
                w[rule_id] = max(0, w[rule_id] + delta)
                ranked = rank_items(WARM_PETITE, self.ITEMS, weights=w)
                self.assertEqual(ranked[0].item_name, "perfect",
                                 f"top-1 flipped with {rule_id}{delta:+d}")     