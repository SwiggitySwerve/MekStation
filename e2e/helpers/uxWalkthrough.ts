/**
 * UX Walkthrough Recorder
 *
 * Drives the repeatable UX audit harness (`npm run qc:ux-audit`). Each journey
 * test creates a recorder, wraps every user-visible action in `step()`, and the
 * recorder captures a numbered full-page screenshot + route + console errors +
 * timing per step into the per-run catalog directory. The runner script
 * (`scripts/qc/run-ux-walkthrough.mjs`) aggregates the per-journey JSON files
 * this recorder writes into the run manifest and the reviewable index.html.
 *
 * Design constraints:
 * - A failing step must NOT lose the catalog: the failure screenshot and the
 *   journey JSON are still written so the reviewer sees exactly where the
 *   normal-user path broke — that broken path IS the audit finding.
 * - Console errors are usability evidence, not test noise: they are recorded
 *   per step instead of failing the run.
 */

import type { Page, TestInfo } from '@playwright/test';

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { FLOW_MANIFEST } from '../flows/manifest';

const DEFAULT_SURFACE = 'default';
const PUBLISHABLE_SCREENSHOT_STYLE =
  '*,*::before,*::after{color:transparent!important;text-shadow:none!important;' +
  'background:transparent!important;background-image:none!important;content:none!important}' +
  'img,svg,canvas,video,iframe,object,embed{visibility:hidden!important}';

export type WalkthroughFindingSeverity =
  | 'critical'
  | 'major'
  | 'moderate'
  | 'minor';

export interface WalkthroughFindingRecord {
  readonly id: string;
  readonly severity: WalkthroughFindingSeverity;
  readonly summary: string;
  readonly steps: readonly number[];
}

export interface WalkthroughStepOptions {
  readonly note?: string;
  readonly tolerant?: boolean;
  readonly surface?: string;
}

export async function captureCamp01AttestedPng(
  page: Page,
  artifactPath: string,
): Promise<void> {
  const {
    Camp01CaptureInvalidError,
    captureRequestFromEnvironment,
    createBrowserCaptureInstrumentation,
    openCaptureTransaction,
  } = await import('../../scripts/qc/camp01-capture-transaction.mjs');
  const request = captureRequestFromEnvironment(process.env, artifactPath);
  if (!request)
    throw new Camp01CaptureInvalidError('CAMP capture context missing');
  await page.addStyleTag({ content: PUBLISHABLE_SCREENSHOT_STYLE });
  const transaction = openCaptureTransaction(request, {
    instrumentation: createBrowserCaptureInstrumentation(page),
  });
  await transaction.prepare();
  await transaction.capture((file: string) =>
    page.screenshot({
      animations: 'disabled',
      fullPage: true,
      path: file,
      timeout: 15_000,
    }),
  );
  await transaction.publish();
}

export type WalkthroughSoftStepOptions = Omit<
  WalkthroughStepOptions,
  'tolerant'
>;

export interface WalkthroughStepRecord {
  readonly index: number;
  readonly slug: string;
  readonly title: string;
  readonly surface: string;
  readonly screenshot: string | null;
  readonly route: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly notes: readonly string[];
  readonly status: 'ok' | 'failed';
  readonly failure?: string;
}

export type WalkthroughCheckpointStatus =
  | WalkthroughStepRecord['status']
  | 'not-run';

export interface WalkthroughCheckpointRecord {
  readonly name: string;
  readonly stepIndex: number | null;
  readonly status: WalkthroughCheckpointStatus;
  // Per-checkpoint viewport (spec: Viewport Selection — "MUST be recorded in
  // the run manifest AND per-checkpoint metadata"). Same source as the run
  // manifest's top-level viewport (resolveViewport()); duplicated here rather
  // than left implicit so a checkpoint object extracted on its own (e.g. from
  // summary.json) is self-describing without carrying run-level context.
  readonly viewport: { readonly width: number; readonly height: number };
}

export interface WalkthroughEntityRecord {
  readonly kind: string;
  readonly id: string;
}

export interface WalkthroughHoldUrlRecord {
  readonly label: string;
  readonly url: string;
}

const ROUTE_TEMPLATES = (
  '|gameplay|gameplay/quick|gameplay/campaigns|gameplay/campaigns/*|' +
  'gameplay/campaigns/*/starmap|gameplay/campaigns/*/finances|gameplay/campaigns/*/contract-market|' +
  'gameplay/campaigns/*/gm-ledger|gameplay/campaigns/*/hiring|gameplay/campaigns/*/log|gameplay/campaigns/*/mech-bay|' +
  'gameplay/campaigns/*/missions|gameplay/campaigns/*/personnel|gameplay/campaigns/*/repair-bay|' +
  'gameplay/encounters|gameplay/encounters/*|gameplay/encounters/*/pre-battle|' +
  'gameplay/games|gameplay/games/*|gameplay/pilots|gameplay/pilots/create|gameplay/pilots/*|' +
  'compendium|compendium/units|compendium/units/*|compendium/equipment|compendium/equipment/*|compendium/rules|' +
  'customizer|customizer/*/structure|multiplayer|multiplayer/lobby|multiplayer/lobby/*|onboarding|units|replay-library|' +
  'api/campaigns|api/campaigns/*|api/multiplayer/auth/token|api/multiplayer/matches|api/multiplayer/matches/*|api/e2e/vault-identity'
)
  .split('|')
  .map((route) => route.split('/'));

const SAFE_QUERY_KEYS = new Set([
  'assignmentId',
  'campaignId',
  'encounterId',
  'forceId',
  'matchId',
  'missionId',
  'mode',
  'page',
  'pilotId',
  'sessionId',
  'sort',
  'tab',
  'view',
]);

const SAFE_SURFACES = new Set(['default', 'guest', 'host', 'player']);
const SAFE_ENTITY_KINDS = new Set([
  'assignment',
  'campaign',
  'encounter',
  'force',
  'match',
  'mission',
  'pilot',
  'session',
]);
const FINDING_SEVERITIES = new Set(['critical', 'major', 'moderate', 'minor']);

const SAFE_JOURNEY_LABELS = new Set([
  ...FLOW_MANIFEST.map((flow) => flow.id),
  '01-first-visit-navigation',
  '02-compendium-browse',
  '03-fresh-profile-empty-states',
  '04-quick-game-auto-resolve',
  '05-customizer-new-unit',
  '06-campaign-create-to-launch',
  '07-mobile-navigation',
  '08-sp-campaign-deep-loop',
  '09-coop-multiplayer-two-client',
  '10-gm-surfaces',
]);

const SAFE_PERSONA_LABELS = new Set([
  ...FLOW_MANIFEST.map((flow) => flow.description),
  'first-time visitor exploring the app shell',
  'player researching units and equipment',
  'new player with no saved content yet',
  'player running their first quick battle',
  'player building their first custom BattleMech',
  'player starting a mercenary campaign',
  'phone user finding their way around',
  'player pushing a campaign from creation through a battle attempt and full sweep',
  'host and guest proving co-op campaign and 1v1 lobby handoff surfaces',
  'campaign GM validating ledger interventions and the tactical GM dock',
]);

const SAFE_CHECKPOINT_LABELS = new Set(
  FLOW_MANIFEST.flatMap((flow) =>
    flow.checkpoints.map((checkpoint) => checkpoint.name),
  ),
);

/**
 * Canonicalize a route before it enters a publishable journey record.
 * Static route/query shape is retained, while every dynamic value is replaced
 * by a deterministic digest that cannot reveal the original value.
 */
export function canonicalizeWalkthroughRoute(rawRoute: string): string {
  const raw = String(rawRoute ?? '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'http://walkthrough.invalid');
    const decodedSegments = parsed.pathname
      .split('/')
      .slice(1)
      .map((segment) => decodeURIComponent(segment));
    const template = ROUTE_TEMPLATES.find(
      (candidate) =>
        candidate.length === decodedSegments.length &&
        candidate.every(
          (part, index) =>
            part === '*' ||
            part.toLowerCase() === decodedSegments[index].toLowerCase(),
        ),
    );
    const pathname = template
      ? `/${template
          .map((part, index) =>
            part === '*' ? `<route:${digest(decodedSegments[index])}>` : part,
          )
          .join('/')}`
      : `<route:${digest(parsed.pathname)}>`;
    const query = Array.from(parsed.searchParams.entries())
      .map(([key, value]) => {
        const safeKey = Array.from(SAFE_QUERY_KEYS).find(
          (candidate) => candidate.toLowerCase() === key.toLowerCase(),
        );
        const canonicalKey = safeKey ?? `<query-key:${digest(key)}>`;
        return {
          key: canonicalKey,
          value: `<query:${digest(value)}>`,
        };
      })
      .sort(
        (left, right) =>
          compareStrings(left.key, right.key) ||
          compareStrings(left.value, right.value),
      )
      .map(({ key, value }) => `${key}=${value}`)
      .join('&');
    return `${pathname || '/'}${query ? `?${query}` : ''}`;
  } catch {
    return `<route:${digest(raw)}>`;
  }
}

function digest(value: string): string {
  return createHash('sha256')
    .update(String(value ?? ''))
    .digest('hex')
    .slice(0, 16);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalizeRuntimeText(value: string, label: string): string {
  return `${label}:<sha256:${digest(value)}>`;
}

function canonicalizeSourceLabel(value: string, label: string): string {
  return `${label}-${digest(String(value ?? ''))}`;
}

function canonicalizeAllowlistedLabel(
  value: string,
  allowlist: ReadonlySet<string>,
  label: string,
): string {
  return allowlist.has(value) ? value : canonicalizeSourceLabel(value, label);
}

function canonicalizeVocabulary(
  value: string,
  vocabulary: ReadonlySet<string>,
  label: string,
): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return vocabulary.has(normalized)
    ? normalized
    : canonicalizeSourceLabel(value, label);
}

export interface WalkthroughJourneyRecord {
  readonly journey: string;
  readonly persona: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: 'ok' | 'failed';
  readonly steps: readonly WalkthroughStepRecord[];
  readonly findings: readonly WalkthroughFindingRecord[];
  readonly checkpoints?: readonly WalkthroughCheckpointRecord[];
  readonly entityIds?: readonly WalkthroughEntityRecord[];
  readonly holdUrls?: readonly WalkthroughHoldUrlRecord[];
}

interface MutableStep {
  index: number;
  slug: string;
  title: string;
  surface: string;
  screenshot: string | null;
  route: string;
  startedAt: string;
  durationMs: number;
  consoleErrors: string[];
  pageErrors: string[];
  notes: string[];
  status: 'ok' | 'failed';
  failure?: string;
}

interface WalkthroughSurface {
  readonly page: Page;
  consoleBuffer: string[];
  pageErrorBuffer: string[];
}

/** Resolve the per-run catalog directory injected by the runner script. */
export function resolveRunDir(): string {
  const runDir = process.env.MEKSTATION_UX_WALKTHROUGH_RUN_DIR;
  if (runDir && runDir.trim().length > 0) {
    return path.resolve(runDir);
  }
  // Direct `npx playwright test` invocation (no runner): still produce a
  // catalog so the spec is debuggable standalone, keyed by process start.
  const fallbackId = new Date()
    .toISOString()
    .replace(/\.\d+Z$/, '')
    .replace(/:/g, '-');
  return path.resolve(
    process.cwd(),
    '.sisyphus/evidence/ux-walkthrough',
    fallbackId,
  );
}

export interface WalkthroughRecorder {
  attachSurface(name: string, page: Page): void;
  step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  markCheckpointNotRun(name: string): void;
  softStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughSoftStepOptions,
  ): Promise<void>;
  finding(finding: WalkthroughFindingRecord): void;
  registerEntity(kind: string, id: string): void;
  registerHoldUrl(label: string, url: string): void;
  note(text: string): void;
  finish(): void;
}

/**
 * Create a recorder that captures journey evidence without a stateful class
 * surface, keeping the public API focused on journey operations.
 */
export function createWalkthroughRecorder(
  page: Page,
  journey: string,
  persona: string,
  testInfo: TestInfo,
): WalkthroughRecorder {
  const steps: MutableStep[] = [];
  const findings: WalkthroughFindingRecord[] = [];
  const checkpoints: WalkthroughCheckpointRecord[] = [];
  const entityIds: WalkthroughEntityRecord[] = [];
  const holdUrls: WalkthroughHoldUrlRecord[] = [];
  const surfaces = new Map<string, WalkthroughSurface>();
  const runDir = resolveRunDir();
  const journeyKey = canonicalizeSourceLabel(journey, 'journey');
  const journeyLabel = canonicalizeAllowlistedLabel(
    journey,
    SAFE_JOURNEY_LABELS,
    'journey',
  );
  const journeyDir = path.join(runDir, journeyKey);
  const startedAt = new Date().toISOString();
  let stepCounter = 0;
  let failed = false;

  fs.mkdirSync(journeyDir, { recursive: true });

  /**
   * Register another browser surface so one journey can tell a single
   * interleaved host/guest story without splitting the evidence catalog.
   */
  function attachSurface(name: string, page: Page): void {
    const surfaceName = normalizeSurfaceName(name);
    if (surfaces.has(surfaceName)) {
      throw new Error(
        `Walkthrough surface "${surfaceName}" is already attached`,
      );
    }
    let existingPageSurface: string | null = null;
    surfaces.forEach((surface, existingName) => {
      if (surface.page === page) {
        existingPageSurface = existingName;
      }
    });
    if (existingPageSurface) {
      throw new Error(
        `Walkthrough page is already attached as surface "${existingPageSurface}"`,
      );
    }
    const surface: WalkthroughSurface = {
      page,
      consoleBuffer: [],
      pageErrorBuffer: [],
    };
    surfaces.set(surfaceName, surface);

    // Buffer console/page errors between steps so each step record carries the
    // errors that surfaced while a normal user performed that step.
    page.on('console', (message) => {
      if (message.type() === 'error') {
        surface.consoleBuffer.push(
          canonicalizeRuntimeText(message.text().slice(0, 500), 'console'),
        );
      }
    });
    page.on('pageerror', (error) => {
      surface.pageErrorBuffer.push(
        canonicalizeRuntimeText(String(error).slice(0, 500), 'page-error'),
      );
    });
  }

  /**
   * Execute one user-visible action, then settle + screenshot + record it.
   * Strict mode remains the shell-journey default; tolerant mode uses the same
   * failure evidence path but lets deep-play audits keep walking.
   */
  function step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: { readonly note?: string },
  ): Promise<number>;
  function step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  function step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> {
    return recordStep(title, action, options);
  }

  /**
   * Execute a named flow checkpoint and record the same evidence as a step.
   * The resulting checkpoint points to its step so runners can join error
   * counts, screenshots, route, and timing from the journey record. Returns
   * the assigned step index so callers (e.g. flow-audit findings) can
   * reference it without maintaining a parallel counter of their own.
   */
  function checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: { readonly note?: string },
  ): Promise<number>;
  function checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  function checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> {
    return recordStep(name, action, options, (step) => {
      checkpoints.push({
        name: canonicalizeAllowlistedLabel(
          name,
          SAFE_CHECKPOINT_LABELS,
          'checkpoint',
        ),
        stepIndex: step.index,
        status: step.status,
        viewport: resolveViewport(),
      });
    });
  }

  /**
   * Record a checkpoint deliberately skipped by an `--until` stop point.
   * Not-run checkpoints have no associated step, screenshot, or timing, but
   * still ran (or would have run) inside this test's single fixed-viewport
   * browser context, so the viewport is still meaningful metadata.
   */
  function markCheckpointNotRun(name: string): void {
    checkpoints.push({
      name: canonicalizeAllowlistedLabel(
        name,
        SAFE_CHECKPOINT_LABELS,
        'checkpoint',
      ),
      stepIndex: null,
      status: 'not-run',
      viewport: resolveViewport(),
    });
  }

  /**
   * Record a known-fragile action without aborting the rest of the catalog.
   * Findings still carry the product interpretation; the failed step is just
   * the screenshot and runtime evidence.
   */
  async function softStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughSoftStepOptions,
  ): Promise<void> {
    await recordStep(title, action, {
      ...options,
      tolerant: true,
    });
  }

  /**
   * Keep the author's blocker interpretation beside the screenshot evidence
   * instead of forcing downstream reviewers to infer it from failed steps.
   */
  function finding(finding: WalkthroughFindingRecord): void {
    if (
      !FINDING_SEVERITIES.has(finding.severity) ||
      !Array.isArray(finding.steps) ||
      finding.steps.some(
        (ref) =>
          !Number.isSafeInteger(ref) ||
          ref <= 0 ||
          !steps.some((step) => step.index === ref),
      )
    ) {
      throw new Error('Walkthrough finding has invalid severity or step refs');
    }
    findings.push({
      id: canonicalizeSourceLabel(finding.id, 'finding'),
      severity: finding.severity,
      summary: canonicalizeRuntimeText(finding.summary, 'finding-summary'),
      steps: [...finding.steps],
    });
  }

  /**
   * Register an entity created by a flow so a hold-mode summary can identify
   * state left on the developer's server for inspection or cleanup.
   */
  function registerEntity(kind: string, id: string): void {
    const rawId = String(id ?? '');
    entityIds.push({
      kind: canonicalizeVocabulary(kind, SAFE_ENTITY_KINDS, 'entity-kind'),
      id: `<entity:${digest(rawId)}>`,
    });
  }

  /**
   * Register a live URL that a hold-mode summary can present for inspection.
   */
  function registerHoldUrl(label: string, url: string): void {
    holdUrls.push({
      label: canonicalizeSourceLabel(label, 'hold'),
      url: canonicalizeWalkthroughRoute(url),
    });
  }

  async function recordStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
    onRecorded?: (step: MutableStep) => void,
  ): Promise<number> {
    const surfaceName = normalizeSurfaceName(
      options?.surface ?? DEFAULT_SURFACE,
    );
    const surface = getSurface(surfaceName);
    stepCounter += 1;
    const index = stepCounter;
    const safeTitle = canonicalizeRuntimeText(title, 'step-title');
    const slug = `${String(index).padStart(2, '0')}-step-${digest(title)}`;
    const record: MutableStep = {
      index,
      slug,
      title: safeTitle,
      surface: canonicalizeVocabulary(surfaceName, SAFE_SURFACES, 'surface'),
      screenshot: null,
      route: '',
      startedAt: new Date().toISOString(),
      durationMs: 0,
      consoleErrors: [],
      pageErrors: [],
      notes: options?.note
        ? [canonicalizeRuntimeText(options.note, 'note')]
        : [],
      status: 'ok',
    };
    const begin = Date.now();
    try {
      await action(surface.page);
      await settle(surface);
      record.screenshot = await capture(surface, slug);
    } catch (error) {
      record.status = 'failed';
      record.failure = canonicalizeRuntimeText(String(error), 'failure');
      failed = true;
      record.screenshot = await capture(surface, `${slug}-FAILED`).catch(
        () => null,
      );
      if (!options?.tolerant) {
        throw error;
      }
    } finally {
      record.durationMs = Date.now() - begin;
      record.route = currentRoute(surface);
      record.consoleErrors = surface.consoleBuffer;
      record.pageErrors = surface.pageErrorBuffer;
      surface.consoleBuffer = [];
      surface.pageErrorBuffer = [];
      steps.push(record);
      onRecorded?.(record);
    }
    return index;
  }

  /** Attach a free-form usability observation to the previous step. */
  function note(text: string): void {
    const last = steps[steps.length - 1];
    if (last) {
      last.notes.push(canonicalizeRuntimeText(text, 'note'));
    }
  }

  /**
   * Persist the journey record. Call from a `finally` block so a mid-journey
   * failure still lands the partial catalog for review.
   */
  function finish(): void {
    const record: WalkthroughJourneyRecord = {
      journey: journeyLabel,
      persona: canonicalizeAllowlistedLabel(
        persona,
        SAFE_PERSONA_LABELS,
        'persona',
      ),
      viewport: resolveViewport(),
      startedAt,
      finishedAt: new Date().toISOString(),
      status: failed ? 'failed' : 'ok',
      steps,
      findings,
      ...(checkpoints.length > 0 ? { checkpoints } : {}),
      ...(entityIds.length > 0 ? { entityIds } : {}),
      ...(holdUrls.length > 0 ? { holdUrls } : {}),
    };
    const journeysDir = path.join(runDir, 'journeys');
    fs.mkdirSync(journeysDir, { recursive: true });
    fs.writeFileSync(
      path.join(journeysDir, `${journeyKey}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      'utf8',
    );
  }

  /**
   * Give the app a beat to hydrate/animate before the screenshot so captures
   * show what a user actually sees, not a mid-transition frame. Network-idle
   * is best-effort — pages with polling (multiplayer) never go idle.
   */
  async function settle(surface: WalkthroughSurface): Promise<void> {
    await surface.page
      .waitForLoadState('networkidle', { timeout: 5_000 })
      .catch(() => undefined);
    await surface.page.waitForTimeout(350);
  }

  async function capture(
    surface: WalkthroughSurface,
    slug: string,
  ): Promise<string | null> {
    const file = `${slug}.png`;
    await surface.page.screenshot({
      animations: 'disabled',
      fullPage: true,
      style: PUBLISHABLE_SCREENSHOT_STYLE,
      path: path.join(journeyDir, file),
      timeout: 15_000,
    });
    return `${journeyKey}/${file}`;
  }

  /**
   * Resolve the viewport shared by the run manifest and every per-checkpoint
   * record. Single source so both call sites can never drift apart.
   */
  function resolveViewport(): { width: number; height: number } {
    return testInfo.project.use.viewport ?? { width: 1280, height: 720 };
  }

  function currentRoute(surface: WalkthroughSurface): string {
    try {
      const route = surface.page.url();
      return canonicalizeWalkthroughRoute(route);
    } catch {
      return '';
    }
  }

  function getSurface(name: string): WalkthroughSurface {
    const surface = surfaces.get(name);
    if (!surface) {
      throw new Error(`Walkthrough surface "${name}" is not attached`);
    }
    return surface;
  }

  attachSurface(DEFAULT_SURFACE, page);
  return {
    attachSurface,
    step,
    checkpoint,
    markCheckpointNotRun,
    softStep,
    finding,
    registerEntity,
    registerHoldUrl,
    note,
    finish,
  };
}

function normalizeSurfaceName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Walkthrough surface name must not be empty');
  }
  return trimmed;
}
