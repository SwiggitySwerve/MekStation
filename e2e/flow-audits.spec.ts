/**
 * Flow-Audit Routines — one generated Playwright test per manifest flow.
 *
 * Run via the flow-audit runner (`npm run qc:flow -- <id>`, implemented at
 * `scripts/qc/run-flow-audit.mjs`), which spawns Playwright with
 * `--project=flow-audit` plus the MEKSTATION_FLOW_* env vars below.
 * playwright.config.ts registers the `flow-audit` project ONLY when
 * MEKSTATION_FLOW_ID is set, so a bare `npm run test:e2e` / `npx playwright
 * test` (no `--project` flag) never runs this file — the other projects'
 * `testIgnore` entries (chromium, Mobile Chrome, Tablet Portrait, Tablet
 * Landscape) are defense in depth on top of that, not the primary guard.
 *
 * Each flow drives the real UI through the shared `WalkthroughRecorder`, marking
 * one recorder `checkpoint()` per manifest checkpoint in order. Selection travels
 * by env var (design D2), read once at spec-load:
 *   - MEKSTATION_FLOW_ID       run exactly one flow (others `test.skip`)
 *   - MEKSTATION_FLOW_UNTIL    stop after this checkpoint; later ones -> not-run
 *   - MEKSTATION_FLOW_VIEWPORT preset (mobile|tablet|desktop) or WxH
 *   - MEKSTATION_FLOW_HOLD     '1' = skip cleanup + register hold URLs/entity ids
 *
 * Known-fragile product surfaces (manual battle, starmap canvas, seeded
 * projections) use tolerant checkpoints plus structured findings so the flow
 * still completes with evidence rather than aborting — the same capture-tolerant
 * discipline the umbrella journey specs use.
 *
 * @spec openspec/changes/add-flow-audit-routines/specs/flow-audit-routines/spec.md
 */

import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { BREAKPOINTS } from '../src/constants/layout';
import { FLOW_MANIFEST, type IFlowDefinition } from './flows/manifest';
import {
  acceptFirstContractAction,
  createCampaignViaWizard,
  launchMissionToPreBattle,
  openContractMarketAction,
  openLaunchBriefingAction,
  openMissionListAction,
  type CampaignFlowRecorder,
} from './helpers/campaignFlow';
import { seedHiringHall } from './helpers/campaignSeeders';
import {
  WalkthroughRecorder,
  type WalkthroughFindingRecord,
  type WalkthroughStepOptions,
} from './helpers/uxWalkthrough';
import { assertNoMekStationLoading } from './helpers/wait';

// =============================================================================
// Env selection (read once at spec-load, design D2)
// =============================================================================

/** Read a trimmed non-empty env var, or null. */
function readEnv(name: string): string | null {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

const FLOW_ID_FILTER = readEnv('MEKSTATION_FLOW_ID');
const FLOW_UNTIL = readEnv('MEKSTATION_FLOW_UNTIL');
const FLOW_VIEWPORT_RAW = readEnv('MEKSTATION_FLOW_VIEWPORT');
const FLOW_HOLD = readEnv('MEKSTATION_FLOW_HOLD') === '1';

// =============================================================================
// Viewport presets (design D5 — derived from canonical breakpoints)
// =============================================================================

interface ResolvedViewport {
  readonly width: number;
  readonly height: number;
  readonly hasTouch: boolean;
  readonly label: string;
}

const VIEWPORT_PRESETS: Record<string, ResolvedViewport> = {
  // Below the SM breakpoint — iPhone-SE class device, touch enabled.
  mobile: { width: 375, height: 667, hasTouch: true, label: 'mobile' },
  // The MD breakpoint (tablet portrait) straight from the layout constants.
  tablet: {
    width: BREAKPOINTS.MD,
    height: 1024,
    hasTouch: false,
    label: 'tablet',
  },
  // Matches the existing journey desktop viewport.
  desktop: { width: 1440, height: 1000, hasTouch: false, label: 'desktop' },
};

/** Resolve the viewport env value to concrete dimensions (default desktop). */
function resolveViewport(raw: string | null): ResolvedViewport {
  if (!raw) return VIEWPORT_PRESETS.desktop;
  const preset = VIEWPORT_PRESETS[raw.toLowerCase()];
  if (preset) return preset;
  const match = raw.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (match) {
    return {
      width: Number(match[1]),
      height: Number(match[2]),
      hasTouch: false,
      label: raw,
    };
  }
  throw new Error(
    `Invalid MEKSTATION_FLOW_VIEWPORT="${raw}". Use a preset (mobile|tablet|desktop) or a WxH value.`,
  );
}

const RESOLVED_VIEWPORT = resolveViewport(FLOW_VIEWPORT_RAW);

// =============================================================================
// Recorder adapter
// =============================================================================

/**
 * Wraps `WalkthroughRecorder` so the campaign flow helpers (which expect a
 * `CampaignFlowRecorder`) share the same recorder as the flow's checkpoints.
 * `WalkthroughRecorder.step`/`checkpoint` return the real assigned step
 * index, so this adapter just forwards it — no parallel counter to desync if
 * a future call bypasses this wrapper and hits the recorder directly.
 */
class FlowRecorder implements CampaignFlowRecorder {
  constructor(private readonly recorder: WalkthroughRecorder) {}

  async step(
    title: string,
    action: (page: Page) => Promise<void>,
  ): Promise<number> {
    return this.recorder.step(title, action);
  }

  async checkpoint(
    name: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> {
    return this.recorder.checkpoint(name, action, options);
  }

  markCheckpointNotRun(name: string): void {
    this.recorder.markCheckpointNotRun(name);
  }

  finding(input: WalkthroughFindingRecord): void {
    this.recorder.finding(input);
  }

  registerEntity(kind: string, id: string): void {
    this.recorder.registerEntity(kind, id);
  }

  registerHoldUrl(label: string, url: string): void {
    this.recorder.registerHoldUrl(label, url);
  }

  finish(): void {
    this.recorder.finish();
  }
}

// =============================================================================
// Shared flow context + small UI helpers
// =============================================================================

interface FlowRunContext {
  readonly flow: IFlowDefinition;
  readonly hold: boolean;
  campaignId?: string;
  encounterId?: string;
  pilotId?: string;
  hireOfferId?: string;
}

interface FlowRunEnv {
  readonly fr: FlowRecorder;
  readonly page: Page;
  readonly ctx: FlowRunContext;
}

type FlowStageRunner = (env: FlowRunEnv) => Promise<void>;

const CAMPAIGN_DESCRIPTION =
  'Flow-audit campaign created by the flow-audit routines.';

// Count-guarded visibility check: Playwright's `.isVisible()` on a locator
// with zero matches throws in strict mode, so tolerant checkpoints need this
// to observe "the surface never rendered" as `false` instead of crashing.
async function isVisible(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  return locator.first().isVisible();
}

// Same zero-match guard as isVisible, for optional copy a tolerant checkpoint
// wants to read without aborting the flow when the surface didn't render it.
async function locatorText(locator: Locator): Promise<string | null> {
  if ((await locator.count()) === 0) return null;
  const text = await locator.first().textContent();
  return text?.trim() ?? null;
}

// The pilot-creation wizard's "Create Pilot" button redirects to the new
// pilot's detail page without returning the id any other way, so the URL is
// the only place a subsequent checkpoint can recover it from.
function pilotIdFromUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/pilots\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Could not read pilot id from ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

/**
 * Save the current campaign to the server through the dashboard save card,
 * mirroring the umbrella deep-play journey. Waits for the actual save PUT to
 * resolve rather than a loose text match — the card's "Last saved: Never
 * saved" fallback and its "Unsaved changes" badge both satisfy a bare
 * /saved|server|sync|clean/i regex even when nothing has persisted, which
 * would let a holdSafe checkpoint record `ok` with zero evidence of server
 * persistence (design D3's holdSafe honesty contract). Leaves the save
 * status synced so a subsequent holdSafe checkpoint reflects server-persisted
 * state, matching the `saveCampaignThroughDashboard` pattern already used in
 * campaign-flow.spec.ts / gm-campaign-ledger-control-plane.spec.ts.
 */
async function saveCampaignToServer(
  page: Page,
  campaignId: string,
): Promise<void> {
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  const saveNow = page.getByTestId('campaign-save-now-btn');
  if (await isVisible(saveNow)) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/campaigns/${campaignId}`) &&
          response.status() === 200,
        { timeout: 30_000 },
      ),
      saveNow.click(),
    ]);
  }
  await expect(page.getByTestId('campaign-last-saved')).not.toContainText(
    'Never saved',
    { timeout: 5_000 },
  );
}

/**
 * Give the campaign autosave debounce a beat to flush. Campaign command
 * mutations mark the persistence store dirty and re-arm the debounce
 * (campaignPersistenceWiring), so a short settle keeps holdSafe checkpoints
 * honest without racing config collection.
 */
async function settleAutosave(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2_000);
}

/** Register the current screen URL when the checkpoint is hold-safe. */
function maybeHold(env: FlowRunEnv, name: string): void {
  if (!env.ctx.hold) return;
  const checkpoint = env.ctx.flow.checkpoints.find((cp) => cp.name === name);
  if (checkpoint?.holdSafe) {
    env.fr.registerHoldUrl(name, env.page.url());
  }
}

/** Advance the campaign one day from the dashboard (either advance control). */
async function advanceOneDay(page: Page): Promise<void> {
  const oneDay = page.getByTestId('day-advance-one-day');
  const advance = (await isVisible(oneDay))
    ? oneDay
    : page.getByTestId('advance-day-btn');
  await expect(advance).toBeVisible({ timeout: 20_000 });
  await advance.click();
  await page.waitForTimeout(1_500);
}

// =============================================================================
// Repair inventory seeder (equivalent of campaignSeeders.seedRepairTickets, but
// targeting the projection the repair-bay page actually reads)
// =============================================================================

interface FlowRepairTicket {
  readonly ticketId: string;
  readonly unitId: string;
  readonly kind: string;
  readonly location: string | null;
  readonly expectedHours: number;
  readonly partsReady: boolean;
  readonly status: string;
}

const SAMPLE_REPAIR_TICKETS: readonly FlowRepairTicket[] = [
  {
    ticketId: 'flow-repair-1',
    unitId: 'flow-unit-alpha',
    kind: 'armor',
    location: 'Left Torso',
    expectedHours: 6,
    partsReady: true,
    status: 'queued',
  },
  {
    ticketId: 'flow-repair-2',
    unitId: 'flow-unit-alpha',
    kind: 'structure',
    location: 'Center Torso',
    expectedHours: 10,
    partsReady: false,
    status: 'parts-needed',
  },
];

/**
 * Seed the campaign inventory projection the repair-bay page renders. The
 * existing `seedRepairTickets` helper writes a `repairBay.tickets` shape the
 * page does not read; the repair-bay UI reads `campaign.campaignInventory`
 * (selectRepairBay), so this seeds that structure directly. The projection is
 * NOT serialized to the server, hence the checkpoints are `holdSafe: false`.
 */
async function seedRepairInventory(
  page: Page,
  campaignId: string,
  tickets: readonly FlowRepairTicket[],
): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as unknown as { __ZUSTAND_STORES__?: Record<string, unknown> })
          .__ZUSTAND_STORES__?.campaign,
      ),
    undefined,
    { timeout: 15_000 },
  );

  await page.evaluate(
    ({ campaignId: id, tickets: rows }) => {
      const stores = (
        window as unknown as { __ZUSTAND_STORES__?: Record<string, unknown> }
      ).__ZUSTAND_STORES__;
      const raw = stores?.campaign as unknown;
      const storeApi =
        raw !== null &&
        (typeof raw === 'object' || typeof raw === 'function') &&
        'getState' in (raw as object)
          ? (raw as { getState: () => unknown })
          : (raw as () => { getState: () => unknown })();
      const state = storeApi.getState() as {
        updateCampaign: (updates: Record<string, unknown>) => void;
      };
      const totalHours = rows.reduce(
        (sum, ticket) => sum + ticket.expectedHours,
        0,
      );
      state.updateCampaign({
        campaignInventory: {
          campaignId: id,
          generatedAt: new Date().toISOString(),
          repairBay: rows,
          salvageBay: [],
          medicalBay: [],
          summary: {
            repairTicketCount: rows.length,
            totalRepairHours: totalHours,
            salvageValueTotal: 0,
            pilotsInMedical: 0,
          },
        },
      });
    },
    { campaignId, tickets },
  );
}

// =============================================================================
// Reusable stage building blocks
// =============================================================================

/** Create a campaign via the wizard and register its id. */
async function createCampaign(env: FlowRunEnv): Promise<string> {
  const campaign = await createCampaignViaWizard(env.fr, env.page, {
    name: `Flow ${env.ctx.flow.id} ${Date.now()}`,
    description: CAMPAIGN_DESCRIPTION,
  });
  env.ctx.campaignId = campaign.campaignId;
  env.fr.registerEntity('campaign', campaign.campaignId);
  return campaign.campaignId;
}

/** Create + save a campaign as one bundled checkpoint (flows 2–5). */
async function createSavedCampaignStage(
  env: FlowRunEnv,
  checkpointName: string,
): Promise<void> {
  await createCampaign(env);
  await env.fr.checkpoint(checkpointName, async (page) => {
    await saveCampaignToServer(page, env.ctx.campaignId!);
  });
  maybeHold(env, checkpointName);
}

/**
 * Open the contract market and accept the first available contract. Reuses
 * the same action bodies `acceptContractAndOpenLaunch` composes from
 * (campaignFlow.ts) so this stays byte-identical to the umbrella journeys'
 * behavior instead of re-implementing the DOM steps; the checkpoint boundary
 * is decided here (the accept action), not in the shared helper.
 */
async function acceptFirstContractStage(
  env: FlowRunEnv,
  checkpointName: string,
): Promise<void> {
  const { fr, page, ctx } = env;
  await fr.step('open contract market', (p) =>
    openContractMarketAction(p, ctx.campaignId!),
  );
  await fr.checkpoint(checkpointName, (p) => acceptFirstContractAction(p));
  await settleAutosave(page);
  maybeHold(env, checkpointName);
}

/**
 * Open the mission list and the launch briefing for the active contract.
 * Reuses the same action bodies the `mission-launch-briefing` checkpoint
 * stage below uses, so both call sites share one implementation.
 */
async function openMissionLaunchBriefing(env: FlowRunEnv): Promise<void> {
  const { fr, ctx } = env;
  await fr.step('open campaign missions', (p) =>
    openMissionListAction(p, ctx.campaignId!),
  );
  await fr.step('open mission launch briefing', (p) =>
    openLaunchBriefingAction(p),
  );
}

// =============================================================================
// Flow stage implementations (one runner per manifest checkpoint)
// =============================================================================

const FLOW_STAGES: Record<string, Record<string, FlowStageRunner>> = {
  'campaign-create-to-launch': {
    'wizard-complete': async (env) => {
      await createCampaign(env);
      await env.fr.checkpoint('wizard-complete', async (page) => {
        await expect(page.getByTestId('campaign-save-status-card')).toBeVisible(
          {
            timeout: 20_000,
          },
        );
        await assertNoMekStationLoading(page);
      });
    },
    'campaign-saved': async (env) => {
      await env.fr.checkpoint('campaign-saved', async (page) => {
        await saveCampaignToServer(page, env.ctx.campaignId!);
      });
      maybeHold(env, 'campaign-saved');
    },
    'starmap-viewed': async (env) => {
      const step = await env.fr.checkpoint(
        'starmap-viewed',
        async (page) => {
          await page.goto(`/gameplay/campaigns/${env.ctx.campaignId}/starmap`);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1_000);
          await expect(
            page
              .getByTestId('starmap-container')
              .or(page.getByTestId('page-title'))
              .first(),
          ).toBeVisible({ timeout: 20_000 });
        },
        { tolerant: true },
      );
      const rendered = await isVisible(
        env.page.getByTestId('starmap-container'),
      );
      env.fr.finding({
        id: rendered ? 'FLOW-STARMAP-OK' : 'FLOW-STARMAP',
        severity: rendered ? 'minor' : 'moderate',
        summary: `Starmap surface captured; canvas container rendered=${rendered}.`,
        steps: [step],
      });
      maybeHold(env, 'starmap-viewed');
    },
    'contract-accepted': async (env) => {
      await acceptFirstContractStage(env, 'contract-accepted');
    },
    'mission-launch-briefing': async (env) => {
      const { fr, ctx } = env;
      await fr.step('open campaign missions', (p) =>
        openMissionListAction(p, ctx.campaignId!),
      );
      await fr.checkpoint('mission-launch-briefing', (p) =>
        openLaunchBriefingAction(p),
      );
      maybeHold(env, 'mission-launch-briefing');
    },
  },

  'battle-turn-loop': {
    'campaign-saved': async (env) => {
      await createSavedCampaignStage(env, 'campaign-saved');
    },
    'contract-accepted': async (env) => {
      await acceptFirstContractStage(env, 'contract-accepted');
    },
    'pre-battle-roster': async (env) => {
      const { fr, page, ctx } = env;
      await openMissionLaunchBriefing(env);
      const { observation } = await launchMissionToPreBattle(fr, page, {});
      ctx.encounterId = observation.encounterId;
      fr.registerEntity('encounter', observation.encounterId);
      await fr.checkpoint('pre-battle-roster', async (p) => {
        await expect(p.getByTestId('pre-battle-page')).toBeVisible({
          timeout: 20_000,
        });
      });
      maybeHold(env, 'pre-battle-roster');
    },
    'battle-mounted': async (env) => {
      const step = await env.fr.checkpoint(
        'battle-mounted',
        async (page) => {
          await page.getByTestId('play-manually-btn').click();
          await page.waitForURL(/\/gameplay\/games\/[^/?#]+/, {
            timeout: 30_000,
          });
          await expect(page.getByTestId('game-session')).toBeVisible({
            timeout: 30_000,
          });
        },
        { tolerant: true },
      );
      const mounted = await isVisible(env.page.getByTestId('game-session'));
      env.fr.finding({
        id: mounted ? 'FLOW-BATTLE-MOUNTED' : 'FLOW-BATTLE-MOUNT-FAILED',
        severity: mounted ? 'minor' : 'major',
        summary: `Manual battle mount attempted; game session visible=${mounted}.`,
        steps: [step],
      });
    },
    'initiative-rolled': async (env) => {
      const step = await env.fr.checkpoint(
        'initiative-rolled',
        async (page) => {
          const advance = page.getByTestId('sp-advance-phase-button');
          if (await isVisible(advance)) {
            await advance.click();
            await page.waitForTimeout(1_000);
          }
          await expect(page.getByTestId('game-session')).toBeVisible({
            timeout: 15_000,
          });
        },
        { tolerant: true },
      );
      const phase = await locatorText(env.page.getByTestId('phase-name'));
      env.fr.finding({
        id: 'FLOW-BATTLE-INITIATIVE',
        severity: 'minor',
        summary: `Initiative/advance probe captured; phase=${phase ?? 'unavailable'} (known-fragile SP surface).`,
        steps: [step],
      });
    },
    'first-movement-locked': async (env) => {
      const step = await env.fr.checkpoint(
        'first-movement-locked',
        async (page) => {
          const railUnit = page.locator('[data-testid^="rail-unit-"]').first();
          if (await isVisible(railUnit)) {
            await railUnit.click();
            await page.waitForTimeout(300);
          }
          const hex = page
            .locator('[data-testid^="hex-overlay-"], [data-testid^="hex-"]')
            .first();
          if (await isVisible(hex)) {
            await hex.click({ force: true });
            await page.waitForTimeout(300);
          }
          const budget = page
            .locator('[data-testid^="budget-option-"]')
            .first();
          if (await isVisible(budget)) {
            await budget.click();
            await page.waitForTimeout(300);
          }
          const lockIn = page.getByTestId('movement-lock-in-btn');
          if ((await isVisible(lockIn)) && (await lockIn.isEnabled())) {
            await lockIn.click();
            await page.waitForTimeout(1_000);
          }
          await expect(page.getByTestId('game-session')).toBeVisible({
            timeout: 15_000,
          });
        },
        { tolerant: true },
      );
      const locked = !(await isVisible(
        env.page.getByTestId('movement-lock-in-btn'),
      ));
      env.fr.finding({
        id: 'FLOW-BATTLE-MOVEMENT',
        severity: 'minor',
        summary: `First-movement lock attempted; lock-in control cleared=${locked} (known-fragile SP surface).`,
        steps: [step],
      });
    },
  },

  'economy-contract-to-ledger': {
    'campaign-saved': async (env) => {
      await createSavedCampaignStage(env, 'campaign-saved');
    },
    'contract-accepted': async (env) => {
      await acceptFirstContractStage(env, 'contract-accepted');
    },
    'day-advanced': async (env) => {
      const { fr, page, ctx } = env;
      await fr.step('open campaign dashboard', async (p) => {
        await p.goto(`/gameplay/campaigns/${ctx.campaignId}`);
        await expect(p.getByTestId('campaign-save-status-card')).toBeVisible({
          timeout: 20_000,
        });
      });
      await fr.checkpoint('day-advanced', async (p) => {
        await advanceOneDay(p);
      });
      await settleAutosave(page);
      maybeHold(env, 'day-advanced');
    },
    'ledger-posted': async (env) => {
      const step = await env.fr.checkpoint('ledger-posted', async (page) => {
        await page.goto(`/gameplay/campaigns/${env.ctx.campaignId}/finances`);
        await expect(page.getByTestId('finances-panel')).toBeVisible({
          timeout: 20_000,
        });
        await assertNoMekStationLoading(page);
      });
      const hasLedger =
        (await env.page.getByTestId('finances-ledger').count()) > 0;
      env.fr.finding({
        id: 'FLOW-ECONOMY-LEDGER',
        severity: 'minor',
        summary: `Finances surface rendered; transaction ledger present=${hasLedger}.`,
        steps: [step],
      });
      maybeHold(env, 'ledger-posted');
    },
  },

  'maintenance-repair-cycle': {
    'campaign-saved': async (env) => {
      await createSavedCampaignStage(env, 'campaign-saved');
    },
    'repair-tickets-seeded': async (env) => {
      const { fr, ctx } = env;
      await fr.step('open repair bay before seeding tickets', async (p) => {
        await p.goto(`/gameplay/campaigns/${ctx.campaignId}/repair-bay`);
        await expect(p.getByTestId('page-title')).toBeVisible({
          timeout: 20_000,
        });
      });
      await fr.checkpoint('repair-tickets-seeded', async (p) => {
        await seedRepairInventory(p, ctx.campaignId!, SAMPLE_REPAIR_TICKETS);
      });
    },
    'repair-bay-queue': async (env) => {
      const step = await env.fr.checkpoint(
        'repair-bay-queue',
        async (page) => {
          await expect(page.getByTestId('repair-bay-queue')).toBeVisible({
            timeout: 15_000,
          });
        },
        { tolerant: true },
      );
      const queueVisible = await isVisible(
        env.page.getByTestId('repair-bay-queue'),
      );
      env.fr.finding({
        id: 'FLOW-MAINTENANCE-QUEUE',
        severity: 'minor',
        summary: `Repair-bay queue rendered from the seeded inventory projection: visible=${queueVisible} (browser-only projection, not server-persisted).`,
        steps: [step],
      });
    },
    'repair-progressed': async (env) => {
      const { fr, ctx } = env;
      const step = await fr.checkpoint(
        'repair-progressed',
        async (page) => {
          await page.goto(`/gameplay/campaigns/${ctx.campaignId}`);
          await advanceOneDay(page);
          await page.goto(`/gameplay/campaigns/${ctx.campaignId}/repair-bay`);
          await expect(page.getByTestId('page-title')).toBeVisible({
            timeout: 20_000,
          });
        },
        { tolerant: true },
      );
      const stillVisible = await isVisible(
        env.page.getByTestId('repair-bay-queue'),
      );
      fr.finding({
        id: 'FLOW-MAINTENANCE-PROGRESS',
        severity: 'minor',
        summary: `After advancing a day the inventory re-projects from combat state; seeded repair queue still visible=${stillVisible}.`,
        steps: [step],
      });
    },
  },

  'personnel-hiring': {
    'campaign-saved': async (env) => {
      await createSavedCampaignStage(env, 'campaign-saved');
    },
    'hiring-hall-seeded': async (env) => {
      const { fr, page, ctx } = env;
      const offerId = `flow-hire-${Date.now()}`;
      ctx.hireOfferId = offerId;
      await fr.step('open hiring hall', async (p) => {
        await p.goto(`/gameplay/campaigns/${ctx.campaignId}/hiring`);
        await expect(p.getByTestId('page-title')).toBeVisible({
          timeout: 20_000,
        });
      });
      await fr.checkpoint('hiring-hall-seeded', async (p) => {
        await seedHiringHall(p, [
          {
            offerId,
            pilotName: 'Flow Audit Recruit',
            hireBonus: 25_000,
          },
        ]);
        await expect(p.getByTestId(`candidate-card-${offerId}`)).toBeVisible({
          timeout: 15_000,
        });
      });
      await settleAutosave(page);
      maybeHold(env, 'hiring-hall-seeded');
    },
    'candidate-hired': async (env) => {
      const { fr, page, ctx } = env;
      const offerId = ctx.hireOfferId ?? '';
      const step = await fr.checkpoint(
        'candidate-hired',
        async (p) => {
          const hireBtn = p.getByTestId(`candidate-hire-${offerId}`);
          await expect(hireBtn).toBeVisible({ timeout: 15_000 });
          await hireBtn.click();
          await p.waitForTimeout(1_000);
        },
        { tolerant: true },
      );
      await settleAutosave(page);
      const stillListed = await isVisible(
        page.getByTestId(`candidate-card-${offerId}`),
      );
      fr.finding({
        id: 'FLOW-PERSONNEL-HIRE',
        severity: 'minor',
        summary: `Hire action fired for offer ${offerId}; candidate still listed=${stillListed}.`,
        steps: [step],
      });
      maybeHold(env, 'candidate-hired');
    },
    'roster-updated': async (env) => {
      const step = await env.fr.checkpoint('roster-updated', async (page) => {
        await page.goto(`/gameplay/campaigns/${env.ctx.campaignId}/personnel`);
        await expect(page.getByTestId('page-title')).toBeVisible({
          timeout: 20_000,
        });
        await assertNoMekStationLoading(page);
      });
      const recruitVisible = await isVisible(
        env.page.getByText('Flow Audit Recruit'),
      );
      env.fr.finding({
        id: 'FLOW-PERSONNEL-ROSTER',
        severity: 'minor',
        summary: `Personnel roster surface rendered after hire; hired recruit visible=${recruitVisible}.`,
        steps: [step],
      });
      maybeHold(env, 'roster-updated');
    },
  },

  'pilot-xp-progression': {
    'pilot-created': async (env) => {
      const { fr } = env;
      await fr.step('open pilot creation wizard', async (p) => {
        await p.goto('/gameplay/pilots/create');
        await expect(
          p.getByRole('heading', { name: 'Choose Creation Mode' }),
        ).toBeVisible({ timeout: 20_000 });
      });
      await fr.step('choose template creation mode', async (p) => {
        await p.getByRole('button', { name: /Template/ }).click();
        await p.getByRole('button', { name: 'Continue' }).click();
        await expect(
          p.getByRole('heading', { name: 'Pilot Identity' }),
        ).toBeVisible({ timeout: 10_000 });
      });
      await fr.step('name the pilot and continue', async (p) => {
        await p
          .getByPlaceholder('Enter pilot name')
          .fill(`Flow Audit Pilot ${Date.now()}`);
        await p.getByRole('button', { name: 'Continue' }).click();
        await expect(
          p.getByRole('heading', { name: 'Select Experience Level' }),
        ).toBeVisible({ timeout: 10_000 });
      });
      await fr.step('keep default experience template', async (p) => {
        await p.getByRole('button', { name: 'Continue' }).click();
        await expect(
          p.getByRole('button', { name: 'Create Pilot' }),
        ).toBeVisible({ timeout: 10_000 });
      });
      await fr.checkpoint('pilot-created', async (p) => {
        await p.getByRole('button', { name: 'Create Pilot' }).click();
        await p.waitForURL(/\/gameplay\/pilots\/[^/?#]+/, { timeout: 30_000 });
      });
      const pilotId = pilotIdFromUrl(env.page);
      env.ctx.pilotId = pilotId;
      fr.registerEntity('pilot', pilotId);
      maybeHold(env, 'pilot-created');
    },
    'pilot-detail-viewed': async (env) => {
      await env.fr.checkpoint('pilot-detail-viewed', async (page) => {
        await page.goto(`/gameplay/pilots/${env.ctx.pilotId}`);
        await expect(
          page.getByRole('button', { name: 'Career History' }),
        ).toBeVisible({ timeout: 20_000 });
      });
      maybeHold(env, 'pilot-detail-viewed');
    },
    'xp-surface-viewed': async (env) => {
      const step = await env.fr.checkpoint(
        'xp-surface-viewed',
        async (page) => {
          await page.goto(`/gameplay/pilots/${env.ctx.pilotId}?tab=career`);
          await expect(
            page.getByRole('heading', { name: 'Career History' }),
          ).toBeVisible({ timeout: 20_000 });
          await expect(page.getByText(/Event timeline for/i)).toBeVisible({
            timeout: 20_000,
          });
        },
      );
      env.fr.finding({
        id: 'FLOW-PILOT-XP',
        severity: 'minor',
        summary: 'Pilot career/XP surface rendered via the ?tab=career route.',
        steps: [step],
      });
      maybeHold(env, 'xp-surface-viewed');
    },
  },
};

// =============================================================================
// Executor
// =============================================================================

/**
 * Drive one flow's checkpoints in manifest order. After the `--until`
 * checkpoint completes, the remaining checkpoints are recorded `not-run` and
 * the test ends cleanly (spec: Until Semantics). A non-tolerant checkpoint
 * failure also backfills every LATER manifest checkpoint as `not-run` (reusing
 * the same emission path) before rethrowing, so journeys/<flow>.json and
 * summary.json always account for every manifest checkpoint instead of the
 * ones after the failure silently vanishing.
 */
async function executeFlow(
  env: FlowRunEnv,
  until: string | null,
): Promise<void> {
  const { flow } = env.ctx;

  if (until && !flow.checkpoints.some((cp) => cp.name === until)) {
    throw new Error(
      `Unknown MEKSTATION_FLOW_UNTIL="${until}" for flow "${flow.id}". Valid checkpoints: ${flow.checkpoints
        .map((cp) => cp.name)
        .join(', ')}`,
    );
  }

  const stages = FLOW_STAGES[flow.id];
  if (!stages) {
    throw new Error(`No stage implementation registered for flow "${flow.id}"`);
  }

  let stopped = false;
  for (let i = 0; i < flow.checkpoints.length; i += 1) {
    const checkpoint = flow.checkpoints[i];
    if (stopped) {
      env.fr.markCheckpointNotRun(checkpoint.name);
      continue;
    }
    const stage = stages[checkpoint.name];
    if (!stage) {
      throw new Error(
        `Flow "${flow.id}" has no runner for manifest checkpoint "${checkpoint.name}"`,
      );
    }
    try {
      await stage(env);
    } catch (error) {
      // The failing checkpoint itself is already recorded `failed` (the
      // recorder's `checkpoint()` records before rethrowing on a non-tolerant
      // failure) — this loop just never reaches the checkpoints after it, so
      // without this backfill they would simply be missing from the journey
      // record instead of reading `not-run`. Rethrow so the test stays red.
      for (let j = i + 1; j < flow.checkpoints.length; j += 1) {
        env.fr.markCheckpointNotRun(flow.checkpoints[j].name);
      }
      throw error;
    }
    if (until && checkpoint.name === until) {
      stopped = true;
    }
  }
}

// =============================================================================
// Generated tests (one per manifest flow, title = flow id)
// =============================================================================

test.describe('flow audits', () => {
  for (const flow of FLOW_MANIFEST) {
    test(flow.id, async ({ browser }) => {
      test.skip(
        FLOW_ID_FILTER !== null && flow.id !== FLOW_ID_FILTER,
        `MEKSTATION_FLOW_ID=${FLOW_ID_FILTER ?? ''} selected; skipping ${flow.id}`,
      );
      test.setTimeout(600_000);

      const context = await browser.newContext({
        viewport: {
          width: RESOLVED_VIEWPORT.width,
          height: RESOLVED_VIEWPORT.height,
        },
        hasTouch: RESOLVED_VIEWPORT.hasTouch,
      });
      const page = await context.newPage();

      // The recorder records `testInfo.project.use.viewport`; the flow run picks
      // its viewport from the env var, so hand the recorder a shim carrying the
      // resolved dimensions instead of the (fixed) project default.
      const recorderTestInfo = {
        project: {
          use: {
            viewport: {
              width: RESOLVED_VIEWPORT.width,
              height: RESOLVED_VIEWPORT.height,
            },
          },
        },
      } as unknown as TestInfo;

      const recorder = new WalkthroughRecorder(
        page,
        flow.id,
        flow.description,
        recorderTestInfo,
      );
      const fr = new FlowRecorder(recorder);
      const ctx: FlowRunContext = { flow, hold: FLOW_HOLD };
      const env: FlowRunEnv = { fr, page, ctx };

      try {
        await executeFlow(env, FLOW_UNTIL);
      } finally {
        fr.finish();
        // Hold mode leaves server-persisted state in place; closing the browser
        // context does not delete dev-server rows, only the local browser.
        await context.close();
      }
    });
  }
});
