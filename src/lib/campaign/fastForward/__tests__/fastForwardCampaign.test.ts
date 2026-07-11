/**
 * `fastForwardCampaign` — proves the day-loop driver actually drives the
 * store's registered-pipeline `advanceDay` action (never
 * `dayAdvancement.ts`'s registry-free fallback, task 2.2's grep gate),
 * detects newly bridged scenarios via `campaign.bridgedScenarioIds`
 * (the only field `scenarioEncounterBridgeProcessor` writes), hands them
 * to an injected battle-runner stub (group 3 doesn't exist yet), drains
 * `pendingBattleOutcomes` before returning (design D5 rule 2), and fails
 * loud on a declared expectation miss instead of returning a quietly
 * empty "green" run.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  _resetCombatOutcomeBus,
  publishCombatOutcome,
} from '@/engine/combatOutcomeBus';
import { _resetContractFulfilledBus } from '@/lib/campaign/contractFulfillmentBus';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  fastForwardCampaign,
  type FastForwardBattleRunner,
} from '../fastForwardCampaign';
import { buildFastForwardFixture } from '../fastForwardFixture';

interface BridgeCampaignView {
  readonly bridgedEncounters?: Readonly<Record<string, unknown>>;
  readonly bridgedScenarioIds?: readonly string[];
}

function resetWorld(): void {
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetContractFulfilledBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

/**
 * Build a minimal, always-appliable `ICombatOutcome` for the driver's
 * battle-runner stub. `unitDeltas: []` is deliberate — this test exercises
 * the DRIVER's day-loop/drain machinery, not pilot-attribution correctness
 * (that is group 3's D9 fix + the group 5 capstone); an empty delta list
 * still exercises the full publish -> enqueue -> drain -> processedBattleIds
 * path because `postBattleProcessor` marks a match processed unconditionally.
 */
function makeStubOutcome(opts: {
  matchId: string;
  contractId: string;
  scenarioId: string;
}): ICombatOutcome {
  const report: IPostBattleReport = {
    version: 1,
    matchId: opts.matchId,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 3,
    units: [],
    mvpUnitId: null,
    log: [],
  };
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: opts.matchId,
    contractId: opts.contractId,
    scenarioId: opts.scenarioId,
    endReason: CombatEndReason.Destruction,
    report,
    unitDeltas: [],
    capturedAt: '3025-06-13T12:00:00Z',
  };
}

// Module-level (never reset per-test): `useCampaignStore`'s `persist`
// middleware rehydrates from jsdom `localStorage` on every fresh singleton
// construction, and `enqueueCampaignOutcome` dedups on `processedBattleIds`
// (`useCampaignStore.outcomes.ts:50`) — a per-test-scoped counter would
// mint the SAME `matchId` string in a later test, get silently skipped as
// an already-processed duplicate, and produce a false green. Matching
// production's real guarantee (`IGameSession.id` is globally unique) keeps
// this stub honest across the whole file.
let stubMatchCounter = 0;

/** A battle-runner stub that publishes a real outcome through the production bus. */
function publishingRunnerStub(): FastForwardBattleRunner {
  return (handoff) => {
    stubMatchCounter += 1;
    const matchId = `ff-stub-match-${stubMatchCounter}`;
    publishCombatOutcome({
      matchId,
      outcome: makeStubOutcome({
        matchId,
        contractId: handoff.contractId,
        scenarioId: handoff.scenarioId,
      }),
    });
    return { matchId, seed: `stub-seed-${stubMatchCounter}` };
  };
}

function bridgedEncountersOf(campaign: ICampaign): BridgeCampaignView {
  return campaign as unknown as BridgeCampaignView;
}

describe('fastForwardCampaign', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('rejects a negative day count', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    await expect(
      fastForwardCampaign(fixture.campaign, { days: -1 }),
    ).rejects.toThrow(/non-negative integer/);
  });

  it('drives the registered pipeline over an 8-day run crossing the fixture Monday and reports every bridged scenario', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });

    const report = await fastForwardCampaign(fixture.campaign, {
      days: 8,
      expectations: { minScenariosBridged: 1 },
    });

    expect(report.daysAdvanced).toBe(8);
    // No runner injected -> no outcome is ever published -> nothing to
    // drain.
    expect(report.drainDays).toBe(0);
    expect(report.dayReports).toHaveLength(8);
    expect(report.battles).toEqual([]);
    expect(report.outcomesApplied).toBe(0);
    expect(report.scenariosBridged.length).toBeGreaterThan(0);

    // Prove the entries came from the REAL registered pipeline: the only
    // writer of `bridgedEncounters`/`bridgedScenarioIds` is
    // `scenarioEncounterBridgeProcessor`, and the store's own campaign
    // state (not just the returned report) carries them.
    const storeCampaign = useCampaignStore().getState().getCampaign();
    expect(storeCampaign).not.toBeNull();
    const bridged = bridgedEncountersOf(storeCampaign as ICampaign);
    for (const scenarioId of report.scenariosBridged) {
      expect(bridged.bridgedEncounters?.[scenarioId]).toBeDefined();
      expect(bridged.bridgedScenarioIds).toContain(scenarioId);
    }
  });

  it('throws on a declared expectation miss instead of returning a quietly-empty green run', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    // Same fixture, AtB gate closed — scenario generation can never fire.
    const closedGateCampaign: ICampaign = {
      ...fixture.campaign,
      options: { ...fixture.campaign.options, useAtBScenarios: false },
    };

    await expect(
      fastForwardCampaign(closedGateCampaign, {
        days: 8,
        expectations: { minScenariosBridged: 1 },
      }),
    ).rejects.toThrow(/minScenariosBridged: expected >= 1, got 0/);
  });

  it('hands every newly bridged scenario to the injected runner, publishes through the real bus, and drains the outcome via extra drain day(s)', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const runner = publishingRunnerStub();

    // Exactly one scheduled day (the fixture's own Monday) — any drain
    // work MUST come from the driver's drain-day loop, not from
    // scheduled days that would have drained it anyway.
    const report = await fastForwardCampaign(fixture.campaign, {
      days: 1,
      runBridgedScenario: runner,
      expectations: { minScenariosBridged: 1, minBattles: 1 },
    });

    expect(report.daysAdvanced).toBe(1);
    expect(report.scenariosBridged.length).toBeGreaterThan(0);
    expect(report.battles).toHaveLength(report.scenariosBridged.length);
    for (const battle of report.battles) {
      expect(report.scenariosBridged).toContain(battle.scenarioId);
      expect(battle.matchId).toMatch(/^ff-stub-match-\d+$/);
    }

    // Design D5 rule 2: the outcome(s) published on the scheduled day
    // apply only on the FOLLOWING day, so at least one drain day was
    // required — and dayReports covers scheduled + drain days exactly.
    expect(report.drainDays).toBeGreaterThan(0);
    expect(report.dayReports).toHaveLength(
      report.daysAdvanced + report.drainDays,
    );

    // R2 capstone-shape assertion, exercised here at group-2 scope:
    // every recorded battle's outcome was actually applied.
    expect(report.outcomesApplied).toBe(report.battles.length);
    expect(useCampaignStore().getState().getPendingOutcomeCount()).toBe(0);
  });

  it('fails loud instead of looping forever when an outcome never drains within maxDrainDays', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const runner = publishingRunnerStub();

    await expect(
      fastForwardCampaign(fixture.campaign, {
        days: 1,
        runBridgedScenario: runner,
        maxDrainDays: 0,
      }),
    ).rejects.toThrow(/still pending after 0 drain day\(s\)/);
  });

  it('skips a bridged scenario without recording a battle when the runner returns null', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const skipAll: FastForwardBattleRunner = () => null;

    const report = await fastForwardCampaign(fixture.campaign, {
      days: 8,
      runBridgedScenario: skipAll,
    });

    expect(report.scenariosBridged.length).toBeGreaterThan(0);
    expect(report.battles).toEqual([]);
    expect(report.outcomesApplied).toBe(0);
    expect(report.drainDays).toBe(0);
  });
});
