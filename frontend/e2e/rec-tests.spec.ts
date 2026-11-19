/**
 * Recommendations (REC) test suite — docs/Test Cases/FitFusionAI - Test Cases - REC — Recommendations.csv
 *
 * Evidence-only automation. No application code is touched: the suite drives
 * the running Vite frontend (https://localhost:8443) and the Django API
 * (http://127.0.0.1:8000). Cases run in CSV order in a serial describe, so
 * STOP ON FAILURE skips every later case.
 *
 * Logged-in cases intentionally use a brand-new BrowserContext and a real UI
 * login (the AV-007 pattern) so no addInitScript can replay a session or hide a
 * persistence regression. Guest cases use a separate clean context as well.
 *
 *   npx playwright test e2e/rec-tests.spec.ts
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'rec-tests');

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type Session = {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
  email: string;
  password: string;
};

type RecommendationPayload = {
  weights_version?: string;
  weights?: Record<string, number>;
  avatar_profile?: Record<string, unknown>;
  recommendations: Array<{
    id: string;
    name: string;
    store?: string;
    size?: string;
    total_score: number;
    max_score: number;
    [key: string]: unknown;
  }>;
};

function appUrl(path: string) {
  return new URL(path, APP_BASE_URL).toString();
}

function apiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access}` };
}

function isRecommendationsRequest(url: URL) {
  return url.pathname === '/api/recommendations/';
}

function isRatingsRequest(url: URL) {
  return url.pathname.startsWith('/ratings/');
}

// ---------------------------------------------------------------------------
// Infrastructure helpers
// ---------------------------------------------------------------------------

async function registerUser(request: APIRequestContext): Promise<Session> {
  const suffix = randomUUID();
  const password = `RecTest-${suffix}!7`;
  const payload = {
    email: `rec-shopper-${suffix}@example.test`,
    full_name: 'REC Test Shopper',
    password,
    password_confirm: password,
    role: 'shopper',
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
  };
  const response = await request.post(apiUrl('/auth/register/'), { data: payload });
  expect(
    response.ok(),
    `could not register REC shopper: ${await response.text()}`,
  ).toBeTruthy();
  const data = await response.json();
  expect(data.tokens?.access, 'registration must return an access token').toBeTruthy();
  return {
    access: data.tokens.access as string,
    refresh: data.tokens.refresh as string,
    user: data.user as Record<string, unknown>,
    email: payload.email,
    password,
  };
}

/** Real cold login in a context with no addInitScript session replay. */
async function loginInFreshContext(page: Page, session: Session) {
  await page.goto(appUrl('/login'));
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 60_000 });
  await page.locator('#login-email').fill(session.email);
  await page.locator('#login-password').fill(session.password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/shopper\/dashboard$/, { timeout: 60_000 });
}

async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate(
    (element: HTMLInputElement, nextValue: string) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(element, nextValue);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    String(value),
  );
}

async function openRecommendations(
  page: Page,
  options: { expectItems?: boolean } = {},
) {
  const expectItems = options.expectItems !== false;
  await page
    .locator('.studio-panel-tabs button', { hasText: 'Recommendations' })
    .click();
  await expect(page.locator('.studio-recommendations-panel')).toBeVisible({
    timeout: 60_000,
  });
  if (expectItems) {
    await expect(page.locator('.studio-recommendation-item').first()).toBeVisible({
      timeout: 60_000,
    });
  }
}

/**
 * Opens the studio with a deterministic size-M avatar and returns the URL of
 * the ranked recommendation request that produced the visible list.
 */
async function prepareStudio(
  page: Page,
  options: { guest?: boolean; expectItems?: boolean } = {},
): Promise<string> {
  const recommendationUrls: string[] = [];
  const onRequest = (request: { url: () => string }) => {
    try {
      const url = new URL(request.url());
      if (isRecommendationsRequest(url)) recommendationUrls.push(url.toString());
    } catch {
      // ignore non-absolute URLs
    }
  };
  page.on('request', onRequest);

  if (options.guest) {
    await page.goto(appUrl('/guest/fitting-studio'));
    await expect(page.getByRole('heading', { name: 'Choose your avatar' })).toBeVisible({
      timeout: 60_000,
    });
    await page.locator('.gender-card').filter({ hasText: 'Female' }).click();
    await page.getByRole('button', { name: /Continue with Female/ }).click();
    await expect(page).toHaveURL(/\/guest\/fitting-studio\/customize$/, {
      timeout: 60_000,
    });
  } else {
    await page.goto(appUrl('/shopper/fitting-studio/customize'));
  }

  await expect(page.locator('main.fitting-studio-page')).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');

  // 160 cm / 93 cm Body Build maps to size M, the only size with a broad
  // seeded top/bottom/dress selection. Done through the UI, not storage.
  // The recommendation request fires once on mount; Body Build changes are
  // applied as a client-side size filter, so no second network call is due.
  await setRange(page, '#studio-height', 160);
  await setRange(page, '#studio-body-build', 93);
  await page.waitForLoadState('networkidle');

  await openRecommendations(page, { expectItems: options.expectItems });
  return recommendationUrls.at(-1) ?? '';
}

async function recommendationPayload(
  request: APIRequestContext,
  recUrl: string,
): Promise<RecommendationPayload> {
  expect(recUrl, 'studio must issue a ranked recommendation request').not.toBe('');
  const response = await request.get(recUrl);
  expect(
    response.ok(),
    `could not reload recommendation payload: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as RecommendationPayload;
}

async function firstRecommendationCard(page: Page) {
  const card = page.locator('.studio-recommendation-item').first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  return card;
}

async function cardSummary(card: Locator) {
  const name = (await card.locator('.studio-product-link').innerText()).trim();
  const store = (await card.locator('.studio-recommendation-information p').first().innerText()).trim();
  const badge = card.locator('.studio-match-score-badge strong');
  return {
    name,
    store,
    badge: (await badge.count()) ? (await badge.innerText()).trim() : '',
  };
}

async function matchRows(page: Page) {
  const section = page.locator('.studio-match-card');
  await expect(section).toBeVisible({ timeout: 60_000 });
  await expect(section.locator('.studio-match-score')).toHaveCount(4, {
    timeout: 30_000,
  });
  return section.locator('.studio-match-score').evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.querySelector('h3')?.textContent?.trim() ?? '',
      score: node.querySelector('strong')?.textContent?.trim() ?? '',
      reason: node.querySelector('p')?.textContent?.trim() ?? '',
    })),
  );
}

async function settleFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function canvasSignature(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector(
      'canvas.studio-avatar-canvas',
    ) as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL('image/png') : '';
  });
  return createHash('sha1').update(dataUrl).digest('hex').slice(0, 16);
}

async function waitForCanvasChange(page: Page, before: string) {
  await expect
    .poll(() => canvasSignature(page), { timeout: 10_000, intervals: [50, 100, 150] })
    .not.toBe(before);
}

async function equippedSlots(page: Page) {
  return page.locator('.studio-equipped-item').evaluateAll((nodes) =>
    nodes.map((node) => ({
      slot: node.querySelector('span')?.textContent?.trim() ?? '',
      name: node.querySelector('.studio-product-link')?.textContent?.trim() ?? '',
    })),
  );
}

async function submitStars(
  page: Page,
  score: number,
  testId: string,
  screenshot: string,
): Promise<string> {
  const modal = page.locator('.studio-rating-modal');
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.locator('.studio-rating-stars button')).toHaveCount(5);
  await modal.locator('.studio-rating-stars button').nth(score - 1).click();
  await capture(page, testId, screenshot);

  // The success toast auto-dismisses after 2.5s (FittingStudioPage
  // displayNotification). Polling for it AFTER the modal closes is racy — on a
  // slow run the toast is already gone. Record it the moment it is inserted.
  await page.evaluate(() => {
    const globals = window as unknown as Record<string, unknown>;
    globals.__recToastText = '';
    const observer = new MutationObserver(() => {
      const toast = document.querySelector('.studio-notification');
      if (toast?.textContent?.trim()) {
        globals.__recToastText = toast.textContent.trim();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    globals.__recToastObserver = observer;
  });

  await modal.getByRole('button', { name: 'Submit Rating' }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });

  const toastText = await page.evaluate(() => {
    const globals = window as unknown as Record<string, unknown>;
    (globals.__recToastObserver as MutationObserver | undefined)?.disconnect();
    return String(globals.__recToastText ?? '');
  });
  expect(toastText, 'rating success toast must be displayed on submit').toContain(
    'Thanks! Rating saved.',
  );
  return toastText;
}

async function myRatings(request: APIRequestContext, page: Page) {
  const token = await page.evaluate(() => {
    const raw = window.sessionStorage.getItem('fitfusion.session.v1');
    return raw ? (JSON.parse(raw)?.access as string | undefined) : undefined;
  });
  expect(token, 'cold login must leave an access token in sessionStorage').toBeTruthy();
  const response = await request.get(apiUrl('/ratings/mine/'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `could not read /ratings/mine/: ${await response.text()}`).toBeTruthy();
  const body = await response.json();
  return Array.isArray(body) ? body : body.results ?? [];
}

async function ratingStorageKeys(page: Page) {
  return page.evaluate(() => ({
    session: Object.keys(window.sessionStorage).filter((key) =>
      /rating|uat/i.test(key),
    ),
    local: Object.keys(window.localStorage).filter((key) => /rating|uat/i.test(key)),
  }));
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
  await page.screenshot({
    path: resolve(await evidenceDir(testId), filename),
    fullPage: true,
  });
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

async function withFreshPage(
  browser: Browser,
  testId: string,
  body: (page: Page, context: BrowserContext) => Promise<Record<string, unknown> | void>,
) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    await execute(testId, page, () => body(page, context));
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// REC-001 .. REC-007 (CSV order, serial, STOP ON FAILURE)
// ---------------------------------------------------------------------------

test.describe('Recommendations REC-001..REC-007 (CSV order, stop on failure)', () => {
  test.describe.configure({ mode: 'serial' });

  /** REC-001 — ranked items, weighted scores, match indicators. */
  test('REC-001 view ranked recommendations with scores', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-001', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);
      const recUrl = await prepareStudio(page);
      const payload = await recommendationPayload(request, recUrl);

      expect(payload.weights).toEqual({
        color_compatibility: 3,
        height_contrast: 2,
        proportion_shading: 1,
        style_occasion: 1,
      });
      expect(payload.recommendations.length, 'ranked API payload must not be empty').toBeGreaterThan(0);

      const card = await firstRecommendationCard(page);
      const summary = await cardSummary(card);
      const apiMatch = payload.recommendations.find((row) => row.name === summary.name);
      expect(apiMatch, `recommendation "${summary.name}" must be in the API payload`).toBeTruthy();
      expect(summary.badge).toBe(`${apiMatch?.total_score}/${apiMatch?.max_score}`);
      expect(
        await page.locator('.studio-match-score-badge').count(),
        'match score badges must be rendered',
      ).toBeGreaterThan(0);
      expect(
        await page.locator('.studio-recommendation-match-button', { hasText: 'View Match Reasons' }).count(),
      ).toBeGreaterThan(0);
      await capture(page, 'REC-001', '01-ranked-recommendations.png');

      return {
        weights_version: payload.weights_version ?? 'not supplied',
        api_recommendations: payload.recommendations.length,
        rendered_cards: await page.locator('.studio-recommendation-item').count(),
        sample_item: summary.name,
        sample_match_badge: summary.badge,
      };
    });
  });

  /** REC-002 — four-rule match-reason breakdown. */
  test('REC-002 view match reasons breakdown', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-002', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);
      await prepareStudio(page);
      const card = await firstRecommendationCard(page);
      const summary = await cardSummary(card);

      await card.getByRole('button', { name: /view match reasons/i }).click();
      const rows = await matchRows(page);
      expect(rows.map((row) => row.label)).toEqual([
        'Color compatibility',
        'Height contrast',
        'Proportion shading',
        'Style match',
      ]);
      for (const row of rows) {
        expect(row.score, `${row.label} score must render`).toMatch(/^\d+\/\d+$/);
        expect(row.reason.length, `${row.label} must explain the score`).toBeGreaterThan(0);
      }
      await capture(page, 'REC-002', '01-match-reasons.png');

      return {
        item: summary.name,
        rules: rows.map((row) => ({ label: row.label, score: row.score })),
        reasons_present: rows.every((row) => row.reason.length > 0),
      };
    });
  });

  /** REC-003 — empty/incompatible recommendation state and recovery hint. */
  test('REC-003 empty recommendation state', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-003', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);

      // The seeded catalog has no profile that yields zero API rows, so the
      // precondition is simulated at the API boundary: one returned garment
      // is size XL while the avatar is size M and is filtered by the UI.
      await page.route(isRecommendationsRequest, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            weights_version: '1.1.0',
            weights: {
              color_compatibility: 3,
              height_contrast: 2,
              proportion_shading: 1,
              style_occasion: 1,
            },
            avatar_profile: {
              undertone: 'neutral',
              height_cm: 160,
              body_shape: 'balanced',
              style_tags: ['casual'],
            },
            recommendations: [
              {
                id: 'rec-incompatible-xl',
                item_id: 'rec-incompatible-xl',
                name: 'Incompatible Size XL Sample',
                store: 'REC Fixture Store',
                category: 'tops',
                size: 'XL',
                total_score: 0,
                max_score: 7,
              },
            ],
          }),
        }),
      );

      await prepareStudio(page, { expectItems: false });
      const status = page.locator('.studio-recommendations-panel p[role="status"]');
      await expect(status).toBeVisible({ timeout: 15_000 });
      const message = (await status.innerText()).trim();

      // Equivalent UI wording accepted, consistent with the finalized CAT
      // empty-state decision: the assertion checks the behaviour, not the
      // exact marketing phrase in the CSV.
      expect(message, `empty-state message was: ${message}`).toMatch(
        /no recommendations|no catalog items available/i,
      );
      expect(message, `recovery hint was: ${message}`).toMatch(
        /browse|move the body build slider|switch gender/i,
      );
      expect(await page.locator('.studio-recommendation-item').count()).toBe(0);
      await capture(page, 'REC-003', '01-no-recommendations.png');

      return {
        simulated_precondition: 'one size-XL recommendation vs size-M avatar',
        message,
        rendered_cards: 0,
      };
    });
  });

  /** REC-004 — guest star click is blocked with no write or cache. */
  test('REC-004 guest rating is blocked', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-004', async (page) => {
      const ratingRequests: string[] = [];
      page.on('request', (req) => {
        try {
          if (isRatingsRequest(new URL(req.url()))) {
            ratingRequests.push(`${req.method()} ${req.url()}`);
          }
        } catch {
          // ignore
        }
      });

      await prepareStudio(page, { guest: true });
      const card = await firstRecommendationCard(page);
      const before = await ratingStorageKeys(page);

      // Try-before-rate gate: the Rate button only appears after Try Item.
      await card.getByRole('button', { name: 'Try Item', exact: true }).click();
      await expect(card.getByRole('button', { name: /Rate recommendation/i })).toBeVisible({
        timeout: 15_000,
      });
      await card.getByRole('button', { name: /Rate recommendation/i }).click();
      const modal = page.locator('.studio-rating-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });
      await capture(page, 'REC-004', '01-rating-control.png');

      await modal.locator('.studio-rating-stars button').first().click();
      const prompt = page.locator('[aria-labelledby="guest-rating-title"]');
      await expect(prompt).toBeVisible({ timeout: 15_000 });
      await expect(prompt).toContainText('Please sign up or log in to save your rating.');
      await expect(prompt.getByRole('button', { name: 'Sign Up' })).toBeVisible();
      await expect(prompt.getByRole('button', { name: 'Log In' })).toBeVisible();
      await expect(modal).toBeHidden();
      await capture(page, 'REC-004', '02-signup-prompt.png');

      const after = await ratingStorageKeys(page);
      expect(after, 'guest star click must not cache a rating').toEqual(before);
      expect(ratingRequests, 'guest star click must not call any ratings endpoint').toEqual([]);

      return {
        prompt: 'Please sign up or log in to save your rating.',
        ratings_network_calls: ratingRequests.length,
        rating_storage_before: before,
        rating_storage_after: after,
      };
    });
  });

  /** REC-005 — registered 4-star rating persists across reload/DB rehydrate. */
  test('REC-005 registered rating persists', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-005', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);
      await prepareStudio(page);
      const card = await firstRecommendationCard(page);
      const summary = await cardSummary(card);
      await capture(page, 'REC-005', '01-before-rating.png');

      // Try-before-rate gate: unlock the Rate button for this item first.
      await card.getByRole('button', { name: 'Try Item', exact: true }).click();
      await expect(card.getByRole('button', { name: /Rate recommendation/i })).toBeVisible({
        timeout: 15_000,
      });
      await card.getByRole('button', { name: /Rate recommendation/i }).click();
      await submitStars(page, 4, 'REC-005', '02-four-stars-submitted.png');

      const mine = await myRatings(request, page);
      const saved = mine.find(
        (entry: Record<string, unknown>) =>
          String(entry.target_type) === 'item' &&
          String(entry.source) === 'recommendation_panel' &&
          Number(entry.score) === 4,
      );
      expect(saved, 'a 4-star recommendation_panel rating must be persisted').toBeTruthy();
      expect(String((saved as Record<string, unknown>).target_id)).toMatch(/^[a-f0-9]{24}$/i);

      await page.reload();
      await expect(page.locator('main.fitting-studio-page')).toBeVisible({ timeout: 60_000 });
      await openRecommendations(page);
      const reloaded = page
        .locator('.studio-recommendation-item')
        .filter({ has: page.locator('.studio-product-link', { hasText: summary.name }) })
        .first();
      await expect(reloaded).toBeVisible({ timeout: 30_000 });
      await expect(reloaded.locator('small', { hasText: 'Your rating: 4/5' })).toBeVisible({
        timeout: 15_000,
      });
      await capture(page, 'REC-005', '03-rating-after-reload.png');

      return {
        item: summary.name,
        score: 4,
        persisted_target_id: String((saved as Record<string, unknown>).target_id),
        rehydrated_after_reload: true,
      };
    });
  });

  /** REC-006 — UAT fit visualization and functional fit rating control. */
  test('REC-006 UAT fit and style confidence', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-006', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);
      await prepareStudio(page);

      const card = await firstRecommendationCard(page);
      const summary = await cardSummary(card);
      const before = await canvasSignature(page);
      await card.getByRole('button', { name: 'Try Item', exact: true }).click();
      await expect(page.locator('.studio-notification')).toContainText(summary.name, {
        timeout: 15_000,
      });
      await waitForCanvasChange(page, before);
      await settleFrames(page);
      const slots = await equippedSlots(page);
      expect(slots.length, 'try-on must equip a garment for the fit observation').toBeGreaterThan(0);
      await capture(page, 'REC-006', '01-fit-visualization.png');

      await page.getByRole('button', { name: 'Rate Avatar Look' }).click();
      const modal = page.locator('.studio-rating-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });
      const successToast = await submitStars(
        page,
        4,
        'REC-006',
        '02-fit-rating-submitted.png',
      );

      const mine = await myRatings(request, page);
      const fit = mine.find(
        (entry: Record<string, unknown>) =>
          String(entry.target_type) === 'fit' &&
          String(entry.source) === 'fit_visualization' &&
          Number(entry.score) === 4,
      );
      expect(fit, 'a 4-star fit_visualization rating must be persisted').toBeTruthy();

      return {
        item: summary.name,
        equipped_slots: slots,
        canvas_redrawn: true,
        success_toast: successToast,
        fit_rating_persisted: true,
        observation_notes:
          'Automated UAT observation: canvas rendered the equipped garment overlay and changed after try-on; the 1-5 star fit control accepted a 4-star submission. Team physical fit-accuracy comparison and the >=80% population KPI remain deferred to post-deployment per Scope v1.1.',
      };
    });
  });

  /** REC-007 — UAT recommendation explainability + rating control. */
  test('REC-007 UAT recommendation approval', async ({ browser, request }) => {
    test.setTimeout(120_000);
    await withFreshPage(browser, 'REC-007', async (page) => {
      const session = await registerUser(request);
      await loginInFreshContext(page, session);
      await prepareStudio(page);

      const card = await firstRecommendationCard(page);
      const summary = await cardSummary(card);
      await card.getByRole('button', { name: /view match reasons/i }).click();
      const rows = await matchRows(page);
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row.score.includes('/') && row.reason.length > 0)).toBe(true);
      await capture(page, 'REC-007', '01-match-reasons-reviewed.png');

      // Try-before-rate gate: unlock the Rate button for this item first.
      await card.getByRole('button', { name: 'Try Item', exact: true }).click();
      await expect(card.getByRole('button', { name: /Rate recommendation/i })).toBeVisible({
        timeout: 15_000,
      });
      await card.getByRole('button', { name: /Rate recommendation/i }).click();
      await submitStars(page, 5, 'REC-007', '02-recommendation-rated.png');

      const mine = await myRatings(request, page);
      const rec = mine.find(
        (entry: Record<string, unknown>) =>
          String(entry.target_type) === 'item' &&
          String(entry.source) === 'recommendation_panel' &&
          Number(entry.score) === 5,
      );
      expect(rec, 'a 5-star recommendation rating must be persisted').toBeTruthy();
      await capture(page, 'REC-007', '03-approval-recorded.png');

      return {
        item: summary.name,
        explainable_rules: rows.map((row) => row.label),
        score: 5,
        observation_notes:
          'Automated UAT observation: four weighted match reasons were visible with non-empty explanations and the 1-5 star recommendation rating control accepted a 5-star submission. The >=80% population approval KPI remains deferred to post-deployment per Scope v1.1.',
      };
    });
  });
});
