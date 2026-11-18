import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'KAN-115');

// Values produced by the KAN-115 staging seed run (docs/evidence/KAN-115/*-seed-staging.log).
const SEEDED_LISTING_NAME = 'Classic White Tee';
const SEEDED_STORE_NAME =
  process.env.STAGING_SEED_STORE ?? 'Seed Store cbd72b57';
const SEEDED_SELLER_EMAIL =
  process.env.STAGING_SEED_SELLER_EMAIL ??
  'seed-seller-20261118142358-cbd72b57@example.test';
const SEEDED_SELLER_PASSWORD =
  process.env.STAGING_SEED_SELLER_PASSWORD ?? 'SeedSeller123!';

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type TestRole = 'shopper' | 'seller';

async function createApiSession(request: APIRequestContext, role: TestRole) {
  const suffix = randomUUID();
  const password = `StagingTest-${suffix}!7`;
  const payload = {
    email: `staging-${role}-${suffix}@example.test`,
    full_name: role === 'seller' ? 'Staging Seller' : 'Staging Shopper',
    password,
    password_confirm: password,
    role,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
    ...(role === 'seller' ? { store_name: `Staging Store ${suffix}` } : {}),
  };

  const response = await request.post(
    new URL('/auth/register/', API_BASE_URL).toString(),
    { data: payload },
  );
  expect(
    response.ok(),
    `could not register ${role} staging user: ${await response.text()}`,
  ).toBeTruthy();

  const data = await response.json();
  expect(data.tokens?.access).toBeTruthy();
  expect(data.user?.role).toBe(role);
  return { access: data.tokens.access, refresh: data.tokens.refresh, user: data.user };
}

async function installApiSession(
  page: Page,
  session: Awaited<ReturnType<typeof createApiSession>>,
) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('fitfusion.session.v1', JSON.stringify(value));
    window.sessionStorage.setItem('fitfusion.history.epoch', String(Date.now()));
  }, session);
}

async function screenshot(page: Page, filename: string) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, filename),
    fullPage: true,
  });
}

async function findSeededListing(request: APIRequestContext) {
  const response = await request.get(`${API_BASE_URL}/catalog/`, {
    timeout: 60_000,
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.results ?? [];
  const match = rows.find(
    (row: { name?: string; store_name?: string }) =>
      row.name === SEEDED_LISTING_NAME && row.store_name === SEEDED_STORE_NAME,
  );
  expect(
    match,
    'the KAN-115 seeded listing must be public and active',
  ).toBeTruthy();
  expect(match.status).toBe('active');
  return match as { id: string; name: string; price: string; store_name: string };
}

test('staging landing page renders', async ({ page }) => {
  await page.goto(new URL('/', APP_BASE_URL).toString());
  await expect(page.getByRole('button', { name: 'Create an Account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible();
  await screenshot(page, 'landing-real-data.png');
});

test('guest catalog shows the seeded staging listing', async ({ page }) => {
  await page.goto(new URL('/guest/catalog', APP_BASE_URL).toString());

  const card = page
    .locator('.catalog-product-card')
    .filter({ hasText: SEEDED_LISTING_NAME })
    .filter({ hasText: SEEDED_STORE_NAME })
    .first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.locator('.catalog-price')).toContainText('599');
  await expect(card).toContainText(SEEDED_STORE_NAME);
  await screenshot(page, 'guest-catalog-real-data.png');
});

test('guest product details loads the seeded listing from the API', async ({
  page,
  request,
}) => {
  const listing = await findSeededListing(request);
  await page.goto(
    new URL(`/guest/products/${listing.id}`, APP_BASE_URL).toString(),
  );

  await expect(page.getByRole('heading', { level: 1, name: listing.name })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();
  await expect(page.locator('.product-details-page')).toContainText(
    SEEDED_STORE_NAME,
  );
  await screenshot(page, 'guest-product-details-real-data.png');
});

test('guest avatar presets page loads preset data', async ({ page }) => {
  await page.goto(new URL('/guest/avatar-presets', APP_BASE_URL).toString());
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose an Avatar Preset' }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('FitFusion Standard').first()).toBeVisible();
  await screenshot(page, 'guest-avatar-presets-real-data.png');
});

test('registered shopper pages use live account and cart data', async ({
  page,
  request,
}) => {
  const session = await createApiSession(request, 'shopper');
  await installApiSession(page, session);

  await page.goto(new URL('/shopper/dashboard', APP_BASE_URL).toString());
  await expect(page.getByText(/WELCOME/).first()).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/shopper\/dashboard$/);
  await screenshot(page, 'shopper-dashboard-real-data.png');

  await page.goto(new URL('/shopper/cart', APP_BASE_URL).toString());
  await expect(
    page.getByRole('heading', { name: 'Your shopping cart is empty' }),
  ).toBeVisible({ timeout: 60_000 });
  await screenshot(page, 'shopper-cart-empty-real-data.png');

  await page.goto(new URL('/shopper/account', APP_BASE_URL).toString());
  await expect(
    page.getByRole('heading', { level: 1, name: 'Account Management' }),
  ).toBeVisible({ timeout: 60_000 });
  await screenshot(page, 'shopper-account-real-data.png');
});

test('seeded seller logs in and CSV validation rejects a non-CSV file', async ({
  page,
}) => {
  await page.goto(new URL('/login', APP_BASE_URL).toString());
  await page.locator('#login-email').fill(SEEDED_SELLER_EMAIL);
  await page.locator('#login-password').fill(SEEDED_SELLER_PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL(/\/seller\/dashboard$/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { level: 1, name: /Welcome,/ }),
  ).toBeVisible({ timeout: 60_000 });
  await screenshot(page, 'seller-dashboard-real-data.png');

  await page.goto(new URL('/seller/catalog-upload', APP_BASE_URL).toString());
  await page.locator('#catalog-csv').setInputFiles({
    name: 'not-a-catalog.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('name,price\nClassic White Tee,599.00\n'),
  });

  await expect(page.getByText('Please upload a valid CSV file.')).toBeVisible();
  await expect(page.getByText('Select your CSV file')).toBeVisible();
  await screenshot(page, 'seller-csv-client-validation.png');
});

test('signup client validation blocks an empty first step', async ({ page }) => {
  await page.goto(new URL('/signup/shopper', APP_BASE_URL).toString());
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Full name is required.')).toBeVisible();
  await expect(page.getByText('Email address is required.')).toBeVisible();
  await expect(page.getByText('Step 1 of 3').first()).toBeVisible();
  await screenshot(page, 'signup-client-validation.png');
});

test('login surfaces the staging API credential error', async ({ page }) => {
  await page.goto(new URL('/login', APP_BASE_URL).toString());
  await page.locator('#login-email').fill(`unknown-${randomUUID()}@example.test`);
  await page.locator('#login-password').fill('NotTheRealPassword1!');
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
  await screenshot(page, 'login-invalid-credentials.png');
});
