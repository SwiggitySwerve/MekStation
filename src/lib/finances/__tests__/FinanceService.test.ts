/**
 * FinanceService.test.ts - Comprehensive tests for FinanceService
 *
 * Tests cover:
 * - recordTransaction: income, expense, salvage, maintenance, repair,
 *   miscellaneous, multiple transactions, balance updates
 * - getBalance: empty transactions, single income, single expense,
 *   mixed transactions, salvage as income, zero amounts
 * - calculateDailyCosts: salary calculation, maintenance calculation,
 *   option toggles, multipliers, empty campaign, combined costs
 * - processContractPayment: success payout, partial payout, failure payout,
 *   active contract (no payment), pending contract, zero payout,
 *   breach/cancelled/aborted statuses
 */

import {
  recordTransaction,
  getBalance,
  calculateDailyCosts,
  processContractPayment,
  DEFAULT_DAILY_SALARY,
  DEFAULT_DAILY_MAINTENANCE,
  DailyCosts,
} from '../FinanceService';

import { IFinances } from '@/types/campaign/IFinances';
import { Transaction } from '@/types/campaign/Transaction';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { ICampaign, createDefaultCampaignOptions, ICampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IContract, createContract } from '@/types/campaign/Mission';
import { IPerson } from '@/types/campaign/Person';
import { IMission } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import {
  PersonnelStatus,
  MissionStatus,
  CampaignPersonnelRole,
  ForceRole,
  FormationLevel,
} from '@/types/campaign/enums';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestFinances(overrides?: Partial<IFinances>): IFinances {
  return {
    transactions: [],
    balance: Money.ZERO,
    ...overrides,
  };
}

function createTestTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'tx-001',
    type: TransactionType.Income,
    amount: new Money(1000),
    date: new Date('3025-06-15T00:00:00Z'),
    description: 'Test transaction',
    ...overrides,
  };
}

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 200,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestForce(
  id: string,
  unitIds: string[] = [],
  subForceIds: string[] = [],
  parentForceId?: string
): IForce {
  return {
    id,
    name: `Force ${id}`,
    parentForceId,
    subForceIds,
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
    return {
      id: 'campaign-001',
      name: 'Test Campaign',
      currentDate: new Date('3025-06-15T00:00:00Z'),
      factionId: 'mercenary',
      personnel: new Map<string, IPerson>(),
      forces: new Map<string, IForce>(),
      rootForceId: 'force-root',
      missions: new Map<string, IMission>(),
      finances: { transactions: [], balance: new Money(1000000) },
      factionStandings: {},
      shoppingList: { items: [] },
      options: createDefaultCampaignOptions(),
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
      campaignType: CampaignType.MERCENARY,
    };
}

function createTestContract(overrides?: Partial<IContract>): IContract {
  const base = createContract({
    id: overrides?.id ?? 'contract-001',
    name: overrides?.name ?? 'Garrison Duty',
    employerId: overrides?.employerId ?? 'davion',
    targetId: overrides?.targetId ?? 'liao',
    systemId: overrides?.systemId ?? 'new-avalon',
    status: overrides?.status ?? MissionStatus.SUCCESS,
    paymentTerms: overrides?.paymentTerms ?? createPaymentTerms({
      basePayment: new Money(500000),
      successPayment: new Money(250000),
      partialPayment: new Money(100000),
      failurePayment: new Money(0),
      transportPayment: new Money(50000),
      supportPayment: new Money(25000),
    }),
    salvageRights: overrides?.salvageRights ?? 'Integrated',
    commandRights: overrides?.commandRights ?? 'Independent',
  });
  return base;
}

// =============================================================================
// recordTransaction Tests
// =============================================================================

describe('recordTransaction', () => {
  it('should add an income transaction and increase balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Income,
      amount: new Money(500),
    });

    const result = recordTransaction(finances, tx);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toBe(tx);
    expect(result.balance.amount).toBe(1500);
  });

  it('should add an expense transaction and decrease balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Expense,
      amount: new Money(300),
    });

    const result = recordTransaction(finances, tx);

    expect(result.transactions).toHaveLength(1);
    expect(result.balance.amount).toBe(700);
  });

  it('should add a salvage transaction and increase balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Salvage,
      amount: new Money(200),
    });

    const result = recordTransaction(finances, tx);

    expect(result.transactions).toHaveLength(1);
    expect(result.balance.amount).toBe(1200);
  });

  it('should add a repair transaction and decrease balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Repair,
      amount: new Money(150),
    });

    const result = recordTransaction(finances, tx);

    expect(result.transactions).toHaveLength(1);
    expect(result.balance.amount).toBe(850);
  });

  it('should add a maintenance transaction and decrease balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Maintenance,
      amount: new Money(100),
    });

    const result = recordTransaction(finances, tx);

    expect(result.balance.amount).toBe(900);
  });

  it('should add a miscellaneous transaction and decrease balance', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Miscellaneous,
      amount: new Money(50),
    });

    const result = recordTransaction(finances, tx);

    expect(result.balance.amount).toBe(950);
  });

  it('should handle multiple transactions sequentially', () => {
    let finances = createTestFinances({ balance: new Money(10000) });

    const income = createTestTransaction({
      id: 'tx-1',
      type: TransactionType.Income,
      amount: new Money(5000),
    });
    finances = recordTransaction(finances, income);

    const expense = createTestTransaction({
      id: 'tx-2',
      type: TransactionType.Expense,
      amount: new Money(3000),
    });
    finances = recordTransaction(finances, expense);

    expect(finances.transactions).toHaveLength(2);
    expect(finances.balance.amount).toBe(12000);
  });

  it('should not mutate the original finances object', () => {
    const original = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Income,
      amount: new Money(500),
    });

    const result = recordTransaction(original, tx);

    expect(original.transactions).toHaveLength(0);
    expect(original.balance.amount).toBe(1000); // Original unchanged
    expect(result).not.toBe(original);
  });

  it('should allow balance to go negative', () => {
    const finances = createTestFinances({ balance: new Money(100) });
    const tx = createTestTransaction({
      type: TransactionType.Expense,
      amount: new Money(500),
    });

    const result = recordTransaction(finances, tx);

    expect(result.balance.amount).toBe(-400);
    expect(result.balance.isNegative()).toBe(true);
  });

  it('should handle zero-amount transactions', () => {
    const finances = createTestFinances({ balance: new Money(1000) });
    const tx = createTestTransaction({
      type: TransactionType.Income,
      amount: Money.ZERO,
    });

    const result = recordTransaction(finances, tx);

    expect(result.transactions).toHaveLength(1);
    expect(result.balance.amount).toBe(1000);
  });
});

// =============================================================================
// getBalance Tests
// =============================================================================

describe('getBalance', () => {
  it('should return zero for empty transactions', () => {
    const finances = createTestFinances();

    const balance = getBalance(finances);

    expect(balance.amount).toBe(0);
    expect(balance.isZero()).toBe(true);
  });

  it('should return positive balance for single income', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          type: TransactionType.Income,
          amount: new Money(5000),
        }),
      ],
    });

    const balance = getBalance(finances);

    expect(balance.amount).toBe(5000);
  });

  it('should return negative balance for single expense', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          type: TransactionType.Expense,
          amount: new Money(3000),
        }),
      ],
    });

    const balance = getBalance(finances);

    expect(balance.amount).toBe(-3000);
  });

  it('should correctly sum mixed income and expense transactions', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          id: 'tx-1',
          type: TransactionType.Income,
          amount: new Money(10000),
        }),
        createTestTransaction({
          id: 'tx-2',
          type: TransactionType.Expense,
          amount: new Money(3000),
        }),
        createTestTransaction({
          id: 'tx-3',
          type: TransactionType.Income,
          amount: new Money(2000),
        }),
        createTestTransaction({
          id: 'tx-4',
          type: TransactionType.Repair,
          amount: new Money(1500),
        }),
      ],
    });

    const balance = getBalance(finances);

    // 10000 - 3000 + 2000 - 1500 = 7500
    expect(balance.amount).toBe(7500);
  });

  it('should treat salvage as income', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          type: TransactionType.Salvage,
          amount: new Money(8000),
        }),
      ],
    });

    const balance = getBalance(finances);

    expect(balance.amount).toBe(8000);
  });

  it('should treat maintenance as expense', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          type: TransactionType.Maintenance,
          amount: new Money(500),
        }),
      ],
    });

    const balance = getBalance(finances);

    expect(balance.amount).toBe(-500);
  });

  it('should treat miscellaneous as expense', () => {
    const finances = createTestFinances({
      transactions: [
        createTestTransaction({
          type: TransactionType.Miscellaneous,
          amount: new Money(200),
        }),
      ],
    });

    const balance = getBalance(finances);

    expect(balance.amount).toBe(-200);
  });

  it('should handle many transactions accurately', () => {
    const transactions: Transaction[] = [];
    for (let i = 0; i < 100; i++) {
      transactions.push(
        createTestTransaction({
          id: `tx-${i}`,
          type: i % 2 === 0 ? TransactionType.Income : TransactionType.Expense,
          amount: new Money(100),
        })
      );
    }

    const finances = createTestFinances({ transactions });
    const balance = getBalance(finances);

    // 50 income * 100 - 50 expense * 100 = 0
    expect(balance.amount).toBe(0);
  });

  it('should ignore stored balance and recompute from transactions', () => {
    const finances: IFinances = {
      transactions: [
        createTestTransaction({
          type: TransactionType.Income,
          amount: new Money(5000),
        }),
      ],
      balance: new Money(999999), // Intentionally wrong stored balance
    };

    const balance = getBalance(finances);

    // Should compute from transactions, not use stored balance
    expect(balance.amount).toBe(5000);
  });
});

// =============================================================================
// calculateDailyCosts Tests
// =============================================================================

describe('calculateDailyCosts', () => {
  it('should return zero costs for empty campaign', () => {
    const campaign = createTestCampaign();

    const costs = calculateDailyCosts(campaign);

    expect(costs.salaries.isZero()).toBe(true);
    expect(costs.maintenance.isZero()).toBe(true);
    expect(costs.total.isZero()).toBe(true);
    expect(costs.personnelCount).toBe(0);
    expect(costs.unitCount).toBe(0);
  });

  it('should calculate salary for active personnel', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));
    personnel.set('p2', createTestPerson({ id: 'p2', status: PersonnelStatus.ACTIVE }));

    const campaign = createTestCampaign({ personnel });

    const costs = calculateDailyCosts(campaign);

    expect(costs.personnelCount).toBe(2);
    expect(costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2);
  });

  it('should exclude KIA personnel from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));
    personnel.set('p2', createTestPerson({ id: 'p2', status: PersonnelStatus.KIA }));

    const campaign = createTestCampaign({ personnel });

    const costs = calculateDailyCosts(campaign);

    expect(costs.personnelCount).toBe(1);
    expect(costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY);
  });

  it('should exclude RETIRED personnel from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.RETIRED }));

    const campaign = createTestCampaign({ personnel });

    const costs = calculateDailyCosts(campaign);

    expect(costs.personnelCount).toBe(0);
    expect(costs.salaries.isZero()).toBe(true);
  });

  it('should exclude DESERTED personnel from salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.DESERTED }));

    const campaign = createTestCampaign({ personnel });

    const costs = calculateDailyCosts(campaign);

    expect(costs.personnelCount).toBe(0);
    expect(costs.salaries.isZero()).toBe(true);
  });

  it('should include WOUNDED personnel in salary', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.WOUNDED }));

    const campaign = createTestCampaign({ personnel });

    const costs = calculateDailyCosts(campaign);

    expect(costs.personnelCount).toBe(1);
    expect(costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY);
  });

  it('should apply salary multiplier from options', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      salaryMultiplier: 2.0,
    };

    const campaign = createTestCampaign({ personnel, options });

    const costs = calculateDailyCosts(campaign);

    expect(costs.salaries.amount).toBe(DEFAULT_DAILY_SALARY * 2.0);
  });

  it('should return zero salary when payForSalaries is false', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      payForSalaries: false,
    };

    const campaign = createTestCampaign({ personnel, options });

    const costs = calculateDailyCosts(campaign);

    expect(costs.salaries.isZero()).toBe(true);
    expect(costs.personnelCount).toBe(1); // Still counted, just not paid
  });

  it('should calculate maintenance for units in forces', () => {
    const forces = new Map<string, IForce>();
    const rootForce = createTestForce('force-root', ['unit-1', 'unit-2', 'unit-3']);
    forces.set('force-root', rootForce);

    const campaign = createTestCampaign({ forces });

    const costs = calculateDailyCosts(campaign);

    expect(costs.unitCount).toBe(3);
    expect(costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 3);
  });

  it('should apply maintenance multiplier from options', () => {
    const forces = new Map<string, IForce>();
    const rootForce = createTestForce('force-root', ['unit-1']);
    forces.set('force-root', rootForce);

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      maintenanceCostMultiplier: 1.5,
    };

    const campaign = createTestCampaign({ forces, options });

    const costs = calculateDailyCosts(campaign);

    expect(costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 1.5);
  });

  it('should return zero maintenance when payForMaintenance is false', () => {
    const forces = new Map<string, IForce>();
    const rootForce = createTestForce('force-root', ['unit-1']);
    forces.set('force-root', rootForce);

    const options: ICampaignOptions = {
      ...createDefaultCampaignOptions(),
      payForMaintenance: false,
    };

    const campaign = createTestCampaign({ forces, options });

    const costs = calculateDailyCosts(campaign);

    expect(costs.maintenance.isZero()).toBe(true);
    expect(costs.unitCount).toBe(1); // Units still counted, just not charged
  });

  it('should combine salary and maintenance in total', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const forces = new Map<string, IForce>();
    const rootForce = createTestForce('force-root', ['unit-1']);
    forces.set('force-root', rootForce);

    const campaign = createTestCampaign({ personnel, forces });

    const costs = calculateDailyCosts(campaign);

    const expectedTotal = DEFAULT_DAILY_SALARY + DEFAULT_DAILY_MAINTENANCE;
    expect(costs.total.amount).toBe(expectedTotal);
  });

  it('should handle campaign with no root force', () => {
    const campaign = createTestCampaign({
      rootForceId: 'nonexistent-force',
    });

    const costs = calculateDailyCosts(campaign);

    expect(costs.unitCount).toBe(0);
    expect(costs.maintenance.isZero()).toBe(true);
  });

  it('should count units in sub-forces', () => {
    const forces = new Map<string, IForce>();
    const subForce = createTestForce('force-sub', ['unit-3', 'unit-4'], [], 'force-root');
    const rootForce = createTestForce('force-root', ['unit-1', 'unit-2'], ['force-sub']);
    forces.set('force-root', rootForce);
    forces.set('force-sub', subForce);

    const campaign = createTestCampaign({ forces });

    const costs = calculateDailyCosts(campaign);

    expect(costs.unitCount).toBe(4);
    expect(costs.maintenance.amount).toBe(DEFAULT_DAILY_MAINTENANCE * 4);
  });
});

// =============================================================================
// processContractPayment Tests
// =============================================================================

describe('processContractPayment', () => {
  it('should record payment for successful contract', () => {
    const contract = createTestContract({ status: MissionStatus.SUCCESS });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe(TransactionType.Income);
    expect(result.transactions[0].description).toContain('Garrison Duty');
    expect(result.transactions[0].description).toContain(MissionStatus.SUCCESS);
    // base(500000) + success(250000) + transport(50000) + support(25000) = 825000
    expect(result.transactions[0].amount.amount).toBe(825000);
  });

  it('should record partial payment for partially successful contract', () => {
    const contract = createTestContract({ status: MissionStatus.PARTIAL });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(1);
    // base(500000) + partial(100000) + transport(50000) + support(25000) = 675000
    expect(result.transactions[0].amount.amount).toBe(675000);
  });

  it('should record failure payment for failed contract', () => {
    const contract = createTestContract({ status: MissionStatus.FAILED });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    // base(500000) + failure(0) + transport(50000) + support(25000) = 575000
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount.amount).toBe(575000);
  });

  it('should not process payment for active contract', () => {
    const contract = createTestContract({ status: MissionStatus.ACTIVE });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(0);
    expect(result).toBe(campaign.finances);
  });

  it('should not process payment for pending contract', () => {
    const contract = createTestContract({ status: MissionStatus.PENDING });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(0);
    expect(result).toBe(campaign.finances);
  });

  it('should process payment for breach status', () => {
    const contract = createTestContract({ status: MissionStatus.BREACH });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    // Breach maps to 'failure' outcome
    // base(500000) + failure(0) + transport(50000) + support(25000) = 575000
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount.amount).toBe(575000);
  });

  it('should process payment for cancelled status', () => {
    const contract = createTestContract({ status: MissionStatus.CANCELLED });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(1);
  });

  it('should process payment for aborted status', () => {
    const contract = createTestContract({ status: MissionStatus.ABORTED });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(1);
  });

  it('should not record transaction when payout is zero', () => {
    const contract = createTestContract({
      status: MissionStatus.FAILED,
      paymentTerms: createPaymentTerms({
        basePayment: Money.ZERO,
        successPayment: Money.ZERO,
        partialPayment: Money.ZERO,
        failurePayment: Money.ZERO,
        transportPayment: Money.ZERO,
        supportPayment: Money.ZERO,
      }),
    });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(0);
  });

  it('should update balance when recording payment', () => {
    const contract = createTestContract({ status: MissionStatus.SUCCESS });
    const campaign = createTestCampaign({
      finances: { transactions: [], balance: new Money(100000) },
    });

    const result = processContractPayment(campaign, contract);

    // 100000 + 825000 = 925000
    expect(result.balance.amount).toBe(925000);
  });

  it('should use campaign current date for transaction date', () => {
    const campaignDate = new Date('3025-06-15T00:00:00Z');
    const contract = createTestContract({ status: MissionStatus.SUCCESS });
    const campaign = createTestCampaign({ currentDate: campaignDate });

    const result = processContractPayment(campaign, contract);

    expect(result.transactions[0].date).toBe(campaignDate);
  });

  it('should include contract name in transaction description', () => {
    const contract = createTestContract({
      name: 'Raid on Hesperus II',
      status: MissionStatus.SUCCESS,
    });
    const campaign = createTestCampaign();

    const result = processContractPayment(campaign, contract);

    expect(result.transactions[0].description).toContain('Raid on Hesperus II');
  });

  it('should preserve existing transactions when adding payment', () => {
    const existingTx = createTestTransaction({
      id: 'existing-tx',
      type: TransactionType.Expense,
      amount: new Money(5000),
    });
    const contract = createTestContract({ status: MissionStatus.SUCCESS });
    const campaign = createTestCampaign({
      finances: {
        transactions: [existingTx],
        balance: new Money(100000),
      },
    });

    const result = processContractPayment(campaign, contract);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toBe(existingTx);
  });
});

// =============================================================================
// Integration / Cross-function Tests
// =============================================================================

describe('FinanceService integration', () => {
  it('should maintain consistency between recordTransaction and getBalance', () => {
    let finances = createTestFinances();

    finances = recordTransaction(
      finances,
      createTestTransaction({
        id: 'tx-1',
        type: TransactionType.Income,
        amount: new Money(10000),
      })
    );
    finances = recordTransaction(
      finances,
      createTestTransaction({
        id: 'tx-2',
        type: TransactionType.Expense,
        amount: new Money(3000),
      })
    );

    const computedBalance = getBalance(finances);

    expect(finances.balance.amount).toBe(computedBalance.amount);
  });

  it('should handle full workflow: costs + payment', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({
      personnel,
      forces,
      finances: { transactions: [], balance: new Money(1000000) },
    });

    // Calculate daily costs
    const costs = calculateDailyCosts(campaign);
    expect(costs.total.isPositive()).toBe(true);

    // Process a contract payment
    const contract = createTestContract({ status: MissionStatus.SUCCESS });
    const updatedFinances = processContractPayment(campaign, contract);

    expect(updatedFinances.balance.amount).toBeGreaterThan(campaign.finances.balance.amount);
  });
});
