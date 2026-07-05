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

export interface WalkthroughStepRecord {
  readonly index: number;
  readonly slug: string;
  readonly title: string;
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

export interface WalkthroughJourneyRecord {
  readonly journey: string;
  readonly persona: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: 'ok' | 'failed';
  readonly steps: readonly WalkthroughStepRecord[];
}

interface MutableStep {
  index: number;
  slug: string;
  title: string;
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
  private readonly journeyDir: string;
  private readonly runDir: string;
  private readonly startedAt: string;
  private consoleBuffer: string[] = [];
  private pageErrorBuffer: string[] = [];
  private stepCounter = 0;
  private failed = false;

  constructor(
    private readonly page: Page,
    private readonly journey: string,
    private readonly persona: string,
    private readonly testInfo: TestInfo,
  ) {
    this.runDir = resolveRunDir();
    this.journeyDir = path.join(this.runDir, journey);
    fs.mkdirSync(this.journeyDir, { recursive: true });
    this.startedAt = new Date().toISOString();

    // Buffer console/page errors between steps so each step record carries the
    // errors that surfaced while a normal user performed that step.
    page.on('console', (message) => {
      if (message.type() === 'error') {
        this.consoleBuffer.push(message.text().slice(0, 500));
      }
    });
    page.on('pageerror', (error) => {
      this.pageErrorBuffer.push(String(error).slice(0, 500));
    });
  }

  /**
   * Execute one user-visible action, then settle + screenshot + record it.
   * On failure the step is recorded (with a failure screenshot when possible)
   * and the error is rethrown so the journey test fails honestly.
   */
  async step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: { readonly note?: string },
  ): Promise<void> {
    this.stepCounter += 1;
    const index = this.stepCounter;
    const slug = `${String(index).padStart(2, '0')}-${slugify(title)}`;
    const record: MutableStep = {
      index,
      slug,
      title,
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
      await action(this.page);
      await this.settle();
      record.screenshot = await this.capture(slug);
    } catch (error) {
      record.status = 'failed';
      record.failure = String(error).slice(0, 1000);
      this.failed = true;
      record.screenshot = await this.capture(`${slug}-FAILED`).catch(
        () => null,
      );
      throw error;
    } finally {
      record.durationMs = Date.now() - begin;
      record.route = this.currentRoute();
      record.consoleErrors = this.consoleBuffer;
      record.pageErrors = this.pageErrorBuffer;
      this.consoleBuffer = [];
      this.pageErrorBuffer = [];
      this.steps.push(record);
    }
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
  private async settle(): Promise<void> {
    await this.page
      .waitForLoadState('networkidle', { timeout: 5_000 })
      .catch(() => undefined);
    await this.page.waitForTimeout(350);
  }

  private async capture(slug: string): Promise<string | null> {
    const file = `${slug}.png`;
    await this.page.screenshot({
      animations: 'disabled',
      fullPage: true,
      path: path.join(this.journeyDir, file),
      timeout: 15_000,
    });
    return `${this.journey}/${file}`;
  }

  private currentRoute(): string {
    try {
      return this.page.url();
    } catch {
      return '';
    }
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
