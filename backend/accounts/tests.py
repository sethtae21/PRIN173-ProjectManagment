from datetime import timedelta

from django.test import TestCase
from django.test import SimpleTestCase
from unittest.mock import Mock, patch
from types import SimpleNamespace
from rest_framework import serializers as drf_serializers
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from accounts.archive import ARCHIVE_GRACE_DAYS
from accounts.models import User
from accounts.serializers import AvatarPresetSerializer
from accounts.serializers.auth_serializers import (
    LoginSerializer,
    RegistrationContactSerializer,
    RegistrationSerializer,
    validate_email_format,
    validate_password_strength,
)
from accounts.validators import validate_mobile_number, validate_postal_code
from accounts.views import auth_views
from accounts.views.preset_views import AvatarPresetViewSet
from commerce.models import Cart, Order
from outfits.models import AvatarPreset, Outfit
from accounts.storage import GridFSStorage


class AvatarPresetCRUDTests(TestCase):
    """KAN-58: Preset CRUD — owner-only, guests rejected (FR-2.5, 2.8–2.10)."""

    def setUp(self):
        self.client = APIClient()
        # FIX: User model is email-based (no username field) and roles are
        # 'shopper'/'seller'; the old username=/role='user' kwargs raised TypeError.
        self.user = User.objects.create_user(
            email='preset@test.com', full_name='Preset User',
            password='Test123!@#', role='shopper')
        self.other = User.objects.create_user(
            email='other@test.com', full_name='Other User',
            password='Test123!@#', role='shopper')
        self.client.force_authenticate(self.user)
        self.payload = {
            'name': 'My Daily Preset',
            'gender': 'female',
            'height': 165.0,
            'weight': 55.0,
            'skin_tone': '#d9aa82',
            'shoulder': 'average',
            'waist': 'slim',
            'hip': 'average',
            'cup_size': 'B',
            'thigh': 'average',
        }

    def test_create_preset(self):
        res = self.client.post('/presets/', self.payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['name'], 'My Daily Preset')

    def test_guest_rejected(self):
        self.client.force_authenticate(None)
        res = self.client.get('/presets/')
        self.assertIn(res.status_code, (401, 403))

    def test_list_returns_only_own_presets(self):
        self.client.post('/presets/', self.payload, format='json')
        self.client.force_authenticate(self.other)
        res = self.client.get('/presets/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_other_user_cannot_update_or_delete(self):
        pid = self.client.post('/presets/', self.payload, format='json').data['id']
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.patch(f'/presets/{pid}/', {'name': 'hack'}, format='json').status_code, 404)
        self.assertEqual(
            self.client.delete(f'/presets/{pid}/').status_code, 404)

    def test_male_with_cup_size_rejected(self):
        bad = dict(self.payload, gender='male', cup_size='B')
        res = self.client.post('/presets/', bad, format='json')
        self.assertEqual(res.status_code, 400)


# ==========================================
# KAN-56 ADDED: Account Management Tests
# ==========================================
class AccountManagementTests(TestCase):
    """KAN-56: profile view/update, password change, account archive
    (FR-1.2–1.4, RA 10173).

    CHANGED (stale-test fix):
      * Password change lives at POST /auth/change-password/ with
        old_password / new_password / new_password_confirm. The old
        /profile/password/ + current_password contract no longer exists (404).
      * DELETE /profile/ is the baselined FR-1.4 ARCHIVE grace window (204),
        not a hard delete. Linked data is RETAINED for
        ARCHIVE_GRACE_DAYS and only relocated/purged by accounts/archive.py.
    """

    def setUp(self):
        self.client = APIClient()
        # FIX: email-based user creation (see note in AvatarPresetCRUDTests).
        self.user = User.objects.create_user(
            email='acct@test.com', full_name='Acct User',
            password='OldPass123!@#', role='shopper')
        self.client.force_authenticate(self.user)

    def test_guest_cannot_view_profile(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/profile/').status_code, (401, 403))

    def test_view_profile(self):
        res = self.client.get('/profile/')
        self.assertEqual(res.status_code, 200)
        # FIX: serializer exposes email, not username.
        self.assertEqual(res.data['user']['email'], 'acct@test.com')

    def test_profile_payload_excludes_body_fields(self):
        """Avatar refactor regression: body/skin data must NOT leak from /profile/.
        They are owned exclusively by outfits.AvatarPreset now."""
        res = self.client.get('/profile/')
        self.assertEqual(res.status_code, 200)
        user_payload = res.data['user']
        for field in ('skin_tone', 'height', 'weight', 'body_proportions'):
            self.assertNotIn(field, user_payload)

    def test_update_profile(self):
        # FIX: skin_tone/height no longer exist on User; profile updates now
        # cover contact/address fields only (body data lives on presets).
        res = self.client.patch(
            '/profile/',
            {'mobile': '09123456789', 'city': 'Makati City'},
            format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.mobile, '09123456789')
        self.assertEqual(self.user.city, 'Makati City')

    def test_update_profile_ignores_legacy_body_fields(self):
        """Legacy clients sending body fields get them silently ignored (no crash)."""
        res = self.client.patch(
            '/profile/',
            {'city': 'Taguig City', 'height': 180, 'skin_tone': '#ffffff'},
            format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.city, 'Taguig City')
        self.assertFalse(hasattr(self.user, 'skin_tone'))
        self.assertFalse(hasattr(self.user, 'height'))

    def test_password_change_wrong_current_rejected(self):
        # FIX: canonical route + payload keys (see PasswordChangePersistenceTests).
        res = self.client.post(
            '/auth/change-password/',
            {
                'old_password': 'WrongPass1!',
                'new_password': 'NewPass123!@#',
                'new_password_confirm': 'NewPass123!@#',
            },
            format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPass123!@#'))

    def test_password_change_success_and_login(self):
        # FIX: canonical route + payload keys (see PasswordChangePersistenceTests).
        res = self.client.post(
            '/auth/change-password/',
            {
                'old_password': 'OldPass123!@#',
                'new_password': 'NewPass123!@#',
                'new_password_confirm': 'NewPass123!@#',
            },
            format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass123!@#'))
        self.client.force_authenticate(None)
        # FIX: login is email-based.
        login = self.client.post('/auth/login/',
                                 {'email': 'acct@test.com', 'password': 'NewPass123!@#'},
                                 format='json')
        self.assertEqual(login.status_code, 200)

    @patch('accounts.views.core.blacklist_refresh_token')
    def test_delete_account_archives_and_blocks_login(self, mock_blacklist):
        """FR-1.4 BASELINED grace window (replaces the old hard-delete test).

        DELETE /profile/ archives the account: HTTP 204, status='archive',
        is_active=False, archived_at stamped, refresh token blacklisted, and
        login blocked. EVERY linked record is RETAINED untouched for
        ARCHIVE_GRACE_DAYS so support can restore; the RA 10173 erasure /
        relocation proof belongs to the prune sweep (accounts/archive.py),
        which runs after the window closes — not to this endpoint.
        """
        preset = AvatarPreset.objects.create(
            user=self.user, name='P', gender='female',
            height=165, weight=55, skin_tone='#d9aa82'
        )
        outfit = Outfit.objects.create(user=self.user, name='My Outfit')
        cart = Cart.objects.create(user=self.user)
        order = Order.objects.create(
            user=self.user,
            order_number='FF-DELETE-0001',
            status='paid',
            recipient_name='Acct User',
            recipient_email='acct@test.com',
            contact_number='09123456789',
            shipping_address='123 Sample Street, Makati',
            payment_method='Cash',
            total_amount='250.00',
        )

        refresh = RefreshToken.for_user(self.user)

        # Archive the account, blacklisting the supplied refresh token.
        res = self.client.delete('/profile/', {'refresh': str(refresh)}, format='json')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(res.content, b'')
        mock_blacklist.assert_called_once()

        # The account row is RETAINED (cold-relocation happens later).
        self.assertTrue(User.objects.filter(email='acct@test.com').exists())
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, 'archive')
        self.assertFalse(self.user.is_active)
        self.assertIsNotNone(self.user.archived_at)

        # The 90-day grace-window clock starts at archived_at.
        self.assertEqual(
            self.user.archive_due_date,
            self.user.archived_at + timedelta(days=ARCHIVE_GRACE_DAYS),
        )

        # ALL linked data survives the grace window (restorable by support).
        self.assertTrue(AvatarPreset.objects.filter(pk=preset.pk).exists())
        self.assertTrue(Outfit.objects.filter(pk=outfit.pk).exists())
        self.assertTrue(Cart.objects.filter(pk=cart.pk).exists())
        order.refresh_from_db()
        self.assertEqual(order.user_id, self.user.pk)
        self.assertEqual(order.recipient_name, 'Acct User')
        self.assertEqual(order.contact_number, '09123456789')
        self.assertEqual(order.recipient_email, 'acct@test.com')
        self.assertEqual(order.shipping_address, '123 Sample Street, Makati')

        # Login is blocked while the account is archived.
        self.client.force_authenticate(None)
        login = self.client.post('/auth/login/',
                                 {'email': 'acct@test.com', 'password': 'OldPass123!@#'},
                                 format='json')
        self.assertEqual(login.status_code, 400)


class RegistrationAndJWTTests(TestCase):
    def test_registration_assigns_role_and_issues_user_bound_jwt(self):
        registrations = (
            {
                'email': 'new-shopper@test.com',
                'full_name': 'New Shopper',
                'password': 'Test123!@#',
                'password_confirm': 'Test123!@#',
                'mobile': '09123456780',
            },
            {
                'email': 'new-seller@test.com',
                'full_name': 'New Seller',
                'password': 'Test123!@#',
                'password_confirm': 'Test123!@#',
                'role': 'seller',
                'store_name': 'New Seller Store',
                'mobile': '09123456781',
            },
        )

        for payload, expected_role in zip(registrations, ('shopper', 'seller')):
            with self.subTest(role=expected_role):
                response = self.client.post('/auth/register/', payload, format='json')
                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(response.data['user']['role'], expected_role)
                user = User.objects.get(email=payload['email'])

                tokens = response.data['tokens']
                self.assertTrue(tokens['access'])
                self.assertTrue(tokens['refresh'])
                access_token = AccessToken(tokens['access'])
                self.assertEqual(str(access_token['user_id']), str(user.pk))

                login = self.client.post(
                    '/auth/login/',
                    {'email': payload['email'], 'password': payload['password']},
                    format='json',
                )
                self.assertEqual(login.status_code, 200, login.data)
                self.assertEqual(login.data['user']['role'], expected_role)
                self.assertTrue(login.data['tokens']['access'])
                self.assertTrue(login.data['tokens']['refresh'])
                self.assertEqual(user.role, expected_role)


class PasswordChangePersistenceTests(TestCase):
    """Password changes are stored for both registered account roles."""

    def change_password(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client.post(
            '/auth/change-password/',
            {
                'old_password': 'OldPass123!@#',
                'new_password': 'NewPass123!@#',
                'new_password_confirm': 'NewPass123!@#',
            },
            format='json',
        )

    def test_shopper_password_change_is_persisted(self):
        user = User.objects.create_user(
            email='password-shopper@test.com',
            full_name='Password Shopper',
            password='OldPass123!@#',
            role='shopper',
        )

        response = self.change_password(user)

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewPass123!@#'))

    def test_seller_password_change_is_persisted(self):
        user = User.objects.create_seller(
            email='password-seller@test.com',
            full_name='Password Seller',
            store_name='Password Store',
            password='OldPass123!@#',
        )

        response = self.change_password(user)

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewPass123!@#'))


class GridFSStorageDeletionTests(SimpleTestCase):
    def test_delete_finds_object_id_backed_image_fields(self):
        from bson import ObjectId

        file_id = ObjectId('507f1f77bcf86cd799439011')
        stored_file = Mock(_id=file_id)
        gridfs = Mock()
        gridfs.find_one.return_value = stored_file
        storage = GridFSStorage()
        storage._fs = gridfs
        storage._use_gridfs = True

        storage.delete(str(file_id))

        gridfs.find_one.assert_called_once_with({'_id': file_id})
        gridfs.delete.assert_called_once_with(file_id)

    def test_delete_falls_back_to_filename_for_non_object_id_keys(self):
        stored_file = Mock(_id='legacy-id')
        gridfs = Mock()
        gridfs.find_one.return_value = stored_file
        storage = GridFSStorage()
        storage._fs = gridfs
        storage._use_gridfs = True

        storage.delete('legacy-name.png')

        # KAN-119: delete() looks the name up VERBATIM, and _save() stores the
        # full generated name (upload_to prefix + extension). The previous
        # expectation of a stripped stem did not match the implementation.
        gridfs.find_one.assert_called_once_with({'filename': 'legacy-name.png'})
        gridfs.delete.assert_called_once_with('legacy-id')

    # ------------------------------------------------------------------
    # KAN-119 cleanup contract (supports UT-13).
    #   GridFS unreachable  -> FAIL FAST. A silent return for an outage is
    #                          what makes an orphaned image look cleaned.
    #   File already absent -> idempotent no-op, never an exception.
    # Injected Mock GridFS: no Atlas connection, no database (SimpleTestCase).
    # ------------------------------------------------------------------
    def test_delete_propagates_failure_when_gridfs_is_unavailable(self):
        gridfs = Mock()
        storage = GridFSStorage()
        storage._fs = gridfs

        # create=False on purpose: if this internal boundary ever drifts, the
        # test errors loudly instead of patching a phantom attribute.
        with patch.object(storage, '_require_fs',
                          side_effect=FileNotFoundError('GridFS is not reachable right now')):
            with self.assertRaises(FileNotFoundError):
                storage.delete('507f1f77bcf86cd799439011')

        gridfs.find_one.assert_not_called()
        gridfs.delete.assert_not_called()

    def test_delete_is_a_noop_when_the_file_is_already_absent(self):
        from bson import ObjectId

        cases = (
            ('507f1f77bcf86cd799439011', {'_id': ObjectId('507f1f77bcf86cd799439011')}),
            ('catalog/front/legacy.png', {'filename': 'catalog/front/legacy.png'}),
        )
        for key, first_query in cases:
            with self.subTest(key=key):
                gridfs = Mock()
                gridfs.find_one.return_value = None
                storage = GridFSStorage()
                storage._fs = gridfs

                with self.assertLogs('accounts.storage', level='WARNING') as logs:
                    self.assertIsNone(storage.delete(key))

                self.assertEqual(gridfs.find_one.call_args_list[0].args[0], first_query)
                gridfs.delete.assert_not_called()
                self.assertTrue(any('not found' in message for message in logs.output))


class DatabasePingRedactionTests(SimpleTestCase):
    def test_ping_result_never_contains_the_connection_uri(self):
        from accounts.health_utils import ping

        target = {
            'uri': 'mongodb+srv://user:secret@example.mongodb.net/fitfusion',
            'is_srv': True,
            'cluster': 'example.mongodb.net',
            'database': 'fitfusion',
            'atlas': True,
            'local': False,
            'tls': 'implied-by-srv',
            'tls_disabled_warning': False,
        }
        client = Mock()
        client.server_info.return_value = {'version': '8.0'}

        with patch('accounts.health_utils.resolve_target', return_value=target), \
             patch('pymongo.MongoClient', return_value=client):
            result = ping()

        self.assertTrue(result['ok'])
        self.assertNotIn('uri', result)
        self.assertNotIn('secret', str(result))
class AuthValidationCoverageTests(TestCase):
    """Focused coverage for auth serializers/validators and legacy auth views."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            full_name='Coverage User', email='coverage@test.com',
            password='Test123!@#', role='user')

    def test_password_policy_rejects_each_weak_case(self):
        weak = {
            'short': 'Aa1!',
            'no_upper': 'lowercase1!',
            'no_lower': 'UPPERCASE1!',
            'no_number': 'NoNumber!',
            'no_special': 'NoSpecial1',
        }
        for label, password in weak.items():
            with self.subTest(case=label):
                with self.assertRaises(drf_serializers.ValidationError):
                    validate_password_strength(password)
        self.assertEqual(validate_password_strength('Strong123!'), 'Strong123!')

    def test_email_format_helper_rejects_invalid_address(self):
        self.assertEqual(validate_email_format('ok@test.com'), 'ok@test.com')
        with self.assertRaises(drf_serializers.ValidationError):
            validate_email_format('not-an-email')

    def test_contact_serializer_rejects_duplicates_and_bad_values(self):
        User.objects.create_seller(
            full_name='Taken Seller', email='taken@test.com',
            store_name='Taken Store', password='Test123!@#',
            role='seller', mobile='09123456789')

        duplicate = RegistrationContactSerializer(data={
            'email': 'TAKEN@test.com', 'mobile': '09123456789',
            'store_name': 'taken store'})
        self.assertFalse(duplicate.is_valid())
        for field in ('email', 'mobile', 'store_name'):
            self.assertIn(field, duplicate.errors)

        short_mobile = RegistrationContactSerializer(data={
            'email': 'short@test.com', 'mobile': '0912345678'})
        self.assertFalse(short_mobile.is_valid())

        wrong_prefix = RegistrationContactSerializer(data={
            'email': 'prefix@test.com', 'mobile': '08123456789'})
        self.assertFalse(wrong_prefix.is_valid())

        blank_store = RegistrationContactSerializer(data={
            'email': 'blank-store@test.com', 'mobile': '09123456780',
            'store_name': '   '})
        self.assertTrue(blank_store.is_valid(), blank_store.errors)

    def test_registration_serializer_rejects_name_mismatch_and_seller_without_store(self):
        base = {
            'email': 'valid@test.com', 'full_name': 'Valid Name',
            'password': 'Test123!@#', 'password_confirm': 'Test123!@#',
            'mobile': '09123456780'}

        short_name = RegistrationSerializer(data={**base, 'full_name': 'Solo'})
        self.assertFalse(short_name.is_valid())
        self.assertIn('full_name', short_name.errors)

        mismatch = RegistrationSerializer(data={**base, 'password_confirm': 'Different1!'})
        self.assertFalse(mismatch.is_valid())
        self.assertIn('password_confirm', mismatch.errors)

        seller_no_store = RegistrationSerializer(
            data={**base, 'role': 'seller', 'store_name': ''})
        self.assertFalse(seller_no_store.is_valid())
        self.assertIn('store_name', seller_no_store.errors)

    def test_login_serializer_rejects_missing_deactivated_and_archived(self):
        missing = LoginSerializer(data={'email': '', 'password': ''})
        self.assertFalse(missing.is_valid())

        deactivated = SimpleNamespace(is_active=False, status='active')
        with patch('accounts.serializers.auth_serializers.authenticate',
                   return_value=deactivated):
            serializer = LoginSerializer(data={'email': 'x@test.com', 'password': 'Test123!@#'})
            self.assertFalse(serializer.is_valid())
            self.assertIn('deactivated', str(serializer.errors))

        archived = SimpleNamespace(is_active=True, status='archive')
        with patch('accounts.serializers.auth_serializers.authenticate',
                   return_value=archived):
            serializer = LoginSerializer(data={'email': 'x@test.com', 'password': 'Test123!@#'})
            self.assertFalse(serializer.is_valid())
            self.assertIn('archived', str(serializer.errors))

    def test_preset_serializer_aliases_and_range_validation(self):
        base = {
            'name': 'Coverage Preset', 'gender': 'female', 'height': 170,
            'weight': 60, 'skin_tone': 'medium', 'undertone': 'neutral',
            'shoulder': 'average', 'waist': 'average', 'hip': 'average',
            'thigh': 'average', 'style_focus': 'casual', 'body_build_cm': 95}

        alias_payload = {
            key: value for key, value in base.items()
            if key not in ('skin_tone', 'style_focus', 'body_build_cm')
        }
        alias_payload.update({
            'skinTone': ' Fair ', 'bodyBuildCm': '95.5',
            'styleFocus': 'Formal', 'cupSize': 'b'})
        aliased = AvatarPresetSerializer(data=alias_payload)
        self.assertTrue(aliased.is_valid(), aliased.errors)
        self.assertEqual(aliased.validated_data['skin_tone'], 'Fair')
        self.assertEqual(aliased.validated_data['style_focus'], 'formal')
        self.assertEqual(aliased.validated_data['cup_size'], 'B')

        no_cup = AvatarPresetSerializer(data={**base, 'cup_size': None})
        self.assertTrue(no_cup.is_valid(), no_cup.errors)

        invalid_cases = {
            'height': {**base, 'height': 119},
            'weight': {**base, 'weight': 29},
            'cup_size': {**base, 'cup_size': 'Z'},
            'body_build_cm': {**base, 'body_build_cm': 85},
        }
        for field, payload in invalid_cases.items():
            with self.subTest(field=field):
                serializer = AvatarPresetSerializer(data=payload)
                self.assertFalse(serializer.is_valid())
                self.assertIn(field, serializer.errors)

    def test_preset_destroy_rejects_non_owner_branch(self):
        owner = User.objects.create_user(
            full_name='Preset Owner', email='owner@test.com',
            password='Test123!@#', role='user')
        preset = AvatarPreset.objects.create(
            user=owner, name='Owner Preset', gender='male', height=170,
            weight=65, body_build_cm=95)
        view = AvatarPresetViewSet()
        view.request = SimpleNamespace(user=self.user)
        with patch.object(view, 'get_object', return_value=preset):
            response = view.destroy(view.request, pk=str(preset.id))
        self.assertEqual(response.status_code, 403)

    def test_legacy_html_views_render(self):
        from django.contrib.auth.models import AnonymousUser
        from django.contrib.sessions.backends.db import SessionStore
        from django.test import RequestFactory

        factory = RequestFactory()
        request = factory.get('/')
        request.session = SessionStore()
        request.user = AnonymousUser()
        self.assertEqual(auth_views.home(request).status_code, 200)

        from django.template import TemplateDoesNotExist
        for view in (auth_views.register_view, auth_views.login_view):
            request = factory.get('/')
            request.session = SessionStore()
            request.user = AnonymousUser()
            with self.assertRaises(TemplateDoesNotExist):
                view(request)

        dashboard_request = factory.get('/seller-dashboard/')
        dashboard_request.user = self.user
        with self.assertRaises(TemplateDoesNotExist):
            auth_views.seller_dashboard(dashboard_request)

        logout_request = factory.get('/logout/')
        logout_request.session = SessionStore()
        logout_request.user = self.user
        self.assertEqual(auth_views.logout_view(logout_request).status_code, 302)

    def test_legacy_profile_view_crud(self):
        factory = APIRequestFactory()
        view = auth_views.ProfileView.as_view()

        request = factory.get('/profile/')
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'coverage@test.com')

        request = factory.patch('/profile/', {'full_name': 'Updated Coverage'}, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['full_name'], 'Updated Coverage')

        request = factory.delete('/profile/', {
            'refresh': str(RefreshToken.for_user(self.user))}, format='json')
        force_authenticate(request, user=self.user)
        with patch('accounts.views.auth_views.blacklist_refresh_token') as blacklist:
            response = view(request)
        self.assertEqual(response.status_code, 204)
        blacklist.assert_called_once()
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, 'archive')
        self.assertFalse(self.user.is_active)

    def test_token_refresh_blacklist_rotation_and_logout_and_deactivate(self):
        refresh = str(RefreshToken.for_user(self.user))

        with patch('accounts.views.auth_views.blacklist_refresh_token') as blacklist, \
             patch('accounts.views.auth_views.is_token_blacklisted', return_value=False):
            response = self.client.post('/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['access'])
        blacklist.assert_called_once()

        with patch('accounts.views.auth_views.is_token_blacklisted', return_value=True):
            response = self.client.post('/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 401)

        response = self.client.post('/auth/token/refresh/', {'refresh': 'not-a-token'}, format='json')
        self.assertEqual(response.status_code, 401)

        self.client.force_authenticate(user=self.user)
        with patch('accounts.views.auth_views.blacklist_refresh_token') as blacklist:
            response = self.client.post('/auth/logout/', {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 200)
        blacklist.assert_called_once()

        response = self.client.post('/auth/logout/', {}, format='json')
        self.assertEqual(response.status_code, 200)

        with patch('accounts.views.auth_views.blacklist_refresh_token'):
            response = self.client.post(
                '/auth/deactivate/', {'reason': 'coverage', 'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)


class AccountValidatorCoverageTests(SimpleTestCase):
    def test_mobile_number_validator(self):
        from django.core.exceptions import ValidationError as DjangoValidationError

        self.assertEqual(validate_mobile_number('09123456789'), '09123456789')
        self.assertEqual(validate_mobile_number('+63 9123456789'), '+63 9123456789')
        self.assertEqual(validate_mobile_number(''), '')
        for bad in ('12345', '08123456789'):
            with self.subTest(value=bad):
                with self.assertRaises(DjangoValidationError):
                    validate_mobile_number(bad)

    def test_postal_code_validator(self):
        from django.core.exceptions import ValidationError as DjangoValidationError

        self.assertEqual(validate_postal_code('1000'), '1000')
        self.assertEqual(validate_postal_code(''), '')
        with self.assertRaises(DjangoValidationError):
            validate_postal_code('123')
