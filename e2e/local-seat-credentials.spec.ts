/**
 * LSC-2P packaged local-seat proof (roadmap Step 2 done-test).
 *
 * Mode A: the operator installs the NSIS build and starts the installed app.
 * This spec attaches to http://127.0.0.1:3001 with three Chromium persistent
 * profiles (gm, p1, p2). State changes happen only through clicks in the
 * shipped UI; the harness itself issues public GETs (plus the N2 negative
 * probes). Everything it writes lives under LSC2P_RUN_DIR.
 *
 * Order (serial): S0, S1a, S1b, S2, S4, S5a, S5c, N1-N4, N6, S3 (@soak; ends with N5),
 * S7a-S7c, then S5b (variant b, test-only). Every test but S3 fits the unchanged 30 s
 * timeout; S3 alone overrides it (owner ruling Q2).
 *
 * @tags @coop @multiplayer @packaged
 */

import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ORIGIN = 'http://127.0.0.1:3001';
const NAMES = ['gm', 'p1', 'p2'] as const;
type ProfileName = (typeof NAMES)[number];
const CHOICE_OF = { gm: 'primary', p1: 'seat1', p2: 'seat2' } as const;
const PID_RE = /^pid_[1-9A-HJ-NP-Za-km-z]+$/;
const RENEWAL_WINDOW_MS = 4 * 60 * 1000;
const REFUSED = 'Local seat credentials were refused.';
const THROTTLED = 'Local seat requests are throttled.';
const RENEWAL_REGION = 'Co-op sign-in renewal and recovery';
const FORGET_MATCH = 'Forget choice and match sign-in; return to co-op entry';
const ENV_NAMES = [
  'LSC2P_INSTALLER',
  'LSC2P_INSTALLER_SHA256',
  'LSC2P_INSTALL_DIR',
  'LSC2P_RC_SHA',
  'LSC2P_RUN_DIR',
] as const;
/** Launcher variables that must never reach the authority (it inherits them). */
const SCRUB = [
  'NEXT_PUBLIC_E2E_MODE',
  'PLAYWRIGHT_E2E_RUN_ID',
  'MEKSTATION_E2E_SERVER_COMMAND',
  'MULTIPLAYER_STORE',
  'MULTIPLAYER_DB_PATH',
  'DATABASE_PATH',
  'PORT',
  'HOSTNAME',
  'NODE_ENV',
  'ELECTRON_RUN_AS_NODE',
];

interface IObservation {
  timestamp: string;
  status: 'PASS';
  description: string;
}
interface IRun {
  id: string;
  startedAt: string;
  endedAt: string | null;
  result: 'PASS' | 'FAIL';
  observations: IObservation[];
  artifacts: string[];
}
interface IPublicState {
  choice: string | null;
  joined: { matchId: string; choice: string; playerId: string }[];
  bearers: {
    matchId: string;
    playerId: string;
    issuedAt: number | null;
    expiresAt: number | null;
  }[];
}
interface ISeat {
  seatId: string;
  status: string;
  label: string | null;
  playerId: string | null;
  generation: number;
}

/** Module state: passwords exist only here and are never written anywhere. */
const S = {
  contexts: {} as Partial<Record<ProfileName, BrowserContext>>,
  pages: {} as Partial<Record<ProfileName, Page>>,
  passwords: {} as Record<string, string>,
  submits: { gm: 0, p1: 0, p2: 0 } as Record<ProfileName, number>,
  posts: { gm: [], p1: [], p2: [] } as Record<ProfileName, string[]>,
  requestUrls: [] as string[],
  consoleLines: [] as string[],
  runs: new Map<string, IRun>(),
  ids: {} as Record<string, string>,
  roomCode: '',
  matchId: '',
  campaignPath: '',
  t0: 0,
  identity: {} as Record<string, unknown>,
  timeline: { gm: {}, p1: {} } as Record<string, Record<string, string>>,
  reprovision: {
    seat2PlayerIds: [] as string[],
    ghostMembershipObserved: false,
    removalUi: 'unknown',
  },
  restart: {
    seatsUnchanged: null as boolean | null,
    idsUnchanged: null as boolean | null,
    matchRecovered: 'unknown',
    inMemoryPlayerStoreWarning: 'unknown',
  },
  gaps: [
    'Playwright cannot observe a browser password-manager prompt (Step 8 human item)',
    'Installer is unsigned (Authenticode NotSigned)',
    'Windows x64 NSIS only',
    'Pre-RC installer: Step 8 must bind the RC bytes',
  ],
  artifacts: [] as string[],
};

// ---------------------------------------------------------------- environment

function cfg() {
  const missing = ENV_NAMES.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing environment: ${missing.join()}`);
  const e = (n: (typeof ENV_NAMES)[number]) => process.env[n] as string;
  const runDir = path.resolve(e('LSC2P_RUN_DIR'));
  return {
    installer: path.resolve(e('LSC2P_INSTALLER')),
    installerSha: e('LSC2P_INSTALLER_SHA256').toLowerCase(),
    installDir: path.resolve(e('LSC2P_INSTALL_DIR')),
    rcSha: e('LSC2P_RC_SHA').toLowerCase(),
    runDir,
    userData: path.join(runDir, 'userdata'),
    exe: path.join(path.resolve(e('LSC2P_INSTALL_DIR')), 'MekStation.exe'),
  };
}

const now = () => new Date().toISOString();
const same = (a: string, b: string) =>
  path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const under = (child: string | null | undefined, dir: string) =>
  !!child &&
  path
    .resolve(child)
    .toLowerCase()
    .startsWith(`${path.resolve(dir).toLowerCase()}${path.sep}`);
const secret = () => `Aa1!${randomBytes(12).toString('base64url')}`;

function ps(script: string): string {
  return execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
  ).trim();
}
const q = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file))
    hash.update(chunk as Buffer);
  return hash.digest('hex');
}

interface IListener {
  address: string;
  pid: number;
  path: string | null;
  commandLine: string | null;
  parentPid: number;
  parentCommandLine: string | null;
}
function listeners(port: number): IListener[] {
  const out = ps(
    `$r=@(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$_.OwningProcess); $q=$null; if($p){$q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId)}; [pscustomobject]@{address=$_.LocalAddress;pid=[int]$_.OwningProcess;path=$p.ExecutablePath;commandLine=$p.CommandLine;parentPid=[int]$p.ParentProcessId;parentCommandLine=$q.CommandLine} }); ConvertTo-Json -InputObject $r -Compress -Depth 3`,
  );
  return out ? (JSON.parse(out) as IListener[]) : [];
}
function mekStationImages(): string[] {
  const out = ps(
    `$r=@(Get-CimInstance Win32_Process -Filter "Name='MekStation.exe'" | ForEach-Object { $_.ExecutablePath }); ConvertTo-Json -InputObject $r -Compress`,
  );
  return out ? (JSON.parse(out) as string[]) : [];
}

/** Public data only; the harness never mutates through this path. */
async function publicGet(
  p: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${ORIGIN}${p}`, {
    method: 'GET',
    cache: 'no-store',
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function seatList(): Promise<ISeat[]> {
  const { status, body } = await publicGet('/api/multiplayer/auth/local-seats');
  expect(status).toBe(200);
  return (body as { seats: ISeat[] }).seats;
}

// ------------------------------------------------------------------- records

function begin(id: string): IRun {
  const run: IRun = {
    id,
    startedAt: now(),
    endedAt: null,
    result: 'FAIL',
    observations: [],
    artifacts: [],
  };
  S.runs.set(id, run);
  return run;
}
function ok(run: IRun, description: string): void {
  run.observations.push({ timestamp: now(), status: 'PASS', description });
}
function done(run: IRun): void {
  run.result = 'PASS';
  run.endedAt = now();
  flushRecord();
}
function note(id: string, description: string): void {
  const run = S.runs.get(id);
  if (run) ok(run, description);
}

/** Pretty to depth 2, one line below it, so the pasted record stays short. */
function compact(value: unknown, depth = 0): string {
  if (depth >= 2 || value === null || typeof value !== 'object')
    return JSON.stringify(value);
  const pad = '  '.repeat(depth + 1);
  const rows = Array.isArray(value)
    ? value.map((v) => compact(v, depth + 1))
    : Object.entries(value).map(
        ([k, v]) => `${JSON.stringify(k)}: ${compact(v, depth + 1)}`,
      );
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return rows.length
    ? `${open}\n${pad}${rows.join(`,\n${pad}`)}\n${'  '.repeat(depth)}${close}`
    : `${open}${close}`;
}

function scenarioRecord(id: string) {
  const group = id === 'S6' ? ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'] : [id];
  const runs = group.map((g) => S.runs.get(g));
  const passed = runs.every((r) => r?.result === 'PASS');
  const first = runs.find(Boolean);
  return {
    id,
    result: passed ? 'PASS' : runs.some(Boolean) ? 'FAIL' : 'NOT RUN',
    startedAt: first?.startedAt ?? null,
    endedAt: runs.filter(Boolean).at(-1)?.endedAt ?? null,
    observations: runs.flatMap((r) => r?.observations ?? []),
    artifacts: runs.flatMap((r) => r?.artifacts ?? []),
  };
}

function buildRecord() {
  const c = cfg();
  const scenarios = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].map(
    scenarioRecord,
  );
  const s5b = S.runs.get('S5b');
  return {
    kind: 'local-seat-proof',
    rcSha: c.rcSha,
    run: {
      startedAt: S.runs.get('S0')?.startedAt ?? null,
      endedAt: now(),
      t0MintAt: S.t0 ? new Date(S.t0).toISOString() : null,
      attempt: 1,
    },
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
      playwright: (
        JSON.parse(
          fs.readFileSync(
            path.join(
              process.cwd(),
              'node_modules/@playwright/test/package.json',
            ),
            'utf8',
          ),
        ) as { version: string }
      ).version,
    },
    installer: S.identity.installer,
    installed: S.identity.installed,
    publicIdentities: [
      { profile: 'gm', choice: 'primary', playerId: S.ids.gm },
      { profile: 'p1', choice: 'seat1', playerId: S.ids.seat1 },
      { profile: 'p2', choice: 'seat2', playerId: S.ids.seat2 },
    ],
    reprovision: {
      ...S.reprovision,
      freeSeatCampaign: s5b ? scenarioRecord('S5b') : 'not run',
    },
    timeline: S.timeline,
    scenarios,
    observations: scenarios.flatMap((s) =>
      s.observations.map((o) => ({ ...o, scenario: s.id })),
    ),
    restart: S.restart,
    gaps: S.gaps,
    operator: {
      identity: `${os.userInfo().username}@${os.hostname()}`,
      kind: process.env.LSC2P_OPERATOR_KIND === 'human' ? 'human' : 'agent',
      attestation:
        'Ran the registered command against the installer with the recorded hash',
    },
    artifacts: Object.fromEntries(
      S.artifacts
        .filter((f) => fs.existsSync(path.join(c.runDir, f)))
        .map((f) => [
          f,
          createHash('sha256')
            .update(fs.readFileSync(path.join(c.runDir, f)))
            .digest('hex'),
        ]),
    ),
    defects: [...S.runs.values()]
      .filter((r) => r.result === 'FAIL')
      .map((r) => ({ scenario: r.id })),
  };
}
function flushRecord(): void {
  const { runDir } = cfg();
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, 'proof-record.json'),
    `${compact(buildRecord())}\n`,
  );
}
function artifact(run: IRun, name: string): string {
  run.artifacts.push(name);
  S.artifacts.push(name);
  return path.join(cfg().runDir, name);
}

// ------------------------------------------------------------------ profiles

function wire(name: ProfileName, ctx: BrowserContext): void {
  ctx.on('request', (req) => {
    const url = new URL(req.url());
    S.requestUrls.push(`${url.pathname}${url.search}`);
    if (
      req.method() === 'POST' &&
      url.pathname.startsWith('/api/multiplayer/auth/')
    )
      S.posts[name].push(url.pathname);
  });
  ctx.on('console', (msg) => S.consoleLines.push(msg.text()));
  ctx.on('weberror', (err) => S.consoleLines.push(String(err.error())));
}
async function openProfile(name: ProfileName): Promise<Page> {
  const ctx = await chromium.launchPersistentContext(
    path.join(cfg().runDir, 'profiles', name),
    {
      headless: true,
      baseURL: ORIGIN,
      viewport: { width: 1280, height: 900 },
    },
  );
  wire(name, ctx);
  S.contexts[name] = ctx;
  S.pages[name] = ctx.pages()[0] ?? (await ctx.newPage());
  return S.pages[name] as Page;
}
const page = (name: ProfileName): Page => S.pages[name] as Page;

/** Counts a click that must cause exactly one auth POST (checked by audit). */
async function submit(name: ProfileName, target: Locator): Promise<void> {
  S.submits[name] += 1;
  await target.click();
}
async function auditPosts(name: ProfileName): Promise<void> {
  await expect
    .poll(() => S.posts[name].length, {
      message: `${name} auth POSTs equal user submits`,
    })
    .toBe(S.submits[name]);
}
const marks = () => ({
  gm: S.posts.gm.length,
  p1: S.posts.p1.length,
  p2: S.posts.p2.length,
});

/** Only public values leave the page: ids, choice and numeric times. */
async function publicState(p: Page): Promise<IPublicState> {
  return p.evaluate(() => {
    const joinedKey = 'mekstation.coopCredential.joined.';
    const bearerKey = 'mekstation.coopCampaign.token.';
    const state: IPublicState = {
      choice: localStorage.getItem('mekstation.coopCredential.choice'),
      joined: [],
      bearers: [],
    };
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) as string;
      const raw = sessionStorage.getItem(key) ?? '';
      try {
        const stored = JSON.parse(raw) as Record<string, unknown>;
        if (key.startsWith(joinedKey)) {
          state.joined.push({
            matchId: String(stored.matchId),
            choice: String(stored.choice),
            playerId: String(stored.playerId),
          });
        } else if (key.startsWith(bearerKey)) {
          let issuedAt: number | null = null;
          let expiresAt: number | null = null;
          for (const v of Object.values(stored)) {
            if (typeof v !== 'string' || v.length < 100) continue;
            try {
              const t = JSON.parse(atob(v)) as Record<string, unknown>;
              if (typeof t.expiresAt === 'string')
                expiresAt = Date.parse(t.expiresAt);
              if (typeof t.issuedAt === 'string')
                issuedAt = Date.parse(t.issuedAt);
            } catch {
              // not an encoded credential
            }
          }
          state.bearers.push({
            matchId: key.slice(bearerKey.length),
            playerId: String(stored.playerId),
            issuedAt,
            expiresAt,
          });
        }
      } catch {
        // unrelated storage entry
      }
    }
    return state;
  });
}
/** Count of bearer-looking strings outside the two per-match keys. */
async function bearerLeaks(p: Page): Promise<number> {
  return p.evaluate(() => {
    const allowed = [
      'mekstation.coopCredential.joined.',
      'mekstation.coopCampaign.token.',
    ];
    const strings: string[] = [location.href, document.body.innerText];
    document.querySelectorAll('*').forEach((el) => {
      for (const a of Array.from(el.attributes)) {
        if (
          a.name === 'href' ||
          a.name === 'value' ||
          a.name.startsWith('data-')
        )
          strings.push(a.value);
      }
    });
    for (let i = 0; i < localStorage.length; i += 1)
      strings.push(localStorage.getItem(localStorage.key(i) as string) ?? '');
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) as string;
      if (!allowed.some((a) => key.startsWith(a)))
        strings.push(sessionStorage.getItem(key) ?? '');
    }
    let hits = 0;
    for (const s of strings) {
      for (const m of s.match(/[A-Za-z0-9+/=_-]{100,}/g) ?? []) {
        try {
          const decoded = atob(m);
          if (
            decoded.includes('"signature"') &&
            decoded.includes('"publicKey"')
          )
            hits += 1;
        } catch {
          // not base64
        }
      }
    }
    return hits;
  });
}
async function checkpointScan(): Promise<void> {
  for (const name of NAMES) {
    if (!S.pages[name]) continue;
    for (const p of S.contexts[name]?.pages() ?? [])
      expect(
        await bearerLeaks(p),
        `${name} exposes no bearer outside its own keys`,
      ).toBe(0);
  }
}

// -------------------------------------------------------------- ordinary UI

async function createVaultIdentity(
  p: Page,
  displayName: string,
  password: string,
): Promise<void> {
  await p.goto('/settings#vault');
  const name = p.getByPlaceholder('Your name or alias');
  if (!(await name.isVisible().catch(() => false)))
    await p.getByText('Vault & Sharing').first().click();
  await name.fill(displayName);
  await p.getByPlaceholder('At least 8 characters').fill(password);
  await p.getByPlaceholder('Confirm your password').fill(password);
  await p.getByRole('button', { name: 'Create Identity' }).click();
  await expect(p.getByText('Create Your Vault Identity')).toHaveCount(0, {
    timeout: 20_000,
  });
}
async function openEntry(p: Page): Promise<void> {
  await p.goto('/gameplay/campaigns');
  await expect(p.getByTestId('create-coop-campaign-btn')).toBeEnabled({
    timeout: 20_000,
  });
}
async function createCoopCampaign(
  name: ProfileName,
  password: string,
): Promise<{ roomCode: string; url: string }> {
  const p = page(name);
  await openEntry(p);
  await p.getByTestId('create-coop-password-input').fill(password);
  await submit(name, p.getByTestId('create-coop-campaign-btn'));
  await p.waitForURL(/\/gameplay\/campaigns\/[^/?#]+$/, { timeout: 30_000 });
  const roomCode = (
    (await p
      .getByTestId('coop-session-room-code')
      .textContent({ timeout: 20_000 })) ?? ''
  ).trim();
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  return { roomCode, url: new URL(p.url()).pathname };
}
async function openSeatPanel(p: Page): Promise<void> {
  const toggle = p.getByRole('button', { name: 'Manage local seats' });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true')
    await toggle.click();
  await expect(
    p.getByRole('list', { name: 'Local seat states' }),
  ).toBeVisible();
}
async function seatRow(p: Page, seatId: string): Promise<string> {
  return (
    (await p
      .getByRole('list', { name: 'Local seat states' })
      .getByText(`${seatId}:`)
      .textContent()) ?? ''
  );
}
const rowId = (row: string) =>
  /playerId: (pid_[1-9A-HJ-NP-Za-km-z]+)/.exec(row)?.[1] ?? '';
const rowGeneration = (row: string) =>
  Number(/generation: (\d+)/.exec(row)?.[1] ?? NaN);

/** Operator-panel write: provision or revoke through the shipped panel. */
async function operatorWrite(
  action: 'provision' | 'revoke',
  seatId: string,
  input: { label?: string; seatPassword?: string; confirm?: boolean },
): Promise<string> {
  const p = page('gm');
  await openSeatPanel(p);
  await p
    .getByRole('combobox', { name: 'Local seat', exact: true })
    .selectOption(seatId);
  if (action === 'provision')
    await p.getByLabel('Seat label').fill(input.label ?? '');
  const confirmLabel = p.locator('label', {
    hasText: 'Re-provisioning gives this seat a new identity.',
  });
  const confirm = confirmLabel.getByRole('checkbox');
  if (input.confirm && (await confirm.count())) await confirm.check();
  const operatorField = p.getByLabel('Primary vault password');
  await operatorField.fill(S.passwords.gm);
  if (action === 'provision')
    await p.getByLabel('New seat password').fill(input.seatPassword ?? '');
  const button = p.getByRole('button', {
    name:
      action === 'revoke'
        ? 'Revoke seat'
        : /^(Provision seat|Re-provision seat \(new identity\))$/,
  });
  await submit('gm', button);
  await expect(operatorField).toHaveValue('');
  const alert = p
    .getByRole('alert')
    .filter({ hasText: /^Local seat |refused|Confirm|Seat changed/ });
  await expect(alert.first()).toBeVisible({ timeout: 15_000 });
  return ((await alert.first().textContent()) ?? '').trim();
}

type Choice = 'Primary vault identity' | 'Local seat 1' | 'Local seat 2';
async function openJoin(p: Page): Promise<Locator> {
  await openEntry(p);
  await p.getByTestId('join-coop-campaign-btn').click();
  const dialog = p.getByTestId('join-coop-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}
/** Chooser + room code + password; returns the dialog for the caller to read. */
async function join(
  name: ProfileName,
  p: Page,
  roomCode: string,
  password: string,
  choice: Choice,
  shot?: string,
): Promise<Locator> {
  const dialog = await openJoin(p);
  await dialog
    .getByLabel('This browser profile joins as')
    .selectOption({ label: choice });
  if (shot) {
    await dialog
      .getByRole('button', { name: 'Show / refresh local seat availability' })
      .click();
    await expect(
      dialog.getByRole('list', { name: 'Public local seat availability' }),
    ).toBeVisible();
    await p.screenshot({ path: shot });
  }
  await dialog.getByTestId('join-coop-room-code-input').fill(roomCode);
  const field = dialog.getByTestId('join-coop-password-input');
  await field.fill(password);
  await submit(name, dialog.getByTestId('join-coop-submit-btn'));
  await expect(field).toHaveValue('');
  return dialog;
}
/** Join and wait for the guest campaign route; returns the public playerId. */
async function joinedAs(
  name: ProfileName,
  p: Page,
  roomCode: string,
  password: string,
  choice: Choice,
  shot?: string,
): Promise<string> {
  await join(name, p, roomCode, password, choice, shot);
  await p.waitForURL(/\/gameplay\/campaigns\/[^/?#]+$/, { timeout: 30_000 });
  await expect(p.getByTestId('coop-session-badge')).toContainText('Guest', {
    timeout: 20_000,
  });
  const state = await publicState(p);
  expect(state.joined).toHaveLength(1);
  return state.joined[0].playerId;
}
async function cancelJoin(p: Page): Promise<void> {
  await p.getByTestId('join-coop-cancel-btn').click();
  await expect(p.getByTestId('join-coop-dialog')).toHaveCount(0);
}

// ----------------------------------------------------------------- scenarios

// G-P3: the dialog never shows the host's close reason (campaign-tactical-seats-full);
// it times out waiting for the snapshot. The reason appears only in the server log.
const HOST_REFUSAL = /Timed out waiting for the host campaign snapshot/;
const paths: Partial<Record<ProfileName, string>> = {};

test.describe('LSC-2P packaged local-seat proof', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    process.env.LSC2P_PACKAGED !== '1',
    'Runs only through playwright.local-seat-packaged.config.ts',
  );

  test.afterAll(async () => {
    await finalize();
  });

  test('S0 installed artifact identity and clean single authority', async () => {
    const run = begin('S0');
    expect(process.platform, 'S0 is Windows only').toBe('win32');
    const c = cfg();
    expect(c.rcSha).toMatch(/^[a-f0-9]{40}$/);
    expect(path.basename(c.installer)).toMatch(/^MekStation-.+-win-x64\.exe$/);
    const installerSha = await sha256File(c.installer);
    expect(installerSha, 'operator hash cross-check').toBe(c.installerSha);
    const authenticode = ps(
      `(Get-AuthenticodeSignature -LiteralPath ${q(c.installer)}).Status.ToString()`,
    );
    ok(
      run,
      `installer ${path.basename(c.installer)} sha256 ${installerSha} authenticode ${authenticode}`,
    );

    const found = listeners(3001);
    expect(found, 'exactly one listener on 3001').toHaveLength(1);
    const [listener] = found;
    expect(listener.address, 'loopback bind').toBe('127.0.0.1');
    expect(
      under(listener.path, c.installDir),
      'listener image is under the install dir',
    ).toBe(true);
    expect(path.basename(listener.path ?? '').toLowerCase()).toBe(
      'mekstation.exe',
    );
    expect(listeners(3600), 'no dev server on 3600').toHaveLength(0);
    for (const image of mekStationImages())
      expect(
        under(image, c.installDir),
        'every MekStation.exe is the installed one',
      ).toBe(true);
    expect(
      (listener.parentCommandLine ?? '').toLowerCase(),
      'authority uses the run user-data dir',
    ).toContain(`--user-data-dir=${c.userData}`.toLowerCase());
    ok(
      run,
      `one listener 127.0.0.1:3001 pid ${listener.pid} image ${path.basename(listener.path ?? '')} under the install dir`,
    );

    const exeSha256 = await sha256File(c.exe);
    const productVersion = ps(
      `(Get-Item -LiteralPath ${q(c.exe)}).VersionInfo.ProductVersion`,
    );
    const seats = await seatList();
    expect(seats.map((s) => s.seatId)).toEqual([
      'local-seat-1',
      'local-seat-2',
    ]);
    for (const seat of seats) {
      expect(seat.status, 'authority not fresh').toBe('unprovisioned');
      expect(seat.generation).toBe(0);
    }
    expect(
      fs.existsSync(path.join(c.userData, 'data', 'multiplayer-matches.db')),
      'match store follows the run dir',
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          c.installDir,
          'resources',
          'next-standalone',
          'data',
          'multiplayer-matches.db',
        ),
      ),
      'install-dir match store untouched',
    ).toBe(false);
    expect(
      fs.existsSync(path.join(c.runDir, 'profiles')),
      'fresh run dir',
    ).toBe(false);
    ok(
      run,
      'both local seats unprovisioned at generation 0; match store lives in the run dir',
    );

    S.identity = {
      installer: {
        filename: path.basename(c.installer),
        sha256: installerSha,
        sizeBytes: fs.statSync(c.installer).size,
        authenticode,
        productVersion: ps(
          `(Get-Item -LiteralPath ${q(c.installer)}).VersionInfo.ProductVersion`,
        ),
      },
      installed: {
        exeSha256,
        productVersion,
        authorityUrl: ORIGIN,
        listener: {
          pid: listener.pid,
          imageUnderInstallDir: true,
          bind: listener.address,
        },
        freshAuthority: true,
      },
    };
    fs.writeFileSync(
      artifact(run, 'installer.sha256.txt'),
      `${installerSha}  ${path.basename(c.installer)}\n`,
    );
    done(run);
  });

  test('S1a GM identity, campaign and seat provisioning', async () => {
    const run = begin('S1');
    for (const name of NAMES) await openProfile(name);
    S.passwords = {
      gm: secret(),
      seat1: secret(),
      seat2: secret(),
      seat2b: secret(),
      seat2c: secret(),
    };
    await createVaultIdentity(page('gm'), 'LSC2P GM', S.passwords.gm);
    ok(run, 'GM created the vault identity from Settings');
    const created = await createCoopCampaign('gm', S.passwords.gm);
    S.roomCode = created.roomCode;
    S.campaignPath = paths.gm = created.url;
    const gm = await publicState(page('gm'));
    expect(gm.joined).toHaveLength(1);
    expect(gm.joined[0].choice).toBe('primary');
    S.matchId = gm.joined[0].matchId;
    S.ids.gm = gm.joined[0].playerId;
    S.t0 = gm.bearers[0].issuedAt ?? Date.now();
    await expect(page('gm').getByTestId('coop-session-badge')).toContainText(
      'Host',
    );
    await expect(page('gm').getByTestId('host-gm-review-surface')).toBeVisible({
      timeout: 20_000,
    });
    ok(
      run,
      `GM created the co-op campaign, room code captured, GM playerId ${S.ids.gm}`,
    );

    await openEntry(page('gm'));
    expect(
      await operatorWrite('provision', 'local-seat-1', {
        label: 'Player 1',
        seatPassword: S.passwords.seat1,
      }),
    ).toBe('Local seat provision completed.');
    expect(
      await operatorWrite('provision', 'local-seat-2', {
        label: 'Player 2',
        seatPassword: S.passwords.seat2,
      }),
    ).toBe('Local seat provision completed.');
    const row1 = await seatRow(page('gm'), 'local-seat-1');
    const row2 = await seatRow(page('gm'), 'local-seat-2');
    expect(row1).toMatch(
      /local-seat-1: active; label: Player 1; playerId: pid_/,
    );
    expect(row2).toMatch(
      /local-seat-2: active; label: Player 2; playerId: pid_/,
    );
    await page('gm').screenshot({ path: artifact(run, 's1-gm.png') });
    ok(run, 'GM provisioned both seats through the operator panel');
  });

  test('S1b players join through the chooser with distinct public ids', async () => {
    const run = S.runs.get('S1') as IRun;
    const seatsBefore = await seatList();
    S.ids.seat1 = await joinedAs(
      'p1',
      page('p1'),
      S.roomCode,
      S.passwords.seat1,
      'Local seat 1',
      artifact(run, 's1-p1.png'),
    );
    S.ids.seat2 = await joinedAs(
      'p2',
      page('p2'),
      S.roomCode,
      S.passwords.seat2,
      'Local seat 2',
      artifact(run, 's1-p2.png'),
    );
    paths.p1 = new URL(page('p1').url()).pathname;
    paths.p2 = new URL(page('p2').url()).pathname;
    expect(seatsBefore[0].playerId).toBe(S.ids.seat1);
    expect(seatsBefore[1].playerId).toBe(S.ids.seat2);
    const listed = await seatList();
    expect(listed.map((s) => s.playerId)).toEqual([S.ids.seat1, S.ids.seat2]);
    const ids = [S.ids.gm, S.ids.seat1, S.ids.seat2];
    for (const id of ids) expect(id).toMatch(PID_RE);
    expect(new Set(ids).size, 'three pairwise-distinct public playerIds').toBe(
      3,
    );
    for (const name of ['p1', 'p2'] as const) {
      expect((await publicState(page(name))).joined[0].choice).toBe(
        CHOICE_OF[name],
      );
      await expect(
        page(name).getByTestId('host-gm-review-surface'),
      ).toHaveCount(0);
    }
    expect(
      (await publicState(page('gm'))).choice,
      'GM keeps the default choice',
    ).toBeNull();
    await auditAll();
    await checkpointScan();
    ok(
      run,
      `P1 joined as ${S.ids.seat1}, P2 as ${S.ids.seat2}; three distinct ids; host surfaces only on the GM`,
    );
    done(run);
  });

  test('S2 reload and reconnect keep identity', async () => {
    const run = begin('S2');
    // a. plain reload: the stored bearer and binding survive, nothing mints.
    for (const name of NAMES) {
      const p = page(name);
      await p.goto(paths[name] as string);
      await expect(p.getByTestId('coop-session-badge')).toBeVisible({
        timeout: 20_000,
      });
      const before = await publicState(p);
      const posted = S.posts[name].length;
      await p.reload();
      await expect(p.getByTestId('coop-session-badge')).toBeVisible({
        timeout: 20_000,
      });
      const after = await publicState(p);
      expect(after.joined, `${name} binding survives reload`).toEqual(
        before.joined,
      );
      expect(after.bearers.map((b) => b.playerId)).toEqual(
        before.bearers.map((b) => b.playerId),
      );
      await expect(p.locator('input[type=password]')).toHaveCount(0);
      expect(S.posts[name].length, `${name} reload mints nothing`).toBe(posted);
      ok(
        run,
        `${name}: reload kept ${before.joined[0].playerId} with no mint and no prompt`,
      );
    }

    // b. Transport drop (G-P2): the real socket is routed through and its page side
    // is closed. LSC-2 does not reconnect a closed socket by itself, so the claims
    // are: no silent re-mint, no prompt, same identity, and an explicit reload
    // reconnects with the stored bearer. Authority restart is covered by S7.
    const drops = await Promise.all(
      NAMES.map(async (name) => {
        const p = page(name);
        const hold = {
          sockets: 0,
          closed: 0,
          drop: null as null | (() => void),
        };
        const id = (await publicState(p)).joined[0].playerId;
        const posted = S.posts[name].length;
        p.on('websocket', (ws) => ws.on('close', () => (hold.closed += 1)));
        await p.routeWebSocket(/\/api\/multiplayer\/socket/, (ws) => {
          hold.sockets += 1;
          ws.connectToServer();
          hold.drop = () => ws.close();
        });
        await p.reload();
        await expect
          .poll(() => hold.sockets, {
            timeout: 15_000,
            message: `${name} opens a routed socket`,
          })
          .toBeGreaterThan(0);
        const first = hold.sockets;
        hold.drop?.();
        await expect
          .poll(() => hold.closed, {
            timeout: 10_000,
            message: `${name} sees the socket close`,
          })
          .toBeGreaterThan(0);
        await p.waitForTimeout(5_000);
        const autoReconnect = hold.sockets > first;
        expect((await publicState(p)).joined[0].playerId).toBe(id);
        await expect(p.locator('input[type=password]')).toHaveCount(0);
        expect(S.posts[name].length, `${name} drop mints nothing`).toBe(posted);
        await p.reload();
        await expect
          .poll(() => hold.sockets, {
            timeout: 15_000,
            message: `${name} reload reconnects`,
          })
          .toBeGreaterThan(first);
        expect((await publicState(p)).joined[0].playerId).toBe(id);
        expect(
          S.posts[name].length,
          `${name} reload after drop mints nothing`,
        ).toBe(posted);
        return `${name}: page-side close observed; automatic reconnect ${autoReconnect ? 'yes' : 'no'} (recorded); reload reconnected with the stored bearer, same playerId, no mint`;
      }),
    );
    for (const line of drops) ok(run, line);
    // c. second tab in the P2 profile has no bearer; a same-password re-mint keeps the id.
    const tab = await (S.contexts.p2 as BrowserContext).newPage();
    await tab.goto(paths.p2 as string);
    const bare = await publicState(tab);
    expect(bare.bearers, 'new tab inherits no bearer').toHaveLength(0);
    expect(bare.joined).toHaveLength(0);
    expect(bare.choice, 'next-join choice is shared by the profile').toBe(
      'seat2',
    );
    const region = await tab
      .getByRole('region', { name: RENEWAL_REGION })
      .count();
    const missing = await tab
      .getByText('The joined credential is unavailable.')
      .count();
    ok(
      run,
      `P2 second tab: no bearer, choice seat2; renewal region count ${region}, binding-required text count ${missing} (recorded, not asserted)`,
    );
    const again = await joinedAs(
      'p2',
      tab,
      S.roomCode,
      S.passwords.seat2,
      'Local seat 2',
    );
    expect(again, 'same password gives the same playerId').toBe(S.ids.seat2);
    await tab.close();
    await auditAll();
    await checkpointScan();
    ok(run, 'P2 re-minted in a new tab with the same password: same playerId');
    done(run);
  });

  test('S4 operator revoke, then re-provision seat 2', async () => {
    const run = begin('S4');
    await openEntry(page('gm'));
    expect(await operatorWrite('revoke', 'local-seat-2', {})).toBe(
      'Local seat revoke completed.',
    );
    expect(await seatRow(page('gm'), 'local-seat-2')).toMatch(
      /local-seat-2: revoked/,
    );
    ok(run, 'GM revoked local-seat-2');

    await page('p2').reload();
    await expect(page('p2').getByTestId('coop-session-badge')).toBeVisible({
      timeout: 20_000,
    });
    expect(
      (await publicState(page('p2'))).joined[0].playerId,
      'issued bearer keeps working',
    ).toBe(S.ids.seat2);
    ok(
      run,
      'P2 original tab still joined as the revoked id after reload (no immediate eviction)',
    );

    const tab = await (S.contexts.p2 as BrowserContext).newPage();
    const dialog = await join(
      'p2',
      tab,
      S.roomCode,
      S.passwords.seat2,
      'Local seat 2',
    );
    await expect(dialog.getByTestId('join-coop-error')).toContainText(REFUSED);
    await auditAll();
    await cancelJoin(tab);
    await tab.close();
    ok(run, 'old seat-2 password refused with exactly one POST');

    const before = rowGeneration(await seatRow(page('gm'), 'local-seat-2'));
    await openEntry(page('gm'));
    expect(
      await operatorWrite('provision', 'local-seat-2', {
        label: 'Player 2b',
        seatPassword: S.passwords.seat2b,
      }),
    ).toBe('Local seat provision completed.');
    const row = await seatRow(page('gm'), 'local-seat-2');
    S.ids.seat2b = rowId(row);
    expect(rowGeneration(row)).toBeGreaterThan(before);
    expect(
      new Set([S.ids.gm, S.ids.seat1, S.ids.seat2, S.ids.seat2b]).size,
    ).toBe(4);
    await auditAll();
    ok(
      run,
      `re-provision gave local-seat-2 the new playerId ${S.ids.seat2b} at a higher generation`,
    );
    done(run);
  });
  test('S5a guest reclaim with a new password: refused while the ghost holds a seat', async () => {
    const run = begin('S5');
    const tab = await (S.contexts.p2 as BrowserContext).newPage();
    await tab.goto(paths.p2 as string);
    const reachable = await tab
      .getByRole('button', { name: FORGET_MATCH })
      .count();
    ok(
      run,
      `forget-match control reachable in a bare tab: ${reachable > 0} (renders only in the four-minute window or on a stored problem; new-tab path used)`,
    );
    const dialog = await join(
      'p2',
      tab,
      S.roomCode,
      S.passwords.seat2b,
      'Local seat 2',
    );
    const error = dialog.getByTestId('join-coop-error');
    await expect(error).toBeVisible({ timeout: 20_000 });
    const refusal = ((await error.textContent()) ?? '').trim();
    expect(
      refusal,
      'the host refuses the new identity while the ghost holds a seat',
    ).toMatch(HOST_REFUSAL);
    const hostLog = serverLogs();
    if (hostLog)
      expect(hostLog, 'the host log names the refusal').toContain(
        'reason=campaign-tactical-seats-full',
      );
    await tab.screenshot({ path: artifact(run, 's5-reclaim.png') });
    await expect(tab.getByTestId('coop-session-badge')).toHaveCount(0);
    await expect(tab.getByTestId('host-gm-review-surface')).toHaveCount(0);
    const stored = await publicState(tab);
    S.reprovision.ghostMembershipObserved = true;
    ok(
      run,
      `join dialog shows: "${refusal}"; no member surface; refused tab holds ${stored.bearers.length} bearer(s) and ${stored.joined.length} binding(s) (recorded)`,
    );
    await cancelJoin(tab);
    await tab.close();

    await auditAll();
  });

  test('S5c active-seat re-provision needs confirmation; no removal control', async () => {
    const run = S.runs.get('S5') as IRun;
    const p = page('gm');
    await openEntry(p);
    await openSeatPanel(p);
    await p
      .getByRole('combobox', { name: 'Local seat', exact: true })
      .selectOption('local-seat-2');
    await expect(
      p.getByRole('button', { name: 'Re-provision seat (new identity)' }),
    ).toBeVisible();
    await p.getByLabel('Seat label').fill('Player 2c');
    await p.getByLabel('Primary vault password').fill(S.passwords.gm);
    await p.getByLabel('New seat password').fill(S.passwords.seat2c);
    await p
      .getByRole('button', { name: 'Re-provision seat (new identity)' })
      .click();
    await expect(p.getByRole('alert').first()).toHaveText(
      'Confirm the new identity before re-provisioning this seat.',
    );
    const confirmation = (
      (await p
        .locator('label', {
          hasText: 'Re-provisioning gives this seat a new identity.',
        })
        .textContent()) ?? ''
    ).trim();
    expect(await seatRow(p, 'local-seat-2')).toContain(S.ids.seat2b);
    expect(
      await operatorWrite('provision', 'local-seat-2', {
        label: 'Player 2c',
        seatPassword: S.passwords.seat2c,
        confirm: true,
      }),
    ).toBe('Local seat provision completed.');
    S.ids.seat2c = rowId(await seatRow(p, 'local-seat-2'));
    expect(
      new Set([S.ids.gm, S.ids.seat1, S.ids.seat2, S.ids.seat2b, S.ids.seat2c])
        .size,
    ).toBe(5);
    S.reprovision.seat2PlayerIds = [S.ids.seat2, S.ids.seat2b, S.ids.seat2c];
    ok(
      run,
      `active-seat re-provision refused without the checkbox, then gave ${S.ids.seat2c}; confirmation text: "${confirmation}"`,
    );

    // No ordinary-UI control removes a participant: record only, never claim it.
    let removals = 0;
    for (const route of [
      S.campaignPath,
      `${S.campaignPath}/gm-ledger`,
      '/gameplay/campaigns',
    ]) {
      await p.goto(route);
      removals += await p
        .getByRole('button', { name: /remove|kick|evict|ban\b|participant/i })
        .count();
      removals += await p
        .getByRole('link', { name: /remove|kick|evict|ban\b|participant/i })
        .count();
    }
    S.reprovision.removalUi = removals === 0 ? 'absent' : 'present';
    expect(
      S.reprovision.removalUi,
      'removal UI is recorded absent; no removal is claimed',
    ).toBe('absent');
    // Quoted product copy is exempt; the spec's own wording must not claim removal.
    const claims = [...S.runs.values()]
      .flatMap((r) => r.observations.map((o) => o.description))
      .join('\n')
      .replace(/"[^"]*"/g, '');
    expect(claims).not.toMatch(/\b(removed|readmitted)\b/i);
    ok(
      run,
      'no remove/kick/evict control on the GM surfaces; no removal or readmission is claimed',
    );
    await auditAll();
    await checkpointScan();
    done(run);
  });

  test('N1 no token transfer', async () => {
    const run = begin('N1');
    // Harness audit first: it needs only this file. The N2 probe block is
    // exempt because it must name the activator routes it expects to be dead.
    const source = fs
      .readFileSync(__filename, 'utf8')
      .replace(/\/\/ N2-PROBES-BEGIN[\s\S]*?\/\/ N2-PROBES-END/g, '');
    const banned = [
      ['wire', 'Token'],
      ['session', 'Storage.setItem'],
      ['local', 'Storage.setItem'],
      ['addInit', 'Script'],
      ['page.', 'clock'],
      ['/api/', 'e2e/'],
      ['x-playwright-e2e-', 'run-id'],
      ['vault', '-identity'],
      ['tt', 'lMs'],
    ].map((parts) => parts.join(''));
    for (const token of banned)
      expect(
        source.includes(token),
        `spec source must not contain ${token}`,
      ).toBe(false);
    ok(
      run,
      `harness audit: none of ${banned.length} forbidden constructs appear in the spec source`,
    );

    await checkpointScan();
    for (const name of NAMES) {
      for (const p of (S.contexts[name] as BrowserContext).pages()) {
        const names = await p.evaluate(() =>
          Array.from(
            document.querySelectorAll(
              'button, a, [role=button], input[type=button], input[type=submit]',
            ),
          ).map((e) =>
            (
              e.getAttribute('aria-label') ??
              (e as HTMLElement).innerText ??
              ''
            ).trim(),
          ),
        );
        const hits = names.filter(
          (n) =>
            /(copy|export|import|share)/i.test(n) &&
            /(token|credential|bearer)/i.test(n),
        );
        expect(
          hits,
          `${name} offers no copy/export/import control for a bearer`,
        ).toEqual([]);
      }
    }
    const others = { p1: [S.ids.gm, S.ids.seat2], p2: [S.ids.gm, S.ids.seat1] };
    for (const name of ['p1', 'p2'] as const) {
      for (const p of (S.contexts[name] as BrowserContext).pages())
        expect(
          await exposesSecrets(p, others[name], true),
          `${name} storage names no other profile`,
        ).toBe(0);
    }
    ok(
      run,
      'no bearer outside its own two per-match keys on any page; no copy/export/import/share control; no cross-profile ids in storage',
    );
    done(run);
  });

  test('N2 no test activator', async () => {
    const run = begin('N2');
    expect(
      process.env.NEXT_PUBLIC_E2E_MODE,
      'E2E mode is not set in the spec env',
    ).toBeUndefined();
    expect(
      process.env.PLAYWRIGHT_E2E_RUN_ID,
      'no E2E run id in the spec env',
    ).toBeUndefined();
    const config = fs.readFileSync(
      path.join(process.cwd(), 'playwright.local-seat-packaged.config.ts'),
      'utf8',
    );
    expect(/NEXT_PUBLIC_E2E_MODE|PLAYWRIGHT_E2E_RUN_ID/.test(config)).toBe(
      false,
    );
    // N2-PROBES-BEGIN
    const probes = [
      ['POST', '/api/e2e/token-ttl'],
      ['POST', '/api/e2e/vault-identity'],
      ['GET', '/api/e2e/fault'],
      ['GET', '/api/e2e/performance-probe'],
      ['GET', '/__playwright_e2e_ready__?runId=x'],
    ];
    for (const [method, route] of probes) {
      for (const guessed of [false, true]) {
        const res = await fetch(`${ORIGIN}${route}`, {
          method,
          headers: {
            'content-type': 'application/json',
            ...(guessed ? { 'x-playwright-e2e-run-id': 'x' } : {}),
          },
          body: method === 'POST' ? '{}' : undefined,
        });
        // 404 exactly: an armed activator answers 204, 200 or 400 (measured with the E2E variables set).
        expect(res.status, `${method} ${route} guessed=${guessed}`).toBe(404);
      }
    }
    // N2-PROBES-END
    ok(
      run,
      `${probes.length} activator probes answered 404 with and without a guessed run id; E2E variables absent from the spec env and config`,
    );
    done(run);
  });

  test('N3 no server-wide identity switch', async () => {
    const run = begin('N3');
    const p = page('p1');
    await p.goto('/settings#vault');
    const section = p.locator('#section-vault');
    await expect(section).toBeVisible({ timeout: 20_000 });
    await expect(section.getByText('Create Your Vault Identity')).toHaveCount(
      0,
    );
    await expect(section.getByRole('combobox')).toHaveCount(0);
    await expect(section).not.toContainText(/Player [12]/);
    const choices = await Promise.all(
      NAMES.map(async (n) => (await publicState(page(n))).choice),
    );
    expect(choices, 'each profile keeps its own local choice').toEqual([
      null,
      'seat1',
      'seat2',
    ]);
    ok(
      run,
      'P1 Settings shows the single vault identity (no creation form, no selector, no seat labels); choices stay per profile',
    );
    done(run);
  });

  test('N4 no implied role', async () => {
    const run = begin('N4');
    await page('gm').goto(S.campaignPath);
    await expect(page('gm').getByTestId('host-gm-review-surface')).toBeVisible({
      timeout: 20_000,
    });
    for (const name of ['p1', 'p2'] as const) {
      await page(name).goto(paths[name] as string);
      await expect(page(name).getByTestId('coop-session-badge')).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page(name).getByTestId('host-gm-review-surface'),
      ).toHaveCount(0);
      await expect(
        page(name).getByTestId('host-command-authority-private'),
      ).toHaveCount(0);
    }
    ok(
      run,
      'GM shows the host surface; P1 and P2 show neither host surface; the refused seat holder had no member surface (S5)',
    );
    done(run);
  });

  test('N6 secrecy and autofill attributes', async () => {
    const run = begin('N6');
    const attrs = (l: Locator) =>
      l.evaluate((el) => ({
        type: (el as HTMLInputElement).type,
        auto: (el as HTMLInputElement).autocomplete,
        named: el.hasAttribute('name'),
      }));
    const gm = page('gm');
    await openEntry(gm);
    expect(await attrs(gm.getByTestId('create-coop-password-input'))).toEqual({
      type: 'password',
      auto: 'current-password',
      named: false,
    });
    await openSeatPanel(gm);
    expect(await attrs(gm.getByLabel('Primary vault password'))).toEqual({
      type: 'password',
      auto: 'current-password',
      named: false,
    });
    expect(await attrs(gm.getByLabel('New seat password'))).toEqual({
      type: 'password',
      auto: 'new-password',
      named: false,
    });
    const dialog = await openJoin(page('p1'));
    expect(await attrs(dialog.getByTestId('join-coop-password-input'))).toEqual(
      { type: 'password', auto: 'current-password', named: false },
    );
    await cancelJoin(page('p1'));
    ok(
      run,
      'create/primary/join inputs use current-password, the new seat password uses new-password; all unnamed and empty after submit',
    );

    const secrets = Object.values(S.passwords);
    for (const name of NAMES) {
      for (const p of (S.contexts[name] as BrowserContext).pages())
        expect(
          await exposesSecrets(p, secrets),
          `${name} page, storage and URL hold no password`,
        ).toBe(0);
    }
    expect(
      S.consoleLines.filter((l) => secrets.some((s) => l.includes(s))),
    ).toEqual([]);
    expect(
      S.requestUrls.filter((u) => secrets.some((s) => u.includes(s))),
    ).toEqual([]);
    expect(scanArtifacts(), 'no password in any produced artifact').toEqual([]);
    ok(
      run,
      'no password in URLs, DOM text, storage, console, page errors, request URLs or the record so far; the password-manager prompt stays a human gap',
    );
    done(run);
  });
  test('S3 renewal and expiry in real time @soak', async () => {
    test.setTimeout(75 * 60 * 1000); // Q2: the only per-test timeout in this file
    const run = begin('S3');
    await page('gm').goto(S.campaignPath);
    await page('p1').goto(paths.p1 as string);
    const bearer = async (name: 'gm' | 'p1') => {
      const b = (await publicState(page(name))).bearers.find(
        (x) => name === 'p1' || x.matchId === S.matchId,
      );
      expect(b?.expiresAt, `${name} bearer expiry`).toBeTruthy();
      return b as { playerId: string; issuedAt: number; expiresAt: number };
    };
    const iso = (ms: number) => new Date(ms).toISOString();
    const region = (name: 'gm' | 'p1') =>
      page(name).getByRole('region', { name: RENEWAL_REGION });
    const gm0 = await bearer('gm');
    const p10 = await bearer('p1');
    expect(p10.expiresAt - p10.issuedAt, 'seat bearer lasts one hour').toBe(
      60 * 60 * 1000,
    );
    expect(gm0.expiresAt - gm0.issuedAt).toBeLessThanOrEqual(60 * 60 * 1000);
    S.timeline.gm = {
      mintedAt: iso(gm0.issuedAt),
      expiresAt: iso(gm0.expiresAt),
    };
    S.timeline.p1 = {
      mintedAt: iso(p10.issuedAt),
      expiresAt: iso(p10.expiresAt),
    };
    const opens = (b: { expiresAt: number }) => b.expiresAt - RENEWAL_WINDOW_MS;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const before = marks();

    // No prompt and no mint before the window (5 s of slack).
    while (Date.now() < opens(gm0) - 5_000) {
      expect(await region('gm').count(), 'no early prompt (gm)').toBe(0);
      expect(await region('p1').count(), 'no early prompt (p1)').toBe(0);
      expect(marks(), 'no automatic mint').toEqual(before);
      await sleep(15_000);
    }
    await expect
      .poll(() => region('gm').count(), { intervals: [1_000], timeout: 40_000 })
      .toBe(1);
    S.timeline.gm.promptAppearedAt = now();
    expect(
      Date.now() - opens(gm0),
      'prompt within 30 s of the window',
    ).toBeLessThan(35_000);
    await page('gm').goto(`${S.campaignPath}/missions`);
    await expect(region('gm')).toBeVisible({ timeout: 10_000 });
    await page('gm').goto(S.campaignPath);
    await expect(region('gm')).toBeVisible({ timeout: 10_000 });
    await page('gm').screenshot({
      path: artifact(run, 's3-renewal-prompt.png'),
    });
    const renewalField = region('gm').getByLabel(/^Password for /);
    expect(
      await renewalField.evaluate((el) => ({
        auto: (el as HTMLInputElement).autocomplete,
        named: el.hasAttribute('name'),
      })),
    ).toEqual({ auto: 'current-password', named: false });
    expect(marks(), 'prompt alone mints nothing').toEqual(before);

    let sockets = 0;
    page('gm').on('websocket', () => (sockets += 1));
    await renewalField.fill(S.passwords.gm);
    await submit(
      'gm',
      region('gm').getByRole('button', { name: 'Renew and reload' }),
    );
    await expect(renewalField).toHaveCount(0, { timeout: 20_000 });
    await expect
      .poll(async () => (await bearer('gm')).expiresAt, { timeout: 20_000 })
      .toBeGreaterThan(gm0.expiresAt);
    S.timeline.gm.renewedAt = now();
    expect((await bearer('gm')).playerId, 'renewal keeps the GM playerId').toBe(
      S.ids.gm,
    );
    await expect.poll(() => sockets, { timeout: 20_000 }).toBeGreaterThan(0);
    note(
      'N3',
      `GM primary renewal returned the same playerId ${S.ids.gm} as S1`,
    );
    ok(
      run,
      'GM: prompt in the window on two routes, renewed with the password, same playerId, new socket',
    );

    // P1: ignore the prompt until the bearer expires; nothing may mint.
    while (Date.now() < opens(p10) - 5_000) {
      expect(await region('p1').count(), 'no early prompt (p1)').toBe(0);
      await sleep(5_000);
    }
    await expect
      .poll(() => region('p1').count(), { intervals: [1_000], timeout: 40_000 })
      .toBe(1);
    S.timeline.p1.promptAppearedAt = now();
    while (Date.now() < p10.expiresAt + 5_000) await sleep(5_000);
    expect(S.posts.p1.length, 'P1 prompt was ignored, nothing minted').toBe(
      before.p1,
    );
    await expect(region('p1')).toContainText(
      'Your co-op sign-in expired. Re-enter its password to recover.',
    );
    S.timeline.p1.expiredObservedAt = now();
    await page('p1').screenshot({ path: artifact(run, 's3-expired.png') });
    await page('p1').reload();
    await expect(region('p1')).toContainText(
      'Your co-op sign-in expired. Re-enter its password to recover.',
      { timeout: 20_000 },
    );
    expect(S.posts.p1.length, 'reload does not mint').toBe(before.p1);

    const recover = region('p1').getByLabel(/^Password for /);
    await recover.fill(S.passwords.seat1);
    await submit(
      'p1',
      region('p1').getByRole('button', { name: 'Recover and reload' }),
    );
    await expect
      .poll(async () => (await bearer('p1')).expiresAt, { timeout: 20_000 })
      .toBeGreaterThan(p10.expiresAt);
    S.timeline.p1.recoveredAt = now();
    expect(
      (await bearer('p1')).playerId,
      'recovery keeps the P1 playerId',
    ).toBe(S.ids.seat1);
    await expect(page('p1').getByTestId('coop-session-badge')).toBeVisible({
      timeout: 20_000,
    });
    ok(
      run,
      'P1: prompt ignored, expired state shown, no auto-mint, recovered with the seat password, same playerId',
    );
    await auditAll();
    done(run);
    await runN5();
  });

  test('S7a authority restart: close the installed app gracefully', async () => {
    const run = begin('S7');
    const c = cfg();
    restart.seatsBefore = await seatList();
    restart.before = await playerIdsPerPage();
    const main = listeners(3001)[0]?.parentPid;
    expect(main, 'launcher pid').toBeTruthy();
    closeApp(main as number, c.runDir);
    await waitFor(
      () => listeners(3001).length === 0 && mekStationImages().length === 0,
      60_000,
    );
    ok(
      run,
      'installed app closed with WM_CLOSE; port 3001 free and no MekStation.exe left',
    );
  });

  test('S7b authority restart: relaunch with the same command and user-data dir', async () => {
    const run = S.runs.get('S7') as IRun;
    const c = cfg();
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const n of SCRUB) delete env[n];
    env.MULTIPLAYER_DB_PATH = path.join(
      c.userData,
      'data',
      'multiplayer-matches.db',
    );
    const log = (suffix: string) =>
      fs.openSync(path.join(c.runDir, `app-restart-${suffix}.log`), 'a');
    spawn(c.exe, [`--user-data-dir=${c.userData}`], {
      env,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', log('stdout'), log('stderr')],
    }).unref();
    await waitFor(
      async () =>
        (
          await publicGet('/api/multiplayer/auth/local-seats').catch(() => ({
            status: 0,
          }))
        ).status === 200,
      25_000,
    );
    ok(run, 'relaunched the installed app; the authority answered again');
  });

  test('S7c authority restart: seats and public ids are unchanged', async () => {
    const run = S.runs.get('S7') as IRun;
    const c = cfg();
    const seatsBefore = restart.seatsBefore;
    const seatsAfter = await seatList();
    S.restart.seatsUnchanged =
      JSON.stringify(seatsAfter) === JSON.stringify(seatsBefore);
    expect(S.restart.seatsUnchanged, 'seat rows survive the restart').toBe(
      true,
    );

    let opened = 0;
    let closed = 0;
    for (const n of NAMES) {
      for (const p of (S.contexts[n] as BrowserContext).pages()) {
        p.on('websocket', (ws) => {
          opened += 1;
          ws.on('close', () => (closed += 1));
        });
        await p.reload();
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const after = await playerIdsPerPage();
    S.restart.idsUnchanged =
      JSON.stringify(after) === JSON.stringify(restart.before);
    expect(S.restart.idsUnchanged, 'playerIds unchanged after restart').toBe(
      true,
    );
    S.restart.matchRecovered =
      opened === 0 ? 'unknown' : closed === 0 ? 'yes' : 'no';
    const logs = [
      'app-stdout.log',
      'app-stderr.log',
      'app-restart-stdout.log',
      'app-restart-stderr.log',
    ]
      .map((f) => path.join(c.runDir, f))
      .filter((f) => fs.existsSync(f));
    S.restart.inMemoryPlayerStoreWarning = !logs.length
      ? 'unknown'
      : logs.some((f) =>
            fs.readFileSync(f, 'utf8').includes('InMemoryPlayerStore'),
          )
        ? 'seen'
        : 'not-seen';
    ok(
      run,
      `seats and playerIds unchanged; matchRecovered=${S.restart.matchRecovered}; InMemoryPlayerStore warning=${S.restart.inMemoryPlayerStoreWarning} (recorded, not asserted)`,
    );
    done(run);
  });
  // Variant (b), test-only and last so its extra campaign cannot disturb N4/S3/S7:
  // the re-provisioned identity takes a free seat in another campaign.
  test('S5b new identity takes a free seat in a second campaign', async () => {
    const run = begin('S5b');
    const ctx = S.contexts.p2 as BrowserContext;
    await page('gm').goto(S.campaignPath);
    const created = await createCoopCampaign('gm', S.passwords.gm);
    const tab = await ctx.newPage();
    const id = await joinedAs(
      'p2',
      tab,
      created.roomCode,
      S.passwords.seat2c,
      'Local seat 2',
    );
    expect(
      id,
      'the re-provisioned identity is admitted into the free seat',
    ).toBe(S.ids.seat2c);
    ok(
      run,
      `campaign B admitted ${id} (free tactical seat) while the old identity stays a member of campaign A`,
    );
    const stale = await ctx.newPage();
    const dialog = await join(
      'p2',
      stale,
      S.roomCode,
      S.passwords.seat2c,
      'Local seat 2',
    );
    await expect(dialog.getByTestId('join-coop-error')).toContainText(
      HOST_REFUSAL,
      { timeout: 20_000 },
    );
    await cancelJoin(stale);
    await stale.close();
    ok(
      run,
      'campaign A still refuses the same identity: the ghost keeps its seat',
    );
    // Recorded, not asserted: what the P2 profile shows for campaign A's route after joining B.
    await tab.goto(paths.p2 as string);
    const badge = (
      (await tab
        .getByTestId('coop-session-badge')
        .innerText({ timeout: 20_000 })) ?? ''
    ).trim();
    const hostSurface = await tab.getByTestId('host-gm-review-surface').count();
    ok(
      run,
      `P2 profile on campaign A's route after joining B: badge "${badge}", host review surface count ${hostSurface} (recorded)`,
    );
    await auditAll();
    done(run);
  });
});

// ------------------------------------------------------------------- helpers

const restart = { seatsBefore: [] as ISeat[], before: [] as string[][] };
async function playerIdsPerPage(): Promise<string[][]> {
  return Promise.all(
    NAMES.map(async (n) =>
      (
        await Promise.all(
          (S.contexts[n] as BrowserContext).pages().map((p) => publicState(p)),
        )
      ).map((s) => s.joined.map((j) => j.playerId).join()),
    ),
  );
}

async function auditAll(): Promise<void> {
  for (const name of NAMES) await auditPosts(name);
}
async function waitFor(
  check: () => boolean | Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline)
      throw new Error(`Condition not met within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
/** Graceful quit: a hidden Electron window ignores a plain taskkill. */
function closeApp(pid: number, runDir: string): void {
  const script = path.join(runDir, 'close-window.ps1');
  fs.writeFileSync(
    script,
    [
      'param([uint32]$ProcId)',
      "Add-Type -TypeDefinition @'",
      'using System; using System.Runtime.InteropServices; using System.Text;',
      'public static class W {',
      '  public delegate bool EnumProc(IntPtr h, IntPtr l);',
      '  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);',
      '  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
      '  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder sb, int n);',
      '  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);',
      '  public static int Close(uint pid) { int n = 0; EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == pid) { var c = new StringBuilder(256); GetClassName(h, c, 256); if (c.ToString() == "Chrome_WidgetWin_1") { PostMessage(h, 0x0010, IntPtr.Zero, IntPtr.Zero); n++; } } return true; }, IntPtr.Zero); return n; }',
      '}',
      "'@",
      '[W]::Close($ProcId)',
    ].join('\n'),
  );
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      script,
      String(pid),
    ],
    { windowsHide: true },
  );
}
/** Names of top-level run-dir files that contain any password value. */
function scanArtifacts(): string[] {
  const { runDir } = cfg();
  const secrets = Object.values(S.passwords)
    .filter(Boolean)
    .map((s) => Buffer.from(s));
  return fs
    .readdirSync(runDir)
    .filter((f) => fs.statSync(path.join(runDir, f)).isFile())
    .filter((f) =>
      secrets.some((s) => fs.readFileSync(path.join(runDir, f)).includes(s)),
    );
}
async function exposesSecrets(
  p: Page,
  values: string[],
  storageOnly = false,
): Promise<number> {
  return p.evaluate(
    ([needles, only]) => {
      const hay: string[] = only
        ? []
        : [location.href, document.body.innerText];
      for (let i = 0; i < localStorage.length; i += 1)
        hay.push(localStorage.getItem(localStorage.key(i) as string) ?? '');
      for (let i = 0; i < sessionStorage.length; i += 1)
        hay.push(sessionStorage.getItem(sessionStorage.key(i) as string) ?? '');
      return (needles as string[]).filter((n) => hay.some((h) => h.includes(n)))
        .length;
    },
    [values, storageOnly] as const,
  );
}
async function finalize(): Promise<void> {
  for (const name of NAMES)
    await S.contexts[name]?.close().catch(() => undefined);
  let runDir: string;
  try {
    runDir = cfg().runDir;
  } catch {
    return;
  }
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, 'timeline.json'),
    `${compact(S.timeline)}\n`,
  );
  S.artifacts.push('timeline.json');
  flushRecord();
  expect(scanArtifacts(), 'no password in any produced artifact').toEqual([]);
}

/** Operator-redirected authority output, when present (stdout and stderr). */
function serverLogs(): string {
  const { runDir } = cfg();
  return [
    'app-stdout.log',
    'app-stderr.log',
    'app-restart-stdout.log',
    'app-restart-stderr.log',
  ]
    .map((f) => path.join(runDir, f))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
}

/**
 * N5 runs at the end of the soak test: its 61 s quiet period and the 60 s
 * lockout cannot fit the unchanged 30 s test timeout (owner ruling Q2 allows an
 * override for the soak test only).
 */
async function runN5(): Promise<void> {
  const run = begin('N5');
  await new Promise((resolve) => setTimeout(resolve, 61_000)); // leave the 60 s rate windows
  const tab = await (S.contexts.p2 as BrowserContext).newPage();
  const dialog = await join(
    'p2',
    tab,
    S.roomCode,
    `wrong-${secret()}`,
    'Local seat 2',
  );
  const error = dialog.getByTestId('join-coop-error');
  const field = dialog.getByTestId('join-coop-password-input');
  await expect(error).toContainText(REFUSED);
  await expect(error).not.toContainText('Retry after');
  let failures = 1;
  let message = '';
  for (; failures < 8; failures += 1) {
    await field.fill(`wrong-${secret()}`);
    await submit('p2', dialog.getByTestId('join-coop-submit-btn'));
    await expect(field).toHaveValue('');
    await expect(error)
      .not.toHaveText(message || /^$/, { timeout: 10_000 })
      .catch(() => undefined);
    message = ((await error.textContent()) ?? '').trim();
    if (message.includes(THROTTLED)) break;
    expect(message).toContain(REFUSED);
  }
  expect(message).toMatch(
    /Local seat requests are throttled\. Retry after \d+ seconds\./,
  );
  expect(failures, 'lockout after five refusals').toBe(5);
  await auditAll();
  const wait = Number(/Retry after (\d+) seconds/.exec(message)?.[1] ?? 60);
  ok(run, `5 refusals then "${message}"; POST count equals submits`);
  await new Promise((resolve) => setTimeout(resolve, (wait + 2) * 1000));
  const minted = tab.waitForResponse(
    (r) =>
      r.url().includes('/auth/local-seats') && r.request().method() === 'POST',
  );
  await field.fill(S.passwords.seat2c);
  await submit('p2', dialog.getByTestId('join-coop-submit-btn'));
  expect(
    (await minted).status(),
    'the correct password succeeds after the lock expires',
  ).toBe(200);
  await auditAll();
  ok(
    run,
    'correct seat-2 password minted (HTTP 200) after the lock expired; no automatic retry happened',
  );
  done(run);
}
