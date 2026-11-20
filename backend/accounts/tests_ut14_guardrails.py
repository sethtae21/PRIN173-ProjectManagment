"""Unit case UT-14 from Software Testing & QA Plan §3.3 (backend portion).

Split of responsibility recorded for the traceability crosswalk:
  * UI portion (size S equipped -> height/Body Build control stops at the
    size-compatible sub-range with the allowed-range message) is evidenced by
    the AV-011 E2E case in docs/evidence/avatar-tests/AV-011/.
  * Unit scope here is the backend defensive guard: the global supported
    ranges 120-220 cm and 86-112 cm (Scope Baseline §1.2) must still be
    enforced by the preset serializer regardless of any client-side cap.

Test-only addition: no application source is modified.
"""
from django.test import SimpleTestCase

from accounts.serializers import AvatarPresetSerializer


def _preset(**overrides):
    data = {
        'name': 'UT14 Preset',
        'gender': 'female',
        'height': 170,
        'weight': 60,
        'body_build_cm': 95,
    }
    data.update(overrides)
    return data


class UT14BackendGlobalRangeTests(SimpleTestCase):
    """Backend still enforces the global 120-220 cm / 86-112 cm bounds."""

    def test_ut14_backend_rejects_body_build_beyond_112(self):
        serializer = AvatarPresetSerializer(data=_preset(body_build_cm=113))
        self.assertFalse(serializer.is_valid())
        self.assertIn('Body build must be between 86 and 112 cm.',
                      str(serializer.errors['body_build_cm']))

    def test_ut14_backend_rejects_height_beyond_220(self):
        serializer = AvatarPresetSerializer(data=_preset(height=221))
        self.assertFalse(serializer.is_valid())
        self.assertIn('Height must be between 120 and 220 cm.',
                      str(serializer.errors['height']))

    def test_ut14_backend_accepts_global_boundaries(self):
        for height, build in ((120, 86), (220, 112)):
            with self.subTest(height=height, build=build):
                serializer = AvatarPresetSerializer(data=_preset(height=height, body_build_cm=build))
                self.assertTrue(serializer.is_valid(), str(serializer.errors))
