/**
 * Day-loop driver for the headless campaign fast-forward suites.
 *
 * Why: `useCampaignStore`'s `advanceDay` is the ONLY production path that
 * runs the registered day pipeline (`registerBuiltinProcessors()` +
 * `getDayPipeline().processDay(campaign)`, `useCampaignStore.dayActions.ts:
 * 181-252`) with the store's combat-outcome-bus subscription and
 * `pendingBattleOutcomes` drain wired in. `src/lib/campaign/dayAdvancement.ts`'s
 * top-level `advanceDay`/`advanceDays` are an explicitly-documented
 * "registry-free fallback" for callers that bypass the store — driving a
 * multi-day campaign run through fast-forward via that fallback would skip
 * `scenarioEncounterBridgeProcessor`, `postBattleProcessor`, and every other
 * registered processor, defeating the entire point of this capability. This
 * module therefore imports nothing from `dayAdvancement.ts` (task 2.2's grep
 * gate enforces the absence literally) and loops `useCampaignStore().advanceDay()`
 * instead.
 *
 * Design D5 (`openspec/changes/add-campaign-fast-forward-api/design.md`)
 * governs two hard rules this driver implements:
 *
 *  1. **Subscription liveness** — `useCampaignStore()` (the singleton
 *     getter, `useCampaignStore.ts:135-148`) MUST be touched before any
 *     battle publishes a `CombatOutcomeReady` event, or the store never
 *     registers its bus listener and outcomes vanish silently. The setup
 *     step below touches the store (and loads the run's campaign into it
 *     via the real `switchCampaign` action, never a raw `setState` bypass)
 *     before the day loop starts.
 *  2. **Drain-before-return** — a battle fought during day K is enqueued
 *     onto `pendingBattleOutcomes` and is only *applied* by
 *     `postBattleProcessor` on day K+1 (`postBattleProcessor.ts:295-332`).
 *     After the requested day count, this driver keeps advancing
 *     ("drain days") until the queue is empty, and reports how many it
 *     took, so a caller can never mistake an unapplied outcome for a
 *     finished run.
 *
 * The combat runner itself (group 3 of this change) does not exist yet.
 * Per task 2.1, the hand-off to it is an injected callback
 * (`FastForwardBattleRunner`) — the driver only needs to detect newly
 * bridged scenarios and offer them to whatever runner the caller supplies;
 * a caller with no runner still gets an honest `scenariosBridged` count.
 * Newly bridged scenarios are detected by diffing
 * `campaign.bridgedScenarioIds` day over day — the ONLY writer of that
 * field is `scenarioEncounterBridgeProcessor`
 * (`src/lib/campaign/processors/scenarioEncounterBridgeProcessor.ts`), so a
 * nonempty diff is proof the registered pipeline (not some ad hoc
 * shortcut) generated and bridged the scenario.
 *
 * @module lib/campaign/fastForward/fastForwardCampaign
 */

import type { DayReport } from '@/lib/campaign/dayReportTypes';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { MaybePromise } from '@/stores/campaign/useCampaignStore.types';
import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

// =============================================================================
// Types
// =============================================================================

/** Minimal identity of a newly bridged scenario, handed to the combat runner. */
export interface FastForwardBridgedScenarioHandoff {
  readonly scenarioId: string;
  readonly contractId: string;
  readonly encounterId: string;
}

/** What a battle runner reports back once a bridged scenario has been fought. */
export interface FastForwardBattleRunResult {
  readonly matchId: string;
  /** Whatever seed value the runner derived — recorded, never re-derived here. */
  readonly seed: string | number;
}

/**
 * Injected combat-runner hand-off (group 3 stub point, task 2.1c). Returns
 * `null` to skip a bridged scenario without recording a battle (e.g. a
 * `Draft`-status encounter with no resolvable force — left to the runner's
 * judgment per design Open Questions).
 */
export type FastForwardBattleRunner = (
  handoff: FastForwardBridgedScenarioHandoff,
) => MaybePromise<FastForwardBattleRunResult | null>;

/** Fail-loud expectations (spec: "Fixture Expectations Fail Loud"). */
export interface FastForwardExpectations {
  readonly minScenariosBridged?: number;
  readonly minBattles?: number;
}

export interface FastForwardCampaignParams {
  /** Number of scheduled days to advance before the drain phase. */
  readonly days: number;
  /** Thrown on any miss instead of returning a quietly-empty "green" run. */
  readonly expectations?: FastForwardExpectations;
  /** Group-3 hand-off; omit to exercise only the bridge-detection contract. */
  readonly runBridgedScenario?: FastForwardBattleRunner;
  /**
   * Upper bound on drain-day iterations before the driver fails loud
   * instead of looping forever on an outcome that never drains (e.g. one
   * published with neither `contractId` nor `scenarioId`, which
   * `isCampaignLinkedOutcome` would never have enqueued in the first
   * place — this bound is a safety net, not the expected path).
   */
  readonly maxDrainDays?: number;
}

export interface FastForwardBattleRecord extends FastForwardBridgedScenarioHandoff {
  readonly matchId: string;
  readonly seed: string | number;
}

export interface FastForwardRunReport {
  /** The requested scheduled-day count (`params.days`), verbatim. */
  readonly daysAdvanced: number;
  /** Extra days advanced solely to drain `pendingBattleOutcomes` to zero. */
  readonly drainDays: number;
  /** One entry per `advanceDay()` call, scheduled days followed by drain days. */
  readonly dayReports: readonly DayReport[];
  /** Scenario ids newly present in `bridgedScenarioIds`, in bridge order. */
  readonly scenariosBridged: readonly string[];
  /** One entry per bridged scenario the runner actually fought (non-null result). */
  readonly battles: readonly FastForwardBattleRecord[];
  /** Count of `battles` whose `matchId` is in `getProcessedBattleIds()` by the end of the run. */
  readonly outcomesApplied: number;
}

// =============================================================================
// Internals
// =============================================================================

const DEFAULT_MAX_DRAIN_DAYS = 5;

function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

async function resolveMaybePromise<T>(value: MaybePromise<T>): Promise<T> {
  return isPromiseLike(value) ? await value : value;
}

// =============================================================================
// Driver
// =============================================================================

/**
 * Fast-forward a campaign through `days` scheduled day-advances (plus
 * however many drain days it takes to empty `pendingBattleOutcomes`),
 * offering every newly bridged scenario to `params.runBridgedScenario`.
 *
 * @param campaign - the run's starting campaign (e.g. `buildFastForwardFixture().campaign`)
 * @param params - day count, fail-loud expectations, and the group-3 hand-off
 */
export async function fastForwardCampaign(
  campaign: ICampaign,
  params: FastForwardCampaignParams,
): Promise<FastForwardRunReport> {
  if (!Number.isInteger(params.days) || params.days < 0) {
    throw new Error(
      `fastForwardCampaign: days must be a non-negative integer, got ${params.days}`,
    );
  }

  // (a) Subscription liveness (design D5 rule 1) — touching the singleton
  // getter constructs the store and registers its combat-outcome-bus
  // listener before the loop below can run a single day, let alone a
  // battle. `switchCampaign` is the real production action for loading a
  // campaign into the store (also seeds forcesStore/missionsStore from the
  // campaign's own forces/missions maps) — never a raw `setState` bypass.
  // `useCampaignStore` follows Zustand's `use*` naming convention but is a
  // plain lazy-init function (not a React hook) — safe to call from a
  // headless driver (same precedent as `src/lib/e2e/storeExposure.ts`).
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  const store = useCampaignStore();
  store.getState().switchCampaign(campaign);

  const dayReports: DayReport[] = [];
  const scenariosBridged: string[] = [];
  const battles: FastForwardBattleRecord[] = [];
  let seenScenarioIds = new Set(
    (campaign as ICampaignWithBridgeState).bridgedScenarioIds ?? [],
  );

  // (c) After every `advanceDay()`, diff `bridgedScenarioIds` against what
  // we've already seen. Only `scenarioEncounterBridgeProcessor` ever
  // writes this field (see module doc), so a nonempty diff proves the
  // registered pipeline generated and bridged the scenario this day.
  async function handleNewlyBridged(afterDay: ICampaign): Promise<void> {
    const extended = afterDay as ICampaignWithBridgeState;
    const nextIds = extended.bridgedScenarioIds ?? [];
    const newIds = nextIds.filter((id) => !seenScenarioIds.has(id));
    seenScenarioIds = new Set(nextIds);
    if (newIds.length === 0) {
      return;
    }
    scenariosBridged.push(...newIds);
    if (!params.runBridgedScenario) {
      return;
    }
    for (const scenarioId of newIds) {
      const encounter = extended.bridgedEncounters?.[scenarioId];
      if (!encounter) {
        throw new Error(
          `fastForwardCampaign: scenario ${scenarioId} is in bridgedScenarioIds but bridgedEncounters has no matching entry — the bridge processor's own contract requires both to be written together`,
        );
      }
      if (!encounter.campaignMeta) {
        throw new Error(
          `fastForwardCampaign: bridged encounter ${encounter.id} (scenario ${scenarioId}) has no campaignMeta — buildEncounterFromScenario always stamps it, so this indicates a broken bridge`,
        );
      }
      const handoff: FastForwardBridgedScenarioHandoff = {
        scenarioId,
        contractId: encounter.campaignMeta.contractId,
        encounterId: encounter.id,
      };
      const result = await resolveMaybePromise(
        params.runBridgedScenario(handoff),
      );
      if (!result) {
        continue;
      }
      battles.push({ ...handoff, matchId: result.matchId, seed: result.seed });
    }
  }

  // (b) Loop the store's registered-pipeline `advanceDay` action.
  async function advanceOneDay(): Promise<DayReport> {
    const outcome = await resolveMaybePromise(store.getState().advanceDay());
    if (!outcome) {
      throw new Error(
        'fastForwardCampaign: advanceDay() returned null — the campaign failed to commit (no campaign loaded, or saveCampaign() rejected the write)',
      );
    }
    dayReports.push(outcome);
    await handleNewlyBridged(outcome.campaign);
    return outcome;
  }

  for (let day = 0; day < params.days; day += 1) {
    await advanceOneDay();
  }

  // (d) Drain-before-return (design D5 rule 2).
  let drainDays = 0;
  const maxDrainDays = params.maxDrainDays ?? DEFAULT_MAX_DRAIN_DAYS;
  while (store.getState().getPendingOutcomeCount() > 0) {
    if (drainDays >= maxDrainDays) {
      throw new Error(
        `fastForwardCampaign: ${store.getState().getPendingOutcomeCount()} outcome(s) still pending after ${maxDrainDays} drain day(s) — an outcome enqueued but never drained (raise maxDrainDays only after confirming this isn't a real bug)`,
      );
    }
    await advanceOneDay();
    drainDays += 1;
  }

  // (f) Fixture Expectations Fail Loud — collect every miss so a caller
  // debugging a red run sees the whole picture in one throw, not one at a
  // time across re-runs.
  const violations: string[] = [];
  const { minScenariosBridged, minBattles } = params.expectations ?? {};
  if (
    minScenariosBridged !== undefined &&
    scenariosBridged.length < minScenariosBridged
  ) {
    violations.push(
      `minScenariosBridged: expected >= ${minScenariosBridged}, got ${scenariosBridged.length}`,
    );
  }
  if (minBattles !== undefined && battles.length < minBattles) {
    violations.push(
      `minBattles: expected >= ${minBattles}, got ${battles.length}`,
    );
  }
  if (violations.length > 0) {
    throw new Error(
      `fastForwardCampaign: expectations failed — ${violations.join('; ')}`,
    );
  }

  const processedIds = new Set(store.getState().getProcessedBattleIds());
  const outcomesApplied = battles.filter((battle) =>
    processedIds.has(battle.matchId),
  ).length;

  return {
    daysAdvanced: params.days,
    drainDays,
    dayReports,
    scenariosBridged,
    battles,
    outcomesApplied,
  };
}
