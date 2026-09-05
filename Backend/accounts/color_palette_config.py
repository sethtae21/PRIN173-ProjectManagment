"""
Human-readable color family to palette tags mapping.
This is the auditable "knowledge table" for the rule-based expert system.
Per FR-3.2 + FR-7.1 + §3.7
"""

COLOR_PALETTE_MAPPING = {
    'red': {
        'tags': ['warm-tone', 'vibrant', 'autumn', 'gold', 'bold'],
        'hue_range': (345, 15),  # Wraps around hue wheel
        'skin_tones': ['warm', 'olive', 'deep']
    },
    'blue': {
        'tags': ['cool-tone', 'calm', 'winter', 'silver', 'professional'],
        'hue_range': (195, 255),
        'skin_tones': ['cool', 'fair', 'medium']
    },
    'green': {
        'tags': ['cool-tone', 'nature', 'spring', 'earth-tone'],
        'hue_range': (90, 170),
        'skin_tones': ['warm', 'neutral', 'olive']
    },
    'black': {
        'tags': ['neutral', 'versatile', 'formal', 'timeless', 'slimming'],
        'hue_range': None,  # Achromatic
        'skin_tones': ['all']
    },
    'white': {
        'tags': ['neutral', 'clean', 'fresh', 'versatile', 'light'],
        'hue_range': None,  # Achromatic
        'skin_tones': ['all']
    },
    'gray': {
        'tags': ['neutral', 'professional', 'subtle', 'modern'],
        'hue_range': None,  # Achromatic
        'skin_tones': ['cool', 'neutral']
    },
    'brown': {
        'tags': ['warm-tone', 'earth-tone', 'autumn', 'classic'],
        'hue_range': (15, 45),
        'skin_tones': ['warm', 'deep', 'olive']
    },
    'yellow': {
        'tags': ['warm-tone', 'vibrant', 'cheerful', 'spring'],
        'hue_range': (45, 65),
        'skin_tones': ['warm', 'fair']
    },
    'orange': {
        'tags': ['warm-tone', 'energetic', 'autumn', 'bold'],
        'hue_range': (15, 30),
        'skin_tones': ['warm', 'olive']
    },
    'purple': {
        'tags': ['cool-tone', 'royal', 'creative', 'luxury'],
        'hue_range': (255, 315),
        'skin_tones': ['cool', 'deep']
    },
    'pink': {
        'tags': ['warm-tone', 'feminine', 'soft', 'romantic'],
        'hue_range': (315, 345),
        'skin_tones': ['cool', 'fair', 'warm']
    },
    'navy': {
        'tags': ['cool-tone', 'professional', 'classic', 'versatile'],
        'hue_range': (210, 240),
        'skin_tones': ['all']
    },
}

def get_palette_tags(color_family):
    """Lookup function to get palette tags for a color family"""
    color_family_lower = str(color_family).lower().strip()
    
    # Direct match
    if color_family_lower in COLOR_PALETTE_MAPPING:
        return COLOR_PALETTE_MAPPING[color_family_lower]['tags']
    
    # Partial match
    for key, value in COLOR_PALETTE_MAPPING.items():
        if key in color_family_lower or color_family_lower in key:
            return value['tags']
    
    # Default tags
    return ['neutral', 'versatile']