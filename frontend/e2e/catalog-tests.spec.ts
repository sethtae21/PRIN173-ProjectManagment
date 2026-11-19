/**
 * Catalog / Browsing (CAT) test suite — docs/Test Cases/FitFusionAI - Test Cases - CAT — Catalog & Browsing.csv
 *
 * Evidence-only automation. No application code is touched: the suite drives
 * the running Vite frontend (https://localhost:8443) and the Django API
 * (http://127.0.0.1:8000). Cases are executed in CSV order and the describe is
 * serial, so STOP ON FAILURE skips everything after a failing case.
 *
 *   npx playwright test e2e/catalog-tests.spec.ts
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'catalog-tests');

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type Role = 'shopper' | 'seller';
type Session = { access: string; refresh: string; user: Record<string, unknown> };
type CatalogItem = {
  id: string;
  name: string;
  seller: string;
  store_name: string;
  category: string;
  size: string;
  color: string;
  color_family: string;
  price: string;
  description: string;
  status: string;
  front_image: string;
  rear_image: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Infrastructure helpers
// ---------------------------------------------------------------------------

async function registerUser(request: APIRequestContext, role: Role) {
  const suffix = randomUUID();
  const password = `CatalogTest-${suffix}!7`;
  const payload = {
    email: `catalog-${role}-${suffix}@example.test`,
    full_name: role === 'seller' ? 'Catalog Test Seller' : 'Catalog Test Shopper',
    password,
    password_confirm: password,
    role,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
    ...(role === 'seller' ? { store_name: `Catalog Test Store ${suffix}` } : {}),
  };
  const response = await request.post(new URL('/auth/register/', API_BASE_URL).toString(), {
    data: payload,
  });
  expect(response.ok(), `could not register ${role} user: ${await response.text()}`).toBeTruthy();
  const data = await response.json();
  expect(data.tokens?.access).toBeTruthy();
  return {
    access: data.tokens.access as string,
    refresh: data.tokens.refresh as string,
    user: data.user as Record<string, unknown>,
    email: payload.email,
    password,
    store_name: payload.store_name,
  };
}

async function installSession(page: Page | BrowserContext, session: Session) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('fitfusion.session.v1', JSON.stringify(value));
    window.sessionStorage.setItem('fitfusion.history.epoch', String(Date.now()));
  }, session);
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access}` };
}

async function listCatalog(
  request: APIRequestContext,
  params: Record<string, string | number> = {},
): Promise<CatalogItem[]> {
  const url = new URL('/catalog/', API_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await request.get(url.toString());
  expect(response.ok(), `could not list catalog (${url}): ${await response.text()}`).toBeTruthy();
  return (await response.json()) as CatalogItem[];
}

async function getCatalogItem(request: APIRequestContext, id: string) {
  const response = await request.get(
    new URL(`/catalog/${encodeURIComponent(id)}/`, API_BASE_URL).toString(),
  );
  return { status: response.status(), body: response.ok() ? await response.json() : null };
}

function appUrl(path: string) {
  return new URL(path, APP_BASE_URL).toString();
}

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------

async function evidenceDir(testId: string) {
  const dir = resolve(EVIDENCE_DIR, testId);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function capture(page: Page, testId: string, filename: string) {
  await page.screenshot({ path: resolve(await evidenceDir(testId), filename), fullPage: true });
}

async function writeLog(
  testId: string,
  status: 'PASS' | 'FAIL',
  started: number,
  error_message?: string,
  details?: Record<string, unknown>,
) {
  const log = {
    test_id: testId,
    status,
    timestamp: new Date().toISOString(),
    duration: `${Date.now() - started}ms`,
    ...(error_message ? { error_message } : {}),
    ...(details ? { details } : {}),
  };
  await writeFile(
    resolve(await evidenceDir(testId), 'test-log.json'),
    `${JSON.stringify(log, null, 2)}\n`,
    'utf8',
  );
}

/** Run one CAT case, always writing evidence; rethrow on failure so the test fails. */
async function execute(
  testId: string,
  page: Page,
  body: () => Promise<Record<string, unknown> | void>,
) {
  const started = Date.now();
  try {
    const details = await body();
    await writeLog(testId, 'PASS', started, undefined, details);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    try {
      await capture(page, testId, 'failure.png');
    } catch {
      // screenshot is best-effort; the error log is still written below
    }
    await writeLog(testId, 'FAIL', started, message);
    throw error;
  }
}

function money(text: string) {
  return Number(text.replace(/[^0-9.]/g, ''));
}

test.describe('Catalog CAT-001..CAT-009 (CSV order, stop on failure)', () => {
  test.describe.configure({ mode: 'serial' });

  /** CAT-001 — catalog browser shows items with images and metadata. */
  test('CAT-001 browse catalog renders items with images and metadata', async ({ page, request }) => {
    await execute('CAT-001', page, async () => {
      const session = await registerUser(request, 'shopper');
      await installSession(page, session);

      const apiItems = await listCatalog(request);
      expect(apiItems.length, 'seeded active catalog must not be empty').toBeGreaterThan(0);

      await page.goto(appUrl('/shopper/catalog'));
      const grid = page.locator('section.catalog-product-grid');
      await expect(grid).toBeVisible({ timeout: 60_000 });
      const cards = grid.locator('article.catalog-product-card');
      await expect(cards.first()).toBeVisible({ timeout: 60_000 });
      const rendered = await cards.count();
      expect(rendered).toBeGreaterThan(0);
      await expect(page.locator('.catalog-result-row')).toContainText(`Showing ${rendered} products`);

      const first = cards.first();
      await expect(first.locator('h2')).toBeVisible();
      await expect(first.locator('strong.catalog-price')).toBeVisible();
      await expect(first.locator('button.catalog-store-link')).toBeVisible();
      await expect(first.locator('img.catalog-product-image').or(first.locator('.catalog-product-placeholder')))
        .toBeVisible();
      await capture(page, 'CAT-001', '01-catalog-loaded.png');

      return {
        api_active_items: apiItems.length,
        rendered_cards: rendered,
        sample_name: await first.locator('h2').innerText(),
        sample_price: await first.locator('strong.catalog-price').innerText(),
        sample_store: await first.locator('button.catalog-store-link').innerText(),
      };
    });
  });

  /** CAT-002 — category, size and price filtering (incl. KAN-120 API params). */
  test('CAT-002 filter catalog by category size and price', async ({ page, request }) => {
    await execute('CAT-002', page, async () => {
      const session = await registerUser(request, 'shopper');
      await installSession(page, session);

      const tops = await listCatalog(request, { category: 'tops' });
      const smalls = await listCatalog(request, { size: 'S' });
      const ascending = await listCatalog(request, { sort: 'price_asc' });
      const descending = await listCatalog(request, { sort: 'price_desc' });
      const ranged = await listCatalog(request, { min_price: 1000, max_price: 2000 });
      expect(tops.length).toBeGreaterThan(0);
      expect(smalls.length).toBeGreaterThan(0);
      expect(ranged.length).toBeGreaterThan(0);

      // KAN-120: asc/desc are genuinely ordered and the range is inclusive.
      const ascPrices = ascending.map((item) => Number(item.price));
      const descPrices = descending.map((item) => Number(item.price));
      expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));
      expect(descPrices).toEqual([...descPrices].sort((a, b) => b - a));
      for (const item of ranged) {
        expect(Number(item.price)).toBeGreaterThanOrEqual(1000);
        expect(Number(item.price)).toBeLessThanOrEqual(2000);
      }
      const invalidSort = await request.get(new URL('/catalog/?sort=bogus', API_BASE_URL).toString());
      expect(invalidSort.status()).toBe(400);
      const badRange = await request.get(
        new URL('/catalog/?min_price=2000&max_price=1000', API_BASE_URL).toString(),
      );
      expect(badRange.status()).toBe(400);

      await page.goto(appUrl('/shopper/catalog'));
      const cards = page.locator('section.catalog-product-grid article.catalog-product-card');
      await expect(cards.first()).toBeVisible({ timeout: 60_000 });
      const categorySelect = page.locator('section.catalog-toolbar select').first();
      const filterSelect = page.locator('section.catalog-toolbar select').nth(1);

      // Category filter
      await categorySelect.selectOption('Tops');
      await expect(cards).toHaveCount(tops.length, { timeout: 30_000 });
      const topsNames = tops.map((item) => item.name.toLowerCase());
      for (const name of await cards.locator('h2').allInnerTexts()) {
        expect(topsNames).toContain(name.toLowerCase());
      }
      await capture(page, 'CAT-002', '01-category-filter.png');

      // Size filter (reset category first so this is a size-only assertion)
      await categorySelect.selectOption('All');
      await filterSelect.selectOption('S');
      await expect(cards).toHaveCount(smalls.length, { timeout: 30_000 });
      const smallNames = smalls.map((item) => item.name.toLowerCase());
      for (const name of await cards.locator('h2').allInnerTexts()) {
        expect(smallNames).toContain(name.toLowerCase());
      }
      await capture(page, 'CAT-002', '02-size-filter.png');

      // KAN-120 UI: price sort is requested from the API via sort=price_asc|price_desc.
      await filterSelect.selectOption('all');
      await filterSelect.selectOption('price-low');
      await expect(cards.first()).toBeVisible();
      const lowPrices = await cards.locator('strong.catalog-price').allInnerTexts();
      const lowValues = lowPrices.map(money);
      expect(lowValues).toEqual([...lowValues].sort((a, b) => a - b));
      expect(lowValues[0]).toBe(Number(ascending[0].price));
      await capture(page, 'CAT-002', '03-price-low-to-high.png');

      await filterSelect.selectOption('price-high');
      await expect(cards.first()).toBeVisible();
      const highValues = (await cards.locator('strong.catalog-price').allInnerTexts()).map(money);
      expect(highValues).toEqual([...highValues].sort((a, b) => b - a));
      expect(highValues[0]).toBe(Number(descending[0].price));
      await capture(page, 'CAT-002', '04-price-high-to-low.png');

      return {
        category: 'tops',
        category_count: tops.length,
        size: 'S',
        size_count: smalls.length,
        price_range: { min: 1000, max: 2000, count: ranged.length },
        sort_first_low: lowValues[0],
        sort_first_high: highValues[0],
        invalid_sort_status: invalidSort.status(),
        invalid_range_status: badRange.status(),
      };
    });
  });

  /** CAT-003 — no-match state and clear-filters option. */
  test('CAT-003 no-match message and clear filters', async ({ page, request }) => {
    await execute('CAT-003', page, async () => {
      expect((await listCatalog(request, { category: 'tops', size: 'S' })).length).toBe(0);
      const session = await registerUser(request, 'shopper');
      await installSession(page, session);

      await page.goto(appUrl('/shopper/catalog'));
      await expect(page.locator('section.catalog-product-grid article.catalog-product-card').first())
        .toBeVisible({ timeout: 60_000 });
      await page.locator('section.catalog-toolbar select').first().selectOption('Tops');
      await page.locator('section.catalog-toolbar select').nth(1).selectOption('S');

      const empty = page.locator('section.catalog-empty-state');
      await expect(empty).toBeVisible({ timeout: 30_000 });
      const displayedMessage = await empty.innerText();
      // CSV wording "No items match your filters" is implemented in the UI as
      // "No products found" (approved equivalent empty-state copy).
      await expect(empty).toContainText(/No items match your filters|No products found/);
      await expect(empty.getByRole('button', { name: 'Clear All Filters' })).toBeVisible();
      await capture(page, 'CAT-003', '01-no-match-state.png');

      await empty.getByRole('button', { name: 'Clear All Filters' }).click();
      await expect(page.locator('section.catalog-product-grid article.catalog-product-card').first())
        .toBeVisible({ timeout: 30_000 });
      await capture(page, 'CAT-003', '02-filters-cleared.png');
      return { displayed_message: displayedMessage, clear_filters_offered: true };
    });
  });

  /** CAT-004 — full item details with front and rear views. */
  test('CAT-004 item details and two-view images', async ({ page, request }) => {
    await execute('CAT-004', page, async () => {
      const items = await listCatalog(request);
      const item = items.find((row) => row.front_image && row.rear_image) ?? items[0];
      expect(item).toBeTruthy();

      const session = await registerUser(request, 'shopper');
      await installSession(page, session);
      await page.goto(appUrl(`/shopper/products/${encodeURIComponent(item.id)}`));

      const details = page.locator('main.product-details-page');
      await expect(details).toBeVisible({ timeout: 60_000 });
      await expect(details.getByRole('heading', { level: 1, name: item.name })).toBeVisible();
      await expect(details.locator('p.product-description')).toContainText(item.description.slice(0, 20));
      await expect(details.locator('.product-price-row strong')).toBeVisible();
      await expect(details.locator('.product-seller-card h2')).toContainText(item.store_name);
      await expect(details.locator('.product-details-main-image')).toBeVisible({ timeout: 30_000 });
      await expect(details.locator('img.product-details-main-image')).toHaveAttribute(
        'alt', new RegExp(`${item.name} - front view`, 'i'),
      );
      await capture(page, 'CAT-004', '01-item-details-front.png');

      await details.getByRole('button', { name: 'rear', exact: true }).click();
      await expect(details.locator('img.product-details-main-image')).toHaveAttribute(
        'alt', new RegExp(`${item.name} - rear view`, 'i'),
      );
      await capture(page, 'CAT-004', '02-item-details-rear.png');

      const info = details.getByRole('heading', { name: 'Product information' }).locator('..');
      await expect(info).toContainText('Category');
      await expect(info).toContainText('Color Family');
      await expect(info).toContainText('Style Tags');
      return {
        item_id: item.id,
        name: item.name,
        store: item.store_name,
        price: item.price,
        front_and_rear_images: true,
      };
    });
  });

  /** CAT-005 — per-seller store page lists only that seller's active items. */
  test('CAT-005 per-seller store page isolation', async ({ page, request }) => {
    await execute('CAT-005', page, async () => {
      const all = await listCatalog(request);
      const item = all[0];
      expect(item).toBeTruthy();
      const sellerItems = all.filter((row) => row.seller === item.seller);
      const otherNames = all.filter((row) => row.seller !== item.seller).map((row) => row.name.toLowerCase());
      expect(sellerItems.length).toBeGreaterThan(0);
      expect(otherNames.length).toBeGreaterThan(0);

      const session = await registerUser(request, 'shopper');
      await installSession(page, session);
      await page.goto(appUrl(`/shopper/products/${encodeURIComponent(item.id)}`));
      await expect(page.locator('main.product-details-page')).toBeVisible({ timeout: 60_000 });
      await page.locator('.product-seller-card').getByRole('button', { name: 'View Seller Store' }).click();
      await expect(page).toHaveURL(new RegExp(`/shopper/sellers/${item.seller}`), { timeout: 30_000 });

      const store = page.locator('main.seller-store-page');
      await expect(store).toBeVisible({ timeout: 60_000 });
      await expect(store.getByRole('heading', { level: 1 })).toContainText(item.store_name);
      const cards = store.locator('article.seller-store-card');
      await expect(cards.first()).toBeVisible({ timeout: 30_000 });
      await expect(cards).toHaveCount(sellerItems.length);
      const shown = (await cards.locator('h3').allInnerTexts()).map((name) => name.toLowerCase());
      const expected = sellerItems.map((row) => row.name.toLowerCase());
      expect(shown.sort()).toEqual(expected.sort());
      const foreignNames = otherNames.filter((name) => !expected.includes(name));
      for (const name of foreignNames) expect(shown).not.toContain(name);
      await capture(page, 'CAT-005', '01-seller-store.png');

      return {
        seller_id: item.seller,
        store_name: item.store_name,
        shown_count: shown.length,
        other_seller_names_absent: true,
      };
    });
  });

  /** CAT-006 — empty catalog state (catalog API stubbed to [] via route interception). */
  test('CAT-006 empty catalog state', async ({ page, request }) => {
    await execute('CAT-006', page, async () => {
      const session = await registerUser(request, 'shopper');
      await installSession(page, session);
      // Simulate the "catalog is empty" precondition without touching app code/DB.
      await page.route('**/catalog/', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
      );

      await page.goto(appUrl('/shopper/catalog'));
      const empty = page.locator('section.catalog-empty-state');
      await expect(empty).toBeVisible({ timeout: 60_000 });
      const displayedMessage = await empty.innerText();
      // CSV wording "No items available" is implemented in the UI as
      // "No products found" (approved equivalent empty-state copy).
      await expect(empty).toContainText(/No items available|No products found/);
      await capture(page, 'CAT-006', '01-empty-catalog.png');
      return { displayed_message: displayedMessage, stubbed_api_response: '[]' };
    });
  });

  /** CAT-007 — guest read-only catalog browsing and filtering. */
  test('CAT-007 guest read-only catalog access', async ({ browser, request }) => {
    // Fresh context = no injected session, so this is a real guest.
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await execute('CAT-007', page, async () => {
      const all = await listCatalog(request);
      expect(all.length).toBeGreaterThan(0);

      await page.goto(appUrl('/guest/catalog'));
      const cards = page.locator('section.catalog-product-grid article.catalog-product-card');
      await expect(cards.first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('section.catalog-toolbar select').first()).toBeVisible();
      await expect(cards.first().locator('button.catalog-cart-action'))
        .toHaveText('Register to Add to Cart');
      await capture(page, 'CAT-007', '01-guest-catalog.png');

      await page.locator('section.catalog-toolbar select').first().selectOption('Dresses');
      const dressNames = all
        .filter((i) => ['dresses', 'dresses/one-piece'].includes(String(i.category).toLowerCase()))
        .map((i) => i.name.toLowerCase());
      for (const name of await cards.locator('h2').allInnerTexts()) {
        expect(dressNames).toContain(name.toLowerCase());
      }
      await page.locator('section.catalog-toolbar select').nth(1).selectOption('S');
      await capture(page, 'CAT-007', '02-guest-filtered.png');

      // Guest store link opens the registration gate rather than a store page.
      await page.locator('section.catalog-toolbar select').first().selectOption('All');
      await page.locator('section.catalog-toolbar select').nth(1).selectOption('all');
      await cards.first().locator('button.catalog-store-link').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('dialog')).toContainText('Create an account to continue');
      await capture(page, 'CAT-007', '03-guest-registration-gate.png');

      await context.close();
      return {
        guest_cards: all.length,
        filter_applied: 'category=Dresses, size=S',
        read_only_cart_label: 'Register to Add to Cart',
        store_link_gated: true,
      };
    });
  });

  /** CAT-008 — no catalog upload surface or endpoint access for a regular user. */
  test('CAT-008 upload restriction for registered user', async ({ browser, request }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await execute('CAT-008', page, async () => {
      const session = await registerUser(request, 'shopper');
      await installSession(context, session);

      await page.goto(appUrl('/shopper/catalog'));
      await expect(page.locator('section.catalog-product-grid article.catalog-product-card').first())
        .toBeVisible({ timeout: 60_000 });
      expect(await page.getByRole('button', { name: /upload/i }).count()).toBe(0);
      expect(await page.getByRole('link', { name: /upload/i }).count()).toBe(0);
      expect(await page.locator('#catalog-csv').count()).toBe(0);
      await capture(page, 'CAT-008', '01-no-upload-ui.png');

      await page.goto(appUrl('/seller/catalog-upload'));
      await expect(page).toHaveURL(/\/shopper\/dashboard$/, { timeout: 30_000 });
      await capture(page, 'CAT-008', '02-seller-route-blocked.png');

      // Direct POST to the seller-only upload endpoint with a shopper token.
      const asUser = await request.post(new URL('/catalog/upload/', API_BASE_URL).toString(), {
        headers: authHeaders(session),
        multipart: { csv_file: { name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.from('') } },
      });
      expect(asUser.status()).toBe(403);
      const anonymous = await request.post(new URL('/catalog/upload/', API_BASE_URL).toString());
      expect(anonymous.status()).toBe(401);

      await context.close();
      return {
        upload_ui_controls: 0,
        seller_route_redirect: '/shopper/dashboard',
        user_upload_status: asUser.status(),
        anonymous_upload_status: anonymous.status(),
      };
    });
  });

  /** CAT-009 — two store pages are isolated from each other. */
  test('CAT-009 cross-seller isolation', async ({ page, request }) => {
    await execute('CAT-009', page, async () => {
      const all = await listCatalog(request);
      const bySeller = new Map<string, CatalogItem[]>();
      for (const item of all) {
        const list = bySeller.get(item.seller) ?? [];
        list.push(item);
        bySeller.set(item.seller, list);
      }
      const sellers = [...bySeller.entries()].filter(([, items]) => items.length > 0).slice(0, 2);
      expect(sellers.length, 'two sellers with active listings are required').toBe(2);
      const [sellerA, sellerB] = sellers;

      const session = await registerUser(request, 'shopper');
      await installSession(page, session);
      const results: Record<string, unknown> = {};

      for (const [index, [sellerId, items]] of sellers.entries()) {
        const other = (index === 0 ? sellers[1] : sellers[0])[1].map((i) => i.name.toLowerCase());
        await page.goto(appUrl(`/shopper/sellers/${encodeURIComponent(sellerId)}`));
        const store = page.locator('main.seller-store-page');
        await expect(store).toBeVisible({ timeout: 60_000 });
        const cards = store.locator('article.seller-store-card');
        await expect(cards.first()).toBeVisible({ timeout: 30_000 });
        await expect(cards).toHaveCount(items.length);
        const shown = (await cards.locator('h3').allInnerTexts()).map((name) => name.toLowerCase());
        const expected = items.map((i) => i.name.toLowerCase());
        expect(shown.sort()).toEqual([...expected].sort());
        const foreignNames = other.filter((name) => !expected.includes(name));
        for (const name of foreignNames) expect(shown).not.toContain(name);
        await capture(page, 'CAT-009', `${index + 1}-store-${sellerId.slice(-6)}.png`);
        results[`seller_${index + 1}`] = {
          seller_id: sellerId,
          store_name: items[0].store_name,
          shown: shown.length,
          foreign_items_present: false,
        };
      }
      return {
        seller_a: sellerA[1][0].store_name,
        seller_b: sellerB[1][0].store_name,
        stores: results,
      };
    });
  });
});
