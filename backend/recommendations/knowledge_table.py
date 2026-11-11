"""
FitFusion AI - color-theory & size-range knowledge table (rule-based engine).

Traceability: SRS FR-7.1, FR-7.2 | Scope Baseline WBS 1.3.5 | Charter OBJ-05.
Nature: deterministic, code-encoded knowledge (symbolic/heuristic AI).
No machine learning - every rule is human-readable and auditable.

Weight tuning: before the baseline freeze, bump WEIGHTS_VERSION and record the
change + rationale in the tuning log (KAN-107). AFTER the freeze, weight changes
are baselined changes and must go through the CCB (Charter Sec. 8).

Size-policy revision (integration with female/male avatar fix + size update):
* Petite / average / tall height categories REMOVED. Height is a single
  range: 120.0-218.0 cm. The FR-7.2 contrast rule now uses a deterministic
  midpoint split of that range (below / above 169.0 cm) - no named bands.
* Body build range added: 86.0-112.0 cm.
* Clothing sizes: S, M, L, XL, 2XL, 3XL, 4XL. The clothing size table is
  REFERENCE-ONLY (displayed on product details in the "AVAILABLE SIZE"
  block as e.g. "M (90-94 cm)" + "Standard size chart reference."):
  pure cm, no inches, no regional equivalents. Never scored, never stored.
* Footwear PERMANENTLY REMOVED from the catalog: the regional shoe-size
  table (EU/US/UK), its validation branches and its display helpers are
  gone. Regional codes like "US 9" / "EU 40" are now rejected everywhere.
* Body-proportion TOTAL OUTPUT = recommended size + average cm, where
  average = (height_cm + body_build_cm) / 2.
"""
import re

WEIGHTS_VERSION = "1.1.0"  # weights untouched by the size-policy revision

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

# --- Body ranges (single source of truth) ------------------------------------
HEIGHT_RANGE = (120.0, 218.0)      # cm, inclusive
BODY_BUILD_RANGE = (86.0, 112.0)   # cm, inclusive
HEIGHT_MIDPOINT = (HEIGHT_RANGE[0] + HEIGHT_RANGE[1]) / 2.0  # 169.0 cm

# --- FR-7.2 rule 2: height-appropriate contrast ------------------------------
# No named height bands anymore: a deterministic midpoint split of
# HEIGHT_RANGE. Shorter stature keeps the silhouette unbroken (low/medium
# contrast); taller stature can carry silhouette-breaking contrast.
CONTRAST_BY_HEIGHT_ZONE = {
    "below-midpoint": {"low", "medium"},
    "above-midpoint": {"medium", "high"},
}


def clamp_range(value, bounds):
    """Clamp a numeric value into bounds; invalid input falls back to min."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = bounds[0]
    return min(bounds[1], max(bounds[0], number))


def height_zone(height_cm) -> str:
    """Deterministic height -> zone mapping (helper for FR-7.2 rule 2)."""
    height = clamp_range(height_cm, HEIGHT_RANGE)
    return "below-midpoint" if height < HEIGHT_MIDPOINT else "above-midpoint"


def allowed_contrast(height_cm) -> set:
    """Contrast levels recommended for a height inside 120-218 cm."""
    return CONTRAST_BY_HEIGHT_ZONE[height_zone(height_cm)]


# --- FR-7.2 rule 3: proportion-appropriate shading ---------------------------
# Footwear group removed: the catalog no longer supports footwear items.
CATEGORY_GROUPS = {
    "top": {"tops", "outerwear"},
    "bottom": {"bottoms"},
    "onepiece": {"dresses"},
}
PROPORTION_SHADING = {
    "top-heavy": {"top": {"dark"}, "bottom": {"light"}, "onepiece": set()},
    "bottom-heavy": {"top": {"light"}, "bottom": {"dark"}, "onepiece": set()},
    "balanced": {"top": {"light", "medium", "dark"},
                 "bottom": {"light", "medium", "dark"},
                 "onepiece": {"light", "medium", "dark"}},
}

# --- Size range table (REFERENCE-ONLY, expert-encoded) -----------------------
# Clothing sizes: displayed on product details as "M (90-94 cm)".
# Pure CM - no inches, no regional equivalents. Never scored, never stored.
# Sellers input size labels ONLY (see validate_size_label); cm entries are
# rejected at upload/edit time.
# Bands are half-open [lo, hi) except the last band, which includes 112 cm,
# so the whole 86-112 cm body-build range maps to exactly one size.
SIZE_RANGE_TABLE = {
    'S':   {'cm': (86, 90)},
    'M':   {'cm': (90, 94)},
    'L':   {'cm': (94, 98)},
    'XL':  {'cm': (98, 102)},
    '2XL': {'cm': (102, 106)},
    '3XL': {'cm': (106, 110)},
    '4XL': {'cm': (110, 112)},
}

SIZE_OPTIONS = ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')
CLOTHING_SIZE_OPTIONS = SIZE_OPTIONS  # legacy alias (same policy for clothing)

# --- Size label validation (CSV upload + listing edits) ----------------------
# Every category (tops/bottoms/dresses/outerwear): label must be one of S..4XL.
# Any cm/measured entry is rejected. Footwear was permanently removed, so
# regional shoe codes (US/EU/UK) are no longer accepted for any category.
_MEASURED_RE = re.compile(
    r'\d+(?:\.\d+)?\s*(?:inch|inches|in|cm|centimeter|centimeters|mm|"|″)',
    re.IGNORECASE,
)


def validate_size_label(size_text, category=''):
    """
    Deterministic size-format rule. Returns (is_valid, error_message_or_None).

    All categories: label must be S, M, L, XL, 2XL, 3XL, or 4XL.
    Any cm/measured entry is rejected. Regional shoe codes are rejected
    (footwear was permanently removed from the catalog).
    The `category` parameter is kept for call-site compatibility only.
    Empty values pass here - presence is enforced by the required-field rule.
    """
    raw = str(size_text or '').strip()
    if not raw:
        return True, None

    key = raw.upper()

    if _MEASURED_RE.search(raw):
        return False, (
            f"Invalid size '{raw}': measured values with units (e.g., cm) are not accepted. "
            f"Enter a standard size label ({', '.join(SIZE_OPTIONS)})."
        )

    if key in SIZE_OPTIONS:
        return True, None
    return False, (
        f"Invalid size '{raw}'. Use standard clothing sizes only: "
        f"{', '.join(SIZE_OPTIONS)}. Do not enter cm measurements; "
        f"the product page shows the cm range automatically."
    )


def get_size_ranges(size_text):
    """
    Convert a size label to its display ranges - the exact content of the
    product-details "AVAILABLE SIZE" block.

    Clothing (S..4XL): {'label', 'cm', 'regions': None} where 'cm' renders as
    "(90-94 cm)" so the page shows e.g. "M (90-94 cm)". The 'regions' key is
    kept (always None) for payload-shape compatibility after the footwear
    removal. Returns None for unknown sizes. Display-only: never scored,
    never stored.
    """
    if not size_text:
        return None
    raw_key = str(size_text).strip().upper()

    entry = SIZE_RANGE_TABLE.get(raw_key)
    if entry:
        return {
            'label': raw_key,
            'cm': f"({entry['cm'][0]}-{entry['cm'][1]} cm)",
            'regions': None,
        }
    return None


def size_for_body_build(body_build_cm):
    """Map a body-build measurement (86-112 cm) to its S..4XL size label."""
    value = clamp_range(body_build_cm, BODY_BUILD_RANGE)
    last = SIZE_OPTIONS[-1]
    for label in SIZE_OPTIONS:
        lo, hi = SIZE_RANGE_TABLE[label]['cm']
        if label == last:
            if lo <= value <= hi:
                return label
        elif lo <= value < hi:
            return label
    return last


def body_proportion(height_cm, body_build_cm):
    """
    TOTAL body-proportion output: {'size': <S..4XL>, 'average': <cm>}.

    size    = SIZE_RANGE_TABLE lookup on the clamped body build (86-112 cm).
    average = (height_cm + body_build_cm) / 2, clamped to 120-218 / 86-112
              first, rounded to one decimal.
    """
    height = clamp_range(height_cm, HEIGHT_RANGE)
    build = clamp_range(body_build_cm, BODY_BUILD_RANGE)
    return {
        'size': size_for_body_build(build),
        'average': round((height + build) / 2.0, 1),
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