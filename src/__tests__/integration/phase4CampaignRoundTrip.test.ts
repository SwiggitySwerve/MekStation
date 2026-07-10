/**
 * Phase 4 Campaign Round-Trip Capstone E2E Test
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 spec task §10: the
 * single integration test that proves every Slice 1-7 wiring point hangs
 * together. Builds on the Phase 3 capstone (`phase3RoundTrip.test.ts`)
 * by additionally asserting the Slice 6 surface area:
 *
 *   - daily battle audit ledger (`dailyBattleAudit`) populated and
 *     reflects matches processed, XP awarded, pilots
 *     wounded/KIA/MIA, salvage value secured, repair tickets created,
 *     contracts closed.
 *   - contract fulfillment bus (`ContractFulfilled`) fires exactly once
 *     when post-battle flips a contract to terminal.
 *   - `pendingFulfilledContractIds` enqueued by post-battle and drained
 *     by contractProcessor on the same day, with final payment posted
 *     and contract removed from the active list.
 *   - downstream `pendingFulfilledContractIds` set is empty after the
 *     pipeline runs.
 *
 * The dataflow under test (Slice 1 → Slice 7):
 *
 *     contract → encounter → IGameSession → ICombatOutcome
 *       → CombatOutcomeReady bus → useCampaignStore.pendingBattleOutcomes
 *       → review CTA → return to /campaign → advanceDay
 *       → postBattle (XP, wounds, unit state, contract flip,
 *         ContractFulfilled bus event)
 *       → salvage (allocation by contract terms)
 *       → repair (per-location tickets from damage diff)
 *       → contractProcessor (final payment, drains pending fulfilled set)
 *       → daily-audit-builder (single rollup row appended to
 *         campaign.dailyBattleAudit)
 *
 * Synthetic outcomes are used in place of full bot-vs-bot match runs so
 * the assertions stay deterministic — the wiring itself is what's under
 * test, not the combat math.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/specs/game-session-management/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { IUnitMaxState } from '@/types/campaign/UnitCombatState';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import {
  _resetCombatOutcomeBus,
  publishCombatOutcome,
} from '@/engine/combatOutcomeBus';
import {
  _resetContractFulfilledBus,
  getContractFulfilledListenerCount,
  subscribeToContractFulfilled,
  type IContractFulfilledEvent,
} from '@/lib/campaign/contractFulfillmentBus';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
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
 * specifies winner via `report.winner` so contract status flipping can
 * be asserted in either direction.
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
  _resetContractFulfilledBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 4 capstone — full campaign round-trip with audit ledger + fulfillment bus', () => {
  beforeEach(() => {
    resetWorld();
  });

  afterEach(() => {
    resetWorld();
  });

  it('completes a single-contract play loop: outcome publish → review CTA → advanceDay drains queue, closes contract, fires bus, builds audit row', () => {
    // Capture every ContractFulfilled event the post-battle processor
    // publishes so we can assert it fires exactly once for the closed
    // contract. We subscribe BEFORE creating the campaign to confirm
    // the bus has at least one external listener (the campaign store
    // also subscribes internally for some flows) and to mirror how a
    // real UI banner would attach.
    const contractFulfilledEvents: IContractFulfilledEvent[] = [];
    const initialListenerCount = getContractFulfilledListenerCount();
    const unsubscribe = subscribeToContractFulfilled((event) => {
      contractFulfilledEvents.push(event);
    });
    expect(getContractFulfilledListenerCount()).toBe(initialListenerCount + 1);

    try {
      // ---------------------------------------------------------------
      // 1. Stand up a tiny mercenary campaign with a single Active
      //    contract, an active pilot, a starting balance, and seeded
      //    unit max state so the repair processor can diff damage.
      // ---------------------------------------------------------------
      const store = useCampaignStore();
      const campaignId = store
        .getState()
        .createCampaign('Round-Trip Test Co.', 'mercenary');
      const initialCampaign = store.getState().getCampaign();
      expect(initialCampaign).not.toBeNull();
      expect(initialCampaign?.id).toBe(campaignId);

      const contract = createContract({
        id: 'contract-rt-2',
        name: 'Garrison: Hesperus II',
        employerId: 'lyran-commonwealth',
        targetId: 'capellan-confederation',
        status: MissionStatus.ACTIVE,
      });

      const pilotName = 'Lina "Strix" Volkov';

      // Per PR4 of `wire-iperson-hard-cutover`: seed the roster store.
      // The post-battle processor reads from useCampaignRosterStore — the
      // legacy personnel field on ICampaign was deleted.
      useCampaignRosterStore.setState({
        campaignId: 'campaign-001',
        units: [],
        pilots: [
          {
            pilotId: 'unit-A',
            pilotName,
            status: CampaignPilotStatus.Active,
            wounds: 0,
            recoveryTime: 0,
            xp: 0,
            campaignXpEarned: 0,
            campaignKills: 0,
            campaignMissions: 0,
            primaryRole: CampaignPersonnelRole.PILOT,
            rankIndex: 0,
            hireDate: new Date('3024-01-01'),
          },
        ],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      });
      store.getState().updateCampaign({
        missions: new Map([[contract.id, contract]]),
        finances: {
          transactions: [],
          balance: new Money(1_000_000),
        },
        // Type narrowing: campaign extensions live on the postBattle
        // processor's extended type, not on the core ICampaign — we
        // cast to the same shape the processor expects.
        ...({
          unitMaxStates: { 'unit-A': seedUnitMaxState('unit-A') },
        } as unknown as Record<string, unknown>),
      });

      const startingBalance = store.getState().getCampaign()?.finances
        .balance.amount;
      expect(startingBalance).toBe(1_000_000);

      // ---------------------------------------------------------------
      // 2. Build a synthetic outcome — heavy damage to CT, pilot took
      //    one wound. The report says player won via destruction, so
      //    contract should flip to SUCCESS and the bus should fire.
      // ---------------------------------------------------------------
      const outcome = makeOutcome({
        matchId: 'match-rt-2',
        contractId: contract.id,
        scenarioId: 'scenario-rt-2',
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

      // ---------------------------------------------------------------
      // 3. Publish on the bus. The store's subscription enqueues it
      //    synchronously (bus is sync), so by the next line the queue
      //    has the outcome.
      // ---------------------------------------------------------------
      publishCombatOutcome({ matchId: outcome.matchId, outcome });

      expect(store.getState().getPendingOutcomeCount()).toBe(1);
      expect(store.getState().getPendingOutcomes()[0].matchId).toBe(
        outcome.matchId,
      );

      // ---------------------------------------------------------------
      // 4. Simulate the player clicking "Return to Campaign" on the
      //    review page. Per Slice 4.1, the review CTA calls
      //    `markBattleReviewed(matchId)` which dequeues the outcome
      //    from the pending queue (the post-battle review treats this
      //    as "I've acknowledged the result"). Re-enqueue afterwards
      //    so the day pipeline still has work — the spec scenario
      //    "Return to Campaign re-enqueues if missing" guarantees this
      //    is idempotent.
      //
      //    NOTE: in production the review CTA navigates to
      //    `/campaign?pendingBattle=<matchId>` and the dashboard banner
      //    reads from `getPendingOutcomes()`. We don't render UI here —
      //    we exercise the store actions the CTA fires.
      // ---------------------------------------------------------------
      store.getState().markBattleReviewed(outcome.matchId);
      expect(store.getState().getReviewedAt(outcome.matchId)).not.toBeNull();
      // markBattleReviewed dequeues — re-enqueue per Slice 4.1.
      store.getState().enqueueOutcome(outcome);
      expect(store.getState().getPendingOutcomeCount()).toBe(1);

      // ---------------------------------------------------------------
      // 5. Advance the day. The pipeline runs in phase order:
      //    postBattle → salvage → repair → contracts. Each consumes
      //    the outcome and writes back into the campaign. The Slice-6
      //    `dailyBattleAuditBuilder` is invoked after the pipeline
      //    completes to produce a single rollup row.
      // ---------------------------------------------------------------
      const report = store.getState().advanceDay();
      expect(report).not.toBeNull();

      // ===============================================================
      // Task §10.2 assertions — every dimension of campaign state.
      // ===============================================================
      const updatedCampaign = store.getState().getCampaign();
      expect(updatedCampaign).not.toBeNull();

      // 10.2(a) Pilots have XP awarded.
      // Per PR4 of `wire-iperson-hard-cutover`: pilot reads come from the
      // canonical roster store, not the deleted `campaign.personnel` Map.
      const updatedPilot = useCampaignRosterStore
        .getState()
        .pilots.find((p) => p.pilotId === 'unit-A');
      expect(updatedPilot).toBeDefined();
      expect(updatedPilot?.campaignXpEarned ?? 0).toBeGreaterThan(0);

      // 10.2(b) Wounded pilot reflected in roster status: status flips to
      //         `CampaignPilotStatus.Wounded` and `wounds` increments. The
      //         healing processor consumes this on subsequent days to
      //         advance recoveryTime.
      expect(updatedPilot?.wounds).toBe(1);
      expect(updatedPilot?.status).toBe(CampaignPilotStatus.Wounded);

      // 10.2(c) Units have combat state reflecting damage.
      // Per canonicalize-unit-combat-state PR-A: unitCombatStates is a
      // first-class ICampaign field and is read directly. The remaining
      // cast covers fields (salvageReports, repairQueue, dailyBattleAudit,
      // pendingFulfilledContractIds, processedFulfilledContractIds) that
      // are still pending promotion via separate openspec changes.
      const extended = updatedCampaign as typeof updatedCampaign & {
        readonly salvageReports?: Record<string, unknown>;
        readonly repairQueue?: readonly { matchId: string; ticketId: string }[];
        readonly dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
        readonly pendingFulfilledContractIds?: readonly string[];
        readonly processedFulfilledContractIds?: readonly string[];
      };
      const unitState = updatedCampaign?.unitCombatStates?.['unit-A'];
      expect(unitState).toBeDefined();
      expect(unitState?.currentArmorPerLocation['CT']).toBe(5);
      expect(unitState?.currentStructurePerLocation['CT']).toBe(6);
      expect(unitState?.lastCombatOutcomeId).toBe(outcome.matchId);

      // 10.2(d) Salvage inventory has a per-match report keyed by
      //         matchId. Even with no opponent kills the processor
      //         stamps an empty allocation so the UI can show "no
      //         salvage available".
      expect(extended?.salvageReports?.[outcome.matchId]).toBeDefined();

      // 10.2(e) Repair queue has expected tickets — at least one from
      //         the (CT armor 30→5, CT structure 15→6) damage diff.
      const repairTickets = extended?.repairQueue ?? [];
      const ticketsForThisMatch = repairTickets.filter(
        (t) => t.matchId === outcome.matchId,
      );
      expect(ticketsForThisMatch.length).toBeGreaterThan(0);

      // ===============================================================
      // Slice-6 assertions — audit ledger + fulfillment bus.
      // ===============================================================

      // (i) Contract status flipped to SUCCESS because player won via
      //     Destruction.
      const updatedContract = updatedCampaign?.missions.get(contract.id);
      expect(updatedContract?.status).toBe(MissionStatus.SUCCESS);

      // (ii) ContractFulfilled bus fired exactly once for the closed
      //      contract; payload reflects matchId + new terminal status
      //      + playerWon.
      expect(contractFulfilledEvents).toHaveLength(1);
      expect(contractFulfilledEvents[0].contractId).toBe(contract.id);
      expect(contractFulfilledEvents[0].newStatus).toBe(MissionStatus.SUCCESS);
      expect(contractFulfilledEvents[0].matchId).toBe(outcome.matchId);
      expect(contractFulfilledEvents[0].playerWon).toBe(true);
      expect(contractFulfilledEvents[0].publishedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );

      // (iii) `pendingFulfilledContractIds` was enqueued by post-battle
      //       and drained by contractProcessor on the SAME day, so the
      //       set is empty after the pipeline runs.
      expect(extended?.pendingFulfilledContractIds ?? []).toHaveLength(0);
      expect(extended?.processedFulfilledContractIds ?? []).toContain(
        contract.id,
      );

      // (iv) Final payment hit the campaign balance — contractProcessor
      //      posted an Income transaction. Even with payment terms at
      //      defaults the balance should differ from the starting
      //      1,000,000 (either up or down depending on outcome math),
      //      and the txn list should carry one record tagged with the
      //      contract id.
      const closingTxns =
        updatedCampaign?.finances.transactions.filter((t) =>
          t.description.toLowerCase().includes(contract.name.toLowerCase()),
        ) ?? [];
      expect(closingTxns).toHaveLength(1);

      // (v) Daily audit ledger has a single rollup row.
      const auditLedger = extended?.dailyBattleAudit ?? [];
      expect(auditLedger).toHaveLength(1);
      const auditEntry = auditLedger[0];
      expect(auditEntry.matchesProcessed).toBe(1);
      expect(auditEntry.matches).toHaveLength(1);
      expect(auditEntry.matches[0].matchId).toBe(outcome.matchId);
      expect(auditEntry.matches[0].contractId).toBe(contract.id);
      expect(auditEntry.matches[0].summary).toMatch(/Victory/);
      expect(auditEntry.totalXpAwarded).toBeGreaterThan(0);
      expect(auditEntry.pilotsWounded).toBe(1);
      expect(auditEntry.pilotsKia).toBe(0);
      expect(auditEntry.pilotsMia).toBe(0);
      expect(auditEntry.repairTicketsCreated).toBeGreaterThan(0);
      expect(auditEntry.contractsClosed).toContain(contract.id);
      expect(auditEntry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // (vi) Idempotency: queue drained, processed ledger stamped.
      expect(store.getState().getPendingOutcomeCount()).toBe(0);
      expect(store.getState().getProcessedBattleIds()).toContain(
        outcome.matchId,
      );

      // (vii) A second `advanceDay` is a no-op for the battle-effects
      //       processors — the queue is empty and the processed ledger
      //       suppresses re-application even if the bus republishes.
      //       The CORE idempotency invariant: pilot XP, wounds, and
      //       repair tickets do not change on a no-op day-advance. We
      //       assert state stability rather than ledger growth because
      //       `recentlyAppliedOutcomes` is intentionally sticky on the
      //       campaign object across pipeline runs — that's a separate
      //       cleanup tracked outside this slice.
      const xpAfterFirst = updatedPilot?.campaignXpEarned ?? 0;
      const ticketsAfterFirst = ticketsForThisMatch.length;
      publishCombatOutcome({ matchId: outcome.matchId, outcome });
      expect(store.getState().getPendingOutcomeCount()).toBe(0);
      store.getState().advanceDay();
      const finalCampaign = store.getState().getCampaign();
      void finalCampaign;
      const finalPilot = useCampaignRosterStore
        .getState()
        .pilots.find((p) => p.pilotId === 'unit-A');
      expect(finalPilot?.campaignXpEarned).toBe(xpAfterFirst);
      // Repair ticket count for this match must not double — the
      // processor short-circuits when the matchId is already in the
      // processed-battle ledger.
      const finalExtended = finalCampaign as typeof finalCampaign & {
        readonly repairQueue?: readonly { matchId: string }[];
      };
      const finalTickets = (finalExtended?.repairQueue ?? []).filter(
        (t) => t.matchId === outcome.matchId,
      );
      expect(finalTickets.length).toBe(ticketsAfterFirst);

      // (viii) Bus listener should have only fired once total — the
      //        second advanceDay does NOT re-publish ContractFulfilled
      //        because the contract is already terminal and the
      //        post-battle processor only emits on the flip transition.
      expect(contractFulfilledEvents).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });

  it('multi-match day collapses into a single audit entry with summed pilot counts and per-match summaries', () => {
    // Verifies the audit builder's "matches collapse to one entry"
    // contract — two outcomes drained on the same day produce ONE
    // dailyBattleAudit row whose `matches[]` lists both, and whose
    // pilot tallies sum across them.
    const store = useCampaignStore();
    store.getState().createCampaign('Multi-Match Test Co.', 'mercenary');

    const contract = createContract({
      id: 'contract-multi-1',
      name: 'Raid: Sian',
      employerId: 'lyran-commonwealth',
      targetId: 'capellan-confederation',
      status: MissionStatus.ACTIVE,
    });

    store.getState().updateCampaign({
      missions: new Map([[contract.id, contract]]),
      finances: {
        transactions: [],
        balance: new Money(500_000),
      },
      ...({
        unitMaxStates: {
          'unit-A': seedUnitMaxState('unit-A'),
          'unit-B': seedUnitMaxState('unit-B'),
        },
      } as unknown as Record<string, unknown>),
    });

    // Match 1 — pilot A wounded.
    const outcome1 = makeOutcome({
      matchId: 'match-multi-1',
      contractId: contract.id,
      winner: GameSide.Player,
      unitDeltas: [
        makeDelta('unit-A', {
          armorRemaining: { CT: 5, LT: 12, RT: 12 },
          pilotState: {
            conscious: true,
            wounds: 1,
            killed: false,
            finalStatus: PilotFinalStatus.Wounded,
          },
        }),
      ],
    });

    // Match 2 — pilot B unscathed, no contract binding. The builder
    // only counts wounds on the outcome's own delta, so pilot B
    // contributes zero to the wounded count. Per `add-campaign-combat-loop`
    // D7 a session with no campaign linkage at all is NOT auto-enqueued
    // by the bus trigger — so this match carries a `scenarioId` (the
    // session WAS campaign-linked, it just has no contract) which keeps
    // it on the auto-enqueue path while leaving `contractId` null.
    const outcome2 = makeOutcome({
      matchId: 'match-multi-2',
      contractId: '',
      scenarioId: 'scenario-multi-2',
      winner: GameSide.Player,
      unitDeltas: [makeDelta('unit-B')],
    });
    const outcome2Standalone: ICombatOutcome = {
      ...outcome2,
      contractId: null,
    };

    publishCombatOutcome({ matchId: outcome1.matchId, outcome: outcome1 });
    publishCombatOutcome({
      matchId: outcome2Standalone.matchId,
      outcome: outcome2Standalone,
    });
    expect(store.getState().getPendingOutcomeCount()).toBe(2);

    store.getState().advanceDay();

    const campaign = store.getState().getCampaign();
    const ledger =
      (
        campaign as typeof campaign & {
          readonly dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
        }
      )?.dailyBattleAudit ?? [];

    // Single rollup row, two matches, summed wound count.
    expect(ledger).toHaveLength(1);
    const entry = ledger[0];
    expect(entry.matchesProcessed).toBe(2);
    expect(entry.matches).toHaveLength(2);
    expect(entry.matches.map((m) => m.matchId).sort()).toEqual([
      'match-multi-1',
      'match-multi-2',
    ]);
    expect(entry.pilotsWounded).toBe(1);
    expect(entry.pilotsKia).toBe(0);

    // Both outcomes processed.
    expect(store.getState().getProcessedBattleIds()).toEqual(
      expect.arrayContaining(['match-multi-1', 'match-multi-2']),
    );
    expect(store.getState().getPendingOutcomeCount()).toBe(0);
  });

  it('day-advance with no pending outcomes does not append an audit entry', () => {
    // The builder explicitly returns null when zero outcomes drained;
    // a no-op day must not pollute the ledger with empty rows.
    const store = useCampaignStore();
    store.getState().createCampaign('Quiet Day Co.', 'mercenary');
    store.getState().updateCampaign({});

    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    store.getState().advanceDay();

    const campaign = store.getState().getCampaign();
    const ledger =
      (
        campaign as typeof campaign & {
          readonly dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
        }
      )?.dailyBattleAudit ?? [];
    expect(ledger).toHaveLength(0);
  });
});
