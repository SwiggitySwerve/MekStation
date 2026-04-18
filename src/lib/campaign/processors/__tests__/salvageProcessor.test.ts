/**
 * Salvage Processor Tests
 *
 * Verifies the day-pipeline-facing processor contract:
 *   - reads outcomes off `pendingBattleOutcomes` / `salvagePendingOutcomes`
 *   - persists ISalvageAllocation + ISalvageReport keyed by matchId
 *   - is idempotent on matchId
 *   - emits a `salvage_allocated` event per outcome
 *   - falls back gracefully when contract is missing / 0% rights
 */

import {
  type ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createContract, type IContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
  type ICombatOutcome,
  type IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  applySalvage,
  salvageProcessor,
  type ICampaignWithSalvageState,
} from '../salvageProcessor';

// =============================================================================
// Fixture helpers
// =============================================================================

function makeDelta(overrides?: Partial<IUnitCombatDelta>): IUnitCombatDelta {
  return {
    unitId: 'enemy-1',
    side: GameSide.Opponent,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 10 },
    internalsRemaining: { CT: 10 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function makeOutcome(overrides?: Partial<ICombatOutcome>): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-1',
    contractId: 'contract-1',
    scenarioId: null,
    endReason: CombatEndReason.ObjectiveMet,
    report: {} as ICombatOutcome['report'],
    unitDeltas: [
      makeDelta({ unitId: 'enemy-1', finalStatus: UnitFinalStatus.Damaged }),
      makeDelta({ unitId: 'enemy-2', finalStatus: UnitFinalStatus.Crippled }),
    ],
    capturedAt: '2026-04-17T00:00:00Z',
    ...overrides,
  };
}

function makeCampaign(
  contract?: IContract,
  overrides?: Partial<ICampaignWithSalvageState>,
): ICampaignWithSalvageState {
  const missions = new Map<string, IContract>();
  if (contract) missions.set(contract.id, contract);
  const base: ICampaign = {
    id: 'campaign-1',
    name: 'Test',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'root',
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    missions: missions as any,
    finances: { transactions: [], balance: Money.ZERO },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    shoppingList: { items: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  return { ...base, ...overrides };
}

// =============================================================================
// applySalvage (direct API)
// =============================================================================

describe('applySalvage', () => {
  it('persists an allocation + report on the campaign extension', () => {
    const contract = createContract({
      id: 'contract-1',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
      salvageRights: 'Integrated',
    });
    const campaign = makeCampaign(contract);
    const outcome = makeOutcome();

    const { campaign: updated, summary } = applySalvage(outcome, campaign);

    expect(summary.allocationCreated).toBe(true);
    expect(summary.skippedDuplicate).toBe(false);
    expect(updated.salvageAllocations?.[outcome.matchId]).toBeDefined();
    expect(updated.salvageReports?.[outcome.matchId]).toBeDefined();
    expect(updated.salvageReportedBattleIds).toContain(outcome.matchId);
    // Two opponent kills → 2 candidates total in the pool.
    const allocation = updated.salvageAllocations?.[outcome.matchId];
    const totalCandidates =
      (allocation?.mercenaryAward.candidates.length ?? 0) +
      (allocation?.employerAward.candidates.length ?? 0);
    expect(totalCandidates).toBe(2);
  });

  it('is idempotent on matchId', () => {
    const contract = createContract({
      id: 'contract-1',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
      salvageRights: 'Integrated',
    });
    const campaign = makeCampaign(contract);
    const outcome = makeOutcome();

    const first = applySalvage(outcome, campaign);
    const second = applySalvage(outcome, first.campaign);

    expect(second.summary.skippedDuplicate).toBe(true);
    expect(second.summary.allocationCreated).toBe(false);
    // Allocation map unchanged across calls.
    expect(Object.keys(second.campaign.salvageAllocations ?? {})).toHaveLength(
      1,
    );
  });

  it('routes 0% mercenary rights → all to employer', () => {
    const contract = createContract({
      id: 'contract-1',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
      salvageRights: 'None',
    });
    const campaign = makeCampaign(contract);
    const outcome = makeOutcome();

    const { campaign: updated } = applySalvage(outcome, campaign);
    const allocation = updated.salvageAllocations?.[outcome.matchId];
    expect(allocation?.mercenaryAward.candidates).toHaveLength(0);
    expect(allocation?.employerAward.candidates.length).toBeGreaterThan(0);
  });

  it('persists empty allocation for standalone skirmish (null contract)', () => {
    const campaign = makeCampaign();
    const outcome = makeOutcome({ contractId: null });
    const { campaign: updated, summary } = applySalvage(outcome, campaign);
    expect(summary.allocationCreated).toBe(true);
    const allocation = updated.salvageAllocations?.[outcome.matchId];
    expect(allocation?.splitMethod).toBe('standalone');
    expect(allocation?.mercenaryAward.candidates).toHaveLength(0);
    expect(allocation?.employerAward.candidates).toHaveLength(0);
  });
});

// =============================================================================
// Day-pipeline processor
// =============================================================================

describe('salvageProcessor (day pipeline)', () => {
  it('drains pendingBattleOutcomes and emits salvage_allocated events', () => {
    const contract = createContract({
      id: 'contract-1',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
      salvageRights: 'Integrated',
    });
    const outcome = makeOutcome();
    const campaign = makeCampaign(contract, {
      pendingBattleOutcomes: [outcome],
    });

    const result = salvageProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('salvage_allocated');
    const updated = result.campaign as ICampaignWithSalvageState;
    expect(updated.salvageAllocations?.[outcome.matchId]).toBeDefined();
  });

  it('returns early when no outcomes are queued', () => {
    const contract = createContract({
      id: 'contract-1',
      name: 'Test',
      employerId: 'davion',
      targetId: 'liao',
    });
    const campaign = makeCampaign(contract);

    const result = salvageProcessor.process(campaign, campaign.currentDate);
    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });
});
