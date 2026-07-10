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

export class WalkthroughRecorder {
  private readonly steps: MutableStep[] = [];
  private readonly findings: WalkthroughFindingRecord[] = [];
  private readonly checkpoints: WalkthroughCheckpointRecord[] = [];
  private readonly entityIds: WalkthroughEntityRecord[] = [];
  private readonly holdUrls: WalkthroughHoldUrlRecord[] = [];
  private readonly surfaces = new Map<string, WalkthroughSurface>();
  private readonly journeyDir: string;
  private readonly runDir: string;
  private readonly startedAt: string;
  private stepCounter = 0;
  private failed = false;

  constructor(
    page: Page,
    private readonly journey: string,
    private readonly persona: string,
    private readonly testInfo: TestInfo,
  ) {
    this.runDir = resolveRunDir();
    this.journeyDir = path.join(this.runDir, journey);
    fs.mkdirSync(this.journeyDir, { recursive: true });
    this.startedAt = new Date().toISOString();

    this.attachSurface(DEFAULT_SURFACE, page);
  }

  /**
   * Register another browser surface so one journey can tell a single
   * interleaved host/guest story without splitting the evidence catalog.
   */
  attachSurface(name: string, page: Page): void {
    const surfaceName = normalizeSurfaceName(name);
    if (this.surfaces.has(surfaceName)) {
      throw new Error(
        `Walkthrough surface "${surfaceName}" is already attached`,
      );
    }
    let existingPageSurface: string | null = null;
    this.surfaces.forEach((surface, existingName) => {
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
    this.surfaces.set(surfaceName, surface);

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
  async step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: { readonly note?: string },
  ): Promise<number>;
  async step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  async step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> {
    return this.recordStep(title, action, options);
  }

  /**
   * Execute a named flow checkpoint and record the same evidence as a step.
   * The resulting checkpoint points to its step so runners can join error
   * counts, screenshots, route, and timing from the journey record. Returns
   * the assigned step index so callers (e.g. flow-audit findings) can
   * reference it without maintaining a parallel counter of their own.
   */
  async checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: { readonly note?: string },
  ): Promise<number>;
  async checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  async checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> {
    return this.recordStep(name, action, options, (step) => {
      this.checkpoints.push({
        name,
        stepIndex: step.index,
        status: step.status,
      });
    });
  }

  /**
   * Record a checkpoint deliberately skipped by an `--until` stop point.
   * Not-run checkpoints have no associated step, screenshot, or timing.
   */
  markCheckpointNotRun(name: string): void {
    this.checkpoints.push({
      name,
      stepIndex: null,
      status: 'not-run',
    });
  }

  /**
   * Record a known-fragile action without aborting the rest of the catalog.
   * Findings still carry the product interpretation; the failed step is just
   * the screenshot and runtime evidence.
   */
  async softStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughSoftStepOptions,
  ): Promise<void> {
    await this.recordStep(title, action, {
      ...options,
      tolerant: true,
    });
  }

  /**
   * Keep the author's blocker interpretation beside the screenshot evidence
   * instead of forcing downstream reviewers to infer it from failed steps.
   */
  finding(finding: WalkthroughFindingRecord): void {
    this.findings.push({
      ...finding,
      steps: [...finding.steps],
    });
  }

  /**
   * Register an entity created by a flow so a hold-mode summary can identify
   * state left on the developer's server for inspection or cleanup.
   */
  registerEntity(kind: string, id: string): void {
    this.entityIds.push({ kind, id });
  }

  /**
   * Register a live URL that a hold-mode summary can present for inspection.
   */
  registerHoldUrl(label: string, url: string): void {
    this.holdUrls.push({ label, url });
  }

  private async recordStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
    onRecorded?: (step: MutableStep) => void,
  ): Promise<number> {
    const surfaceName = normalizeSurfaceName(
      options?.surface ?? DEFAULT_SURFACE,
    );
    const surface = this.getSurface(surfaceName);
    this.stepCounter += 1;
    const index = this.stepCounter;
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
      await this.settle(surface);
      record.screenshot = await this.capture(surface, slug);
    } catch (error) {
      record.status = 'failed';
      record.failure = String(error).slice(0, 1000);
      this.failed = true;
      record.screenshot = await this.capture(surface, `${slug}-FAILED`).catch(
        () => null,
      );
      if (!options?.tolerant) {
        throw error;
      }
    } finally {
      record.durationMs = Date.now() - begin;
      record.route = this.currentRoute(surface);
      record.consoleErrors = surface.consoleBuffer;
      record.pageErrors = surface.pageErrorBuffer;
      surface.consoleBuffer = [];
      surface.pageErrorBuffer = [];
      this.steps.push(record);
      onRecorded?.(record);
    }
    return index;
  }

  /** Attach a free-form usability observation to the previous step. */
  note(text: string): void {
    const last = this.steps[this.steps.length - 1];
    if (last) {
      last.notes.push(text);
    }
  }

  /**
   * Persist the journey record. Call from a `finally` block so a mid-journey
   * failure still lands the partial catalog for review.
   */
  finish(): void {
    const record: WalkthroughJourneyRecord = {
      journey: this.journey,
      persona: this.persona,
      viewport: this.testInfo.project.use.viewport ?? {
        width: 1280,
        height: 720,
      },
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      status: this.failed ? 'failed' : 'ok',
      steps: this.steps,
      findings: this.findings,
      ...(this.checkpoints.length > 0 ? { checkpoints: this.checkpoints } : {}),
      ...(this.entityIds.length > 0 ? { entityIds: this.entityIds } : {}),
      ...(this.holdUrls.length > 0 ? { holdUrls: this.holdUrls } : {}),
    };
    const journeysDir = path.join(this.runDir, 'journeys');
    fs.mkdirSync(journeysDir, { recursive: true });
    fs.writeFileSync(
      path.join(journeysDir, `${this.journey}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      'utf8',
    );
  }

  /**
   * Give the app a beat to hydrate/animate before the screenshot so captures
   * show what a user actually sees, not a mid-transition frame. Network-idle
   * is best-effort — pages with polling (multiplayer) never go idle.
   */
  private async settle(surface: WalkthroughSurface): Promise<void> {
    await surface.page
      .waitForLoadState('networkidle', { timeout: 5_000 })
      .catch(() => undefined);
    await surface.page.waitForTimeout(350);
  }

  private async capture(
    surface: WalkthroughSurface,
    slug: string,
  ): Promise<string | null> {
    const file = `${slug}.png`;
    await surface.page.screenshot({
      animations: 'disabled',
      fullPage: true,
      path: path.join(this.journeyDir, file),
      timeout: 15_000,
    });
    return `${this.journey}/${file}`;
  }

  private currentRoute(surface: WalkthroughSurface): string {
    try {
      return surface.page.url();
    } catch {
      return '';
    }
  }

  private getSurface(name: string): WalkthroughSurface {
    const surface = this.surfaces.get(name);
    if (!surface) {
      throw new Error(`Walkthrough surface "${name}" is not attached`);
    }
    return surface;
  }
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
