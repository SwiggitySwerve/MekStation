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

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SURFACE = 'default';

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
  const journeyDir = path.join(runDir, journey);
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
        surface.consoleBuffer.push(message.text().slice(0, 500));
      }
    });
    page.on('pageerror', (error) => {
      surface.pageErrorBuffer.push(String(error).slice(0, 500));
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
        name,
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
      name,
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
    findings.push({
      ...finding,
      steps: [...finding.steps],
    });
  }

  /**
   * Register an entity created by a flow so a hold-mode summary can identify
   * state left on the developer's server for inspection or cleanup.
   */
  function registerEntity(kind: string, id: string): void {
    entityIds.push({ kind, id });
  }

  /**
   * Register a live URL that a hold-mode summary can present for inspection.
   */
  function registerHoldUrl(label: string, url: string): void {
    holdUrls.push({ label, url });
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
    const slug = `${String(index).padStart(2, '0')}-${slugify(title)}`;
    const record: MutableStep = {
      index,
      slug,
      title,
      surface: surfaceName,
      screenshot: null,
      route: '',
      startedAt: new Date().toISOString(),
      durationMs: 0,
      consoleErrors: [],
      pageErrors: [],
      notes: options?.note ? [options.note] : [],
      status: 'ok',
    };
    const begin = Date.now();
    try {
      await action(surface.page);
      await settle(surface);
      record.screenshot = await capture(surface, slug);
    } catch (error) {
      record.status = 'failed';
      record.failure = String(error).slice(0, 1000);
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
      last.notes.push(text);
    }
  }

  /**
   * Persist the journey record. Call from a `finally` block so a mid-journey
   * failure still lands the partial catalog for review.
   */
  function finish(): void {
    const record: WalkthroughJourneyRecord = {
      journey,
      persona,
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
      path.join(journeysDir, `${journey}.json`),
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
      path: path.join(journeyDir, file),
      timeout: 15_000,
    });
    return `${journey}/${file}`;
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
      return surface.page.url();
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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
