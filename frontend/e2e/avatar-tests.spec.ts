/**
 * Avatar (AV) test suite — docs/Test Cases/FitFusionAI - Test Cases - AV — Avatar.csv
 *
 * Evidence-only test automation. No application code is touched here: the
 * suite uses the running Vite frontend, the Django API, and the existing
 * frontend/src/services/api.js constants (HEIGHT_RANGE, BODY_BUILD_RANGE,
 * SIZE_RANGE_TABLE) as the authoritative client-side range mirror.
 *
 * Run one case at a time (dependency order):
 *   npx playwright test e2e/avatar-tests.spec.ts --grep 'AV-001'
 * ... because the hard rule is STOP ON FAILURE. The describe is serial, so a
 * whole-file run also skips every remaining case after the first failure.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  BODY_BUILD_RANGE,
  HEIGHT_RANGE,
  SIZE_RANGE_TABLE,
} from '../src/services/api.js';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://localhost:8443';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence', 'avatar-tests');

test.use({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

type Role = 'shopper' | 'seller';
type Session = { access: string; refresh: string; user: Record<string, unknown> };
type Preset = {
  id: string;
  name: string;
  height: number;
  body_build_cm: number;
  [key: string]: unknown;
};

const DEFAULT_PRESET_PAYLOAD = {
  name: 'AV Fixture Preset',
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

// ---------------------------------------------------------------------------
// Infrastructure helpers (same session contract as the existing e2e specs)
// ---------------------------------------------------------------------------

async function registerUser(request: APIRequestContext, role: Role) {
  const suffix = randomUUID();
  const password = `AvatarTest-${suffix}!7`;
  const payload = {
    email: `avatar-${role}-${suffix}@example.test`,
    full_name: role === 'seller' ? 'Avatar Test Seller' : 'Avatar Test Shopper',
    password,
    password_confirm: password,
    role,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
    ...(role === 'seller' ? { store_name: `Avatar Test Store ${suffix}` } : {}),
  };

  const response = await request.post(new URL('/auth/register/', API_BASE_URL).toString(), {
    data: payload,
  });
  expect(
    response.ok(),
    `could not register ${role} user: ${await response.text()}`,
  ).toBeTruthy();

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

async function installSession(page: Page, session: Session) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('fitfusion.session.v1', JSON.stringify(value));
    window.sessionStorage.setItem('fitfusion.history.epoch', String(Date.now()));
  }, session);
}

function authHeaders(session: Session) {
  return { Authorization: `Bearer ${session.access}` };
}

async function createPreset(
  request: APIRequestContext,
  session: Session,
  overrides: Record<string, unknown> = {},
): Promise<Preset> {
  const response = await request.post(new URL('/presets/', API_BASE_URL).toString(), {
    headers: authHeaders(session),
    data: { ...DEFAULT_PRESET_PAYLOAD, ...overrides },
  });
  expect(
    response.ok(),
    `could not create fixture preset: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as Preset;
}

async function listPresets(request: APIRequestContext, session: Session): Promise<Preset[]> {
  const response = await request.get(new URL('/presets/', API_BASE_URL).toString(), {
    headers: authHeaders(session),
  });
  expect(response.ok(), `could not list presets: ${await response.text()}`).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

async function getPreset(request: APIRequestContext, session: Session, id: string) {
  const response = await request.get(
    new URL(`/presets/${encodeURIComponent(id)}/`, API_BASE_URL).toString(),
    { headers: authHeaders(session) },
  );
  return { status: response.status(), body: response.ok() ? await response.json() : null };
}

async function openEdit(page: Page, presetId: string) {
  await page.goto(
    new URL(`/shopper/avatar-presets/${encodeURIComponent(presetId)}/edit`, APP_BASE_URL).toString(),
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Edit your avatar' })).toBeVisible();
}

async function setRange(page: Page, selector: string, value: number | string) {
  await page.locator(selector).evaluate((element: HTMLInputElement, nextValue: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}

/**
 * Numeric inputs carry min/max attributes, so HTML5 constraint validation
 * blocks submit before the React form validator can render its <small> error.
 * The descriptive error the user actually receives is the browser's
 * validationMessage; assert that surface and that nothing was persisted.
 */
async function rangeValidationMessage(page: Page, name: string) {
  return page.getByRole('spinbutton', { name }).evaluate(
    (element: HTMLInputElement) => element.validationMessage,
  );
}

// ---------------------------------------------------------------------------
// Evidence helpers — every PASS gets a screenshot and a JSON log
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

/** Run one AV case, always writing evidence; rethrow on failure so the test fails. */
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

test.describe('Avatar AV-001..AV-011 (dependency order, stop on failure)', () => {
  test.describe.configure({ mode: 'serial' });

  /** AV-001 — valid custom avatar creation (height 170, build 95). */
  test('AV-001 valid custom avatar creation', async ({ page, request }) => {
    await execute('AV-001', page, async () => {
      const session = await registerUser(request, 'shopper');
      await installSession(page, session);

      await page.goto(new URL('/shopper/fitting-studio', APP_BASE_URL).toString());
      await expect(page.getByRole('heading', { name: 'Choose your avatar' })).toBeVisible();
      await page.locator('.gender-card').filter({ hasText: 'Female' }).click();
      await page.getByRole('button', { name: /Continue with Female/ }).click();
      await expect(page).toHaveURL(/\/shopper\/fitting-studio\/customize$/);

      await expect(page.locator('#studio-height')).toBeVisible();
      await setRange(page, '#studio-height', 170);
      await setRange(page, '#studio-body-build', 95);
      await expect(page.locator('.studio-slider-field').filter({ hasText: 'Height' }).locator('strong'))
        .toHaveText(`${170} cm`);
      await expect(page.locator('.studio-slider-field').filter({ hasText: 'Body Build' }).locator('strong'))
        .toHaveText(`${95} cm`);
      await expect(page.locator('canvas').first()).toBeVisible();
      await capture(page, 'AV-001', '01-valid-avatar-rendered.png');

      await page.getByRole('button', { name: 'Save Avatar Preset' }).click();
      await page.locator('#studio-avatar-preset-name').fill('AV-001 Valid Custom Avatar');
      await page.getByRole('button', { name: 'Save Preset' }).click();
      await expect(page.getByText(/"AV-001 Valid Custom Avatar" was saved to Avatar Presets\./)).toBeVisible();

      const presets = await listPresets(request, session);
      const saved = presets.find((preset) => preset.name === 'AV-001 Valid Custom Avatar');
      expect(saved, 'the created preset must be persisted').toBeTruthy();
      expect(Number(saved!.height)).toBe(170);
      expect(Number(saved!.body_build_cm)).toBe(95);
      await capture(page, 'AV-001', '02-valid-avatar-saved.png');

      return {
        gender: 'Female',
        height_cm: 170,
        body_build_cm: 95,
        preset_id: saved!.id,
        client_height_range: HEIGHT_RANGE,
        client_body_build_range: BODY_BUILD_RANGE,
      };
    });
  });

  /** AV-002 — height outside the valid range is rejected with a descriptive error. */
  test('AV-002 height validation out of range', async ({ page, request }) => {
    await execute('AV-002', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, {
        name: 'AV-002 Height Validation Preset',
        height: 170,
        body_build_cm: 95,
      });
      await installSession(page, session);
      await openEdit(page, preset.id);
      await capture(page, 'AV-002', '01-before-invalid-height.png');

      await page.getByRole('spinbutton', { name: 'Height in cm' }).fill('250');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      const message = await rangeValidationMessage(page, 'Height in cm');
      expect(message).toContain(`less than or equal to ${HEIGHT_RANGE.max}`);
      await expect(page).toHaveURL(new RegExp(`/shopper/avatar-presets/${preset.id}/edit$`));
      await capture(page, 'AV-002', '02-height-error.png');

      const after = await getPreset(request, session, preset.id);
      expect(after.status).toBe(200);
      expect(Number(after.body.height)).toBe(170);
      return {
        attempted_height_cm: 250,
        error: message,
        error_surface: 'HTML5 constraint validation on the Height input',
        persisted_height_cm: after.body.height,
      };
    });
  });

  /** AV-003 — body build outside 86-112 cm is rejected with a descriptive error. */
  test('AV-003 body build validation out of range', async ({ page, request }) => {
    await execute('AV-003', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, {
        name: 'AV-003 Build Validation Preset',
        height: 170,
        body_build_cm: 95,
      });
      await installSession(page, session);
      await openEdit(page, preset.id);
      await capture(page, 'AV-003', '01-before-invalid-build.png');

      await page.getByRole('spinbutton', { name: 'Body Build in cm' }).fill('130');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      const message = await rangeValidationMessage(page, 'Body Build in cm');
      expect(message).toContain(`less than or equal to ${BODY_BUILD_RANGE.max}`);
      await expect(page).toHaveURL(new RegExp(`/shopper/avatar-presets/${preset.id}/edit$`));
      await capture(page, 'AV-003', '02-body-build-error.png');

      const after = await getPreset(request, session, preset.id);
      expect(after.status).toBe(200);
      expect(Number(after.body.body_build_cm)).toBe(95);
      return {
        attempted_body_build_cm: 130,
        error: message,
        error_surface: 'HTML5 constraint validation on the Body Build input',
        persisted_body_build_cm: after.body.body_build_cm,
      };
    });
  });

  /**
   * AV-010 — exact boundaries from the CSV: height 120/220 accepted, 119/221
   * rejected; body build 86/112 accepted, 85/113 rejected.
   */
  test('AV-010 boundary validation exact limits', async ({ page, request }) => {
    await execute('AV-010', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, {
        name: 'AV-010 Boundary Validation Preset',
        height: 165,
        body_build_cm: 99,
      });
      await installSession(page, session);
      const results: Record<string, string> = {};

      async function checkHeight(value: number, shouldAccept: boolean) {
        await openEdit(page, preset.id);
        await page.getByRole('spinbutton', { name: 'Height in cm' }).fill(String(value));
        await page.getByRole('button', { name: 'Save Changes' }).click();
        if (shouldAccept) {
          await expect(page).toHaveURL(/\/shopper\/avatar-presets$/);
          const after = await getPreset(request, session, preset.id);
          expect(Number(after.body.height)).toBe(value);
          results[`height_${value}`] = `ACCEPTED (persisted ${after.body.height} cm)`;
        } else {
          const expectedBound = value < HEIGHT_RANGE.min
            ? `greater than or equal to ${HEIGHT_RANGE.min}`
            : `less than or equal to ${HEIGHT_RANGE.max}`;
          const message = await rangeValidationMessage(page, 'Height in cm');
          expect(message).toContain(expectedBound);
          const after = await getPreset(request, session, preset.id);
          expect(after.body.height).not.toBe(value);
          results[`height_${value}`] = `REJECTED (${message}; persisted ${after.body.height} cm)`;
        }
        await capture(page, 'AV-010', `height-${value}.png`);
      }

      async function checkBuild(value: number, shouldAccept: boolean) {
        await openEdit(page, preset.id);
        await page.getByRole('spinbutton', { name: 'Body Build in cm' }).fill(String(value));
        await page.getByRole('button', { name: 'Save Changes' }).click();
        if (shouldAccept) {
          await expect(page).toHaveURL(/\/shopper\/avatar-presets$/);
          const after = await getPreset(request, session, preset.id);
          expect(Number(after.body.body_build_cm)).toBe(value);
          results[`build_${value}`] = `ACCEPTED (persisted ${after.body.body_build_cm} cm)`;
        } else {
          const expectedBound = value < BODY_BUILD_RANGE.min
            ? `greater than or equal to ${BODY_BUILD_RANGE.min}`
            : `less than or equal to ${BODY_BUILD_RANGE.max}`;
          const message = await rangeValidationMessage(page, 'Body Build in cm');
          expect(message).toContain(expectedBound);
          const after = await getPreset(request, session, preset.id);
          expect(after.body.body_build_cm).not.toBe(value);
          results[`build_${value}`] = `REJECTED (${message}; persisted ${after.body.body_build_cm} cm)`;
        }
        await capture(page, 'AV-010', `build-${value}.png`);
      }

      // CSV: reject 119, accept 120, accept 220, reject 221.
      await checkHeight(119, false);
      await checkHeight(120, true);
      await checkHeight(220, true);
      await checkHeight(221, false);
      // CSV: reject 85, accept 86, accept 112, reject 113.
      await checkBuild(85, false);
      await checkBuild(86, true);
      await checkBuild(112, true);
      await checkBuild(113, false);

      return { results, client_height_range: HEIGHT_RANGE, client_body_build_range: BODY_BUILD_RANGE };
    });
  });

  /** AV-004 — skin-tone shade and warm/cool/neutral undertone selection. */
  test('AV-004 skin tone and undertone selection', async ({ page, request }) => {
    await execute('AV-004', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, { name: 'AV-004 Skin Tone Preset' });
      await installSession(page, session);
      await openEdit(page, preset.id);
      await capture(page, 'AV-004', '01-before-skin-tone.png');

      await page.getByRole('button', { name: 'Skin tone 5' }).click();
      await page.getByLabel('Undertone').selectOption('Warm');
      await expect(page.getByRole('button', { name: 'Skin tone 5' })).toHaveAttribute('aria-pressed', 'true');
      await capture(page, 'AV-004', '02-skin-tone-selected.png');

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page).toHaveURL(/\/shopper\/avatar-presets$/);
      const after = await getPreset(request, session, preset.id);
      expect(String(after.body.skin_tone).toLowerCase()).toBe('#925c3c');
      expect(String(after.body.undertone).toLowerCase()).toBe('warm');
      await capture(page, 'AV-004', '03-skin-tone-saved.png');
      return { skin_tone: after.body.skin_tone, undertone: after.body.undertone };
    });
  });

  /** AV-005 — shoulder/waist/hip/thigh proportions deform the silhouette. */
  test('AV-005 body proportions adjustment', async ({ page, request }) => {
    await execute('AV-005', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, { name: 'AV-005 Proportions Preset' });
      await installSession(page, session);
      await openEdit(page, preset.id);
      await capture(page, 'AV-005', '01-before-proportions.png');

      await page.getByLabel('Shoulder').selectOption('Broad');
      await page.getByLabel('Waist').selectOption('Curvy');
      await page.getByLabel('Hip').selectOption('Wide');
      await page.getByLabel('Thigh').selectOption('Thick');
      await expect(page.locator('.edit-avatar-summary')).toContainText('Broad');
      await capture(page, 'AV-005', '02-proportions-selected.png');

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page).toHaveURL(/\/shopper\/avatar-presets$/);
      const after = await getPreset(request, session, preset.id);
      expect(after.body.shoulder).toBe('broad');
      expect(after.body.waist).toBe('curvy');
      expect(after.body.hip).toBe('wide');
      expect(after.body.thigh).toBe('thick');
      await capture(page, 'AV-005', '03-proportions-saved.png');
      return {
        shoulder: after.body.shoulder,
        waist: after.body.waist,
        hip: after.body.hip,
        thigh: after.body.thigh,
      };
    });
  });

  /** AV-006 — cup-size control is female-only. */
  test('AV-006 cup size female only', async ({ page, request }) => {
    await execute('AV-006', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, { name: 'AV-006 Cup Size Preset' });
      await installSession(page, session);
      await openEdit(page, preset.id);

      const cupControl = page.getByLabel('Cup size');
      await expect(cupControl).toBeVisible();
      await capture(page, 'AV-006', '01-female-cup-size-visible.png');

      await page.getByRole('button', { name: '♂ Male' }).click();
      await expect(cupControl).toHaveCount(0);
      await capture(page, 'AV-006', '02-male-cup-size-hidden.png');

      await page.getByRole('button', { name: '♀ Female' }).click();
      await expect(cupControl).toBeVisible();
      await cupControl.selectOption('D');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page).toHaveURL(/\/shopper\/avatar-presets$/);
      const after = await getPreset(request, session, preset.id);
      expect(after.body.cup_size).toBe('D');
      await capture(page, 'AV-006', '03-female-cup-size-saved.png');
      return { female_visible: true, male_hidden: true, saved_cup_size: after.body.cup_size };
    });
  });

  /**
   * AV-007 — registered preset survives logout/login unchanged.
   *
   * Harness fix: `installSession()` uses `page.addInitScript()`, which re-injects
   * the session on EVERY navigation. Clearing sessionStorage in the same page
   * therefore cannot simulate a real logout — navigating to /login simply got
   * the session put straight back and bounced to the dashboard. Instead we do
   * the login phase in a brand-new BrowserContext: it has no init script and no
   * stored session, so /login is a genuine cold login. The preset is then
   * verified in that fresh UI and through the API using the access token minted
   * by the cold login, proving it came from the database and not tab storage.
   */
  test('AV-007 preset persistence across sessions', async ({ browser, page, request }) => {
    await execute('AV-007', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, {
        name: 'AV-007 Persistent Preset',
        height: 172,
        body_build_cm: 97,
        skin_tone: '#bb7d55',
        undertone: 'cool',
      });
      await installSession(page, session);
      await openEdit(page, preset.id);
      await capture(page, 'AV-007', '01-before-logout.png');

      // Fresh context = no addInitScript, empty sessionStorage/localStorage.
      const freshContext = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1440, height: 900 },
      });
      const freshPage = await freshContext.newPage();
      await freshPage.goto(new URL('/login', APP_BASE_URL).toString());
      await expect(freshPage.locator('#login-email')).toBeVisible();
      await freshPage.locator('#login-email').fill(session.email);
      await freshPage.locator('#login-password').fill(session.password);
      await freshPage.getByRole('button', { name: 'Log In' }).click();
      await freshPage.waitForURL(/\/shopper\/dashboard$/, { timeout: 60_000 });
      await capture(freshPage, 'AV-007', '02-after-login.png');

      await freshPage.goto(new URL('/shopper/avatar-presets', APP_BASE_URL).toString());
      await expect(freshPage.locator('.avatar-preset-card').filter({ hasText: 'AV-007 Persistent Preset' }))
        .toBeVisible({ timeout: 60_000 });
      await capture(freshPage, 'AV-007', '03-preset-reloaded.png');

      // Use the token from the cold login, not the registration token, so the
      // API read proves the preset was reloaded from the database.
      const relogged = await freshPage.evaluate(() =>
        JSON.parse(window.sessionStorage.getItem('fitfusion.session.v1') || 'null'),
      );
      expect(relogged?.access, 'cold login must mint a fresh access token').toBeTruthy();
      const after = await getPreset(request, { ...session, access: relogged.access }, preset.id);
      expect(after.status).toBe(200);
      expect(Number(after.body.height)).toBe(172);
      expect(Number(after.body.body_build_cm)).toBe(97);
      expect(after.body.skin_tone).toBe('#bb7d55');
      expect(after.body.undertone).toBe('cool');
      await freshContext.close();
      return {
        preset_id: preset.id,
        height_cm: after.body.height,
        body_build_cm: after.body.body_build_cm,
        skin_tone: after.body.skin_tone,
        undertone: after.body.undertone,
        cold_login_token_used_for_api_check: true,
      };
    });
  });

  /** AV-008 — list, edit (rename) and delete presets through the UI. */
  test('AV-008 preset CRUD operations', async ({ page, request }) => {
    await execute('AV-008', page, async () => {
      const session = await registerUser(request, 'shopper');
      const preset = await createPreset(request, session, { name: 'AV-008 CRUD Preset' });
      await installSession(page, session);

      await page.goto(new URL('/shopper/avatar-presets', APP_BASE_URL).toString());
      const card = page.locator('.avatar-preset-card').filter({ hasText: 'AV-008 CRUD Preset' });
      await expect(card).toBeVisible({ timeout: 60_000 });
      await expect((await listPresets(request, session)).map((p) => p.name)).toContain('AV-008 CRUD Preset');
      await capture(page, 'AV-008', '01-preset-listed.png');

      await page.getByRole('button', { name: `Rename ${preset.name}` }).click();
      await page.locator('input').filter({ visible: true }).last().fill('AV-008 Renamed Preset');
      await page.getByRole('button', { name: 'Save Name' }).click();
      await expect(page.locator('.avatar-preset-card').filter({ hasText: 'AV-008 Renamed Preset' }))
        .toBeVisible({ timeout: 60_000 });
      await capture(page, 'AV-008', '02-preset-renamed.png');
      expect((await listPresets(request, session)).map((p) => p.name)).toContain('AV-008 Renamed Preset');

      await page.getByRole('button', { name: 'Delete AV-008 Renamed Preset' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await capture(page, 'AV-008', '03-delete-confirmation.png');
      await page.getByRole('dialog').getByRole('button', { name: 'Delete Preset' }).click();
      await expect(page.locator('.avatar-preset-card').filter({ hasText: 'AV-008 Renamed Preset' }))
        .toHaveCount(0, { timeout: 60_000 });
      const after = await getPreset(request, session, preset.id);
      expect(after.status).toBe(404);
      await capture(page, 'AV-008', '04-preset-deleted.png');
      return { listed: true, renamed_to: 'AV-008 Renamed Preset', deleted: true, final_status: after.status };
    });
  });

  /** AV-009 — guest avatar data is ephemeral and never persisted server-side. */
  test('AV-009 guest avatar ephemerality', async ({ browser, request }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await execute('AV-009', page, async () => {
      await page.goto(new URL('/guest/fitting-studio', APP_BASE_URL).toString());
      await expect(page.getByRole('heading', { name: 'Choose your avatar' })).toBeVisible();
      await page.locator('.gender-card').filter({ hasText: 'Female' }).click();
      await page.getByRole('button', { name: /Continue with Female/ }).click();
      await expect(page).toHaveURL(/\/guest\/fitting-studio\/customize$/);
      await setRange(page, '#studio-height', 168);
      await setRange(page, '#studio-body-build', 93);
      // `exact: true` avoids strict-mode ambiguity with the separate
      // "Registration Required to Save Outfit" button in the same toolbar.
      await expect(page.getByRole('button', { name: 'Registration Required to Save', exact: true }))
        .toBeVisible();

      const guestState = await page.evaluate(() => ({
        sessionKeys: Object.keys(window.sessionStorage),
        avatarKeys: Object.keys(window.sessionStorage).filter((key) => key.includes('avatar')),
        localAvatarKeys: Object.keys(window.localStorage).filter((key) => key.includes('avatar')),
      }));
      await capture(page, 'AV-009', '01-guest-avatar-created.png');

      // Guest close: a brand-new tab has no avatar state at all.
      await context.close();
      const freshContext = await browser.newContext({ ignoreHTTPSErrors: true });
      const freshPage = await freshContext.newPage();
      await freshPage.goto(new URL('/guest/avatar-presets', APP_BASE_URL).toString());
      await expect(freshPage.getByRole('heading', { name: 'Choose an Avatar Preset' })).toBeVisible();
      const freshKeys = await freshPage.evaluate(() => ({
        avatarKeys: Object.keys(window.sessionStorage).filter((key) => key.includes('avatar')),
        localAvatarKeys: Object.keys(window.localStorage).filter((key) => key.includes('avatar')),
      }));
      await freshContext.close();

      // No server-side guest records: unauthenticated preset access is refused.
      const anonymous = await request.get(new URL('/presets/', API_BASE_URL).toString());
      expect(anonymous.status()).toBe(401);
      return { guestState, freshKeys, anonymous_presets_status: anonymous.status() };
    });
  });

  /** AV-011 — equipping a size-S garment constrains Body Build to its sub-range. */
  test('AV-011 size compatible guardrails', async ({ page, request }) => {
    // Ranked recommendations load on a debounce; give this case extra headroom.
    test.setTimeout(120_000);
    await execute('AV-011', page, async () => {
      const catalog = await request.get(new URL('/catalog/?size=S', API_BASE_URL).toString());
      expect(catalog.ok()).toBeTruthy();
      const payload = await catalog.json();
      const rows = Array.isArray(payload) ? payload : payload.results ?? [];
      const garment = rows.find((row: { size?: string }) => String(row.size).toUpperCase() === 'S');
      expect(garment, 'a size-S garment is required for this test').toBeTruthy();

      const session = await registerUser(request, 'shopper');
      await installSession(page, session);
      await page.goto(new URL('/shopper/fitting-studio', APP_BASE_URL).toString());
      await page.locator('.gender-card').filter({ hasText: 'Female' }).click();
      await page.getByRole('button', { name: /Continue with Female/ }).click();
      await expect(page).toHaveURL(/\/shopper\/fitting-studio\/customize$/);

      // `exact: true` targets the panel tab, not the "Browse/Open/Back to
      // Recommendations" action buttons present elsewhere on the page.
      await page.getByRole('button', { name: 'Recommendations', exact: true }).click();
      const card = page.locator('.studio-recommendation-item').filter({ hasText: garment.name }).first();
      await expect(card).toBeVisible({ timeout: 60_000 });
      await card.getByRole('button', { name: 'Try Item' }).click();
      await page.getByRole('button', { name: 'Customize', exact: true }).click();

      const buildSlider = page.locator('#studio-body-build');
      const [sMin, sMax] = SIZE_RANGE_TABLE.S;
      // Size bands are half-open: the app caps at the largest value still
      // labelled S (sMax - 0.1), not the band edge that already belongs to M.
      // Read the effective cap from the UI, then prove it is a genuine size-S
      // sub-range — inside the S band and tighter than the global 86-112 max.
      const cappedMax = Number(await buildSlider.getAttribute('max'));
      expect(cappedMax, 'a size-S cap must be applied').toBeGreaterThan(sMin);
      expect(cappedMax, 'the cap must stay within the S band').toBeLessThanOrEqual(sMax);
      expect(cappedMax, 'the cap must be tighter than the global max').toBeLessThan(BODY_BUILD_RANGE.max);
      await expect(page.locator('.studio-fit-validation')).toContainText(`capped at ${cappedMax} cm`);
      await setRange(page, '#studio-body-build', cappedMax + 5);
      await expect(page.locator('.studio-slider-field').filter({ hasText: 'Body Build' }).locator('strong'))
        .toHaveText(`${cappedMax} cm`);
      await capture(page, 'AV-011', '01-size-s-cap-enforced.png');
      return {
        garment: garment.name,
        garment_size: garment.size,
        s_band: { min: sMin, max: sMax },
        effective_build_max: cappedMax,
        global_height_range: HEIGHT_RANGE,
        global_build_range: BODY_BUILD_RANGE,
      };
    });
  });
});
