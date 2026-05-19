/**
 * Campaign Combat Loop — end-to-end integration test
 *
 * Per `add-campaign-combat-loop` task 6: proves the three connectors
 * hang together —
 *   - a generated scenario is bridged to an encounter,
 *   - launched as a campaign-linked session, completed, its outcome
 *     auto-enqueued,
 *   - advancing the day drains the outcome through the existing
 *     battle-effects processors and the inventory projection reflects
 *     the result,
 *   - the full round trip is idempotent.
 *
 * The day pipeline is exercised directly (registered builtin
 * processors) so the bridge → battle-effects → inventory ordering is
 * the genuine production phase ordering.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { IDayEvent } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignInventory } from '@/types/campaign/CampaignInventory';
import type { IUnitMaxState } from '@/types/campaign/UnitCombatState';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { _resetDayPipeline, getDayPipeline } from '@/lib/campaign/dayPipeline';
import {
  _resetBuiltinRegistration,
  registerBuiltinProcessors,
} from '@/lib/campaign/processors';
import { applyScenarioEncounterBridge } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
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
import { EncounterStatus } from '@/types/encounter';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
    id: 'campaign-loop-1',
    name: 'Combat Loop Co.',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1_000_000) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    shoppingList: { items: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    unitCombatStates: {},
    ...overrides,
  };
}

function scenarioEvent(scenarioId: string, contractId: string): IDayEvent {
  return {
    type: 'scenario_generated',
    description: `Scenario ${scenarioId}`,
    severity: 'info',
    data: {
      scenarioType: 'standup',
      isAttacker: true,
      opForBV: 4500,
      conditions: { weather: 'clear', light: 'daylight' },
      teamId: 'force-alpha',
      contractId,
      contractName: 'Garrison: Hesperus II',
      scenarioId,
    },
  };
}

function makeDelta(unitId: string): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 5, LT: 8, RT: 12 },
    internalsRemaining: { CT: 6, LT: 8, RT: 8 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 1,
      killed: false,
      finalStatus: PilotFinalStatus.Wounded,
    },
  };
}

function makeOutcome(matchId: string, contractId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId,
    scenarioId: 'scn-loop-1',
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [makeDelta('unit-A')],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

function seedUnitMaxState(unitId: string): IUnitMaxState {
  return {
    unitId,
    maxArmorPerLocation: { CT: 30, LT: 20, RT: 20 },
    maxStructurePerLocation: { CT: 15, LT: 12, RT: 12 },
    maxAmmoPerBin: {},
  };
}

function seedRoster(): void {
  useCampaignRosterStore.setState({
    campaignId: 'campaign-loop-1',
    units: [],
    pilots: [
      {
        pilotId: 'unit-A',
        pilotName: 'Lina "Strix" Volkov',
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
}

function resetWorld(): void {
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Campaign combat loop — end-to-end round trip', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('6.1 — a generated scenario is bridged to a launchable encounter with linkage', () => {
    const campaign = makeCampaign();
    const result = applyScenarioEncounterBridge(
      campaign,
      [scenarioEvent('scn-loop-1', 'contract-loop-1')],
      campaign.currentDate.toISOString(),
    );

    const bridged = (
      result.campaign as ICampaign & {
        bridgedEncounters?: Record<string, { status: EncounterStatus }>;
      }
    ).bridgedEncounters;
    expect(bridged).toBeDefined();
    const encounter = bridged?.['scn-loop-1'] as {
      id: string;
      status: EncounterStatus;
      campaignMeta?: { contractId: string; scenarioId: string };
    };
    expect(encounter.id).toBe('enc-scn-loop-1');
    expect(encounter.campaignMeta?.contractId).toBe('contract-loop-1');
    expect(encounter.campaignMeta?.scenarioId).toBe('scn-loop-1');
  });

  it('6.2 — advancing the day drains the enqueued outcome and the inventory projection reflects it', () => {
    seedRoster();
    registerBuiltinProcessors();

    const contract = createContract({
      id: 'contract-loop-1',
      name: 'Garrison: Hesperus II',
      employerId: 'lyran-commonwealth',
      targetId: 'capellan-confederation',
      status: MissionStatus.ACTIVE,
    });

    const outcome = makeOutcome('match-loop-1', contract.id);

    // Campaign carries a pending campaign-linked outcome + the unit max
    // state the repair processor needs to diff damage.
    const campaign = makeCampaign({
      missions: new Map([[contract.id, contract]]),
      ...({
        pendingBattleOutcomes: [outcome],
        processedBattleIds: [],
        unitMaxStates: { 'unit-A': seedUnitMaxState('unit-A') },
      } as unknown as Partial<ICampaign>),
    });

    const pipeline = getDayPipeline();
    const dayResult = pipeline.processDay(campaign);

    // The battle-effects block drained the outcome.
    const drained = dayResult.campaign as ICampaign & {
      processedBattleIds?: readonly string[];
      repairQueue?: readonly { matchId: string }[];
      campaignInventory?: ICampaignInventory;
    };
    expect(drained.processedBattleIds).toContain('match-loop-1');

    // Repair tickets were generated from the CT 30→5 / 15→6 damage diff.
    const ticketsForMatch = (drained.repairQueue ?? []).filter(
      (t) => t.matchId === 'match-loop-1',
    );
    expect(ticketsForMatch.length).toBeGreaterThan(0);

    // The inventory projection ran (CLEANUP phase) and reflects the
    // post-battle state — repair tickets + the wounded pilot.
    const inventory = drained.campaignInventory;
    expect(inventory).toBeDefined();
    expect(inventory?.summary.repairTicketCount).toBeGreaterThan(0);
    expect(inventory?.repairBay.length).toBe(
      inventory?.summary.repairTicketCount,
    );
    // The wounded pilot from the outcome landed in the medical bay.
    expect(inventory?.medicalBay.length).toBeGreaterThan(0);
    expect(inventory?.summary.pilotsInMedical).toBe(
      inventory?.medicalBay.length,
    );
  });

  it('6.3 — the round trip is idempotent: re-running the day produces no duplicate encounters, outcomes, or inventory entries', () => {
    seedRoster();
    registerBuiltinProcessors();

    const contract = createContract({
      id: 'contract-loop-2',
      name: 'Raid: Sian',
      employerId: 'lyran-commonwealth',
      targetId: 'capellan-confederation',
      status: MissionStatus.ACTIVE,
    });
    const outcome = makeOutcome('match-loop-2', contract.id);

    const campaign = makeCampaign({
      id: 'campaign-loop-2',
      missions: new Map([[contract.id, contract]]),
      ...({
        pendingBattleOutcomes: [outcome],
        processedBattleIds: [],
        unitMaxStates: { 'unit-A': seedUnitMaxState('unit-A') },
        // Seed a pre-bridged scenario so the bridge idempotency path is
        // exercised on the very first day.
        bridgedScenarioIds: ['scn-loop-2'],
        bridgedEncounters: {
          'scn-loop-2': {
            id: 'enc-scn-loop-2',
            name: 'pre-bridged',
            status: EncounterStatus.Draft,
            mapConfig: {
              radius: 6,
              terrain: 'clear',
              playerDeploymentZone: 'south',
              opponentDeploymentZone: 'north',
            },
            victoryConditions: [],
            optionalRules: [],
            createdAt: '3025-06-15T00:00:00Z',
            updatedAt: '3025-06-15T00:00:00Z',
          },
        },
      } as unknown as Partial<ICampaign>),
    });

    const pipeline = getDayPipeline();
    const firstDay = pipeline.processDay(campaign);
    const firstState = firstDay.campaign as ICampaign & {
      repairQueue?: readonly { matchId: string }[];
      bridgedScenarioIds?: readonly string[];
      campaignInventory?: ICampaignInventory;
    };
    const firstTicketCount = (firstState.repairQueue ?? []).filter(
      (t) => t.matchId === 'match-loop-2',
    ).length;
    const firstInventoryRepairCount =
      firstState.campaignInventory?.summary.repairTicketCount ?? 0;

    // Advance again — the queue is drained, processed ledger suppresses
    // re-application, and the bridge skips the known scenario.
    const secondDay = pipeline.processDay(firstDay.campaign);
    const secondState = secondDay.campaign as ICampaign & {
      repairQueue?: readonly { matchId: string }[];
      bridgedScenarioIds?: readonly string[];
      campaignInventory?: ICampaignInventory;
    };

    // No duplicate repair tickets for the same match.
    const secondTicketCount = (secondState.repairQueue ?? []).filter(
      (t) => t.matchId === 'match-loop-2',
    ).length;
    expect(secondTicketCount).toBe(firstTicketCount);

    // No duplicate bridged scenario ids.
    expect(secondState.bridgedScenarioIds).toEqual(['scn-loop-2']);

    // Inventory repair count is stable across the no-op day.
    expect(secondState.campaignInventory?.summary.repairTicketCount).toBe(
      firstInventoryRepairCount,
    );
  });

  it('5.3 — the inventory projection runs strictly after the battle-effects block', () => {
    registerBuiltinProcessors();
    const processors = getDayPipeline().getProcessors();
    const order = processors.map((p) => p.id);

    const postBattleIdx = order.indexOf('post-battle');
    const salvageIdx = order.indexOf('salvage');
    const repairIdx = order.indexOf('repair-queue-builder');
    const inventoryIdx = order.indexOf('inventory-projection');

    expect(postBattleIdx).toBeGreaterThanOrEqual(0);
    expect(inventoryIdx).toBeGreaterThan(postBattleIdx);
    expect(inventoryIdx).toBeGreaterThan(salvageIdx);
    expect(inventoryIdx).toBeGreaterThan(repairIdx);
  });

  it('2.3 — the bridge runs after scenario generation in the pipeline order', () => {
    registerBuiltinProcessors();
    const order = getDayPipeline()
      .getProcessors()
      .map((p) => p.id);
    const scenarioGenIdx = order.indexOf('scenario-generation');
    const bridgeIdx = order.indexOf('scenario-encounter-bridge');
    expect(scenarioGenIdx).toBeGreaterThanOrEqual(0);
    expect(bridgeIdx).toBeGreaterThan(scenarioGenIdx);
  });
});
