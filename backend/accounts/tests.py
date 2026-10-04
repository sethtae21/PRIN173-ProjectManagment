from django.test import TestCase
from django.test import SimpleTestCase
from unittest.mock import Mock, patch
from rest_framework.test import APIClient
from accounts.models import User
from outfits.models import AvatarPreset
from accounts.storage import GridFSStorage


class AvatarPresetCRUDTests(TestCase):
    """KAN-58: Preset CRUD — owner-only, guests rejected (FR-2.5, 2.8–2.10)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='presetuser', email='preset@test.com',
            password='Test123!@#', role='user')
        self.other = User.objects.create_user(
            username='otheruser', email='other@test.com',
            password='Test123!@#', role='user')
        self.client.force_authenticate(self.user)
        self.payload = {
            'name': 'My Daily Preset',
            'gender': 'female',
            'height': 165.0,
            'weight': 55.0,
            'skin_tone': 'medium',
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
    """KAN-56: profile view/update, password change, account deletion (FR-1.2–1.4, RA 10173)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='acctuser', email='acct@test.com',
            password='OldPass123!@#', role='user')
        self.client.force_authenticate(self.user)

    def test_guest_cannot_view_profile(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get('/profile/').status_code, (401, 403))

    def test_view_profile(self):
        res = self.client.get('/profile/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user']['username'], 'acctuser')

    def test_update_profile(self):
        res = self.client.patch('/profile/', {'skin_tone': 'deep', 'height': 170.0}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.skin_tone, 'deep')

    def test_password_change_wrong_current_rejected(self):
        res = self.client.post('/profile/password/',
                               {'current_password': 'WrongPass1!', 'new_password': 'NewPass123!@#'},
                               format='json')
        self.assertEqual(res.status_code, 400)

    def test_password_change_success_and_login(self):
        res = self.client.post('/profile/password/',
                               {'current_password': 'OldPass123!@#', 'new_password': 'NewPass123!@#'},
                               format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass123!@#'))
        self.client.force_authenticate(None)
        login = self.client.post('/auth/login/',
                                 {'username': 'acctuser', 'password': 'NewPass123!@#'}, format='json')
        self.assertEqual(login.status_code, 200)

    def test_delete_account_cascades_and_blocks_login(self):
        # Create related data to verify CASCADE deletion
        AvatarPreset.objects.create(
            user=self.user, name='P', gender='female',
            height=165, weight=55, skin_tone='medium'
        )

        # Delete account
        res = self.client.delete('/profile/')
        self.assertEqual(res.status_code, 204)

        # Verify user is gone
        self.assertFalse(User.objects.filter(username='acctuser').exists())

        # Verify cascaded data is also gone (RA 10173 erasure proof)
        self.assertFalse(AvatarPreset.objects.filter(name='P').exists())

        # Verify login now fails
        self.client.force_authenticate(None)
        login = self.client.post('/auth/login/',
                                 {'username': 'acctuser', 'password': 'OldPass123!@#'}, format='json')
        self.assertEqual(login.status_code, 400)


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

        gridfs.find_one.assert_called_once_with({'filename': 'legacy-name.png'})
        gridfs.delete.assert_called_once_with('legacy-id')


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