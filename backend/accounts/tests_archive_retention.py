"""
accounts/tests_archive_retention.py — FR-1.4 / RA 10173 end-of-retention proof.

Companion to accounts.tests.AccountManagementTests, which proves the FIRST half
of the lifecycle (DELETE /profile/ -> 200 archive, data RETAINED, login blocked).
This suite proves the SECOND half: the prune sweep relocates the profile to
accounts_archiveduser and erases/pseudonymizes the active collections.

Chain covered end-to-end:
  active --DELETE /profile/--> archived in accounts_user (grace window)
         --prune sweep-------> accounts_archiveduser + active data erased

FR-1.4 PRIVACY: the cold copy is PSEUDONYMOUS (keyed email, constant display
name, cleared contact/address/store identity, EMPTY password). Legacy intact
cold documents are healed by from_user() retry, migration 0012, and the
repeatable pseudonymize_archived_users command.

Includes the forward eligibility math (due = archived_at + ARCHIVE_GRACE_DAYS),
the legacy NULL-stamp branch, --force, the preview (moves nothing), cold-copy
pseudonymization + idempotency, the order pseudonymization + buyer-cart detach
cascade, sweep resilience (one bad row never stalls the rest), and the legacy
backfill (idempotent, dry-run).

GAP-1 HARDENING: a SELLER cold-copy test proves store identity is scrubbed
(the shopper case had store_name=None already, so it proved nothing about
store scrubbing), and a synthetic non-ObjectId closed_account_id proves the
backfill's keyed pseudonym and that role is retained, not reset.

Run: python manage.py test accounts.tests_archive_retention -v 2
"""
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.archive import (
    ARCHIVE_GRACE_DAYS,
    archive_due_date,
    describe_archive_schedule,
    prune_expired_archived_users,
)
from accounts.models import ArchivedUser, FittingStudioSurvey, User
from accounts.pseudonymization import pseudonymous_email
from catalog.models import CatalogItem
from commerce.models import Cart, CartItem, Order
from outfits.models import AvatarPreset, Outfit
from ratings.models import Rating

PASSWORD = 'Test123!@#'


def _user(email, role='shopper', **extra):
    return User.objects.create_user(
        email=email,
        full_name=email.split('@')[0].replace('.', ' ').title(),
        password=PASSWORD,
        role=role,
        **extra,
    )


def _archive(user, days_ago=0, stamp=True):
    """Mirror ProfileView.destroy's archive write, then back-date the clock."""
    user.status = 'archive'
    user.is_active = False
    user.archived_at = (timezone.now() - timedelta(days=days_ago)) if stamp else None
    user.save(update_fields=['status', 'is_active', 'archived_at'])
    # Reload so assertions use the DB's stored precision (BSON dates are
    # millisecond-precision; comparing against the in-memory value is flaky).
    user.refresh_from_db()
    return user


def _listing(owner, name='Blue Jacket'):
    return CatalogItem.objects.create(
        name=name,
        description='Retention test item.',
        category='tops',
        size='M',
        color='Blue',
        color_description='Navy blue',
        color_family='blue',
        price='49.95',
        seller=owner,
        store_name=owner.store_name or 'Retention Store',
        status='active',
    )


def _order(user, number):
    return Order.objects.create(
        user=user,
        order_number=number,
        status='paid',
        recipient_name='Acct User',
        recipient_email=user.email,
        contact_number='09123456789',
        shipping_address='123 Sample Street, Makati',
        payment_method='Cash on Delivery',
        total_amount='250.00',
    )


def _legacy_cold_row(user):
    """Recreate an OLD-build intact cold copy (the pre-fix violation)."""
    return ArchivedUser.objects.create(
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        store_name=user.store_name,
        status='archive',
        mobile=user.mobile,
        street=user.street,
        barangay=user.barangay,
        city=user.city,
        province=user.province,
        postal_code=user.postal_code,
        password=user.password,
        is_active=False,
        is_staff=user.is_staff,
        last_login=user.last_login,
        date_joined=user.date_joined,
        closed_account_id=str(user.pk),
        archived_at=user.archived_at,
        cold_moved_at=timezone.now(),
    )


class ArchiveEligibilityMathTests(TestCase):
    """The forward grace-window rule, asserted literally."""

    def test_due_date_is_archived_at_plus_grace_days(self):
        user = _archive(_user('math@test.com'), days_ago=3)
        expected = user.archived_at + timedelta(days=ARCHIVE_GRACE_DAYS)
        self.assertEqual(archive_due_date(user), expected)
        # The User property must mirror the module helper exactly.
        self.assertEqual(user.archive_due_date, expected)

    def test_custom_window_is_honoured(self):
        user = _archive(_user('window@test.com'), days_ago=3)
        self.assertEqual(
            archive_due_date(user, days=30),
            user.archived_at + timedelta(days=30),
        )

    def test_legacy_null_stamp_has_no_due_date(self):
        user = _archive(_user('legacy-math@test.com'), stamp=False)
        self.assertIsNone(archive_due_date(user))
        self.assertIsNone(user.archive_due_date)

    def test_fresh_archive_is_not_relocated(self):
        user = _archive(_user('fresh@test.com'), days_ago=0)
        self.assertEqual(prune_expired_archived_users(), 0)
        self.assertTrue(User.objects.filter(pk=user.pk).exists())
        self.assertFalse(ArchivedUser.objects.filter(closed_account_id=str(user.pk)).exists())

    def test_overdue_archive_is_relocated(self):
        user = _archive(_user('overdue@test.com'), days_ago=ARCHIVE_GRACE_DAYS + 2)
        uid = str(user.pk)
        self.assertEqual(prune_expired_archived_users(), 1)
        self.assertFalse(User.objects.filter(pk=uid).exists())
        self.assertTrue(ArchivedUser.objects.filter(closed_account_id=uid).exists())

    def test_legacy_null_stamp_is_relocated_immediately(self):
        user = _archive(_user('legacy-now@test.com'), stamp=False)
        uid = str(user.pk)
        self.assertEqual(prune_expired_archived_users(), 1)
        self.assertFalse(User.objects.filter(pk=uid).exists())

    def test_force_relocates_a_fresh_archive(self):
        user = _archive(_user('forced@test.com'), days_ago=0)
        uid = str(user.pk)
        self.assertEqual(prune_expired_archived_users(force=True), 1)
        self.assertFalse(User.objects.filter(pk=uid).exists())

    def test_active_accounts_are_never_relocated(self):
        active = _user('active@test.com')
        active.archived_at = timezone.now() - timedelta(days=ARCHIVE_GRACE_DAYS + 30)
        active.save(update_fields=['archived_at'])
        self.assertEqual(prune_expired_archived_users(), 0)
        self.assertEqual(prune_expired_archived_users(force=True), 0)
        self.assertTrue(User.objects.filter(pk=active.pk).exists())


class ArchiveSchedulePreviewTests(TestCase):
    """--preview must explain the math and move NOTHING."""

    def setUp(self):
        self.fresh = _archive(_user('preview-fresh@test.com'), days_ago=0)
        self.overdue = _archive(
            _user('preview-overdue@test.com'), days_ago=ARCHIVE_GRACE_DAYS + 2)

    def test_preview_reports_schedule_and_moves_nothing(self):
        rows = describe_archive_schedule()
        self.assertEqual(len(rows), 2)
        by_email = {row['email']: row for row in rows}

        fresh_row = by_email[self.fresh.email]
        self.assertFalse(fresh_row['eligible'])
        self.assertIn('day(s)', fresh_row['remaining'])
        self.assertEqual(
            fresh_row['due_date'],
            self.fresh.archived_at + timedelta(days=ARCHIVE_GRACE_DAYS),
        )

        overdue_row = by_email[self.overdue.email]
        self.assertTrue(overdue_row['eligible'])

        # Preview is read-only.
        self.assertEqual(ArchivedUser.objects.count(), 0)
        self.assertTrue(User.objects.filter(pk=self.fresh.pk).exists())
        self.assertTrue(User.objects.filter(pk=self.overdue.pk).exists())

    def test_preview_force_marks_every_row_eligible(self):
        rows = describe_archive_schedule(force=True)
        self.assertTrue(all(row['eligible'] for row in rows))
        fresh_row = next(r for r in rows if r['email'] == self.fresh.email)
        self.assertIn('(forced)', fresh_row['remaining'])
        self.assertEqual(ArchivedUser.objects.count(), 0)

    def test_preview_lists_legacy_rows_as_immediate(self):
        _archive(_user('preview-legacy@test.com'), stamp=False)
        rows = describe_archive_schedule()
        legacy = next(r for r in rows if r['email'] == 'preview-legacy@test.com')
        self.assertIsNone(legacy['due_date'])
        self.assertTrue(legacy['eligible'])
        self.assertIn('legacy', legacy['remaining'])


class ColdCopyTests(TestCase):
    """accounts_archiveduser content (PSEUDONYMOUS), idempotency, timestamps."""

    def test_cold_copy_is_pseudonymized_and_idempotent(self):
        user = _user('cold@test.com', mobile='09123456789', city='Makati City')
        _archive(user, days_ago=ARCHIVE_GRACE_DAYS + 2)
        uid = str(user.pk)

        first = ArchivedUser.from_user(user)
        second = ArchivedUser.from_user(user)  # crash-retry path
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(ArchivedUser.objects.filter(closed_account_id=uid).count(), 1)

        # Retained provenance / business fields.
        self.assertEqual(first.closed_account_id, uid)
        self.assertEqual(first.status, 'archive')
        self.assertFalse(first.is_active)
        self.assertEqual(first.role, user.role)

        # FR-1.4: NO direct identifiers or credentials survive.
        self.assertEqual(first.email, pseudonymous_email(uid))
        self.assertNotEqual(first.email, user.email)
        self.assertEqual(first.full_name, 'Archived User')
        self.assertNotEqual(first.full_name, user.full_name)
        self.assertIsNone(first.mobile)
        self.assertIsNone(first.city)
        self.assertIsNone(first.store_name)
        self.assertEqual(first.password, '')
        self.assertIsNone(first.last_login)

    def test_cold_copy_never_copies_the_password_hash(self):
        user = _user('hash@test.com')
        _archive(user, days_ago=ARCHIVE_GRACE_DAYS + 2)
        cold = ArchivedUser.from_user(user)
        self.assertTrue(user.password)          # live row still has a hash
        self.assertEqual(cold.password, '')     # cold row never does
        self.assertNotEqual(cold.password, user.password)

    def test_from_user_heals_a_legacy_intact_copy(self):
        user = _user('heal@test.com', mobile='09123456789', city='Makati City')
        _archive(user, days_ago=ARCHIVE_GRACE_DAYS + 2)
        uid = str(user.pk)
        legacy = _legacy_cold_row(user)

        healed = ArchivedUser.from_user(user)   # retry must not return PII
        self.assertEqual(healed.pk, legacy.pk)
        healed.refresh_from_db()
        self.assertEqual(healed.email, pseudonymous_email(uid))
        self.assertEqual(healed.full_name, 'Archived User')
        self.assertIsNone(healed.mobile)
        self.assertIsNone(healed.city)
        self.assertEqual(healed.password, '')
        self.assertEqual(ArchivedUser.objects.filter(closed_account_id=uid).count(), 1)

    def test_cold_moved_at_stores_the_scheduled_due_date(self):
        """DOCUMENTED BEHAVIOUR (not the relocation instant).

        ArchivedUser.from_user() writes archived_at + ARCHIVE_GRACE_DAYS into
        cold_moved_at, so this field audits the SCHEDULE, not the wall-clock
        move. See the corrected archive.py docstring and the open RA 10173
        audit-trail item in the sprint notes.
        """
        user = _archive(_user('scheduled@test.com'), days_ago=ARCHIVE_GRACE_DAYS + 2)
        cold = ArchivedUser.from_user(user)
        expected = user.archived_at + timedelta(days=ARCHIVE_GRACE_DAYS)
        self.assertLess(abs((cold.cold_moved_at - expected).total_seconds()), 1)
        # ...and it is demonstrably NOT "now".
        self.assertGreater(abs((cold.cold_moved_at - timezone.now()).total_seconds()), 3600)

    def test_cold_moved_at_falls_back_to_now_for_legacy_rows(self):
        user = _archive(_user('legacy-cold@test.com'), stamp=False)
        before = timezone.now()
        cold = ArchivedUser.from_user(user)
        self.assertIsNotNone(cold.cold_moved_at)
        self.assertGreaterEqual(cold.cold_moved_at, before - timedelta(seconds=1))
        self.assertLess(abs((cold.cold_moved_at - timezone.now()).total_seconds()), 60)

    def test_seller_store_identity_is_cleared(self):
        """FR-1.4 names store identity explicitly. A SELLER's real store_name
        must not survive in the cold row — the shopper case above already had
        store_name=None, so it proved nothing about store scrubbing."""
        seller = _user('cold-seller@test.com', role='seller', store_name='Cold Store')
        _archive(seller, days_ago=ARCHIVE_GRACE_DAYS + 2)
        cold = ArchivedUser.from_user(seller)
        self.assertIsNone(cold.store_name)          # helper writes None, not ''
        self.assertEqual(cold.role, 'seller')       # non-identifying, retained
        self.assertNotIn('Cold Store', str(cold.__dict__))
        self.assertNotIn('cold-seller@test.com', str(cold.__dict__))


class RetentionErasureTests(TestCase):
    """RA 10173: after the window, active collections hold no personal data."""

    def setUp(self):
        self.user = _user('erase@test.com')
        self.preset = AvatarPreset.objects.create(
            user=self.user, name='P', gender='female',
            height=165, weight=55, skin_tone='#d9aa82',
        )
        self.outfit = Outfit.objects.create(user=self.user, name='My Outfit')
        self.cart = Cart.objects.create(user=self.user)
        self.rating = Rating.objects.create(
            user=self.user, target_type='item', target_id='erase-target',
            score=5, source='recommendation_panel',
        )
        self.survey = FittingStudioSurvey.objects.create(
            user=self.user, session_id='studio-erase-0001',
            pre_confidence=2, post_confidence=4, fit_rating=5,
        )
        self.order = _order(self.user, 'FF-ERASE-0001')
        _archive(self.user, days_ago=ARCHIVE_GRACE_DAYS + 2)
        self.uid = str(self.user.pk)

    def test_relocation_erases_active_personal_data(self):
        self.assertEqual(prune_expired_archived_users(), 1)

        self.assertFalse(User.objects.filter(pk=self.uid).exists())
        self.assertFalse(AvatarPreset.objects.filter(pk=self.preset.pk).exists())
        self.assertFalse(Outfit.objects.filter(pk=self.outfit.pk).exists())
        self.assertFalse(Cart.objects.filter(pk=self.cart.pk).exists())
        self.assertFalse(Rating.objects.filter(pk=self.rating.pk).exists())
        self.assertFalse(FittingStudioSurvey.objects.filter(pk=self.survey.pk).exists())
        self.assertFalse(FittingStudioSurvey.objects.filter(user_email='erase@test.com').exists())
        self.assertTrue(ArchivedUser.objects.filter(closed_account_id=self.uid).exists())

    def test_cold_archive_holds_no_direct_identifiers(self):
        self.assertEqual(prune_expired_archived_users(), 1)
        cold = ArchivedUser.objects.get(closed_account_id=self.uid)
        self.assertEqual(cold.email, pseudonymous_email(self.uid))
        self.assertNotEqual(cold.email, 'erase@test.com')
        self.assertEqual(cold.full_name, 'Archived User')
        self.assertEqual(cold.password, '')
        self.assertIsNone(cold.mobile)
        self.assertIsNone(cold.street)
        self.assertIsNone(cold.city)

    def test_orders_survive_but_are_pseudonymized(self):
        order_id = self.order.pk
        self.assertEqual(prune_expired_archived_users(), 1)

        self.order.refresh_from_db()
        self.assertEqual(self.order.pk, order_id)      # record retained
        self.assertIsNone(self.order.user)             # personal link dropped
        self.assertEqual(self.order.recipient_name, '')
        self.assertEqual(self.order.contact_number, '')
        self.assertEqual(self.order.recipient_email, '')
        self.assertEqual(self.order.shipping_address, '')
        self.assertEqual(str(self.order.total_amount), '250.00')  # business data kept

    def test_login_blocked_after_relocation(self):
        self.assertEqual(prune_expired_archived_users(), 1)
        client = APIClient()
        res = client.post('/auth/login/',
                          {'email': 'erase@test.com', 'password': PASSWORD},
                          format='json')
        self.assertEqual(res.status_code, 400)

    def test_second_sweep_is_a_noop(self):
        self.assertEqual(prune_expired_archived_users(), 1)
        self.assertEqual(prune_expired_archived_users(), 0)
        self.assertEqual(ArchivedUser.objects.filter(closed_account_id=self.uid).count(), 1)


class LegacyArchiveBackfillTests(TestCase):
    """Already-archived intact rows are healed; the backfill is repeatable."""

    def _legacy(self, email):
        # Fresh archive (NOT sweep-eligible) so only the backfill acts here.
        user = _user(email, mobile='09123456789', city='Makati City')
        _archive(user, days_ago=0)
        return str(user.pk), _legacy_cold_row(user)

    def test_command_pseudonymizes_and_is_repeatable(self):
        uid, row = self._legacy('backfill@test.com')
        out = StringIO()
        call_command('pseudonymize_archived_users', stdout=out)
        row.refresh_from_db()
        self.assertEqual(row.email, pseudonymous_email(uid))
        self.assertEqual(row.full_name, 'Archived User')
        self.assertIsNone(row.mobile)
        self.assertIsNone(row.city)
        self.assertIsNone(row.store_name)
        self.assertEqual(row.password, '')
        self.assertIn('pseudonymized=1', out.getvalue())

        again = StringIO()
        call_command('pseudonymize_archived_users', stdout=again)
        self.assertIn('pseudonymized=0', again.getvalue())
        self.assertIn('already_clean=1', again.getvalue())

    def test_dry_run_writes_nothing(self):
        uid, row = self._legacy('dry@test.com')
        out = StringIO()
        call_command('pseudonymize_archived_users', '--dry-run', stdout=out)
        row.refresh_from_db()
        self.assertEqual(row.email, 'dry@test.com')   # untouched
        self.assertIn('[dry-run]', out.getvalue())
        self.assertIn('pseudonymized=1', out.getvalue())

    def test_prune_sanitize_existing_flag_heals_legacy_rows(self):
        uid, row = self._legacy('flag@test.com')
        out = StringIO()
        call_command('prune_archived_users', '--sanitize-existing', stdout=out)
        row.refresh_from_db()
        self.assertEqual(row.email, pseudonymous_email(uid))
        self.assertIn('Legacy archive sanitization (applied)', out.getvalue())

    def test_prune_sanitize_existing_preview_is_dry(self):
        uid, row = self._legacy('flagdry@test.com')
        out = StringIO()
        call_command('prune_archived_users', '--sanitize-existing', '--preview', stdout=out)
        row.refresh_from_db()
        self.assertEqual(row.email, 'flagdry@test.com')
        self.assertIn('Legacy archive sanitization (dry-run)', out.getvalue())

    def test_backfill_handles_a_synthetic_legacy_closed_account_id(self):
        """Legacy rows keyed by a non-ObjectId closed_account_id still get a
        stable keyed pseudonym, and their role is RETAINED (not reset to
        shopper). Uses the command's real contract: default applies."""
        from accounts.pseudonymization import pseudonym_for, pseudonymous_profile_fields

        legacy = ArchivedUser.objects.create(
            closed_account_id='legacy0001',
            email='legacy-synthetic@test.com',
            full_name='Legacy Person',
            role='seller',
            status='archive',
            store_name='Legacy Store',
            mobile='09181234567',
            street='1 Old St',
            barangay='Old Brgy',
            city='Old City',
            province='Old Province',
            postal_code='0000',
            password='pbkdf2_sha256$legacyhash',
            is_active=False,
            is_staff=True,
            last_login=timezone.now(),
            date_joined=timezone.now(),
            archived_at=timezone.now() - timedelta(days=120),
            cold_moved_at=timezone.now() - timedelta(days=30),
        )

        call_command('pseudonymize_archived_users', stdout=StringIO())
        legacy.refresh_from_db()
        expected = pseudonymous_profile_fields('legacy0001', role='seller')
        for name, value in expected.items():
            self.assertEqual(getattr(legacy, name), value, name)
        self.assertEqual(
            legacy.email, f"archived-{pseudonym_for('legacy0001')}@archive.invalid")
        self.assertEqual(legacy.closed_account_id, 'legacy0001')
        self.assertIsNotNone(legacy.cold_moved_at)

        again = StringIO()
        call_command('pseudonymize_archived_users', stdout=again)
        self.assertIn('pseudonymized=0', again.getvalue())


class SellerDetachTests(TestCase):
    """A deleted seller must never leave a buyer's cart pointing at a dead item."""

    def test_buyer_cart_items_are_detached_not_deleted(self):
        seller = _user('seller-erase@test.com', role='seller', store_name='Retention Store')
        buyer = _user('buyer-keep@test.com')
        item = _listing(seller)
        item_id = str(item.pk)
        buyer_cart = Cart.objects.create(user=buyer)
        cart_item = CartItem.objects.create(cart=buyer_cart, item=item, quantity=2)

        _archive(seller, days_ago=ARCHIVE_GRACE_DAYS + 2)
        self.assertEqual(prune_expired_archived_users(), 1)

        self.assertFalse(CatalogItem.objects.filter(pk=item_id).exists())
        self.assertTrue(Cart.objects.filter(pk=buyer_cart.pk).exists())

        cart_item.refresh_from_db()
        self.assertIsNone(cart_item.item)
        self.assertEqual(cart_item.catalog_item_id, item_id)
        self.assertEqual(cart_item.item_name, 'Blue Jacket')
        self.assertEqual(cart_item.store_name, 'Retention Store')
        self.assertTrue(cart_item.seller_account_deleted)
        self.assertTrue(cart_item.unavailable_reason)
        self.assertEqual(cart_item.quantity, 2)

        # The buyer's own account is untouched.
        self.assertTrue(User.objects.filter(pk=buyer.pk).exists())


class SweepResilienceTests(TestCase):
    """One bad row must never stall the whole sweep."""

    def test_failure_on_one_row_is_logged_and_skipped(self):
        bad = _archive(_user('bad@test.com'), days_ago=ARCHIVE_GRACE_DAYS + 2)
        good = _archive(_user('good@test.com'), days_ago=ARCHIVE_GRACE_DAYS + 2)
        bad_id, good_id = str(bad.pk), str(good.pk)

        original = ArchivedUser.from_user

        def flaky(user):
            if user.email == 'bad@test.com':
                raise RuntimeError('simulated cold-copy failure')
            return original(user)

        with patch.object(ArchivedUser, 'from_user', side_effect=flaky):
            with self.assertLogs('accounts.archive', level='ERROR') as logs:
                moved = prune_expired_archived_users()

        self.assertEqual(moved, 1)
        self.assertTrue(any('Failed to cold-archive' in m for m in logs.output))
        # Bad row survived untouched; good row completed the whole cascade.
        self.assertTrue(User.objects.filter(pk=bad_id).exists())
        self.assertFalse(User.objects.filter(pk=good_id).exists())
        self.assertTrue(ArchivedUser.objects.filter(closed_account_id=good_id).exists())
        self.assertFalse(ArchivedUser.objects.filter(closed_account_id=bad_id).exists())