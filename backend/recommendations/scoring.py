"""
FitFusion AI - deterministic scoring service (rule-based recommendation engine).

Traceability: SRS FR-7.2 (scoring), FR-7.3/FR-7.4 (explainable output).
Pure functions: no DB, no network, no randomness -> identical inputs always
produce identical outputs (auditability, Charter OBJ-05).
"""
from dataclasses import dataclass

from .knowledge_table import (
    CATEGORY_GROUPS, COLOR_COMPATIBILITY, CONTRAST_BY_HEIGHT, MAX_SCORE,
    PROPORTION_SHADING, WEIGHTS, height_band, infer_contrast, infer_shade,
)

RULE_ORDER = ("color_compatibility", "height_contrast",
              "proportion_shading", "style_occasion")


@dataclass(frozen=True)
class AvatarProfile:
    undertone: str                 # "warm" | "cool" | "neutral"
    height_cm: float
    body_shape: str = "balanced"   # "top-heavy" | "bottom-heavy" | "balanced"
    style_tags: tuple = ()
    occasion_tags: tuple = ()


@dataclass(frozen=True)
class ItemProfile:
    name: str
    category: str                  # tops|bottoms|dresses|outerwear|footwear
    color_family: tuple = ()
    color_description: str = ""
    style_tags: tuple = ()
    occasion_tags: tuple = ()
    contrast_level: str = ""       # optional; inferred from description if empty
    shade: str = ""                # optional; inferred from description if empty


@dataclass(frozen=True)
class RuleResult:
    rule_id: str
    points: int
    fired: bool
    reason: str


@dataclass(frozen=True)
class ScoreBreakdown:
    item_name: str
    rules: tuple
    total: int
    max_score: int = MAX_SCORE

    def as_dict(self) -> dict:
        """FR-7.3/FR-7.4 payload: total + every rule, fired or not, with reason."""
        return {
            "item": self.item_name,
            "total_score": self.total,
            "max_score": self.max_score,
            "rules": [{"rule": r.rule_id, "points": r.points,
                       "fired": r.fired, "reason": r.reason} for r in self.rules],
        }


def _norm(values) -> set:
    if isinstance(values, str):
        values = (values,)
    return {v.lower().strip() for v in values if v and v.strip()}


def _rule_color(avatar, item, weights):
    compatible = COLOR_COMPATIBILITY.get(avatar.undertone.lower(), set())
    hit = _norm(item.color_family) & compatible
    fired = bool(hit)
    reason = (f"color family {sorted(hit)} compatible with {avatar.undertone} undertone"
              if fired else
              f"no color family of {sorted(_norm(item.color_family))} matches "
              f"{avatar.undertone} undertone")
    return RuleResult("color_compatibility", weights["color_compatibility"] if fired else 0,
                      fired, reason)


def _rule_contrast(avatar, item, weights):
    band = height_band(avatar.height_cm)
    level = item.contrast_level.lower() or infer_contrast(item.color_description)
    fired = level in CONTRAST_BY_HEIGHT.get(band, set())
    reason = (f"{level} contrast suits {band} height band ({avatar.height_cm} cm)"
              if fired else
              f"{level} contrast not recommended for {band} height band")
    return RuleResult("height_contrast", weights["height_contrast"] if fired else 0,
                      fired, reason)


def _rule_shading(avatar, item, weights):
    group = next((g for g, cats in CATEGORY_GROUPS.items()
                  if item.category.lower() in cats), None)
    if group is None:
        return RuleResult("proportion_shading", 0, False,
                          f"category '{item.category}' is not shade-scored")
    shade = item.shade.lower() or infer_shade(item.color_description)
    allowed = PROPORTION_SHADING.get(avatar.body_shape, {}).get(group, set())
    fired = shade in allowed
    reason = (f"{shade} shade on a {group} balances a {avatar.body_shape} shape"
              if fired else
              f"{shade} shade on a {group} does not balance a {avatar.body_shape} shape")
    return RuleResult("proportion_shading", weights["proportion_shading"] if fired else 0,
                      fired, reason)


def _rule_style(avatar, item, weights):
    item_tags = _norm(item.style_tags) | _norm(item.occasion_tags)
    avatar_tags = _norm(avatar.style_tags) | _norm(avatar.occasion_tags)
    hit = item_tags & avatar_tags
    fired = bool(hit)
    reason = (f"shared style/occasion tags: {sorted(hit)}"
              if fired else "no style/occasion tag overlap with avatar profile")
    return RuleResult("style_occasion", weights["style_occasion"] if fired else 0,
                      fired, reason)


_RULE_FUNCS = {
    "color_compatibility": _rule_color,
    "height_contrast": _rule_contrast,
    "proportion_shading": _rule_shading,
    "style_occasion": _rule_style,
}


def score_item(avatar: AvatarProfile, item: ItemProfile,
               weights: dict | None = None) -> ScoreBreakdown:
    """Score one item against one avatar profile. Fixed rule order = auditable."""
    weights = weights or WEIGHTS
    rules = tuple(_RULE_FUNCS[rid](avatar, item, weights) for rid in RULE_ORDER)
    return ScoreBreakdown(item_name=item.name, rules=rules,
                          total=sum(r.points for r in rules))


def rank_items(avatar: AvatarProfile, items, limit: int = 10,
               weights: dict | None = None) -> list:
    """Rank items by score desc; ties broken by name for determinism."""
    weights = weights or WEIGHTS
    breaks = [score_item(avatar, i, weights) for i in items]
    breaks.sort(key=lambda b: (-b.total, b.item_name))
    return breaks[:limit]