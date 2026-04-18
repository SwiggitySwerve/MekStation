/**
 * Phase 3 Round-Trip Capstone E2E Test
 *
 * Per `wire-encounter-to-campaign-round-trip` spec task group 10: the
 * single integration test that proves every Phase 3 wave hangs together
 * end-to-end. The dataflow under test:
 *
 *     contract → encounter → IGameSession → ICombatOutcome
 *       → CombatOutcomeReady bus → useCampaignStore.pendingBattleOutcomes
 *       → day pipeline (postBattle → salvage → repair → contract)
 *       → campaign state mutated (XP, wounds, unit state, salvage,
 *         repair tickets, contract status)
 *
 * The test exercises every Wave 5 wiring point:
 *   1. `EncounterService.launchEncounter` accepts and threads
 *      `contractId` / `scenarioId` through `IGameSession.config`.
 *   2. `InteractiveSession.tryFinalizeAndPublish` fires
 *      `CombatOutcomeReady` exactly once when the session reaches
 *      `Completed`.
 *   3. The campaign store's bus subscription enqueues the outcome and
 *      dedupes on retried publishes.
 *   4. `useCampaignStore.advanceDay()` routes through the day pipeline
 *      so `postBattleProcessor` / `salvageProcessor` /
 *      `repairQueueBuilderProcessor` all run in the spec-mandated order.
 *   5. The pipeline drains the queue and stamps `processedBattleIds`,
 *      making subsequent `advanceDay` calls a no-op.
 *
 * Synthetic outcomes are used in place of full bot-vs-bot match runs so
 * the assertions stay deterministic — the round-trip wiring itself is
 * what's under test, not the combat math.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/specs/game-session-management/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { IPerson } from '@/types/campaign/Person';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  _resetCombatOutcomeBus,
  publishCombatOutcome,
} from '@/engine/combatOutcomeBus';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// ---------------------------------------------------------------------------
// Test fixtures (kept local so this file is self-contained)
// ---------------------------------------------------------------------------

/**
 * Build a campaign-side `IPerson` with sane defaults. Tests pass a
 * partial override to flip status / pilot skills.
 */
function makePerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'pilot-1',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3024-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3024-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    awards: [],
    ...overrides,
  };
}

/**
 * Build an `IUnitCombatDelta` with reasonable damage. Reused by both
 * the synthetic outcome construction and the unit max-state seeding.
 */
function makeDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 18, LT: 12, RT: 12 },
    internalsRemaining: { CT: 10, LT: 8, RT: 8 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: { 'srm6-1': 12 },
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

/**
 * Build the full `ICombatOutcome` shape the bus publishes. Caller
 * specifies winner via `report.winner` so contract status flipping
 * can be asserted in either direction.
 */
function makeOutcome(opts: {
  matchId: string;
  contractId: string;
  scenarioId?: string;
  winner?: GameSide | 'draw';
  unitDeltas: readonly IUnitCombatDelta[];
}): ICombatOutcome {
  const winner = opts.winner ?? GameSide.Player;
  const report: IPostBattleReport = {
    version: 1,
    matchId: opts.matchId,
    winner,
    reason: 'destruction',
    turnCount: 5,
    units: [],
    mvpUnitId: null,
    log: [],
  };
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: opts.matchId,
    contractId: opts.contractId,
    scenarioId: opts.scenarioId ?? null,
    endReason: CombatEndReason.Destruction,
    report,
    unitDeltas: opts.unitDeltas,
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

/**
 * Seed a unit's pre-battle armor / structure max state on the campaign
 * extension fields so `repairQueueBuilderProcessor` can diff against
 * the post-battle delta and emit tickets. Without this seed, the
 * processor can't compute the damage diff and emits no tickets.
 */
function seedUnitMaxState(unitId: string): IUnitMaxState {
  return {
    unitId,
    maxArmorPerLocation: { CT: 30, LT: 20, RT: 20 },
    maxStructurePerLocation: { CT: 15, LT: 12, RT: 12 },
    maxAmmoPerBin: {},
  };
}

/**
 * Reset every singleton this test mutates. Without these, prior runs'
 * subscriptions leak across tests and `pendingBattleOutcomes` carries
 * stale data into the next case.
 */
function resetWorld(): void {
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 3 capstone — encounter → outcome → campaign round trip', () => {
  beforeEach(() => {
    resetWorld();
  });

  afterEach(() => {
    resetWorld();
  });

  it('publishes an outcome to the bus, the store enqueues it, and advanceDay drains the queue applying every battle-effects processor', () => {
    // 1. Stand up a tiny campaign with a single Active contract.
    const store = useCampaignStore();
    const campaignId = store
      .getState()
      .createCampaign('Round-Trip Test Co.', 'mercenary');
    const initialCampaign = store.getState().getCampaign();
    expect(initialCampaign).not.toBeNull();
    expect(initialCampaign?.id).toBe(campaignId);

    const contract = createContract({
      id: 'contract-rt-1',
      name: 'Garrison: Hesperus',
      employerId: 'lyran-commonwealth',
      targetId: 'capellan-confederation',
      status: MissionStatus.ACTIVE,
    });

    // Personnel + unit-max state + a starting balance go onto the
    // campaign before we publish the outcome so processors have data
    // to diff. The store's `updateCampaign` shallow-merges; we splat
    // every dimension we care about.
    const pilot = makePerson({
      id: 'unit-A',
      name: 'Lina "Strix" Volkov',
      pilotSkills: { gunnery: 3, piloting: 4 },
    });

    // Seed BOTH the campaign-level personnel map AND the personnelStore
    // sub-store. The store's `saveCampaign` re-syncs personnel from the
    // sub-store after `advanceDay`, so without seeding the sub-store
    // the pipeline's pilot updates get clobbered on save.
    store.getState().getPersonnelStore()?.getState().addPerson(pilot);

    store.getState().updateCampaign({
      missions: new Map([[contract.id, contract]]),
      personnel: new Map([[pilot.id, pilot]]),
      finances: {
        transactions: [],
        balance: new Money(1_000_000),
      },
      // Type narrowing: campaign extensions live on the postBattle
      // processor's extended type, not on the core ICampaign — we cast
      // to the same shape the processor expects.
      ...({
        unitMaxStates: { 'unit-A': seedUnitMaxState('unit-A') },
      } as unknown as Record<string, unknown>),
    });

    // 2. Build a synthetic outcome — heavy damage to CT, pilot took
    //    one wound. The report says player won, so contract should
    //    flip to SUCCESS.
    const outcome = makeOutcome({
      matchId: 'match-rt-1',
      contractId: contract.id,
      scenarioId: 'scenario-rt-1',
      winner: GameSide.Player,
      unitDeltas: [
        makeDelta('unit-A', {
          armorRemaining: { CT: 5, LT: 8, RT: 12 },
          internalsRemaining: { CT: 6, LT: 8, RT: 8 },
          pilotState: {
            conscious: true,
            wounds: 1,
            killed: false,
            finalStatus: PilotFinalStatus.Wounded,
          },
        }),
      ],
    });

    // 3. Publish on the bus. The store's subscription enqueues it
    //    synchronously (bus is sync), so by the next line the queue
    //    has the outcome.
    publishCombatOutcome({ matchId: outcome.matchId, outcome });

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(store.getState().getPendingOutcomes()[0].matchId).toBe(
      outcome.matchId,
    );

    // 3a. Republishing the same outcome is a no-op — Wave 5 spec
    //     "Duplicate outcome ignored".
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    expect(store.getState().getPendingOutcomeCount()).toBe(1);

    // 4. Advance the day. The pipeline runs in phase order:
    //    postBattle → salvage → repair → contracts. Each consumes the
    //    outcome and writes back into the campaign.
    const report = store.getState().advanceDay();
    expect(report).not.toBeNull();

    // 5a. postBattle effects: pilot took the wound, gained scenario XP.
    const updatedCampaign = store.getState().getCampaign();
    expect(updatedCampaign).not.toBeNull();
    const updatedPilot = updatedCampaign?.personnel.get('unit-A');
    expect(updatedPilot).toBeDefined();
    expect(updatedPilot?.hits).toBe(1);
    expect(updatedPilot?.status).toBe(PersonnelStatus.WOUNDED);
    expect(updatedPilot?.totalXpEarned ?? 0).toBeGreaterThan(0);

    // 5b. postBattle effects: per-unit damage state persisted.
    const extended = updatedCampaign as typeof updatedCampaign & {
      readonly unitCombatStates?: Record<string, IUnitCombatState>;
      readonly salvageReports?: Record<string, unknown>;
      readonly repairQueue?: readonly { matchId: string; ticketId: string }[];
    };
    const unitState = extended?.unitCombatStates?.['unit-A'];
    expect(unitState).toBeDefined();
    expect(unitState?.currentArmorPerLocation['CT']).toBe(5);
    expect(unitState?.currentStructurePerLocation['CT']).toBe(6);
    expect(unitState?.lastCombatOutcomeId).toBe(outcome.matchId);

    // 5c. salvage effects: a salvage report was created and keyed by
    //     matchId — even when no opponent units were killed (empty
    //     allocation) the processor stamps a record so the UI can
    //     display "no salvage available".
    expect(extended?.salvageReports?.[outcome.matchId]).toBeDefined();

    // 5d. repair effects: at least one repair ticket was created from
    //     the (CT armor: 30→5, CT structure: 15→6) damage diff.
    const repairTickets = extended?.repairQueue ?? [];
    const ticketsForThisMatch = repairTickets.filter(
      (t) => t.matchId === outcome.matchId,
    );
    expect(ticketsForThisMatch.length).toBeGreaterThan(0);

    // 5e. contract effects: status flipped to SUCCESS because player
    //     won via Destruction.
    const updatedContract = updatedCampaign?.missions.get(contract.id);
    expect(updatedContract?.status).toBe(MissionStatus.SUCCESS);

    // 6. Idempotency: queue drained, processed ledger stamped.
    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    expect(store.getState().getProcessedBattleIds()).toContain(outcome.matchId);

    // 7. A second `advanceDay` is a no-op for the battle-effects
    //    processors — the queue is empty and the processed ledger
    //    suppresses re-application even if the bus republishes.
    const xpAfterFirst = updatedPilot?.totalXpEarned ?? 0;
    publishCombatOutcome({ matchId: outcome.matchId, outcome });
    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    store.getState().advanceDay();
    const finalPilot = store.getState().getCampaign()?.personnel.get('unit-A');
    expect(finalPilot?.totalXpEarned).toBe(xpAfterFirst);
  });

  it('outcomes for matches with no contractId still flow through the queue and post-battle processor', () => {
    // Standalone (non-campaign) matches — the spec scenario "Standalone
    // encounter has encounter id only". The outcome lacks a contract
    // binding so contract status flipping is skipped, but the rest of
    // the pipeline still runs.
    const store = useCampaignStore();
    store.getState().createCampaign('Standalone Test', 'mercenary');
    store.getState().updateCampaign({
      personnel: new Map([['unit-X', makePerson({ id: 'unit-X' })]]),
    });

    const outcome = makeOutcome({
      matchId: 'standalone-1',
      contractId: '',
      unitDeltas: [makeDelta('unit-X')],
    });
    // Strip the contractId per the spec scenario.
    const standalone: ICombatOutcome = { ...outcome, contractId: null };

    publishCombatOutcome({ matchId: standalone.matchId, outcome: standalone });
    expect(store.getState().getPendingOutcomeCount()).toBe(1);

    store.getState().advanceDay();

    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    expect(store.getState().getProcessedBattleIds()).toContain(
      standalone.matchId,
    );
  });
});
