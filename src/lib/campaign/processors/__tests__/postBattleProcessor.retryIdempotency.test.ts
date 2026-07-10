/**
 * Seam tests for audit findings D-5 + D-8 (2026-06-09 audit, remediation W3.4).
 *
 * D-5: a partial failure while applying a battle outcome must NOT leave
 * pilot XP/wound side effects behind — the outcome stays queued for retry,
 * and the retry must apply effects exactly once. The pre-fix code committed
 * roster patches BEFORE the contract/prestige steps, so a throw in either
 * left committed XP plus a queued outcome → retry double-applied.
 *
 * D-8: an applied outcome must increment the pilot's campaignMissions by 1
 * and campaignKills by the after-action report's per-unit kill count so
 * kill/mission auto-awards can ever fire.
 */
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ILoan } from '@/types/campaign/Loan';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type {
  IPostBattleReport,
  IUnitReport,
} from '@/utils/gameplay/postBattleReport';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotType, PilotStatus } from '@/types/pilot/PilotInterfaces';

import { applyOutcomePrestige } from '../../prestige/applyOutcomePrestige';
import { contractProcessor } from '../contractProcessor';
import {
  applyPostBattle,
  postBattleProcessor,
  type ICampaignWithBattleState,
} from '../postBattleProcessor';

// The prestige step runs AFTER pilot patches in the pre-fix ordering, so
// mocking it to throw once reproduces the audit's "partial failure" shape:
// downstream computation explodes after upstream side effects committed.
jest.mock('../../prestige/applyOutcomePrestige', () => {
  const actual = jest.requireActual(
    '../../prestige/applyOutcomePrestige',
  ) as typeof import('../../prestige/applyOutcomePrestige');
  return {
    __esModule: true,
    applyOutcomePrestige: jest.fn(actual.applyOutcomePrestige),
  };
});

const prestigeMock = applyOutcomePrestige as jest.MockedFunction<
  typeof applyOutcomePrestige
>;

// ----------------------------------------------------------------------------
// Fixtures (mirrors postBattleProcessor.test.ts)
// ----------------------------------------------------------------------------

/** Builds a minimal campaign carrying the battle-state extension fields. */
function createTestCampaign(
  overrides: Partial<ICampaignWithBattleState> = {},
): ICampaignWithBattleState {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    unitCombatStates: {},
    ...overrides,
  };
}

/** Builds the after-action report with optional per-unit rows (D-8 kills). */
function createTestReport(
  matchId: string,
  units: readonly IUnitReport[] = [],
): IPostBattleReport {
  return {
    version: 1,
    matchId,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 5,
    units,
    mvpUnitId: null,
    log: [],
  };
}

/** Builds a player-side unit delta whose pilot survives unharmed. */
function createDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 20 },
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

/** Builds an outcome carrying one player delta + report kill rows. */
function createOutcome(
  matchId: string,
  units: readonly IUnitReport[] = [],
): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: createTestReport(matchId, units),
    unitDeltas: [createDelta('unit-A')],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

/** Builds a unit report row so kill attribution flows from the report. */
function makeUnitReport(unitId: string, kills: number): IUnitReport {
  return {
    unitId,
    side: GameSide.Player,
    designation: `Unit ${unitId}`,
    damageDealt: 25,
    damageReceived: 5,
    kills,
    heatProblems: 0,
    physicalAttacks: 0,
    xpPending: true,
  };
}

/** Roster entry factory — fresh zeroed counters per test. */
function makeRosterEntry(id: string): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: `Pilot ${id}`,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [],
  };
}

/** Seeds roster + vault so the XP path is live (entry + pilot non-null). */
function seedRosterEntry(pilotId: string): void {
  useCampaignRosterStore.setState({
    campaignId: 'camp-1',
    units: [],
    pilots: [makeRosterEntry(pilotId)],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({
    pilots: [
      {
        id: pilotId,
        name: `Pilot ${pilotId}`,
        type: PilotType.Persistent,
        status: PilotStatus.Active,
        skills: { gunnery: 4, piloting: 5 },
        wounds: 0,
        abilities: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      },
    ],
  });
}

/** Resets both Zustand stores to empty state. */
function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

/** Reads the live roster entry for assertions. */
function rosterEntry(pilotId: string): ICampaignRosterEntry {
  const entry = useCampaignRosterStore
    .getState()
    .pilots.find((p) => p.pilotId === pilotId);
  if (!entry) throw new Error(`roster entry ${pilotId} missing`);
  return entry;
}

// ----------------------------------------------------------------------------
// D-5 — retry after partial failure must not double-apply pilot effects
// ----------------------------------------------------------------------------

describe('postBattleProcessor retry idempotency (D-5)', () => {
  afterEach(() => {
    clearStores();
    prestigeMock.mockClear();
  });

  it('a failed apply leaves no pilot XP behind and the retry applies exactly once', () => {
    // Control: a clean single apply with default options awards
    // scenarioXP(1) + killXP(1) = 2 to the player-side winning pilot.
    seedRosterEntry('unit-A');
    const controlOutcome = createOutcome('match-control');
    postBattleProcessor.process(
      createTestCampaign({ pendingBattleOutcomes: [controlOutcome] }),
      new Date('3025-06-15T00:00:00Z'),
    );
    const controlXp = rosterEntry('unit-A').xp;
    expect(controlXp).toBeGreaterThan(0);
    clearStores();

    // Day 1: prestige step throws → outcome must stay queued AND the
    // roster must be untouched (no committed XP from the failed apply).
    seedRosterEntry('unit-A');
    const outcome = createOutcome('match-retry');
    const campaign = createTestCampaign({ pendingBattleOutcomes: [outcome] });
    prestigeMock.mockImplementationOnce(() => {
      throw new Error('induced mid-apply failure');
    });

    const day1 = postBattleProcessor.process(
      campaign,
      new Date('3025-06-15T00:00:00Z'),
    );
    const day1Campaign = day1.campaign as ICampaignWithBattleState;

    expect(day1.events.some((e) => e.type === 'post_battle_apply_failed')).toBe(
      true,
    );
    expect(day1Campaign.pendingBattleOutcomes ?? [outcome]).toHaveLength(1);
    // The failed apply must be side-effect free.
    expect(rosterEntry('unit-A').xp).toBe(0);

    // Day 2: retry succeeds → effects applied exactly once.
    const day2 = postBattleProcessor.process(
      day1Campaign,
      new Date('3025-06-16T00:00:00Z'),
    );
    const day2Campaign = day2.campaign as ICampaignWithBattleState;

    expect(day2Campaign.processedBattleIds ?? []).toContain('match-retry');
    expect(rosterEntry('unit-A').xp).toBe(controlXp);
  });
});

// ----------------------------------------------------------------------------
// D-8 — kill / mission counters increment from battle outcomes
// ----------------------------------------------------------------------------

describe('campaign kill/mission counters (D-8)', () => {
  afterEach(() => {
    clearStores();
    prestigeMock.mockClear();
  });

  it('post-battle with 2 kills increments campaignKills by 2 and campaignMissions by 1', () => {
    seedRosterEntry('unit-A');
    const outcome = createOutcome('match-kills', [makeUnitReport('unit-A', 2)]);

    const { summary } = applyPostBattle(outcome, createTestCampaign());

    expect(summary.skippedDuplicate).toBe(false);
    const entry = rosterEntry('unit-A');
    expect(entry.campaignKills).toBe(2);
    expect(entry.campaignMissions).toBe(1);
    expect(entry.xp).toBe(3);
    expect(entry.campaignXpEarned).toBe(3);
  });

  it('a unit with no report row still counts the mission with zero kills', () => {
    seedRosterEntry('unit-A');
    const outcome = createOutcome('match-no-kills', []);

    applyPostBattle(outcome, createTestCampaign());

    const entry = rosterEntry('unit-A');
    expect(entry.campaignKills).toBe(0);
    expect(entry.campaignMissions).toBe(1);
  });
});

describe('contract payout commit point (M4)', () => {
  afterEach(() => {
    clearStores();
    prestigeMock.mockClear();
  });

  it('posts the final payment and processed closure id when apply flips a contract terminal', () => {
    const contract = createContract({
      id: 'contract-close-at-apply',
      name: 'Close at Apply',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      paymentTerms: createPaymentTerms({
        basePayment: new Money(400),
        successPayment: new Money(600),
      }),
    });
    const campaign = createTestCampaign({
      missions: new Map([[contract.id, contract]]),
    });
    const outcome = {
      ...createOutcome('match-contract-close-at-apply'),
      contractId: contract.id,
    };

    const result = applyPostBattle(outcome, campaign);
    const paymentTransactions = result.campaign.finances.transactions.filter(
      (transaction) =>
        transaction.id.startsWith(`tx-contract-close-${contract.id}-`),
    );
    const extensions = result.campaign as ICampaignWithBattleState & {
      readonly processedFulfilledContractIds?: readonly string[];
    };

    expect(result.campaign.finances.balance.amount).toBe(1000);
    expect(paymentTransactions).toHaveLength(1);
    expect(paymentTransactions[0]).toMatchObject({
      type: TransactionType.Income,
      amount: expect.objectContaining({ amount: 1000 }),
    });
    expect(extensions.processedFulfilledContractIds).toContain(contract.id);
    expect(extensions.pendingFulfilledContractIds ?? []).not.toContain(
      contract.id,
    );
  });

  it('preserves the loan ledger while posting the final payment at apply', () => {
    const loans = [
      {
        id: 'loan-apply-closure',
        principal: new Money(120000),
        annualRate: 0.08,
        termMonths: 60,
        monthlyPayment: new Money(2500),
        remainingPrincipal: new Money(100000),
        startDate: new Date('3025-01-01T00:00:00Z'),
        nextPaymentDate: new Date('3025-07-01T00:00:00Z'),
        paymentsRemaining: 48,
        isDefaulted: false,
      },
    ] satisfies ILoan[];
    const contract = createContract({
      id: 'contract-close-preserve-apply-loans',
      name: 'Preserve Apply Loans',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      paymentTerms: createPaymentTerms({
        basePayment: new Money(400),
        successPayment: new Money(600),
      }),
    });
    const result = applyPostBattle(
      {
        ...createOutcome('match-contract-close-preserve-apply-loans'),
        contractId: contract.id,
      },
      createTestCampaign({
        missions: new Map([[contract.id, contract]]),
        finances: { transactions: [], balance: new Money(0), loans },
      }),
    );
    const paymentTransactions = result.campaign.finances.transactions.filter(
      (transaction) =>
        transaction.type === TransactionType.Income &&
        transaction.id.startsWith(`tx-contract-close-${contract.id}-`),
    );

    expect(result.campaign.finances.balance.amount).toBe(1000);
    expect(paymentTransactions).toHaveLength(1);
    expect(result.campaign.finances.loans).toEqual(loans);
  });

  it('does not post a second final payment when the following day pipeline drains', () => {
    const contract = createContract({
      id: 'contract-close-once',
      name: 'Close Once',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      paymentTerms: createPaymentTerms({
        basePayment: new Money(400),
        successPayment: new Money(600),
      }),
    });
    const applied = applyPostBattle(
      {
        ...createOutcome('match-contract-close-once'),
        contractId: contract.id,
      },
      createTestCampaign({ missions: new Map([[contract.id, contract]]) }),
    );
    const balanceAfterApply = applied.campaign.finances.balance.amount;
    const afterPostBattle = postBattleProcessor.process(
      applied.campaign,
      applied.campaign.currentDate,
    ).campaign;
    const afterContractDrain = contractProcessor.process(
      afterPostBattle,
      applied.campaign.currentDate,
    ).campaign as ICampaignWithBattleState;
    const paymentTransactions = afterContractDrain.finances.transactions.filter(
      (transaction) =>
        transaction.type === TransactionType.Income &&
        transaction.id.startsWith(`tx-contract-close-${contract.id}-`),
    );

    expect(afterContractDrain.finances.balance.amount).toBe(balanceAfterApply);
    expect(paymentTransactions).toHaveLength(1);
    expect(
      (
        afterContractDrain as ICampaignWithBattleState & {
          readonly processedFulfilledContractIds?: readonly string[];
        }
      ).processedFulfilledContractIds,
    ).toContain(contract.id);
  });
});
