"""
FitFusion AI - color-theory & size-range knowledge table (rule-based engine).

Traceability: SRS FR-7.1, FR-7.2 | Scope Baseline WBS 1.3.5 | Charter OBJ-05.
Nature: deterministic, code-encoded knowledge (symbolic/heuristic AI).
No machine learning - every rule is human-readable and auditable.

Weight tuning: before the baseline freeze, bump WEIGHTS_VERSION and record the
change + rationale in the tuning log (KAN-107). AFTER the freeze, weight changes
are baselined changes and must go through the CCB (Charter Sec. 8).
"""
import re

WEIGHTS_VERSION = "1.1.0"

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

# --- Size range table (display-only, expert-encoded) -------------------------
# Maps categorical sizes to standard unisex adult chest/body girth ranges in
# CM so the UI can show "M (96-102 cm)". Display-only:
# never stored, never scored. Sellers input SML labels ONLY (see
# validate_size_label); cm entries are rejected at upload/edit time.
SIZE_RANGE_TABLE = {
    'XS': {'cm': (76, 81)},
    'S':  {'cm': (86, 91)},
    'M':  {'cm': (96, 102)},
    'L':  {'cm': (107, 112)},
    'XL': {'cm': (117, 122)},
    'XXL': {'cm': (127, 132)},
}

# --- Size label validation (CSV upload + listing edits) ----------------------
# Sellers must enter categorical labels only; measured sizes (e.g., "96 cm")
# are rejected with a descriptive reason (FR-4.7-style report,
# FR-4.8 display; supports OBJ-09 data quality). Footwear additionally accepts
# regional shoe codes (US 9, EU 40, UK 8).
CLOTHING_SIZE_OPTIONS = ('XS', 'S', 'M', 'L', 'XL', 'XXL')
_FOOTWEAR_REGIONAL_RE = re.compile(r'^(?:US|EU|UK)?\s?\d{1,3}(?:\.\d+)?$', re.IGNORECASE)
_MEASURED_RE = re.compile(
    r'\d+(?:\.\d+)?\s*(?:inch|inches|in|cm|centimeter|centimeters|mm|"|″)',
    re.IGNORECASE,
)


def validate_size_label(size_text, category=''):
    """
    Deterministic size-format rule. Returns (is_valid, error_message_or_None).

    Clothing (tops/bottoms/dresses/outerwear): label must be XS-XXL.
    Footwear: XS-XXL or a regional code (US 9, EU 40, UK 8).
    Any cm/measured entry is rejected for every category.
    Empty values pass here - presence is enforced by the required-field rule.
    """
    raw = str(size_text or '').strip()
    if not raw:
        return True, None

    key = raw.upper()
    cat = str(category or '').strip().lower()

    if _MEASURED_RE.search(raw):
        suffix = (
            " or a regional shoe size (e.g., US 9, EU 40)."
            if cat == 'footwear' else "."
        )
        return False, (
            f"Invalid size '{raw}': measured values with units (e.g., cm) are not accepted. "
            f"Enter a standard size label ({', '.join(CLOTHING_SIZE_OPTIONS)}){suffix}"
        )

    if cat == 'footwear':
        if key in CLOTHING_SIZE_OPTIONS or _FOOTWEAR_REGIONAL_RE.match(key):
            return True, None
        return False, (
            f"Invalid size '{raw}'. Footwear sizes must be regional codes "
            f"(e.g., US 9, EU 40, UK 8) or standard labels "
            f"({', '.join(CLOTHING_SIZE_OPTIONS)}); cm measurements are not accepted."
        )

    if key in CLOTHING_SIZE_OPTIONS:
        return True, None
    return False, (
        f"Invalid size '{raw}'. Use standard clothing sizes only: "
        f"{', '.join(CLOTHING_SIZE_OPTIONS)}. Do not enter cm measurements; "
        f"the product page shows the cm range automatically."
    )


def get_size_ranges(size_text):
    """
    Convert a categorical size label (XS-XXL) to its display ranges.

    Returns {'label', 'cm'} or None for footwear / regional /
    unknown sizes. Case- and whitespace-insensitive (" m " -> "M").
    Display-only: never used for scoring or validation.
    """
    if not size_text:
        return None
    key = str(size_text).strip().upper()
    entry = SIZE_RANGE_TABLE.get(key)
    if not entry:
        return None
    return {
        'label': key,
        'cm': f"({entry['cm'][0]}-{entry['cm'][1]} cm)",
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