import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type TestRole = 'shopper' | 'seller';

async function createApiSession(
  request: APIRequestContext,
  role: TestRole,
) {
  const suffix = randomUUID();
  const password = `EvidenceTest-${suffix}!7`;
  const payload = {
    email: `evidence-${role}-${suffix}@example.test`,
    full_name: role === 'seller' ? 'Evidence Seller' : 'Evidence Shopper',
    password,
    password_confirm: password,
    role,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
    ...(role === 'seller' ? { store_name: `Evidence Store ${suffix}` } : {}),
  };

  const response = await request.post(
    new URL('/auth/register/', API_BASE_URL).toString(),
    { data: payload },
  );
  if (!response.ok()) {
    throw new Error(
      `Could not create ${role} evidence user (${response.status()}): ${await response.text()}`,
    );
  }

  const data = await response.json();
  if (!data.tokens?.access || !data.tokens?.refresh || data.user?.role !== role) {
    throw new Error(`Registration returned no valid ${role} session.`);
  }
  return {
    access: data.tokens.access as string,
    refresh: data.tokens.refresh as string,
    user: data.user,
  };
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

async function capture(
  page: Page,
  route: string,
  ticket: string,
  filename: string,
) {
  const screenshotPath = resolve(
    REPOSITORY_ROOT,
    'docs',
    'evidence',
    ticket,
    filename,
  );
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.goto(new URL(route, APP_BASE_URL).toString());
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(new URL(route, APP_BASE_URL).toString());
  await page.screenshot({ path: screenshotPath });
}

test('KAN-106 landing page', async ({ page }) => {
  await capture(page, '/', 'KAN-106', 'landing-page.png');
});

test('KAN-57 avatar creator', async ({ page, request }) => {
  const session = await createApiSession(request, 'shopper');
  await installApiSession(page, session);
  // The app exposes avatar creation under the shopper fitting-studio route.
  await capture(page, '/shopper/fitting-studio', 'KAN-57', 'avatar-creator.png');
});

test('KAN-66 seller dashboard', async ({ page, request }) => {
  const session = await createApiSession(request, 'seller');
  await installApiSession(page, session);
  await capture(page, '/seller/dashboard', 'KAN-66', 'seller-dashboard.png');
});

test('KAN-113 guest screens', async ({ page }) => {
  // /guest/browse is not registered; /guest is the public guest landing route.
  await capture(page, '/guest', 'KAN-113', 'guest-screens.png');
});

test('KAN-114 registered-user screens', async ({ page, request }) => {
  const session = await createApiSession(request, 'shopper');
  await installApiSession(page, session);
  // The account screen is nested under the authenticated shopper route.
  await capture(page, '/shopper/account', 'KAN-114', 'registered-screens.png');
});
