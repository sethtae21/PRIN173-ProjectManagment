"""
FitFusion AI - color-theory knowledge table (rule-based recommendation engine).

Traceability: SRS FR-7.1, FR-7.2 | Scope Baseline WBS 1.3.5 | Charter OBJ-05.
Nature: deterministic, code-encoded knowledge (symbolic/heuristic AI).
No machine learning - every rule is human-readable and auditable.

Weight tuning: before the baseline freeze, bump WEIGHTS_VERSION and record the
change + rationale in the tuning log (KAN-107). AFTER the freeze, weight changes
are baselined changes and must go through the CCB (Charter Sec. 8).
"""

WEIGHTS_VERSION = "1.0.0"

# SRS FR-7.2 weighted tag scoring. Keys are the rule ids used in scoring.py.
WEIGHTS = {
    "color_compatibility": 3,  # color harmony dominates first impressions
    "height_contrast": 2,      # silhouette / height-appropriate contrast
    "proportion_shading": 1,   # proportion-appropriate shading refines perceived fit
    "style_occasion": 1,       # style/occasion context is least visually salient
}
MAX_SCORE = sum(WEIGHTS.values())  # 7

# --- FR-7.1: undertone -> compatible color families -------------------------
# Encoded from classical color theory / seasonal color analysis (Charter R18).
COLOR_COMPATIBILITY = {
    "warm": {"red", "orange", "yellow", "gold", "brown", "olive", "cream", "beige"},
    "cool": {"blue", "purple", "green", "teal", "pink", "magenta", "gray", "silver"},
    "neutral": {"red", "orange", "yellow", "gold", "brown", "olive", "cream",
                "beige", "blue", "purple", "green", "teal", "pink", "magenta",
                "gray", "silver"},
}

# --- FR-7.2 rule 2: height-appropriate contrast ------------------------------
# Style theory: low contrast (tonal/monochrome) keeps the eye-line unbroken and
# elongates shorter frames; high contrast breaks the line and flatters taller
# frames; average height carries any contrast level.
HEIGHT_BANDS = (  # (band, min_cm inclusive, max_cm exclusive)
    ("petite", 0.0, 160.0),
    ("average", 160.0, 175.0),
    ("tall", 175.0, 999.0),
)
CONTRAST_BY_HEIGHT = {
    "petite": {"low", "medium"},
    "average": {"low", "medium", "high"},
    "tall": {"medium", "high"},
}

# --- FR-7.2 rule 3: proportion-appropriate shading ---------------------------
# Dark shades visually minimize, light shades visually emphasize.
CATEGORY_GROUPS = {
    "top": {"tops", "outerwear"},
    "bottom": {"bottoms"},
    "onepiece": {"dresses"},
    "footwear": {"footwear"},
}
PROPORTION_SHADING = {
    "top-heavy": {"top": {"dark"}, "bottom": {"light"}, "onepiece": set(),
                  "footwear": {"light", "medium", "dark"}},
    "bottom-heavy": {"top": {"light"}, "bottom": {"dark"}, "onepiece": set(),
                     "footwear": {"light", "medium", "dark"}},
    "balanced": {"top": {"light", "medium", "dark"},
                 "bottom": {"light", "medium", "dark"},
                 "onepiece": {"light", "medium", "dark"},
                 "footwear": {"light", "medium", "dark"}},
}

# --- deterministic keyword inference (fallback when catalog lacks the tag) ---
CONTRAST_KEYWORDS = {
    "high": ("high contrast", "contrast", "color-block", "colorblock"),
    "low": ("monochrome", "monochromatic", "tonal", "tone-on-tone"),
}
SHADE_KEYWORDS = {
    "dark": ("dark", "deep", "black", "navy", "charcoal", "espresso"),
    "light": ("light", "pale", "pastel", "white", "ivory", "cream"),
}
DEFAULT_CONTRAST = "medium"
DEFAULT_SHADE = "medium"


def height_band(height_cm: float) -> str:
    """Deterministic height -> band mapping (helper for FR-7.2 rule 2)."""
    for name, lo, hi in HEIGHT_BANDS:
        if lo <= height_cm < hi:
            return name
    return "average"


def infer_contrast(color_description: str) -> str:
    """Keyword -> contrast level; first match wins, else 'medium'."""
    text = (color_description or "").lower()
    for level, keywords in CONTRAST_KEYWORDS.items():
        if any(k in text for k in keywords):
            return level
    return DEFAULT_CONTRAST


def infer_shade(color_description: str) -> str:
    """Keyword -> shade level; first match wins, else 'medium'."""
    text = (color_description or "").lower()
    for level, keywords in SHADE_KEYWORDS.items():
        if any(k in text for k in keywords):
            return level
    return DEFAULT_SHADE