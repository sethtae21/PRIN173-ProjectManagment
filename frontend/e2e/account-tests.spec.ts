/**
 * Account Management (AM) test suite — docs/Test Cases/FitFusionAI - Test Cases - AM — Account Management.csv
 *
 * Evidence-only automation. No application code is touched: the suite drives
 * the running Vite frontend (https://localhost:8443), the Django API
 * (http://127.0.0.1:8000), and runs read-only/targeted MongoDB checks through
 * the backend's own virtualenv. Cases run in CSV order in a serial describe,
 * so STOP ON FAILURE skips every later case.
 *
 * Every distinct user/guest gets a brand-new BrowserContext. Registered
 * shoppers log in through the real UI (no addInitScript replay), and guest
 * contexts never receive a session token.
 *
 *   npx playwright test e2e/account-tests.spec.ts
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const runExecFile = promisify(execFile);

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'account-tests');
const BACKEND_DIR = resolve(REPOSITORY_ROOT, 'backend');
const PYTHON_EXE = resolve(BACKEND_DIR, '.venv', 'Scripts', 'python.exe');

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type Role = 'shopper' | 'seller';
type Session = {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
  email: string;
  password: string;
  role: Role;
};
type SignupData = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  storeName?: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
};
type CatalogItem = { id: string; name: string; [key: string]: unknown };
type Order = { id: string; order_number: string; [key: string]: unknown };
type Preset = { id: string; name: string; [key: string]: unknown };

const GUEST_RATING_PROMPT = 'Please sign up or log in to save your rating.';
const INVALID_CREDENTIALS_PATTERN =
  /Invalid email or password|The email address or password is incorrect/i;
const DUPLICATE_EMAIL_MESSAGE =
  'This email is already used. Please use another email address or log in.';
const DEFAULT_PRESET_PAYLOAD = {
  name: 'AM Fixture Preset',
  gender: 'female',
  height: 170,
  weight: 58,
  skin_tone: '#d9aa82',
  undertone: 'neutral',
  shoulder: 'average',
  waist: 'average',
  hip: 'average',
  thigh: 'average',
  cup_size: 'B',
  body_build_cm: 95,
  style_focus: 'casual',
};
const DB_COLLECTIONS = [
  'accounts_user',
  'accounts_archiveduser',
  'accounts_avatarpreset',
  'accounts_outfit',
  'accounts_cart',
  'accounts_cartitem',
  'accounts_order',
  'accounts_rating',
  'uat_session',
  'uat_response',
];

// Kept open until afterEach so failure screenshots can be taken even when a
// helper fails before execute() is reached.
let activePage: Page | undefined;
let activeContext: BrowserContext | undefined;

// ---------------------------------------------------------------------------
// Infrastructure helpers
// ---------------------------------------------------------------------------

function appUrl(path: string) {
  return new URL(path, APP_BASE_URL).toString();
}

function apiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access}` };
}

function randomMobile() {
  return `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
}

function makeSignupData(role: Role): SignupData {
  const suffix = randomUUID();
  return {
    fullName: role === 'seller' ? 'AM Test Seller' : 'AM Test Shopper',
    email: `am-${role}-${suffix}@example.test`,
    mobile: randomMobile(),
    password: `AmTest-${suffix.slice(0, 8)}!7`,
    ...(role === 'seller' ? { storeName: `AM Test Store ${suffix.slice(0, 8)}` } : {}),
    street: '123 Test Street',
    barangay: 'Barangay San Antonio',
    city: 'Makati',
    province: 'Metro Manila',
    postalCode: '1200',
  };
}

function sessionFromApiData(data: Record<string, any>, email: string, password: string, role: Role): Session {
  expect(data.tokens?.access, 'registration/login must return an access token').toBeTruthy();
  return {
    access: data.tokens.access as string,
    refresh: data.tokens.refresh as string,
    user: data.user as Record<string, unknown>,
    email,
    password,
    role,
  };
}

async function registerUser(request: APIRequestContext, role: Role): Promise<Session> {
  const data = makeSignupData(role);
  const payload = {
    email: data.email,
    full_name: data.fullName,
    password: data.password,
    password_confirm: data.password,
    role,
    mobile: data.mobile,
    ...(role === 'seller' ? { store_name: data.storeName } : {}),
  };
  const response = await request.post(apiUrl('/auth/register/'), { data: payload });
  expect(response.ok(), `could not register ${role} user: ${await response.text()}`).toBeTruthy();
  return sessionFromApiData(await response.json(), data.email, data.password, role);
}

async function newContext(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  activeContext = context;
  activePage = page;
  return { context, page };
}

async function closeActiveContext() {
  await activeContext?.close();
  activeContext = undefined;
  activePage = undefined;
}

async function loginInFreshContext(page: Page, session: Session, expectedRole: Role = 'shopper') {
  await page.goto(appUrl('/login'));
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 60_000 });
  await page.locator('#login-email').fill(session.email);
  await page.locator('#login-password').fill(session.password);
  await page.getByRole('button', { name: 'Log In' }).click();
  const expected = expectedRole === 'seller' ? /\/seller\/dashboard$/ : /\/shopper\/dashboard$/;
  await expect(page).toHaveURL(expected, { timeout: 60_000 });
}

async function storageSnapshot(page: Page) {
  return page.evaluate(() => {
    const sessionKeys = Object.keys(window.sessionStorage);
    const localKeys = Object.keys(window.localStorage);
    return {
      session: window.sessionStorage.getItem('fitfusion.session.v1'),
      epoch: window.sessionStorage.getItem('fitfusion.history.epoch'),
      user: window.localStorage.getItem('fitfusion-user'),
      access:
        window.localStorage.getItem('access_token') ||
        window.sessionStorage.getItem('access_token'),
      refresh:
        window.localStorage.getItem('refresh_token') ||
        window.sessionStorage.getItem('refresh_token'),
      avatarKeys: sessionKeys.filter((key) => key.includes('avatar')),
      localAvatarKeys: localKeys.filter((key) => key.includes('avatar')),
      ratingKeys: [...sessionKeys, ...localKeys].filter((key) =>
        /rating|uat/i.test(key),
      ),
    };
  });
}

async function assertNoSession(page: Page) {
  const storage = await storageSnapshot(page);
  expect(storage.session, 'context must have no fitfusion session token').toBeNull();
  expect(storage.access, 'context must have no access token').toBeNull();
  expect(storage.refresh, 'context must have no refresh token').toBeNull();
  expect(storage.user, 'context must have no cached user').toBeNull();
  return storage;
}

async function sessionFromPage(page: Page): Promise<{ access: string; refresh: string; user: Record<string, unknown> }> {
  const value = await page.evaluate(() => window.sessionStorage.getItem('fitfusion.session.v1'));
  expect(value, 'sessionStorage must contain fitfusion.session.v1').toBeTruthy();
  const parsed = JSON.parse(value as string);
  expect(parsed.access).toBeTruthy();
  return parsed;
}

async function listCatalog(request: APIRequestContext): Promise<CatalogItem[]> {
  const response = await request.get(apiUrl('/catalog/'));
  expect(response.ok(), `could not list catalog: ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

async function cartAdd(request: APIRequestContext, session: Session, id: string, quantity = 1) {
  return request.post(apiUrl('/cart/add_item/'), {
    headers: authHeaders(session),
    data: { catalog_item: id, quantity },
  });
}

async function listOrders(request: APIRequestContext, session: Session): Promise<Order[]> {
  const response = await request.get(apiUrl('/orders/'), { headers: authHeaders(session) });
  expect(response.ok(), `could not list orders: ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

async function checkoutViaApi(request: APIRequestContext, session: Session): Promise<Order> {
  const response = await request.post(apiUrl('/checkout/'), {
    headers: authHeaders(session),
    data: {
      recipient_name: 'AM Test Shopper',
      recipient_email: session.email,
      contact_number: '09123456789',
      shipping_address: '123 AM Test Street, Makati',
      payment_method: 'Mock E-Wallet',
    },
  });
  expect(response.ok(), `could not create fixture order: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as Order;
}

async function createPreset(
  request: APIRequestContext,
  session: Session,
  overrides: Record<string, unknown> = {},
): Promise<Preset> {
  const response = await request.post(apiUrl('/presets/'), {
    headers: authHeaders(session),
    data: { ...DEFAULT_PRESET_PAYLOAD, ...overrides },
  });
  expect(response.ok(), `could not create fixture preset: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as Preset;
}

async function createOutfit(
  request: APIRequestContext,
  session: Session,
  data: Record<string, unknown>,
): Promise<{ id: string; [key: string]: unknown }> {
  const response = await request.post(apiUrl('/outfits/'), {
    headers: authHeaders(session),
    data,
  });
  expect(response.ok(), `could not create fixture outfit: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as { id: string; [key: string]: unknown };
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

async function openRoleSignup(page: Page, role: Role) {
  await page.goto(appUrl('/signup'));
  await expect(page).toHaveURL(/\/signup$/, { timeout: 60_000 });
  await page.getByRole('button', { name: role === 'seller' ? 'Select Seller' : 'Select Shopper' }).click();
  await expect(page).toHaveURL(new RegExp(`/signup/${role}$`), { timeout: 30_000 });
}

function nextButtonName(role: Role, step: 1 | 2) {
  if (role === 'seller') return step === 1 ? 'Next: Address' : 'Next: Security';
  return 'Next';
}

async function fillSignupIdentity(
  page: Page,
  data: SignupData,
  options: { leaveEmailBlank?: boolean; leaveStoreBlank?: boolean } = {},
  role: Role = 'shopper',
) {
  await page.locator('input[name="fullName"]').fill(data.fullName);
  if (data.storeName !== undefined) {
    await page.locator('input[name="storeName"]').fill(options.leaveStoreBlank ? '' : data.storeName);
  }
  if (!options.leaveEmailBlank) {
    await page.locator('input[name="email"]').fill(data.email);
  }
  await page.locator('input[name="mobile"]').fill(data.mobile);
  await page.getByRole('button', { name: nextButtonName(role, 1), exact: true }).click();
}

async function fillSignupAddress(page: Page, data: SignupData, role: Role = 'shopper') {
  await expect(page.locator('input[name="street"]')).toBeVisible({ timeout: 30_000 });
  await page.locator('input[name="street"]').fill(data.street);
  await page.locator('input[name="barangay"]').fill(data.barangay);
  await page.locator('input[name="city"]').fill(data.city);
  await page.locator('select[name="province"]').selectOption(data.province);
  await page.locator('input[name="postalCode"]').fill(data.postalCode);
  await page.getByRole('button', { name: nextButtonName(role, 2), exact: true }).click();
}

async function fillSignupPasswordAndSubmit(
  page: Page,
  role: Role,
  password: string,
  confirmation = password,
) {
  await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 30_000 });
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(confirmation);
  await page.getByRole('button', { name: `Create ${role === 'seller' ? 'Seller' : 'Shopper'} Account` }).click();
}

async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((element: HTMLInputElement, nextValue: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}

async function prepareGuestStudio(page: Page) {
  const recommendationStatuses: number[] = [];
  const onResponse = (response: { status: () => number; url: () => string }) => {
    if (/\/api\/recommendations\//.test(response.url())) recommendationStatuses.push(response.status());
  };
  page.on('response', onResponse);

  await page.goto(appUrl('/guest/fitting-studio'));
  await expect(page.getByRole('heading', { name: 'Choose your avatar' })).toBeVisible({ timeout: 60_000 });
  await page.locator('.gender-card').filter({ hasText: 'Female' }).click();
  await page.getByRole('button', { name: /Continue with Female/ }).click();
  await expect(page).toHaveURL(/\/guest\/fitting-studio\/customize$/, { timeout: 60_000 });
  await expect(page.locator('main.fitting-studio-page')).toBeVisible({ timeout: 60_000 });

  await setRange(page, '#studio-height', 160);
  await setRange(page, '#studio-body-build', 93);
  await page.locator('.studio-panel-tabs button', { hasText: 'Recommendations' }).click();
  await expect(page.locator('.studio-recommendations-panel')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.studio-recommendation-item').first()).toBeVisible({ timeout: 60_000 });
  return recommendationStatuses;
}

async function tryFirstRecommendation(page: Page) {
  const card = page.locator('.studio-recommendation-item').first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByRole('button', { name: 'Try Item', exact: true }).click();
  await expect(page.locator('.studio-equipped-item').first()).toBeVisible({ timeout: 30_000 });
  return card;
}

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------

async function evidenceDir(testId: string) {
  const dir = resolve(EVIDENCE_DIR, testId);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function capture(page: Page | undefined, testId: string, filename: string) {
  if (!page) return;
  await page.screenshot({ path: resolve(await evidenceDir(testId), filename), fullPage: true });
}

async function writeLog(
  testId: string,
  status: 'PASS' | 'FAIL',
  started: number,
  error_message?: string,
  details?: Record<string, unknown>,
  note?: string,
) {
  const log = {
    test_id: testId,
    status,
    timestamp: new Date().toISOString(),
    duration: `${Date.now() - started}ms`,
    ...(note ? { note } : {}),
    ...(error_message ? { error_message } : {}),
    ...(details ? { details } : {}),
  };
  await writeFile(
    resolve(await evidenceDir(testId), 'test-log.json'),
    `${JSON.stringify(log, null, 2)}\n`,
    'utf8',
  );
}

/** Run one AM case, always writing evidence; rethrow on failure so the test fails. */
async function execute(
  testId: string,
  page: Page | undefined,
  body: () => Promise<Record<string, unknown> | void>,
  note?: string,
) {
  const started = Date.now();
  try {
    const details = await body();
    await writeLog(testId, 'PASS', started, undefined, details, note);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    try {
      await capture(page, testId, 'failure.png');
    } catch {
      // best effort
    }
    await writeLog(testId, 'FAIL', started, message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Backend DB helpers (read-only / scoped test-only writes)
// ---------------------------------------------------------------------------

async function runBackendPython(code: string, extraEnv: Record<string, string> = {}) {
  const { stdout, stderr } = await runExecFile(PYTHON_EXE, ['-c', code], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      DJANGO_SETTINGS_MODULE: 'fitfusion.settings',
      PYTHONUNBUFFERED: '1',
      ...extraEnv,
    },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  const lines = stdout.trim().split(/\r?\n/);
  const last = lines[lines.length - 1];
  try {
    return JSON.parse(last);
  } catch {
    throw new Error(`Backend Python did not return JSON. stdout=${stdout} stderr=${stderr}`);
  }
}

const DB_USER_SNAPSHOT_CODE = `
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitfusion.settings')
django.setup()
from django.conf import settings
from pymongo import MongoClient
email = os.environ['AM_TARGET_EMAIL'].strip().lower()
client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000)
db = client[settings.DATABASES['default']['NAME']]
doc = db['accounts_user'].find_one(
    {'email': email},
    {'_id': 0, 'email': 1, 'password': 1, 'role': 1, 'status': 1, 'is_active': 1},
)
print(json.dumps({'found': doc is not None, 'user': doc}, default=str))
`;

const DB_COUNTS_CODE = `
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitfusion.settings')
django.setup()
from django.conf import settings
from pymongo import MongoClient
collections = json.loads(os.environ['AM_COLLECTIONS'])
client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000)
db = client[settings.DATABASES['default']['NAME']]
print(json.dumps({name: db[name].count_documents({}) for name in collections}, default=str))
`;

const DB_PRUNE_TARGET_CODE = `
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitfusion.settings')
django.setup()
from accounts.models import User, ArchivedUser
from outfits.models import AvatarPreset, Outfit
from commerce.models import Order
import accounts.archive as archive

email = os.environ['AM_TARGET_EMAIL'].strip().lower()
user = User.objects.filter(email=email).first()
if user is None:
    raise RuntimeError('Target user not found in accounts_user')
if user.status != 'archive':
    raise RuntimeError('Target user is not archived; refusing cold relocation')

closed_id = str(user.pk)
order_ids = [str(order.pk) for order in Order.objects.filter(user=user)]
preset_count = AvatarPreset.objects.filter(user=user).count()
outfit_count = Outfit.objects.filter(user=user).count()

# Scope the real production sweep to this single test account only. No other
# archived user is touched by this evidence run.
archive._eligibility_queryset = (
    lambda days=archive.ARCHIVE_GRACE_DAYS, force=False: User.objects.filter(
        pk=user.pk, status='archive'
    )
)
moved = archive.prune_expired_archived_users(force=True)

live_exists = User.objects.filter(email=email).exists()
cold = ArchivedUser.objects.filter(closed_account_id=closed_id).first()
cold_info = None
if cold is not None:
    cold_info = {
        'email': cold.email,
        'full_name': cold.full_name,
        'password': cold.password,
        'store_name': cold.store_name,
        'mobile': cold.mobile,
        'street': cold.street,
        'barangay': cold.barangay,
        'city': cold.city,
        'province': cold.province,
        'postal_code': cold.postal_code,
        'status': cold.status,
    }

order_rows = []
for row in Order.objects.filter(pk__in=order_ids).values(
    'recipient_name', 'recipient_email', 'contact_number', 'shipping_address', 'user'
):
    order_rows.append({
        'user': str(row['user']) if row['user'] else None,
        'recipient_name': row['recipient_name'],
        'recipient_email': row['recipient_email'],
        'contact_number': row['contact_number'],
        'shipping_address': row['shipping_address'],
    })

print(json.dumps({
    'moved': moved,
    'closed_account_id': closed_id,
    'live_user_exists': live_exists,
    'cold': cold_info,
    'order_ids': order_ids,
    'orders': order_rows,
    'presets_before': preset_count,
    'outfits_before': outfit_count,
}, default=str))
`;

async function dbUserSnapshot(email: string) {
  return runBackendPython(DB_USER_SNAPSHOT_CODE, { AM_TARGET_EMAIL: email });
}

async function dbCounts() {
  return runBackendPython(DB_COUNTS_CODE, { AM_COLLECTIONS: JSON.stringify(DB_COLLECTIONS) });
}

async function dbPruneTarget(email: string) {
  return runBackendPython(DB_PRUNE_TARGET_CODE, { AM_TARGET_EMAIL: email });
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let shopper: Session;

// ---------------------------------------------------------------------------
// AM-001 .. AM-015 (CSV order, stop on failure)
// ---------------------------------------------------------------------------

test.describe('Account Management AM-001..AM-015 (CSV order, stop on failure)', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.afterEach(async ({}, testInfo) => {
    const testId = testInfo.title.match(/AM-\d{3}/)?.[0];
    if (testInfo.status === 'failed' && testId) {
      if (activePage) {
        try {
          await capture(activePage, testId, 'failure.png');
        } catch {
          // best effort
        }
      }
      let alreadyLogged = false;
      try {
        const existing = await readFile(resolve(await evidenceDir(testId), 'test-log.json'), 'utf8');
        alreadyLogged = existing.includes('"status": "FAIL"');
      } catch {
        // no prior log
      }
      if (!alreadyLogged) {
        const message = testInfo.error?.stack ?? testInfo.error?.message ?? 'Unknown failure';
        await writeLog(testId, 'FAIL', Date.now(), message);
      }
    }
    await activeContext?.close();
    activePage = undefined;
    activeContext = undefined;
  });

  test('AM-001 register account (User)', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    const data = makeSignupData('shopper');
    await execute('AM-001', page, async () => {
      await openRoleSignup(page, 'shopper');
      await fillSignupIdentity(page, data);
      await fillSignupAddress(page, data);
      await capture(page, 'AM-001', '01-registration-form.png');
      await fillSignupPasswordAndSubmit(page, 'shopper', data.password);

      await expect(page).toHaveURL(/\/shopper\/dashboard$/, { timeout: 60_000 });
      const session = await sessionFromPage(page);
      shopper = { ...session, email: data.email, password: data.password, role: 'shopper' };
      // The application treats session.user.role as canonical; the JWT is not
      // required to carry a role claim.
      expect(session.user?.role).toBe('shopper');
      await capture(page, 'AM-001', '02-registration-success.png');

      return {
        email: data.email,
        session_user_role: session.user?.role,
        redirect_url: page.url(),
        confirmation: 'Shopper dashboard opened after registration',
        session_persisted: true,
      };
    });
  });

  test('AM-002 register account (Seller) requires Store Name', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    const data = makeSignupData('seller');
    await execute('AM-002', page, async () => {
      await openRoleSignup(page, 'seller');
      await fillSignupIdentity(page, data, { leaveStoreBlank: true }, 'seller');
      await expect(page.getByText('Store Name is required for Seller accounts.')).toBeVisible({
        timeout: 15_000,
      });
      await capture(page, 'AM-002', '01-store-name-required.png');

      await page.locator('input[name="storeName"]').fill(data.storeName as string);
      await page.getByRole('button', { name: 'Next: Address', exact: true }).click();
      await fillSignupAddress(page, data, 'seller');
      await fillSignupPasswordAndSubmit(page, 'seller', data.password);
      await expect(page).toHaveURL(/\/seller\/dashboard$/, { timeout: 60_000 });

      const session = await sessionFromPage(page);
      expect(session.user?.role).toBe('seller');
      await capture(page, 'AM-002', '02-seller-registered.png');

      return {
        email: data.email,
        store_name: data.storeName,
        blank_store_error: 'Store Name is required for Seller accounts.',
        session_user_role: session.user?.role,
        redirect_url: page.url(),
      };
    });
  });

  test('AM-003 weak password is blocked', async ({ browser, request }) => {
    await newContext(browser);
    const page = activePage as Page;
    const data = makeSignupData('shopper');
    const weakPassword = 'Passw0rd';
    await execute('AM-003', page, async () => {
      await openRoleSignup(page, 'shopper');
      await fillSignupIdentity(page, data);
      await fillSignupAddress(page, data);
      await fillSignupPasswordAndSubmit(page, 'shopper', weakPassword);

      await expect(page.getByText('Complete all password requirements.')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page).toHaveURL(/\/signup\/shopper$/, { timeout: 15_000 });
      const passedRules = await page.locator('.ff-register-rule.passed').count();
      const storage = await assertNoSession(page);
      await capture(page, 'AM-003', '01-weak-password-blocked.png');

      const login = await request.post(apiUrl('/auth/login/'), {
        data: { email: data.email, password: weakPassword },
      });
      expect(login.status()).toBe(400);

      return {
        attempted_password: weakPassword,
        error: 'Complete all password requirements.',
        password_rules_passed: passedRules,
        backend_login_status: login.status(),
        session_token: storage.session,
      };
    });
  });

  test('AM-004 duplicate email is rejected', async ({ browser, request }) => {
    const existing = await registerUser(request, 'shopper');
    await newContext(browser);
    const page = activePage as Page;
    const data = makeSignupData('shopper');
    data.email = existing.email;
    await execute('AM-004', page, async () => {
      await openRoleSignup(page, 'shopper');
      await fillSignupIdentity(page, data);

      const message = page.getByText(DUPLICATE_EMAIL_MESSAGE);
      await expect(message).toBeVisible({ timeout: 20_000 });
      await expect(page).toHaveURL(/\/signup\/shopper$/, { timeout: 15_000 });
      const storage = await assertNoSession(page);
      await capture(page, 'AM-004', '01-duplicate-email.png');

      return {
        duplicate_email: existing.email,
        error: (await message.innerText()).trim(),
        suggest_log_in: /log in/i.test(await message.innerText()),
        session_token: storage.session,
      };
    });
  });

  test('AM-005 missing email is identified', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    const data = makeSignupData('shopper');
    await execute('AM-005', page, async () => {
      await openRoleSignup(page, 'shopper');
      await fillSignupIdentity(page, data, { leaveEmailBlank: true });

      await expect(page.getByText('Email address is required.')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
      const storage = await assertNoSession(page);
      await capture(page, 'AM-005', '01-missing-email.png');

      return {
        error: 'Email address is required.',
        email_field_aria_invalid: true,
        session_token: storage.session,
      };
    });
  });

  test('AM-006 valid login succeeds', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-006', page, async () => {
      await loginInFreshContext(page, shopper);
      const session = await sessionFromPage(page);
      expect(session.user?.role).toBe('shopper');
      await capture(page, 'AM-006', '01-login-success.png');

      return {
        email: shopper.email,
        session_user_role: session.user?.role,
        redirect_url: page.url(),
        tokens_present: Boolean(session.access && session.refresh),
      };
    });
  });

  test('AM-007 wrong password is rejected', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-007', page, async () => {
      await page.goto(appUrl('/login'));
      await expect(page.locator('#login-email')).toBeVisible({ timeout: 60_000 });
      await page.locator('#login-email').fill(shopper.email);
      await page.locator('#login-password').fill('DefinitelyWrong123!');
      await page.getByRole('button', { name: 'Log In' }).click();

      const alert = page.locator('.login-error-message[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 20_000 });
      const text = (await alert.innerText()).trim();
      expect(INVALID_CREDENTIALS_PATTERN.test(text)).toBeTruthy();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      const storage = await assertNoSession(page);
      await capture(page, 'AM-007', '01-wrong-password.png');

      return { error: text, url: page.url(), session_token: storage.session };
    });
  });

  test('AM-008 unregistered email is rejected', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    const unknownEmail = `am-unknown-${randomUUID()}@example.test`;
    await execute('AM-008', page, async () => {
      await page.goto(appUrl('/login'));
      await expect(page.locator('#login-email')).toBeVisible({ timeout: 60_000 });
      await page.locator('#login-email').fill(unknownEmail);
      await page.locator('#login-password').fill('AmUnknown123!');
      await page.getByRole('button', { name: 'Log In' }).click();

      const alert = page.locator('.login-error-message[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 20_000 });
      const text = (await alert.innerText()).trim();
      expect(INVALID_CREDENTIALS_PATTERN.test(text)).toBeTruthy();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      const storage = await assertNoSession(page);
      await capture(page, 'AM-008', '01-unregistered-email.png');

      return { email: unknownEmail, error: text, url: page.url(), session_token: storage.session };
    });
  });

  test('AM-009 logout clears session and blocks protected access', async ({ browser, request }) => {
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-009', page, async () => {
      await loginInFreshContext(page, shopper);
      const before = await sessionFromPage(page);

      await page.goto(appUrl('/shopper/orders'));
      await expect(page).toHaveURL(/\/shopper\/orders$/, { timeout: 30_000 });
      await capture(page, 'AM-009', '01-protected-page.png');

      await page.locator('.unified-shopper-logout').click();
      const modal = page.locator('.shopper-logout-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });
      await capture(page, 'AM-009', '02-logout-modal.png');
      await modal.getByRole('button', { name: 'Log Out' }).click();

      await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
      const storage = await assertNoSession(page);
      await capture(page, 'AM-009', '03-after-logout.png');

      await page.goBack();
      await expect(page).not.toHaveURL(/\/shopper\//, { timeout: 30_000 });
      const afterBack = await assertNoSession(page);

      const oldTokenResponse = await request.get(apiUrl('/cart/'), {
        headers: { Authorization: `Bearer ${before.access}` },
      });

      return {
        protected_page_before: '/shopper/orders',
        url_after_logout: page.url(),
        url_after_back: page.url(),
        session_after_logout: storage.session,
        session_after_back: afterBack.session,
        old_token_api_status: oldTokenResponse.status(),
        old_token_api_denied: [401, 403].includes(oldTokenResponse.status()),
      };
    });
  });

  test('AM-010 archive account, block login, and cold-relocate PII', async ({ browser, request }) => {
    const victim = await registerUser(request, 'shopper');
    const items = await listCatalog(request);
    expect(items.length, 'catalog must contain at least one item').toBeGreaterThan(0);
    const add = await cartAdd(request, victim, items[0].id, 1);
    expect(add.ok(), `fixture cart add failed: ${await add.text()}`).toBeTruthy();
    const order = await checkoutViaApi(request, victim);
    const preset = await createPreset(request, victim, { name: 'AM-010 Fixture Preset' });
    const outfit = await createOutfit(request, victim, {
      name: 'AM-010 Fixture Outfit',
      items: [items[0].id],
    });

    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-010', page, async () => {
      await loginInFreshContext(page, victim);
      await page.goto(appUrl('/shopper/account'));
      await expect(page.getByRole('heading', { name: 'Account Management' })).toBeVisible({
        timeout: 30_000,
      });
      await capture(page, 'AM-010', '01-account-management.png');

      await page.getByRole('button', { name: 'Archive Account' }).click();
      const dialog = page.locator('.account-deactivate-modal');
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog).toContainText('Archive Your Account?');
      await dialog.locator('input[type="checkbox"]').check();
      await capture(page, 'AM-010', '02-archive-confirmation.png');
      await dialog.getByRole('button', { name: 'Confirm Archive' }).click();

      await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
      const storage = await assertNoSession(page);
      await capture(page, 'AM-010', '03-archived-signed-out.png');

      // A completely fresh context proves the archived identity cannot log in.
      const { page: retryPage } = await newContext(browser);
      await retryPage.goto(appUrl('/login'));
      await expect(retryPage.locator('#login-email')).toBeVisible({ timeout: 60_000 });
      await retryPage.locator('#login-email').fill(victim.email);
      await retryPage.locator('#login-password').fill(victim.password);
      await retryPage.getByRole('button', { name: 'Log In' }).click();
      const alert = retryPage.locator('.login-error-message[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 20_000 });
      const loginError = (await alert.innerText()).trim();
      expect(/archived/i.test(loginError) || INVALID_CREDENTIALS_PATTERN.test(loginError)).toBeTruthy();
      await expect(retryPage).toHaveURL(/\/login$/, { timeout: 15_000 });
      const retryStorage = await assertNoSession(retryPage);
      await capture(retryPage, 'AM-010', '04-login-blocked.png');

      // Stage-2 cold relocation, scoped to this one test account.
      const prune = await dbPruneTarget(victim.email);
      expect(prune.moved, 'scoped prune must relocate exactly one archived row').toBe(1);
      expect(prune.live_user_exists, 'live accounts_user row must be removed').toBe(false);
      expect(prune.cold, 'pseudonymous cold row must exist').toBeTruthy();
      expect(prune.cold.email, 'cold email must be pseudonymous').not.toBe(victim.email);
      expect(prune.cold.email).toMatch(/^archived-[a-f0-9]{32}@archive\.invalid$/);
      expect(prune.cold.password).toBe('');
      expect(prune.cold.full_name).toBe('Archived User');
      for (const field of ['store_name', 'mobile', 'street', 'barangay', 'city', 'province', 'postal_code']) {
        expect(prune.cold[field], `cold ${field} must be cleared`).toBeNull();
      }
      expect(prune.orders.length).toBe(1);
      for (const row of prune.orders) {
        expect(row.user, 'order must be detached from the deleted user').toBeNull();
        expect(row.recipient_name).toBe('');
        expect(row.recipient_email).toBe('');
        expect(row.contact_number).toBe('');
        expect(row.shipping_address).toBe('');
      }

      return {
        archived_email: victim.email,
        order_id: order.id,
        preset_id: preset.id,
        outfit_id: outfit.id,
        presets_before_prune: prune.presets_before,
        outfits_before_prune: prune.outfits_before,
        login_error: loginError,
        session_after_archive: storage.session,
        session_after_retry: retryStorage.session,
        prune_summary: {
          moved: prune.moved,
          live_user_exists: prune.live_user_exists,
          cold_email: prune.cold.email,
          cold_password_empty: prune.cold.password === '',
          pseudonymized_orders: prune.orders.length,
        },
      };
    });
  });

  test('AM-011 password is hashed in the database', async ({ browser, request }) => {
    const user = await registerUser(request, 'shopper');
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-011', page, async () => {
      await loginInFreshContext(page, user);
      const snapshot = await dbUserSnapshot(user.email);
      expect(snapshot.found, `user ${user.email} must exist in accounts_user`).toBe(true);
      const stored = String(snapshot.user.password ?? '');
      expect(
        /^(pbkdf2_sha256|argon2)/.test(stored),
        'stored credential must use PBKDF2 or Argon2id',
      ).toBeTruthy();
      expect(stored, 'plaintext password must never be stored').not.toBe(user.password);
      expect(stored.includes(user.password), 'stored hash must not contain the password').toBe(false);
      await capture(page, 'AM-011', '01-registered-login.png');

      return {
        email: user.email,
        hash_prefix: stored.slice(0, 16),
        hash_algorithm: stored.split('$')[0],
        plaintext_password_stored: false,
        hash_length: stored.length,
      };
    });
  });

  test('AM-012 guest data is ephemeral after context close', async ({ browser, request }) => {
    const before = await dbCounts();
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-012', page, async () => {
      const recommendationStatuses = await prepareGuestStudio(page);
      await tryFirstRecommendation(page);
      const guestStorage = await storageSnapshot(page);
      expect(guestStorage.session).toBeNull();
      expect(guestStorage.avatarKeys.length).toBeGreaterThan(0);
      await capture(page, 'AM-012', '01-guest-avatar-and-outfit.png');

      await closeActiveContext();

      const { page: freshPage } = await newContext(browser);
      await freshPage.goto(appUrl('/guest/avatar-presets'));
      await expect(freshPage.getByRole('heading', { name: 'Choose an Avatar Preset' })).toBeVisible({
        timeout: 60_000,
      });
      const freshStorage = await storageSnapshot(freshPage);
      expect(freshStorage.avatarKeys).toEqual([]);
      expect(freshStorage.localAvatarKeys).toEqual([]);
      await assertNoSession(freshPage);
      await capture(freshPage, 'AM-012', '02-fresh-context-no-avatar.png');

      const anonymous = await request.get(apiUrl('/presets/'));
      expect(anonymous.status(), 'guest preset API access must be denied').toBe(401);
      const after = await dbCounts();
      expect(after, 'closing a guest context must leave no persistent records').toEqual(before);

      return {
        recommendation_statuses: recommendationStatuses,
        guest_avatar_keys: guestStorage.avatarKeys,
        fresh_avatar_keys: freshStorage.avatarKeys,
        fresh_local_avatar_keys: freshStorage.localAvatarKeys,
        anonymous_presets_status: anonymous.status(),
        db_counts_before: before,
        db_counts_after: after,
      };
    });
  });

  test('AM-013 cross-user RBAC isolates orders, presets, and outfits', async ({ browser, request }) => {
    const userA = await registerUser(request, 'shopper');
    const userB = await registerUser(request, 'shopper');
    const items = await listCatalog(request);
    expect(items.length, 'catalog must contain at least one item').toBeGreaterThan(0);
    const add = await cartAdd(request, userA, items[0].id, 1);
    expect(add.ok(), `fixture cart add failed: ${await add.text()}`).toBeTruthy();
    const orderA = await checkoutViaApi(request, userA);
    const presetA = await createPreset(request, userA, { name: 'AM-013 Private Preset' });
    const outfitA = await createOutfit(request, userA, {
      name: 'AM-013 Private Outfit',
      items: [items[0].id],
    });

    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-013', page, async () => {
      await loginInFreshContext(page, userB);
      const bSession = await sessionFromPage(page);
      const headers = { Authorization: `Bearer ${bSession.access}` };

      const orderResponse = await request.get(
        apiUrl(`/orders/${encodeURIComponent(orderA.id)}/`),
        { headers },
      );
      const orderBody = await orderResponse.text();
      expect([403, 404], 'User B must be denied User A order').toContain(orderResponse.status());
      expect(orderBody).not.toContain(userA.email);

      const presetResponse = await request.get(
        apiUrl(`/presets/${encodeURIComponent(presetA.id)}/`),
        { headers },
      );
      const presetBody = await presetResponse.text();
      expect([403, 404], 'User B must be denied User A preset').toContain(presetResponse.status());
      expect(presetBody).not.toContain(presetA.name);

      const outfitResponse = await request.get(
        apiUrl(`/outfits/${encodeURIComponent(outfitA.id)}/`),
        { headers },
      );
      const outfitBody = await outfitResponse.text();
      expect([403, 404], 'User B must be denied User A outfit').toContain(outfitResponse.status());
      expect(outfitBody).not.toContain('AM-013 Private Outfit');

      await page.goto(appUrl('/shopper/orders'));
      await expect(page.locator('main').first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(userA.email)).toHaveCount(0);
      await expect(page.getByText(presetA.name)).toHaveCount(0);
      await capture(page, 'AM-013', '01-user-b-orders-no-a-data.png');

      return {
        user_a_email: userA.email,
        user_b_email: userB.email,
        order_a_id: orderA.id,
        preset_a_id: presetA.id,
        outfit_a_id: outfitA.id,
        order_status: orderResponse.status(),
        preset_status: presetResponse.status(),
        outfit_status: outfitResponse.status(),
        no_user_a_data_disclosed: true,
      };
    });
  });

  test('AM-014 guest can browse, create avatar, try on, and see recommendations', async ({ browser }) => {
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-014', page, async () => {
      await page.goto(appUrl('/guest'));
      await expect(page.getByRole('heading', { name: 'Try the FitFusion experience' })).toBeVisible({
        timeout: 60_000,
      });
      const guestStorage = await assertNoSession(page);
      await capture(page, 'AM-014', '01-guest-dashboard.png');

      await page.goto(appUrl('/guest/catalog'));
      await expect(page.locator('.catalog-product-card').first()).toBeVisible({ timeout: 60_000 });
      await assertNoSession(page);
      await capture(page, 'AM-014', '02-guest-catalog.png');

      const recommendationStatuses = await prepareGuestStudio(page);
      const card = await tryFirstRecommendation(page);
      const recommendedName = (await card.locator('.studio-product-link').innerText()).trim();
      await assertNoSession(page);
      await capture(page, 'AM-014', '03-guest-try-on-and-recommendations.png');

      expect(
        recommendationStatuses.some((status) => status >= 200 && status < 300),
        'guest recommendations request must succeed without login',
      ).toBeTruthy();

      return {
        guest_dashboard_url: appUrl('/guest'),
        catalog_cards: await page.locator('.catalog-product-card').count(),
        recommendation_statuses: recommendationStatuses,
        tried_item: recommendedName,
        equipped_items: await page.locator('.studio-equipped-item').count(),
        guest_session_token: guestStorage.session,
      };
    });
  });

  test('AM-015 guest restrictions prompt sign-up and deny protected writes', async ({ browser, request }) => {
    const before = await dbCounts();
    const protectedRequests: Array<{ path: string; method: string }> = [];
    await newContext(browser);
    const page = activePage as Page;
    await execute('AM-015', page, async () => {
      const cartCalls: string[] = [];
      const ratingCalls: string[] = [];
      page.on('request', (req) => {
        if (/\/cart\//.test(req.url())) cartCalls.push(req.url());
        if (/\/ratings\//.test(req.url())) ratingCalls.push(req.url());
      });

      // Add to Cart gate
      await page.goto(appUrl('/guest/catalog'));
      await expect(page.locator('.catalog-product-card').first()).toBeVisible({ timeout: 60_000 });
      const card = page.locator('.catalog-product-card').first();
      await card.getByRole('button', { name: 'Register to Add to Cart' }).click();
      const cartDialog = page.getByRole('dialog');
      await expect(cartDialog).toBeVisible({ timeout: 15_000 });
      await expect(cartDialog).toContainText('REGISTRATION REQUIRED');
      await expect(cartDialog).toContainText('Create an account to continue');
      await expect(cartDialog).toContainText(
        'Please create an account or log in to add products to your cart.',
      );
      await capture(page, 'AM-015', '01-add-to-cart-restricted.png');
      await cartDialog.getByRole('button', { name: 'Continue Browsing' }).click();

      // Checkout gate
      await page.goto(appUrl('/shopper/checkout'));
      await expect(page).not.toHaveURL(/\/shopper\/checkout$/, { timeout: 30_000 });
      const checkoutUrl = page.url();
      await assertNoSession(page);
      await capture(page, 'AM-015', '02-checkout-restricted.png');

      // Save Outfit gate
      await prepareGuestStudio(page);
      await tryFirstRecommendation(page);
      await page.getByRole('button', { name: 'Registration Required to Save Outfit', exact: true }).click();
      const saveDialog = page.locator('.studio-registration-modal').filter({
        hasText: 'Unlock the complete fitting experience',
      });
      await expect(saveDialog).toBeVisible({ timeout: 15_000 });
      await expect(saveDialog).toContainText('REGISTRATION REQUIRED');
      await capture(page, 'AM-015', '03-save-outfit-restricted.png');
      await saveDialog.getByRole('button', { name: 'Continue as Guest' }).click();

      // Rating gate
      const ratingCard = page.locator('.studio-recommendation-item').first();
      await ratingCard.getByRole('button', { name: /Rate recommendation/i }).click();
      const ratingModal = page.locator('.studio-rating-modal');
      await expect(ratingModal).toBeVisible({ timeout: 15_000 });
      const ratingStorageBefore = await storageSnapshot(page);
      await ratingModal.locator('.studio-rating-stars button').first().click();
      const ratingPrompt = page.locator('[aria-labelledby="guest-rating-title"]');
      await expect(ratingPrompt).toBeVisible({ timeout: 15_000 });
      await expect(ratingPrompt).toContainText(GUEST_RATING_PROMPT);
      await expect(ratingPrompt.getByRole('button', { name: 'Sign Up' })).toBeVisible();
      await expect(ratingPrompt.getByRole('button', { name: 'Log In' })).toBeVisible();
      await expect(ratingModal).toBeHidden({ timeout: 15_000 });
      const ratingStorageAfter = await storageSnapshot(page);
      expect(ratingStorageAfter.ratingKeys, 'guest rating must not be cached').toEqual(
        ratingStorageBefore.ratingKeys,
      );
      await capture(page, 'AM-015', '04-rating-restricted.png');

      // Anonymous API denials
      const endpoints = [
        { path: '/cart/', method: 'GET' },
        { path: '/orders/', method: 'GET' },
        { path: '/outfits/', method: 'GET' },
        { path: '/presets/', method: 'GET' },
        { path: '/checkout/', method: 'POST' },
        { path: '/profile/', method: 'GET' },
        { path: '/ratings/', method: 'POST' },
      ];
      for (const endpoint of endpoints) {
        const response =
          endpoint.method === 'POST'
            ? await request.post(apiUrl(endpoint.path), { data: {} })
            : await request.get(apiUrl(endpoint.path));
        protectedRequests.push({ path: endpoint.path, method: endpoint.method });
        expect([401, 403], `${endpoint.method} ${endpoint.path} must be denied`).toContain(response.status());
      }

      const after = await dbCounts();
      expect(after, 'guest restrictions must create no persistent records').toEqual(before);
      const storage = await assertNoSession(page);

      return {
        add_to_cart_prompt: 'REGISTRATION REQUIRED / Create an account to continue',
        cart_api_calls_from_guest: cartCalls.length,
        checkout_redirect_url: checkoutUrl,
        save_outfit_prompt: 'Unlock the complete fitting experience',
        rating_prompt: GUEST_RATING_PROMPT,
        rating_api_calls_from_guest: ratingCalls.length,
        rating_storage_before: ratingStorageBefore.ratingKeys,
        rating_storage_after: ratingStorageAfter.ratingKeys,
        anonymous_api_denials: protectedRequests,
        guest_session_token: storage.session,
        db_counts_before: before,
        db_counts_after: after,
      };
    });
  });
});
