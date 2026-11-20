/**
 * Test-only fixture seeding for the post-repair regression gate.
 *
 * This helper never imports or modifies application code. It restores live
 * catalog preconditions through the approved seller CSV upload path (the same
 * KAN-40/KAN-100 staging-seed mechanism) when the current catalog has drifted
 * away from the preconditions the TO/AV specs assert.
 */
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { APIRequestContext } from '@playwright/test';

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000';
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BACKEND_DIR = resolve(REPOSITORY_ROOT, 'backend');
const EVIDENCE_DIR = resolve(REPOSITORY_ROOT, 'docs', 'evidence');
const VENV_PYTHON = resolve(BACKEND_DIR, '.venv', 'Scripts', 'python.exe');
const PYTHON_EXE = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python';
const AVATAR_SRC = resolve(
  REPOSITORY_ROOT,
  'Frontend',
  'public',
  'Avatars',
  'Female_Standard',
  'Female_Standard_front.png',
);
const runExecFile = promisify(execFile);

export type GateCatalogRow = {
  id: string;
  name: string;
  category: string;
  size: string;
  status: string;
  front_image?: string;
  store_name?: string;
  [key: string]: unknown;
};

export type GateTargets = {
  topA: GateCatalogRow;
  topB: GateCatalogRow;
  bottom: GateCatalogRow;
  dress: GateCatalogRow;
  guestDress: GateCatalogRow;
};

export type GateSeedingRecord = {
  seeding_occurred: boolean;
  mechanism: string;
  reason: string;
  catalog_before: Record<string, number>;
  catalog_after: Record<string, number>;
  seeded_names: string[];
  batch?: Record<string, unknown>;
  artifact?: string;
};

export type ToFixtureResult = {
  seeding: GateSeedingRecord;
  targets: GateTargets;
};

export type SizeSFixtureResult = {
  seeding: GateSeedingRecord;
  garment: GateCatalogRow;
};

type Session = { access: string; email: string; password: string; store_name: string };

const CSV_HEADER =
  'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename';
const FIXTURE_SCRIPT = `
import base64, io, sys
from PIL import Image, ImageDraw
src = Image.open(sys.argv[1]).convert('RGBA')
canvas = Image.new('RGBA', (900, 900), (255, 255, 255, 255))
canvas.alpha_composite(src, ((900 - src.width) // 2, (900 - src.height) // 2))
variant = int(sys.argv[2]) if len(sys.argv) > 2 else 0
if variant:
    shade = 250 - ((variant - 1) % 3) * 18
    y = 220 + ((variant - 1) % 3) * 170
    ImageDraw.Draw(canvas).rectangle((70, y, 830, y + 110), fill=(shade, shade, shade, 255))
out = io.BytesIO()
canvas.convert('RGB').save(out, format='PNG', compress_level=9)
print(base64.b64encode(out.getvalue()).decode('ascii'))
`;

function apiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

async function listCatalog(request: APIRequestContext, size?: string): Promise<GateCatalogRow[]> {
  const url = new URL(apiUrl('/catalog/'));
  if (size) url.searchParams.set('size', size);
  const response = await request.get(url.toString());
  if (!response.ok()) throw new Error(`could not list catalog: ${await response.text()}`);
  const payload = await response.json();
  return (Array.isArray(payload) ? payload : payload.results ?? []) as GateCatalogRow[];
}

/** Names present on the first ranked recommendation page for the TO avatar. */
async function recommendedNames(request: APIRequestContext): Promise<Set<string>> {
  const url = new URL(apiUrl('/api/recommendations/'));
  url.searchParams.set('undertone', 'neutral');
  url.searchParams.set('height_cm', '160');
  url.searchParams.set('body_shape', 'balanced');
  url.searchParams.set('styles', 'casual');
  url.searchParams.set('limit', '50');
  const response = await request.get(url.toString());
  if (!response.ok()) throw new Error(`could not load recommendations: ${await response.text()}`);
  const payload = await response.json();
  return new Set(
    (Array.isArray(payload.recommendations) ? payload.recommendations : []).map(
      (row: { name?: string }) => String(row.name ?? ''),
    ),
  );
}

/** TO-002/TO-005 must switch to a visibly different garment, so select tops by
 *  image CONTENT, not just name or GridFS id (duplicate fixtures exist). */
async function distinctByImageContent(
  request: APIRequestContext,
  rows: GateCatalogRow[],
  count: number,
): Promise<GateCatalogRow[]> {
  const seen = new Set<string>();
  const picked: GateCatalogRow[] = [];
  for (const row of rows) {
    if (!row.front_image) continue;
    const response = await request.get(row.front_image);
    if (!response.ok()) continue;
    const digest = createHash('sha1').update(await response.body()).digest('hex');
    if (seen.has(digest)) continue;
    seen.add(digest);
    picked.push(row);
    if (picked.length >= count) break;
  }
  return picked;
}

async function registerSeller(request: APIRequestContext): Promise<Session> {
  const suffix = randomUUID();
  const password = `GateSeed-${suffix}!7`;
  const store_name = `Gate Seed Store ${suffix.slice(0, 8)}`;
  const payload = {
    email: `gate-seed-${suffix}@example.test`,
    full_name: 'Gate Fixture Seller',
    password,
    password_confirm: password,
    role: 'seller',
    store_name,
    mobile: `09${Math.floor(100_000_000 + Math.random() * 900_000_000)}`,
  };
  const response = await request.post(apiUrl('/auth/register/'), { data: payload });
  if (!response.ok()) throw new Error(`could not register seed seller: ${await response.text()}`);
  const data = await response.json();
  if (!data.tokens?.access) throw new Error('seed seller response had no access token');
  return { access: data.tokens.access, email: payload.email, password, store_name };
}

const fixturePngByVariant = new Map<number, Buffer>();
async function validFixturePng(variant = 0): Promise<Buffer> {
  const cached = fixturePngByVariant.get(variant);
  if (cached) return cached;
  if (!existsSync(AVATAR_SRC)) throw new Error(`fixture source image missing: ${AVATAR_SRC}`);
  const { stdout } = await runExecFile(
    PYTHON_EXE,
    ['-c', FIXTURE_SCRIPT, AVATAR_SRC, String(variant)],
    {
      cwd: BACKEND_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  const png = Buffer.from(stdout.trim(), 'base64');
  if (png.length < 1000) throw new Error('generated fixture PNG was empty');
  fixturePngByVariant.set(variant, png);
  return png;
}

function csvRow(fields: Record<string, string>) {
  return CSV_HEADER.split(',')
    .map((key) => {
      const value = fields[key] ?? '';
      return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    })
    .join(',');
}

function fixtureRow(
  name: string,
  category: string,
  size: string,
  index: number,
): Record<string, string> {
  return {
    name,
    description: `Live gate fixture restored through the approved seller CSV seeding path (${name}).`,
    category,
    size,
    // Neutral undertone + medium default contrast/shade makes these fixtures
    // rank highly enough to appear in the first recommendation page. This is
    // fixture setup only; scoring logic is untouched.
    // Declared color stays White so the FR-4.7 image-alignment check passes;
    // the family is gray, which is compatible with the neutral avatar
    // undertone and keeps the fixture high in the ranked recommendation list.
    color: 'White',
    color_description: 'Medium gray',
    color_family: 'gray',
    price: '599.00',
    style_tags: 'casual',
    front_image_filename: `front-${index}.png`,
    rear_image_filename: `rear-${index}.png`,
  };
}

async function uploadRows(request: APIRequestContext, rows: Array<Record<string, string>>) {
  const seller = await registerSeller(request);
  const csv = [CSV_HEADER, ...rows.map(csvRow)].join('\n');
  const form = new FormData();
  form.append('csv_file', new Blob([csv], { type: 'text/csv' }), 'gate-fixtures.csv');
  for (const [index] of rows.entries()) {
    // Distinct variants are required so TO-002 can prove a visible garment
    // switch; identical bytes would leave the canvas signature unchanged.
    const png = await validFixturePng(index % 4);
    form.append('images', new Blob([png], { type: 'image/png' }), `front-${index + 1}.png`);
    form.append('images', new Blob([png], { type: 'image/png' }), `rear-${index + 1}.png`);
  }
  const response = await fetch(apiUrl('/catalog/upload/'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${seller.access}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`gate fixture upload failed: ${response.status} ${text}`);
  const body = JSON.parse(text) as { batch_id: string; status: string };
  if (!body.batch_id) throw new Error(`gate fixture upload had no batch_id: ${text}`);
  return { seller, batchId: body.batch_id };
}

async function waitForBatch(
  request: APIRequestContext,
  access: string,
  batchId: string,
  timeoutMs = 180_000,
): Promise<Record<string, any>> {
  const started = Date.now();
  let polls = 0;
  let report: Record<string, any> | undefined;
  while (Date.now() - started < timeoutMs) {
    polls += 1;
    const response = await request.get(
      apiUrl(`/catalog/batch-report/?batch_id=${encodeURIComponent(batchId)}`),
      { headers: { Authorization: `Bearer ${access}` } },
    );
    if (!response.ok()) throw new Error(`batch report failed: ${await response.text()}`);
    report = await response.json();
    if (report.status === 'completed' || report.status === 'failed') {
      return { ...report, elapsed_ms: Date.now() - started, polls };
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`batch ${batchId} never completed (last=${JSON.stringify(report)})`);
}

function active(rows: GateCatalogRow[]) {
  return rows.filter((row) => String(row.status).toLowerCase() === 'active');
}

function categoryRows(rows: GateCatalogRow[], category: string, size?: string) {
  return active(rows).filter(
    (row) =>
      String(row.category).toLowerCase() === category &&
      (!size || String(row.size).toUpperCase() === size),
  );
}

function uniqueByName(rows: GateCatalogRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.name, (counts.get(row.name) ?? 0) + 1));
  return rows.filter((row) => counts.get(row.name) === 1 && Boolean(row.front_image));
}

function first(rows: GateCatalogRow[], label: string): GateCatalogRow {
  const row = rows[0];
  if (!row) throw new Error(`no active catalog fixture for ${label}`);
  return row;
}

/** Gate fixtures are deliberately given score 7 so they share recommendation
 *  page 1; TO-005 times the click->canvas interval, so page navigation must not
 *  be counted as garment-render latency. */
function preferGateFixtures(a: GateCatalogRow, b: GateCatalogRow) {
  const rank = (row: GateCatalogRow) => {
    if (row.name.startsWith('TO Gate A')) return 2;
    if (row.name.startsWith('TO Gate')) return 1;
    return 0;
  };
  return rank(b) - rank(a) || b.name.localeCompare(a.name);
}

function catalogCounts(rows: GateCatalogRow[]) {
  return {
    total_active: active(rows).length,
    active_m_tops: categoryRows(rows, 'tops', 'M').length,
    active_m_bottoms: categoryRows(rows, 'bottoms', 'M').length,
    active_m_dresses: categoryRows(rows, 'dresses', 'M').length,
    active_s_items: active(rows).filter((row) => String(row.size).toUpperCase() === 'S').length,
    active_s_dresses: categoryRows(rows, 'dresses', 'S').length,
  };
}

async function writeArtifact(
  suite: 'tryon-tests' | 'avatar-tests',
  payload: Record<string, unknown>,
) {
  const dir = resolve(EVIDENCE_DIR, suite);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `gate-fixture-seed-${stamp}-${randomUUID().slice(0, 6)}.json`;
  await writeFile(resolve(dir, name), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return `docs/evidence/${suite}/${name}`;
}

function seedingBase(reason: string, before: Record<string, number>): GateSeedingRecord {
  return {
    seeding_occurred: false,
    mechanism:
      'KAN-40/KAN-100 staging seed pattern: seller CSV upload via /catalog/upload/ (test-only precondition setup, no app change)',
    reason,
    catalog_before: before,
    catalog_after: before,
    seeded_names: [],
  };
}

/** Ensure every live precondition used by TO-001..TO-011 is present. */
export async function ensureToFixtures(request: APIRequestContext): Promise<ToFixtureResult> {
  const beforeRows = await listCatalog(request);
  const before = catalogCounts(beforeRows);
  const seeding = seedingBase('TO catalog preconditions for M tops, M bottoms, M dress and S dress', before);
  const suffix = randomUUID().slice(0, 8);
  const rowsToSeed: Array<Record<string, string>> = [];
  const seededNames: string[] = [];

  const recommended = await recommendedNames(request);
  const uniqueTops = uniqueByName(categoryRows(beforeRows, 'tops', 'M')).filter((row) =>
    recommended.has(row.name),
  );
  const gateTops = uniqueTops
    .filter((row) => row.name.startsWith('TO Gate'))
    .sort(preferGateFixtures);
  const distinctGateTops = await distinctByImageContent(request, gateTops, 2);
  if (distinctGateTops.length < 2) {
    ['Top A', 'Top B'].forEach((label) => {
      const name = `TO Gate ${label} ${suffix}`;
      rowsToSeed.push(fixtureRow(name, 'tops', 'M', rowsToSeed.length + 1));
      seededNames.push(name);
    });
    seeding.reason += '; seed two high-ranking M tops with distinct images';
  }

  const bottomPrefix = 'TO Gate A Bottom';
  if (!uniqueByName(categoryRows(beforeRows, 'bottoms', 'M')).some((row) => row.name.startsWith(bottomPrefix))) {
    const name = `${bottomPrefix} ${suffix}`;
    rowsToSeed.push(fixtureRow(name, 'bottoms', 'M', rowsToSeed.length + 1));
    seededNames.push(name);
    seeding.reason += '; seed one high-ranking M bottom';
  }

  const dressPrefix = 'TO Gate A One Piece Dress';
  if (!uniqueByName(categoryRows(beforeRows, 'dresses', 'M')).some((row) => row.name.startsWith(dressPrefix))) {
    const name = `${dressPrefix} ${suffix}`;
    rowsToSeed.push(fixtureRow(name, 'dresses', 'M', rowsToSeed.length + 1));
    seededNames.push(name);
    seeding.reason += '; seed one high-ranking M one-piece';
  }

  const guestPrefix = 'TO Gate A Guest Dress S';
  if (!uniqueByName(categoryRows(beforeRows, 'dresses', 'S')).some((row) => row.name.startsWith(guestPrefix))) {
    const name = `${guestPrefix} ${suffix}`;
    rowsToSeed.push(fixtureRow(name, 'dresses', 'S', rowsToSeed.length + 1));
    seededNames.push(name);
    seeding.reason += '; seed one high-ranking S guest one-piece';
  }

  if (rowsToSeed.length) {
    if (rowsToSeed.length > 10) throw new Error('TO fixture batch exceeds the 10-item upload limit');
    const uploaded = await uploadRows(request, rowsToSeed);
    const report = await waitForBatch(request, uploaded.seller.access, uploaded.batchId);
    if (report.status !== 'completed') {
      throw new Error(`gate fixture batch did not complete: ${JSON.stringify(report)}`);
    }
    if (Number(report.accepted_count) !== rowsToSeed.length || Number(report.rejected_count) !== 0) {
      throw new Error(`gate fixture batch was not fully accepted: ${JSON.stringify(report)}`);
    }
    seeding.seeding_occurred = true;
    seeding.seeded_names = seededNames;
    seeding.batch = {
      batch_id: uploaded.batchId,
      status: report.status,
      total_items: report.total_items,
      accepted_count: report.accepted_count,
      rejected_count: report.rejected_count,
      elapsed_ms: report.elapsed_ms,
      polls: report.polls,
      seller_email: uploaded.seller.email,
      store_name: uploaded.seller.store_name,
    };
  }

  const afterRows = await listCatalog(request);
  seeding.catalog_after = catalogCounts(afterRows);
  const recommendedAfter = await recommendedNames(request);
  const tops = await distinctByImageContent(
    request,
    uniqueByName(categoryRows(afterRows, 'tops', 'M'))
      .filter((row) => recommendedAfter.has(row.name))
      .sort(preferGateFixtures),
    2,
  );
  if (tops.length < 2) throw new Error('need two recommended M tops with different images');
  const bottoms = uniqueByName(categoryRows(afterRows, 'bottoms', 'M')).sort(preferGateFixtures);
  const mDresses = uniqueByName(categoryRows(afterRows, 'dresses', 'M')).sort(preferGateFixtures);
  const sDresses = uniqueByName(categoryRows(afterRows, 'dresses', 'S')).sort(preferGateFixtures);
  const targets: GateTargets = {
    topA: first(tops, 'active unique M top A'),
    topB: first(tops.filter((row) => row.id !== tops[0].id), 'active unique M top B'),
    bottom: first(bottoms, 'active unique M bottom'),
    dress: first(mDresses, 'active unique M one-piece'),
    guestDress: first(sDresses, 'active unique S one-piece'),
  };
  seeding.artifact = await writeArtifact('tryon-tests', {
    generated_at: new Date().toISOString(),
    ...seeding,
    targets: Object.fromEntries(
      Object.entries(targets).map(([key, row]) => [
        key,
        { id: row.id, name: row.name, category: row.category, size: row.size, status: row.status },
      ]),
    ),
  });
  return { seeding, targets };
}

/** AV-011 precondition: an active size-S garment in the S body-build band. */
export async function ensureSizeSFixture(request: APIRequestContext): Promise<SizeSFixtureResult> {
  const beforeRows = await listCatalog(request, 'S');
  const before = catalogCounts(beforeRows);
  const seeding = seedingBase('AV-011 requires an active size-S garment', before);
  const prefix = 'AV Gate S Top';
  const name = `${prefix} ${randomUUID().slice(0, 8)}`;

  const candidates = uniqueByName(
    active(beforeRows).filter((row) => String(row.size).toUpperCase() === 'S' && Boolean(row.front_image)),
  ).filter((row) => row.name.startsWith(prefix));
  if (!candidates.length) {
    const row = fixtureRow(name, 'tops', 'S', 1);
    const uploaded = await uploadRows(request, [row]);
    const report = await waitForBatch(request, uploaded.seller.access, uploaded.batchId);
    if (report.status !== 'completed' || Number(report.accepted_count) !== 1) {
      throw new Error(`size-S seeding batch was not fully accepted: ${JSON.stringify(report)}`);
    }
    seeding.seeding_occurred = true;
    seeding.seeded_names = [name];
    seeding.batch = {
      batch_id: uploaded.batchId,
      status: report.status,
      total_items: report.total_items,
      accepted_count: report.accepted_count,
      rejected_count: report.rejected_count,
      elapsed_ms: report.elapsed_ms,
      polls: report.polls,
      seller_email: uploaded.seller.email,
      store_name: uploaded.seller.store_name,
    };
  }

  const afterRows = await listCatalog(request, 'S');
  seeding.catalog_after = catalogCounts(afterRows);
  const afterCandidates = uniqueByName(
    active(afterRows).filter((row) => String(row.size).toUpperCase() === 'S' && Boolean(row.front_image)),
  );
  const garment = afterCandidates.find((row) => row.name.startsWith(prefix)) ?? first(afterCandidates, 'active size-S garment');
  seeding.artifact = await writeArtifact('avatar-tests', {
    generated_at: new Date().toISOString(),
    garment: { id: garment.id, name: garment.name, size: garment.size, status: garment.status },
    ...seeding,
  });
  return { seeding, garment };
}
