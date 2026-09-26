"""Outfit persistence tests (FR-5.4-5.8 / WBS 1.3.8 / RT-05 / KAN-69 backend half).

DB-backed (unlike the pure weights suite) -> run with the Atlas cluster AWAKE; a
WinError 10054 here is the KAN-93 connectivity/whitelist issue, not a code bug.

CatalogItem/UploadBatch construction in _make_item/_make_batch MIRRORS the exact
kwargs used by catalog/views/core.py upload() so it tracks the real model; if a
required catalog field is ever added, the create() raises with the field name in
the traceback -> add it to _make_item (self-diagnosing, never silently mocked).

Covers: create+IDs contract, owner-only 404, guest 401, edit name+items, the
active-add rule AND its grandfathering (no lockout), delete 204->404, empty-items
edge, cross-session persistence (server-side row, not localStorage), and the
KAN-56 / RA-10173 cascade (deleting the user erases outfits + join rows).
"""
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import CatalogItem, UploadBatch

from .models import Outfit


class OutfitAPITests(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.alice = User.objects.create_user(
            username='alice', email='alice@t.com', password='Test123!@#',
            role='user', store_name=None)
        self.bob = User.objects.create_user(
            username='bob', email='bob@t.com', password='Test123!@#',
            role='user', store_name=None)
        self.batch = self._make_batch(self.alice)

    # ---- helpers mirroring catalog/views/core.py create() field set ----------
    def _make_batch(self, seller):
        return UploadBatch.objects.create(
            seller=seller, store_name=getattr(seller, 'store_name', None) or 'Store',
            status='completed', total_items=1)

    def _make_item(self, seller, status='active', name='Item'):
        batch = self._make_batch(seller)
        return CatalogItem.objects.create(
            name=name, description='desc', category='tops', size='M',
            color='White', color_description='pure white', color_family='neutral',
            price=10.0, style_tags=['casual'], occasion_tags=['everyday'],
            seller=seller, store_name=getattr(seller, 'store_name', None) or 'Store',
            batch=batch, status=status)

    # ---- FR-5.4 create + KAN-41 IDs contract --------------------------------
    def test_create_returns_id_list_and_binds_user(self):
        x = self._make_item(self.alice, name='X')
        y = self._make_item(self.alice, name='Y')
        self.c.force_authenticate(self.alice)
        res = self.c.post('/outfits/', {'name': 'My Look',
                                        'items': [str(x.pk), str(y.pk)]}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['name'], 'My Look')
        self.assertEqual(res.data['user'], str(self.alice.pk))
        self.assertEqual(sorted(res.data['items']), sorted([str(x.pk), str(y.pk)]))
        self.assertEqual(Outfit.objects.filter(user=self.alice).count(), 1)

    def test_create_with_no_items_allowed(self):           # model blank=True
        self.c.force_authenticate(self.alice)
        res = self.c.post('/outfits/', {'name': 'Empty'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['items'], [])

    # ---- FR-5.5 list + owner-only (others -> 404, KAN-58/56 enforcement) ----
    def test_list_is_owner_only_and_foreign_retrieve_404(self):
        x = self._make_item(self.alice)
        self.c.force_authenticate(self.alice)
        oid = self.c.post('/outfits/', {'name': 'A', 'items': [str(x.pk)]},
                          format='json').data['id']
        self.c.force_authenticate(self.bob)
        self.assertEqual(self.c.get('/outfits/').data, [])          # bob sees none
        self.assertEqual(self.c.get(f'/outfits/{oid}/').status_code, 404)

    # ---- FR-1.8/1.9 guests must not persist ---------------------------------
    def test_guest_rejected_401(self):
        anon = APIClient()
        self.assertEqual(anon.get('/outfits/').status_code, 401)
        self.assertEqual(anon.post('/outfits/', {'name': 'g'}, format='json').status_code, 401)

    # ---- FR-5.7 edit name + items -------------------------------------------
    def test_update_name_and_items(self):
        x = self._make_item(self.alice, name='X')
        y = self._make_item(self.alice, name='Y')
        self.c.force_authenticate(self.alice)
        oid = self.c.post('/outfits/', {'name': 'V1', 'items': [str(x.pk)]},
                          format='json').data['id']
        res = self.c.patch(f'/outfits/{oid}/', {'name': 'V2',
                                                'items': [str(x.pk), str(y.pk)]},
                           format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['name'], 'V2')
        self.assertEqual(sorted(res.data['items']), sorted([str(x.pk), str(y.pk)]))

    # ---- judgment call #2: active-add rule + grandfathering -----------------
    def test_cannot_add_inactive_item_on_create(self):
        z = self._make_item(self.alice, status='rejected', name='Z')
        self.c.force_authenticate(self.alice)
        res = self.c.post('/outfits/', {'name': 'Bad', 'items': [str(z.pk)]},
                          format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('items', res.data)

    def test_inactive_existing_item_does_not_lock_out_edit(self):
        x = self._make_item(self.alice, status='active', name='X')
        y = self._make_item(self.alice, status='active', name='Y')
        self.c.force_authenticate(self.alice)
        oid = self.c.post('/outfits/', {'name': 'G', 'items': [str(x.pk)]},
                          format='json').data['id']
        x.status = 'rejected'; x.save()                  # seller rejects AFTER save
        # name-only edit must still work (x grandfathered, not re-validated)
        r1 = self.c.patch(f'/outfits/{oid}/', {'name': 'G2'}, format='json')
        self.assertEqual(r1.status_code, 200)
        self.assertIn(str(x.pk), r1.data['items'])
        # adding a NEW active item alongside the now-inactive stored one is fine
        r2 = self.c.patch(f'/outfits/{oid}/',
                          {'items': [str(x.pk), str(y.pk)]}, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(sorted(r2.data['items']), sorted([str(x.pk), str(y.pk)]))
        # but adding a DIFFERENT inactive item is still rejected
        w = self._make_item(self.alice, status='processing', name='W')
        r3 = self.c.patch(f'/outfits/{oid}/',
                          {'items': [str(x.pk), str(y.pk), str(w.pk)]}, format='json')
        self.assertEqual(r3.status_code, 400)

    # ---- FR-5.8 delete ------------------------------------------------------
    def test_delete_204_then_gone(self):
        x = self._make_item(self.alice)
        self.c.force_authenticate(self.alice)
        oid = self.c.post('/outfits/', {'name': 'D', 'items': [str(x.pk)]},
                          format='json').data['id']
        self.assertEqual(self.c.delete(f'/outfits/{oid}/').status_code, 204)
        self.assertEqual(self.c.get(f'/outfits/{oid}/').status_code, 404)

    # ---- FR-5.4 / FR-2.5 "persists across sessions" (kills localStorage) ----
    def test_persists_across_sessions_server_side(self):
        x = self._make_item(self.alice)
        s1 = APIClient(); s1.force_authenticate(self.alice)
        oid = s1.post('/outfits/', {'name': 'S', 'items': [str(x.pk)]},
                      format='json').data['id']
        s2 = APIClient(); s2.force_authenticate(self.alice)   # fresh "session"
        got = s2.get(f'/outfits/{oid}/')
        self.assertEqual(got.status_code, 200)               # row survived server-side
        self.assertEqual(got.data['name'], 'S')

    # ---- FR-1.4 / RA-10173 cascade (KAN-56 erasure reaches outfits) ---------
    def test_account_deletion_cascades_outfits(self):
        x = self._make_item(self.alice)
        self.c.force_authenticate(self.alice)
        self.c.post('/outfits/', {'name': 'C', 'items': [str(x.pk)]}, format='json')
        self.assertEqual(Outfit.objects.filter(user=self.alice).count(), 1)
        self.alice.delete()
        self.assertEqual(Outfit.objects.filter(user=self.alice).count(), 0)
        x.refresh_from_db()
        self.assertEqual(x.outfits.count(), 0)               # join rows gone too