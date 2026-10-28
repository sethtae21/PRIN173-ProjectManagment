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
# S/M/L STORE POLICY (KAN-FIX): the store stocks Small, Medium, Large ONLY.
# Maps categorical sizes to standard unisex adult chest/body girth ranges in
# CM so the UI can show "M (96-102 cm)". Display-only:
# never stored, never scored. Sellers input S/M/L labels ONLY (see
# validate_size_label); cm entries are rejected at upload/edit time.
SIZE_RANGE_TABLE = {
    'S': {'cm': (86, 91)},
    'M': {'cm': (96, 102)},
    'L': {'cm': (107, 112)},
}

# --- Footwear regional size table (display-only, expert-encoded) ------------
# One row per EU size with its US/UK equivalents and the EU-based foot-length
# bracket in CM. BACKEND CM CALCULATION ALWAYS USES THE EU COLUMN: a US or UK
# input is first resolved to its EU row, then the EU cm bracket is used.
# The product page displays all three regional equivalents.
# Approximation chart (whole sizes only): EU = US + 31, UK = US - 2.
FOOTWEAR_SIZE_TABLE = (
    # (eu, us, uk, foot-length cm)
    (35, 4, 2, (22.0, 22.5)),
    (36, 5, 3, (22.5, 23.0)),
    (37, 6, 4, (23.0, 23.5)),
    (38, 7, 5, (23.5, 24.0)),
    (39, 8, 6, (24.0, 24.5)),
    (40, 9, 7, (24.5, 25.0)),
    (41, 10, 8, (25.0, 25.5)),
    (42, 11, 9, (25.5, 26.0)),
    (43, 12, 10, (26.0, 26.5)),
    (44, 13, 11, (26.5, 27.0)),
    (45, 14, 12, (27.0, 27.5)),
    (46, 15, 13, (27.5, 28.0)),
)

# --- Size label validation (CSV upload + listing edits) ----------------------
# S/M/L STORE POLICY: clothing labels are S, M, L only. Footwear additionally
# accepts regional shoe codes WITH a region prefix (US 9, EU 40, UK 7); a bare
# number ("40") is rejected because the region would be ambiguous.
CLOTHING_SIZE_OPTIONS = ('S', 'M', 'L')
_FOOTWEAR_REGIONAL_RE = re.compile(r'^(?:US|EU|UK)\s?\d{1,3}(?:\.\d+)?$', re.IGNORECASE)
_MEASURED_RE = re.compile(
    r'\d+(?:\.\d+)?\s*(?:inch|inches|in|cm|centimeter|centimeters|mm|"|″)',
    re.IGNORECASE,
)


def _parse_regional(size_text):
    """Return (prefix, number) for a prefixed regional code, else None."""
    raw = str(size_text or '').strip()
    if not _FOOTWEAR_REGIONAL_RE.match(raw):
        return None
    prefix = raw[:2].upper()
    try:
        return prefix, float(raw[2:].strip())
    except ValueError:
        return None


def get_footwear_row(size_text):
    """Find the FOOTWEAR_SIZE_TABLE row matching an EU/US/UK code, else None."""
    parsed = _parse_regional(size_text)
    if not parsed:
        return None
    prefix, number = parsed
    index = {'EU': 0, 'US': 1, 'UK': 2}[prefix]
    for row in FOOTWEAR_SIZE_TABLE:
        if float(row[index]) == number:
            return row
    return None


def get_footwear_equivalents(size_text):
    """Return {'eu','us','uk','cm'} for a regional code, else None.
    'cm' is ALWAYS the EU-based foot-length bracket."""
    row = get_footwear_row(size_text)
    if not row:
        return None
    eu, us, uk, cm = row
    return {'eu': f"EU {eu}", 'us': f"US {us}", 'uk': f"UK {uk}", 'cm': cm}


def validate_size_label(size_text, category=''):
    """
    Deterministic size-format rule. Returns (is_valid, error_message_or_None).

    Clothing (tops/bottoms/dresses/outerwear): label must be S, M, or L.
    Footwear: S/M/L or a prefixed regional code in the supported table
    (EU 35-46, US 4-15, UK 2-13, whole sizes).
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
        if key in CLOTHING_SIZE_OPTIONS:
            return True, None
        if _FOOTWEAR_REGIONAL_RE.match(key):
            if get_footwear_row(key) is not None:
                return True, None
            return False, (
                f"Invalid size '{raw}'. Regional shoe sizes must be whole sizes in the "
                f"supported range: EU 35-46, US 4-15, or UK 2-13."
            )
        return False, (
            f"Invalid size '{raw}'. Footwear sizes must be regional codes with a region "
            f"prefix (e.g., US 9, EU 40, UK 7) or standard labels "
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
    Convert a size label to its display ranges.

    Clothing (S/M/L): {'label', 'cm', 'regions': None}.
    Footwear regional: {'label', 'cm', 'regions'} where 'cm' is the EU-based
    foot-length bracket and 'regions' is the triple display string
    ("EU 40 · US 9 · UK 7").
    Returns None for unknown sizes. Display-only: never scored, never stored.
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

    equiv = get_footwear_equivalents(raw_key)
    if equiv:
        return {
            'label': raw_key,
            'cm': f"({equiv['cm'][0]}-{equiv['cm'][1]} cm)",
            'regions': f"{equiv['eu']} · {equiv['us']} · {equiv['uk']}",
        }
    return None


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