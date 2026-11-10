"""
catalog/color_rules.py
Single source of truth for image-text COLOR ALIGNMENT (SRS FR-4.7).

Both CatalogValidator implementations (the authoritative one wired into
catalog/views/core.py and the legacy catalog/validators.py) delegate here so
the validation rule and the "correct color to declare" suggestion can never
drift. Pure stdlib (colorsys) — no Django, no PIL — so it is import-safe from
either module.

Why this module exists
----------------------
The original HSV rule set left a *saturation dead zone*: muted-but-clearly
hued garments (light-wash denim, slate blue-gray, dusty rose) fell between the
achromatic ceiling (gray/white required s <= 0.2) and the chromatic floors
(blue required s >= 0.3, red s >= 0.35, green/brown s >= 0.25). A pixel in that
band matched NO rule, so EVERY mapped declaration was rejected and the seller
had no valid color to type — exactly the "#6e8391 declared Blue -> mismatch"
false rejection. Two fixes live here:

1. Contiguous thresholds. Every chromatic rule now uses s >= 0.2 and the
   achromatic rules use s <= 0.2, tiling the (s, v) plane with no gap, so any
   muted color resolves to its true hue family (denim -> Blue).
2. A total-cover classifier. suggest_declared_color() returns, for ANY hex, a
   color name that the validator will ACCEPT — first by strict rule, else by
   the nearest hue family (Orange/Yellow/Cyan/Purple/Pink), which passes via
   the documented "unmapped declaration is trusted" rule. The mismatch message
   embeds this suggestion so the seller always sees the correct color to use.
"""

import colorsys

# Ordered strict rules (priority matters where two bands overlap, e.g. dark
# orange is Brown before Red). Predicates receive normalized HSV (0..1).
HSV_COLOR_RULES = {
    "black":  lambda h, s, v: v <= 0.22,
    "white":  lambda h, s, v: v >= 0.78 and s <= 0.2,
    "brown":  lambda h, s, v: 0.035 <= h <= 0.13 and s >= 0.2 and v < 0.62,
    "red":    lambda h, s, v: (h <= 0.06 or h >= 0.94) and s >= 0.2,
    "green":  lambda h, s, v: 0.20 <= h <= 0.46 and s >= 0.2,
    "blue":   lambda h, s, v: 0.54 <= h <= 0.75 and s >= 0.2,
    "gray":   lambda h, s, v: s <= 0.2 and 0.22 < v < 0.78,
}

# Priority order used when several strict rules could match a pixel.
_RULE_PRIORITY = ("black", "white", "brown", "red", "green", "blue", "gray")

# Achromatic names map to the neutral color family used by the catalog
# (matches the CSV template, where White -> color_family "neutral").
_ACHROMATIC = {"black", "white", "gray"}

# Fallback hue bands (fractions of 360deg) covering the gaps the seven strict
# rules intentionally leave (yellow / cyan / purple / pink / bright orange).
# Reached only when no strict rule matches; the resulting name is NOT in
# HSV_COLOR_RULES, so a seller declaring it passes via the unmapped-trust rule
# while still describing the image truthfully.
_FALLBACK_HUE_BANDS = (
    (0.00, 0.06, "Red"),
    (0.06, 0.16, "Orange"),
    (0.16, 0.20, "Yellow"),
    (0.20, 0.45, "Green"),
    (0.45, 0.54, "Cyan"),
    (0.54, 0.72, "Blue"),
    (0.72, 0.86, "Purple"),
    (0.86, 0.95, "Pink"),
    (0.95, 1.00, "Red"),
)


def _parse_hsv(dominant_hex):
    digits = str(dominant_hex or "").lstrip("#").strip()
    if len(digits) < 6:
        raise ValueError(f"short hex: {dominant_hex}")
    r = int(digits[0:2], 16) / 255
    g = int(digits[2:4], 16) / 255
    b = int(digits[4:6], 16) / 255
    return colorsys.rgb_to_hsv(r, g, b)


def color_family_for(name):
    """color_family value for a suggested color name (achromatic -> neutral)."""
    return "neutral" if str(name).lower() in _ACHROMATIC else str(name).lower()


def classify_color(dominant_hex):
    """Return the color NAME a seller should declare for this dominant hex.

    Guaranteed to be a name the validator accepts: a strict rule match when one
    exists, otherwise the nearest fallback hue family (accepted via the
    unmapped-trust rule). Raises ValueError on an unparseable hex.
    """
    h, s, v = _parse_hsv(dominant_hex)
    for name in _RULE_PRIORITY:
        if HSV_COLOR_RULES[name](h, s, v):
            return name
    # No strict rule matched -> nearest hue family (covers yellow/cyan/purple/
    # pink/bright-orange gaps). s>0.2 here because s<=0.2 always hits an
    # achromatic strict rule, and v<=0.22 always hits black.
    for low, high, name in _FALLBACK_HUE_BANDS:
        if low <= h < high:
            return name
    return "Gray"  # defensive; unreachable because the bands tile [0, 1).


def suggest_declared_color(dominant_hex):
    """Full suggestion payload embedded in mismatch messages + used by the UI.

    Returns {"name", "family", "hex", "description"} or None if the hex cannot
    be parsed (callers must then fall back to their own heuristic).
    """
    try:
        name = classify_color(dominant_hex)
    except ValueError:
        return None
    family = color_family_for(name)
    hex_text = str(dominant_hex).lower()
    return {
        "name": name,
        "family": family,
        "hex": hex_text,
        "description": f"{name} ({hex_text}) as photographed",
    }


def alignment_result(declared_color, dominant_hex):
    """(is_valid, message) for FR-4.7 color alignment, with a built-in fix.

    Mirrors the historical contract of CatalogValidator.validate_color_alignment
    (so existing tests and both call sites keep working) while appending the
    correct color to declare whenever the declaration mismatches the image.
    """
    declared_lower = str(declared_color or "").lower()
    declared_names = [name for name in HSV_COLOR_RULES if name in declared_lower]

    # Unmapped declaration (e.g. "Purple", "Navy", "Beige"): trusted, not
    # checked against the seven strict bands. This is also what makes a
    # fallback suggestion pass on re-upload.
    if not declared_names:
        return True, "Color alignment OK"

    try:
        h, s, v = _parse_hsv(dominant_hex)
    except (ValueError, TypeError):
        return False, f"Invalid dominant color value: {dominant_hex}"

    if any(HSV_COLOR_RULES[name](h, s, v) for name in declared_names):
        return True, "Color alignment OK"

    suggestion = suggest_declared_color(dominant_hex)
    if suggestion:
        return False, (
            f"Color mismatch: declared '{declared_color}' but the image's "
            f"dominant color is {suggestion['hex']}. "
            f"Correct color to declare: \"{suggestion['name']}\" "
            f"(color family: {suggestion['family']})."
        )
    return False, (
        f"Color mismatch: declared '{declared_color}' but image appears to be "
        f"a different color ({dominant_hex})"
    )