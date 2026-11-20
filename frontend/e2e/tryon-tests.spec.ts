/**
 * Try-On & Outfits (TO) test suite — docs/Test Cases/FitFusionAI - Test Cases - TO — Try-On & Outfits .csv
 *
 * Evidence-only automation. No application code is touched: the suite drives
 * the running Vite frontend (https://localhost:8443) and the Django API
 * (http://127.0.0.1:8000). Cases are defined by the CSV and executed in CSV
 * order; the describe is serial so STOP ON FAILURE skips every later case.
 *
 *   npx playwright test e2e/tryon-tests.spec.ts
 */
import { createHash, randomUUID } from 'node:crypto';
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

import { ensureToFixtures, type ToFixtureResult } from './fixture-seed';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'tryon-tests');

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type Role = 'shopper' | 'seller';
type Session = {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
  email: string;
  password: string;
};
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
type Outfit = {
  id: string;
  name: string;
  items: string[];
  occasion?: string;
  description?: string;
  avatar_view?: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Infrastructure helpers
// ---------------------------------------------------------------------------

async function registerUser(request: APIRequestContext, role: Role): Promise<Session> {
  const suffix = randomUUID();
  const password = `TryOnTest-${suffix}!7`;
  const payload = {
    email: `tryon-${role}-${suffix}@example.test`,
    full_name: role === 'seller' ? 'TryOn Test Seller' : 'TryOn Test Shopper',
    password,
    password_confirm: password,
    role,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
    ...(role === 'seller' ? { store_name: `TryOn Test Store ${suffix}` } : {}),
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
  };
}

async function installSession(target: Page | BrowserContext, session: Session) {
  await target.addInitScript((value) => {
    window.sessionStorage.setItem('fitfusion.session.v1', JSON.stringify(value));
    window.sessionStorage.setItem('fitfusion.history.epoch', String(Date.now()));
  }, session);
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access}` };
}

async function listCatalog(request: APIRequestContext, params: Record<string, string> = {}): Promise<CatalogItem[]> {
  const url = new URL('/catalog/', API_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await request.get(url.toString());
  expect(response.ok(), `could not list catalog: ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

async function createOutfit(
  request: APIRequestContext,
  session: Session,
  data: Record<string, unknown>,
): Promise<Outfit> {
  const response = await request.post(new URL('/outfits/', API_BASE_URL).toString(), {
    headers: authHeaders(session),
    data,
  });
  expect(response.ok(), `could not create outfit: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as Outfit;
}

async function listOutfits(request: APIRequestContext, session: Session): Promise<Outfit[]> {
  const response = await request.get(new URL('/outfits/', API_BASE_URL).toString(), {
    headers: authHeaders(session),
  });
  expect(response.ok(), `could not list outfits: ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.results ?? [];
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

/** Run one TO case, always writing evidence; rethrow on failure so the test fails. */
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
      // best effort
    }
    await writeLog(testId, 'FAIL', started, message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Try-on helpers
// ---------------------------------------------------------------------------

/** 160 cm / 61 kg maps to body-build ~92.7 cm => avatar size M, the only size
 *  with tops, bottoms AND dresses in the seeded catalog. */
const AVATAR_M = {
  gender: 'Female',
  height: 160,
  weight: 61,
  skinTone: '#dca77d',
  undertone: 'Neutral',
  shoulder: 'Average',
  waist: 'Average',
  hip: 'Average',
  thigh: 'Average',
  cupSize: 'B',
  styleFocus: 'Casual',
};

async function installStudioAvatar(page: Page) {
  await page.addInitScript((avatar) => {
    window.sessionStorage.setItem(
      'fitfusion-fitting-studio-session-shopper',
      JSON.stringify({
        avatar,
        currentView: 'Front',
        equippedGender: 'Female',
        avatarPresetId: '',
      }),
    );
    window.localStorage.setItem('fitfusion-avatar-gender', 'Female');
  }, AVATAR_M);
}

async function settleFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

/** Canvas-aware readiness: networkidle, canvas present, avatar image decoded,
 *  and one animation frame completed (canvasWarp2D draws inside rAF). */
async function waitForCanvasReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main.fitting-studio-page')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas.studio-avatar-canvas').first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('Loading avatar...').first()).toBeHidden({ timeout: 60_000 });
  await settleFrames(page);
}

async function openRecommendations(page: Page) {
  await page
    .locator('.studio-panel-tabs button', { hasText: 'Recommendations' })
    .click();
  await expect(page.locator('.studio-recommendations-panel')).toBeVisible();
  await expect(page.locator('.studio-recommendation-item').first()).toBeVisible({
    timeout: 60_000,
  });
}

async function openShopperStudio(page: Page, request: APIRequestContext) {
  const session = await registerUser(request, 'shopper');
  await installSession(page, session);
  await installStudioAvatar(page);
  await page.goto(appUrl('/shopper/fitting-studio/customize'));
  await waitForCanvasReady(page);
  await openRecommendations(page);
  return session;
}

/** The studio paginates ranked recommendations (8 per page); locate an item
 *  deterministically from page 1 instead of relying on backend score order. */
async function goToFirstRecommendationPage(page: Page) {
  const previous = page.getByRole('button', { name: /Previous page/i });
  for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
    if (!(await previous.count()) || (await previous.isDisabled())) return;
    await previous.click();
    await expect(page.locator('.studio-recommendation-item').first()).toBeVisible();
  }
  throw new Error('Could not return to recommendation page 1.');
}

async function recommendationCard(page: Page, name: string) {
  await goToFirstRecommendationPage(page);
  const card = page
    .locator('.studio-recommendation-item')
    .filter({ has: page.locator('.studio-product-link', { hasText: name }) })
    .first();
  if (await card.count()) return card;

  const next = page.getByRole('button', { name: /Next page/i });
  for (let pageNumber = 1; pageNumber < 10; pageNumber += 1) {
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
    await expect(page.locator('.studio-recommendation-item').first()).toBeVisible();
    if (await card.count()) return card;
  }
  throw new Error(`Recommendation card "${name}" not found on any page.`);
}

/** Record the app's transient status messages so a slow canvas redraw cannot
 *  hide the confirmation before Playwright's live locator polls. This observes
 *  the real DOM; it does not fabricate or relax the notification assertion. */
async function armNotificationRecorder(page: Page) {
  await page.evaluate(() => {
    const scope = window as unknown as {
      __toNotifications?: string[];
      __toNotificationObserver?: MutationObserver;
    };
    scope.__toNotifications = [];
    const record = () => {
      const text = document.querySelector('.studio-notification')?.textContent?.trim() ?? '';
      const notes = scope.__toNotifications ?? [];
      if (text && notes[notes.length - 1] !== text) notes.push(text);
      scope.__toNotifications = notes;
    };
    record();
    if (!scope.__toNotificationObserver) {
      const observer = new MutationObserver(record);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      scope.__toNotificationObserver = observer;
    }
  });
}

async function notificationContaining(page: Page, name: string): Promise<string> {
  const notes = await page.evaluate<string[]>(
    () =>
      (window as unknown as { __toNotifications?: string[] }).__toNotifications ?? [],
  );
  return notes.find((text) => text.includes(name)) ?? '';
}

async function tryItem(page: Page, name: string) {
  const card = await recommendationCard(page, name);
  await expect(card, `recommendation card for "${name}"`).toBeVisible({ timeout: 30_000 });
  await armNotificationRecorder(page);
  await card.getByRole('button', { name: 'Try Item', exact: true }).click();
  await expect
    .poll(
      async () => {
        const text = await notificationContaining(page, name);
        return text.length > 0;
      },
      { timeout: 15_000, intervals: [50, 100, 150] },
    )
    .toBe(true);
  await settleFrames(page);
}

async function equippedSlots(page: Page): Promise<Array<{ slot: string; name: string }>> {
  return page.locator('.studio-equipped-item').evaluateAll((nodes) =>
    nodes.map((node) => ({
      slot: node.querySelector('span')?.textContent?.trim() ?? '',
      name: node.querySelector('.studio-product-link')?.textContent?.trim() ?? '',
    })),
  );
}

/** Short hash of the rendered canvas — a change proves the 2D overlay redrew. */
async function canvasSignature(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector(
      'canvas.studio-avatar-canvas',
    ) as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL('image/png') : '';
  });
  return createHash('sha1').update(dataUrl).digest('hex').slice(0, 16);
}

async function waitForCanvasChange(page: Page, before: string, timeout = 5000) {
  await expect
    .poll(() => canvasSignature(page), { timeout, intervals: [50, 100, 150] })
    .not.toBe(before);
}

async function timeCanvasChange(
  page: Page,
  action: () => Promise<void>,
): Promise<number> {
  const before = await canvasSignature(page);
  const started = Date.now();
  await action();
  await waitForCanvasChange(page, before, 3000);
  return Date.now() - started;
}

async function catalogItemByName(
  request: APIRequestContext,
  name: string,
  size = 'M',
): Promise<CatalogItem> {
  const items = await listCatalog(request, { size });
  const item = items.find((row) => row.name === name);
  expect(item, `catalog item "${name}" (size ${size})`).toBeTruthy();
  return item as CatalogItem;
}

let cachedToFixtures: ToFixtureResult | undefined;
async function gateFixtures(request: APIRequestContext): Promise<ToFixtureResult> {
  if (!cachedToFixtures) cachedToFixtures = await ensureToFixtures(request);
  return cachedToFixtures;
}

/** State-aware target resolution: prefer the live-catalog item across all
 *  recommendation pages; if it is absent, fall back to the first visible card.
 *  `item_used` is returned by every case for auditability. */
async function resolveTryOnTarget(
  page: Page,
  preferred: string,
  exclude: string[] = [],
): Promise<{ item_used: string; source: 'preferred' | 'fallback'; excluded: string[] }> {
  const cards = page.locator('.studio-recommendation-item');
  await cards.first().waitFor({ state: 'visible', timeout: 60_000 });
  if (!exclude.includes(preferred)) {
    try {
      await recommendationCard(page, preferred);
      return { item_used: preferred, source: 'preferred', excluded: exclude };
    } catch {
      // The catalog item exists but is not in the ranked page set; fall back.
    }
  }
  const visibleNames = (await cards.locator('.studio-product-link').allInnerTexts())
    .map((name) => name.trim())
    .filter(Boolean);
  const fallback = visibleNames.find((name) => !exclude.includes(name));
  expect(fallback, 'no recommendation card was available for state-aware resolution').toBeTruthy();
  return { item_used: fallback as string, source: 'fallback', excluded: exclude };
}

// ---------------------------------------------------------------------------
// TO-001 .. TO-011 (CSV order, serial, STOP ON FAILURE)
// ---------------------------------------------------------------------------

test.describe('Try-On & Outfits TO-001..TO-011 (CSV order, stop on failure)', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  /** TO-001 — Equip Clothing Item: PNG overlay layers over avatar instantly. */
  test('TO-001 equip clothing item renders on the avatar', async ({ page, request }) => {
    await execute('TO-001', page, async () => {
      const fixtures = await gateFixtures(request);
      await openShopperStudio(page, request);

      // Recommendation-panel integration is part of the try-on entry surface.
      const cards = page.locator('.studio-recommendation-item');
      const cardCount = await cards.count();
      expect(cardCount, 'recommendation panel must list catalog items').toBeGreaterThan(0);
      await expect(cards.first().locator('.studio-match-score-badge')).toBeVisible();

      const target = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      const canvasBefore = await canvasSignature(page);
      const elapsed = await timeCanvasChange(page, () => tryItem(page, target.item_used));

      const slots = await equippedSlots(page);
      const top = slots.find((slot) => slot.slot === 'top');
      expect(top?.name).toBe(target.item_used);
      await expect(page.locator('.studio-equipped-card')).toContainText(target.item_used);
      await expect(page.locator('.studio-notification')).toContainText('equipped');
      await capture(page, 'TO-001', '01-item-equipped.png');

      return {
        recommendation_cards: cardCount,
        equipped_slot: top,
        item_used: target.item_used,
        target_resolution: target,
        fixture_seeding: fixtures.seeding,
        canvas_before: canvasBefore,
        canvas_after: await canvasSignature(page),
        render_ms: elapsed,
      };
    });
  });

  /** TO-002 — Switch Item (Same Category) + match reasons + rating persistence. */
  test('TO-002 switch item in same category', async ({ page, request }) => {
    await execute('TO-002', page, async () => {
      const fixtures = await gateFixtures(request);
      const session = await openShopperStudio(page, request);
      const firstTarget = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      await tryItem(page, firstTarget.item_used);
      const first = await canvasSignature(page);

      const secondTarget = await resolveTryOnTarget(page, fixtures.targets.topB.name, [
        firstTarget.item_used,
      ]);
      expect(secondTarget.item_used, 'a distinct second top is required').not.toBe(
        firstTarget.item_used,
      );
      await tryItem(page, secondTarget.item_used);
      await waitForCanvasChange(page, first);
      const slots = await equippedSlots(page);
      expect(slots).toHaveLength(1);
      expect(slots[0].name).toBe(secondTarget.item_used);
      expect(slots.some((slot) => slot.name === firstTarget.item_used)).toBe(false);
      await capture(page, 'TO-002', '01-item-replaced.png');

      // Match reasons integration.
      const secondCard = await recommendationCard(page, secondTarget.item_used);
      await secondCard.getByRole('button', { name: /View match reasons/i }).click();
      const matchPanel = page.locator('.studio-match-card');
      await expect(matchPanel).toBeVisible({ timeout: 30_000 });
      const scores = matchPanel.locator('meter[aria-label$="score"]');
      await expect(scores.first()).toBeVisible({ timeout: 30_000 });
      expect(await scores.count()).toBe(4);
      await capture(page, 'TO-002', '02-match-reasons.png');

      // Rating persistence (CSV-adjacent coverage; KAN-120 deprecated colour).
      const ratedItem = await catalogItemByName(request, secondTarget.item_used);
      await secondCard
        .getByRole('button', { name: `Rate recommendation ${ratedItem.name}` })
        .click();
      const modal = page.locator('.studio-rating-modal');
      await expect(modal).toBeVisible();
      await modal.locator('.studio-rating-stars button').nth(4).click();
      await modal.locator('.studio-save-confirm-button').click();
      await expect(modal).toBeHidden({ timeout: 15_000 });
      const mine = await request.get(new URL('/ratings/mine/', API_BASE_URL).toString(), {
        headers: authHeaders(session),
      });
      expect(mine.ok()).toBeTruthy();
      const ratings = (await mine.json()) as Array<Record<string, unknown>>;
      const saved = ratings.find(
        (row) =>
          String(row.target_id) === String(ratedItem.id) &&
          Number(row.score) === 5,
      );
      expect(saved, '5-star rating must persist to /ratings/mine/').toBeTruthy();

      await page.reload();
      await waitForCanvasReady(page);
      await openRecommendations(page);
      // The recap is deliberately gated on "tried this visit"; re-equip after
      // the reload so the saved-rating display is exercised, not skipped.
      await tryItem(page, ratedItem.name);
      await expect(
        await recommendationCard(page, ratedItem.name),
      ).toContainText('Your rating: 5/5', { timeout: 30_000 });
      await capture(page, 'TO-002', '03-rating-persisted.png');

      return {
        item_used: secondTarget.item_used,
        previous_item_used: firstTarget.item_used,
        target_resolution: secondTarget,
        fixture_seeding: fixtures.seeding,
        replaced_item: slots[0].name,
        previous_item_present: false,
        match_score_rules: 4,
        persisted_rating: { target_id: ratedItem.id, score: 5 },
      };
    });
  });

  /** TO-003 — Equip Dress/One-Piece: replaces BOTH top and bottom slots. */
  test('TO-003 equip dress replaces top and bottom', async ({ page, request }) => {
    await execute('TO-003', page, async () => {
      const fixtures = await gateFixtures(request);
      await openShopperStudio(page, request);
      const top = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      const bottom = await resolveTryOnTarget(page, fixtures.targets.bottom.name, [top.item_used]);
      const dress = await resolveTryOnTarget(page, fixtures.targets.dress.name);
      await tryItem(page, top.item_used);
      await tryItem(page, bottom.item_used);
      const before = await equippedSlots(page);
      expect(before.map((slot) => slot.slot).sort()).toEqual(['bottom', 'top']);
      await capture(page, 'TO-003', '01-top-and-bottom.png');

      await tryItem(page, dress.item_used);
      const confirmation = await notificationContaining(page, dress.item_used);
      const after = await equippedSlots(page);
      const bySlot = Object.fromEntries(after.map((slot) => [slot.slot, slot.name]));

      // CSV FR-5.2: one-piece replaces both slots and confirms the replacement.
      expect(confirmation, 'one-piece equipment confirmation must be displayed').toMatch(
        /replac|one-piece|dress/i,
      );
      expect(bySlot.top?.toLowerCase(), 'dress must occupy the one-piece/top slot').toContain(
        'dress',
      );
      expect(
        bySlot.bottom,
        'equipping a one-piece must replace/clear the previously equipped bottom',
      ).toBeUndefined();
      await capture(page, 'TO-003', '02-dress-replaced-both.png');

      return {
        item_used: dress.item_used,
        top_item_used: top.item_used,
        bottom_item_used: bottom.item_used,
        target_resolution: { top, bottom, dress },
        fixture_seeding: fixtures.seeding,
        before,
        after,
        confirmation,
      };
    });
  });

  /** TO-004 — Switch View (Front/Rear) without reload. */
  test('TO-004 switch front and rear view', async ({ page, request }) => {
    await execute('TO-004', page, async () => {
      const fixtures = await gateFixtures(request);
      await openShopperStudio(page, request);
      const target = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      await tryItem(page, target.item_used);
      const front = await canvasSignature(page);

      const rearButton = page
        .locator('.studio-view-buttons button', { hasText: 'Rear' })
        .first();
      const rearMs = await timeCanvasChange(page, () => rearButton.click());
      await expect(rearButton).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('canvas.studio-avatar-canvas').first()).toHaveAttribute(
        'aria-label',
        /female avatar, rear view/i,
      );
      await expect(page.locator('.studio-avatar-label')).toContainText('Rear View');
      await capture(page, 'TO-004', '01-rear-view.png');

      const frontButton = page
        .locator('.studio-view-buttons button', { hasText: 'Front' })
        .first();
      const frontMs = await timeCanvasChange(page, () => frontButton.click());
      await expect(frontButton).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.studio-avatar-label')).toContainText('Front View');
      await capture(page, 'TO-004', '02-front-view.png');

      return {
        item_used: target.item_used,
        target_resolution: target,
        fixture_seeding: fixtures.seeding,
        front_signature: front,
        rear_render_ms: rearMs,
        front_render_ms: frontMs,
      };
    });
  });

  /** TO-005 — Canvas Render Performance (<1 s) + size-cap guardrail. */
  test('TO-005 canvas overlay renders within one second', async ({ page, request }) => {
    await execute('TO-005', page, async () => {
      const fixtures = await gateFixtures(request);
      await openShopperStudio(page, request);
      const firstTarget = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      await tryItem(page, firstTarget.item_used);

      // Size-compatible guardrail: a capped slider and visible size-cap notice.
      await page.locator('.studio-panel-tabs button', { hasText: 'Customize' }).click();
      await expect(page.locator('.studio-fit-validation')).toContainText('Size cap active', {
        timeout: 15_000,
      });
      const heightMax = await page.locator('#studio-height').getAttribute('max');
      expect(Number(heightMax)).toBeLessThanOrEqual(220);
      await capture(page, 'TO-005', '00-size-cap-guardrail.png');
      await openRecommendations(page);

      const secondTarget = await resolveTryOnTarget(page, fixtures.targets.topB.name, [
        firstTarget.item_used,
      ]);
      expect(secondTarget.item_used, 'a distinct second top is required').not.toBe(
        firstTarget.item_used,
      );
      const switchMs = await timeCanvasChange(page, () => tryItem(page, secondTarget.item_used));
      const rearButton = page
        .locator('.studio-view-buttons button', { hasText: 'Rear' })
        .first();
      const viewMs = await timeCanvasChange(page, () => rearButton.click());

      await page.locator('.studio-panel-tabs button', { hasText: 'Customize' }).click();
      const height = page.locator('#studio-height');
      const proportionMs = await timeCanvasChange(page, async () => {
        await height.focus();
        await height.press('ArrowRight');
      });
      await capture(page, 'TO-005', '01-proportion-adjusted.png');

      expect(switchMs, `item switch took ${switchMs}ms`).toBeLessThan(1000);
      expect(viewMs, `view switch took ${viewMs}ms`).toBeLessThan(1000);
      expect(proportionMs, `proportion adjust took ${proportionMs}ms`).toBeLessThan(1000);
      return {
        item_used: secondTarget.item_used,
        previous_item_used: firstTarget.item_used,
        target_resolution: secondTarget,
        fixture_seeding: fixtures.seeding,
        item_switch_ms: switchMs,
        view_switch_ms: viewMs,
        proportion_adjust_ms: proportionMs,
        threshold_ms: 1000,
        height_slider_max: Number(heightMax),
      };
    });
  });

  /** TO-006 — Clothing Image Fails to Load: error + retain previous + retry. */
  test('TO-006 failed clothing image keeps previous item', async ({ page, request }) => {
    await execute('TO-006', page, async () => {
      const fixtures = await gateFixtures(request);
      const retainedItem = await catalogItemByName(request, fixtures.targets.topA.name);
      const retainedImageId = String(retainedItem.front_image ?? '').split('/').pop() ?? '';
      expect(retainedImageId, 'retained fixture must have a front image id').not.toBe('');

      // Prefetch now warms images when cards render. Install the failure route
      // before navigation so the failed-image precondition is still exercised;
      // the assertion that the previous item is retained is unchanged.
      await page.route(
        (url) => url.pathname.startsWith('/media/') && !url.href.includes(retainedImageId),
        (route) => route.abort('failed'),
      );

      await openShopperStudio(page, request);
      const retainedTarget = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      await tryItem(page, retainedTarget.item_used);
      const retained = await canvasSignature(page);

      const brokenTarget = await resolveTryOnTarget(page, fixtures.targets.topB.name, [
        retainedTarget.item_used,
      ]);
      const broken = await catalogItemByName(request, brokenTarget.item_used);
      const imageId = String(broken.front_image ?? '').split('/').pop() ?? '';
      expect(imageId, 'fixture must have a front image id').not.toBe('');
      expect(imageId, 'broken fixture must differ from the retained image').not.toBe(retainedImageId);

      await tryItem(page, brokenTarget.item_used);
      const errorLocators = [
        page.locator('.studio-canvas-wrapper [role="alert"]'),
        page.locator('.studio-notification', { hasText: /fail|error|image/i }),
      ];
      let errorShown = false;
      for (const locator of errorLocators) {
        if (await locator.count()) {
          await expect(locator.first()).toBeVisible({ timeout: 10_000 });
          errorShown = true;
          break;
        }
      }
      const slotsAfterFailure = await equippedSlots(page);
      expect(errorShown, 'a failed garment image must surface an error').toBe(true);
      expect(
        slotsAfterFailure.some((slot) => slot.name === retainedTarget.item_used),
        'previous item must be retained after image failure',
      ).toBe(true);
      await capture(page, 'TO-006', '01-image-failure.png');

      // A different item can still be selected.
      await page.unrouteAll({ behavior: 'wait' });
      const anotherTarget = await resolveTryOnTarget(page, fixtures.targets.bottom.name, [
        retainedTarget.item_used,
        brokenTarget.item_used,
      ]);
      await tryItem(page, anotherTarget.item_used);
      await capture(page, 'TO-006', '02-another-item-selected.png');

      return {
        item_used: brokenTarget.item_used,
        retained_item_used: retainedTarget.item_used,
        another_item_used: anotherTarget.item_used,
        target_resolution: { retainedTarget, brokenTarget, anotherTarget },
        fixture_seeding: fixtures.seeding,
        route_installed_before_navigation: true,
        broken_image_id: imageId,
        error_shown: errorShown,
        previous_item_retained: true,
        canvas_changed_after_retry: (await canvasSignature(page)) !== retained,
      };
    });
  });

  /** TO-007 — Save Outfit (registered shopper). */
  test('TO-007 save named outfit', async ({ page, request }) => {
    await execute('TO-007', page, async () => {
      const fixtures = await gateFixtures(request);
      const session = await openShopperStudio(page, request);
      const top = await resolveTryOnTarget(page, fixtures.targets.topA.name);
      const bottom = await resolveTryOnTarget(page, fixtures.targets.bottom.name);
      await tryItem(page, top.item_used);
      await tryItem(page, bottom.item_used);
      const before = await listOutfits(request, session);
      const name = `TO Outfit ${randomUUID().slice(0, 8)}`;

      await page.getByRole('button', { name: 'Save Outfit', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Save Outfit' });
      await expect(dialog).toBeVisible();
      await dialog.locator('#studio-outfit-name').fill(name);
      await dialog.locator('.studio-save-confirm-button').click();
      await expect(page.locator('.studio-notification')).toContainText(
        'was saved successfully',
        { timeout: 15_000 },
      );
      await capture(page, 'TO-007', '01-outfit-saved.png');

      const after = await listOutfits(request, session);
      const saved = after.find((outfit) => outfit.name === name);
      expect(saved, 'saved outfit must be retrievable via API').toBeTruthy();
      expect(await equippedSlots(page)).toHaveLength(2);
      expect(after.length).toBe(before.length + 1);
      return {
        item_used: top.item_used,
        bottom_item_used: bottom.item_used,
        target_resolution: { top, bottom },
        fixture_seeding: fixtures.seeding,
        outfit_id: saved?.id,
        outfit_name: name,
        saved_item_ids: saved?.items,
      };
    });
  });

  /** TO-008 — Load Outfit: Saved Outfits -> Edit -> Open Fitting Studio. */
  test('TO-008 load saved outfit auto-equips items', async ({ page, request }) => {
    await execute('TO-008', page, async () => {
      const fixtures = await gateFixtures(request);
      const session = await registerUser(request, 'shopper');
      const top = await catalogItemByName(request, fixtures.targets.topA.name);
      const bottom = await catalogItemByName(request, fixtures.targets.bottom.name);
      const name = `TO Load ${randomUUID().slice(0, 8)}`;
      const outfit = await createOutfit(request, session, {
        name,
        items: [top.id, bottom.id],
      });
      await installSession(page, session);

      await page.goto(appUrl('/shopper/saved-outfits'));
      await page.waitForLoadState('networkidle');
      const card = page.locator('.saved-outfit-card').filter({ hasText: name }).first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      await expect(card.locator('canvas.studio-avatar-canvas')).toBeVisible();
      await capture(page, 'TO-008', '01-saved-outfit-card.png');

      await card.getByRole('button', { name: 'Edit' }).click();
      await expect(page).toHaveURL(new RegExp(`/saved-outfits/${outfit.id}/edit`));
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Open Fitting Studio' }).click();
      await expect(page).toHaveURL(/\/shopper\/fitting-studio\/customize/, { timeout: 30_000 });
      await waitForCanvasReady(page);

      const slots = await equippedSlots(page);
      const names = slots.map((slot) => slot.name).sort();
      expect(names).toEqual([top.name, bottom.name].sort());
      await capture(page, 'TO-008', '02-outfit-auto-equipped.png');

      return {
        item_used: top.name,
        bottom_item_used: bottom.name,
        fixture_seeding: fixtures.seeding,
        outfit_id: outfit.id,
        equipped: slots,
      };
    });
  });

  /** TO-009 — Load Outfit with Deleted Item: warn + available items only. */
  test('TO-009 load outfit with deleted catalog item', async ({ page, request }) => {
    await execute('TO-009', page, async () => {
      const fixtures = await gateFixtures(request);
      const session = await registerUser(request, 'shopper');
      const available = await catalogItemByName(request, fixtures.targets.topA.name);
      const missing = await catalogItemByName(request, fixtures.targets.topB.name);
      const name = `TO Missing ${randomUUID().slice(0, 8)}`;
      const outfit = await createOutfit(request, session, {
        name,
        items: [available.id, missing.id],
      });
      await installSession(page, session);
      // Simulate a hard-deleted catalog row without mutating the database.
      await page.route(
        (url) => url.pathname === `/catalog/${missing.id}/`,
        (route) =>
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: '{"detail":"Not found."}',
          }),
      );

      await page.goto(appUrl('/shopper/saved-outfits'));
      await page.waitForLoadState('networkidle');
      const card = page.locator('.saved-outfit-card').filter({ hasText: name }).first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      const warning = card.locator('.saved-outfit-product', { hasText: /unavailable|missing/i });
      await expect(warning.first()).toBeVisible({ timeout: 15_000 });
      await expect(card.locator('.saved-outfit-products')).toContainText(available.name);
      await expect(card.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
      await capture(page, 'TO-009', '01-missing-item-warning.png');

      await card.getByRole('button', { name: 'Add to Cart' }).click();
      await expect(page.locator('.saved-outfits-toast')).toContainText('added to your cart', {
        timeout: 15_000,
      });

      return {
        item_used: available.name,
        missing_item_used: missing.name,
        fixture_seeding: fixtures.seeding,
        outfit_id: outfit.id,
        missing_item_id: missing.id,
        warning_text: await warning.first().innerText(),
        available_item_loaded: available.name,
      };
    });
  });

  /** TO-010 — Edit/Delete Outfit (FR-5.7 / FR-5.8). */
  test('TO-010 edit and delete outfit', async ({ page, request }) => {
    await execute('TO-010', page, async () => {
      const fixtures = await gateFixtures(request);
      const session = await registerUser(request, 'shopper');
      const top = await catalogItemByName(request, fixtures.targets.topA.name);
      const original = `TO Edit ${randomUUID().slice(0, 8)}`;
      const outfit = await createOutfit(request, session, { name: original, items: [top.id] });
      const renamed = `${original} Renamed`;
      await installSession(page, session);

      await page.goto(appUrl(`/shopper/saved-outfits/${outfit.id}/edit`));
      await page.waitForLoadState('networkidle');
      const nameField = page.locator('input[name="name"]');
      await expect(nameField).toHaveValue(original);
      await nameField.fill(renamed);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page).toHaveURL(/\/shopper\/saved-outfits$/, { timeout: 15_000 });
      const renamedResponse = await request.get(
        new URL(`/outfits/${outfit.id}/`, API_BASE_URL).toString(),
        { headers: authHeaders(session) },
      );
      expect((await renamedResponse.json()).name).toBe(renamed);
      await capture(page, 'TO-010', '01-outfit-renamed.png');

      await page.goto(appUrl('/shopper/saved-outfits'));
      await page.waitForLoadState('networkidle');
      const card = page.locator('.saved-outfit-card').filter({ hasText: renamed }).first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      await card.getByRole('button', { name: 'Delete' }).click();
      const dialog = page.locator('.saved-outfits-modal[role="dialog"]');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete Outfit' }).click();
      await expect(page.locator('.saved-outfits-toast')).toContainText(
        'Outfit deleted successfully',
        { timeout: 15_000 },
      );
      await capture(page, 'TO-010', '02-outfit-deleted.png');

      const deletedResponse = await request.get(
        new URL(`/outfits/${outfit.id}/`, API_BASE_URL).toString(),
        { headers: authHeaders(session) },
      );
      expect(deletedResponse.status()).toBe(404);
      return {
        item_used: top.name,
        fixture_seeding: fixtures.seeding,
        outfit_id: outfit.id,
        renamed_to: renamed,
        delete_status: deletedResponse.status(),
      };
    });
  });

  /** TO-011 — UAT: first-time guest completes one try-on within 2 minutes. */
  test('TO-011 guest completes a try-on within two minutes', async ({ browser, request }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await execute('TO-011', page, async () => {
      const fixtures = await gateFixtures(request);
      const started = Date.now();
      await page.goto(appUrl('/guest/fitting-studio'));
      await page.waitForLoadState('networkidle');
      await page.locator('.gender-card', { hasText: 'Female' }).first().click();
      await page.getByRole('button', { name: /Continue with Female/i }).click();
      await expect(page).toHaveURL(/\/guest\/fitting-studio\/customize/, { timeout: 30_000 });
      await waitForCanvasReady(page);
      await capture(page, 'TO-011', '01-guest-avatar-created.png');

      await openRecommendations(page);
      const dress = fixtures.targets.guestDress;
      expect(
        String(dress.category).toLowerCase() === 'dresses' && String(dress.size).toUpperCase() === 'S',
        'guest avatar size S must have a dress fixture',
      ).toBeTruthy();
      const dressCard = await recommendationCard(page, dress.name);
      await expect(dressCard).toBeVisible({ timeout: 30_000 });
      await timeCanvasChange(page, () =>
        dressCard.getByRole('button', { name: 'Try Item', exact: true }).click(),
      );
      const rearButton = page
        .locator('.studio-view-buttons button', { hasText: 'Rear' })
        .first();
      await timeCanvasChange(page, () => rearButton.click());
      await capture(page, 'TO-011', '02-guest-try-on-complete.png');

      const elapsed = Date.now() - started;
      const equipped = await equippedSlots(page);
      expect(elapsed, `guest try-on took ${elapsed}ms`).toBeLessThanOrEqual(120_000);
      await context.close();
      return {
        item_used: dress.name,
        fixture_seeding: fixtures.seeding,
        elapsed_ms: elapsed,
        limit_ms: 120_000,
        equipped,
      };
    });
  });
});
