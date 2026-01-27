import { describe, it, expect } from '@jest/globals';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { DayPhase, IDayEvent } from '../../dayPipeline';
import { TransactionType } from '@/types/campaign/Transaction';
import type { ILoan } from '@/types/campaign/Loan';
import { financialProcessor } from '../financialProcessor';
import { dailyCostsProcessor } from '../dailyCostsProcessor';

function filterByTransactionType(events: readonly IDayEvent[], txType: TransactionType): readonly IDayEvent[] {
  return events.filter((e: IDayEvent) => e.type === 'transaction' && e.data?.transactionType === txType);
}

// =============================================================================
// Test Helpers
// =============================================================================

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'Test Pilot',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3000-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 500,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
    const defaultOptions = createDefaultCampaignOptions();
    return {
      id: 'campaign-001',
      name: 'Test Campaign',
      currentDate: new Date('3025-01-01T00:00:00Z'),
      factionId: 'mercenary',
      personnel: new Map<string, IPerson>(),
      forces: new Map(),
      rootForceId: 'force-root',
      missions: new Map(),
      finances: { transactions: [], balance: new Money(1000000) },
      factionStandings: {},
      shoppingList: { items: [] },
      options: {
        ...defaultOptions,
        useRoleBasedSalaries: true,
        payForSalaries: true,
        useTaxes: true,
        taxRate: 10,
        overheadPercent: 5,
        startingFunds: 500000,
      },
      createdAt: '3020-01-01T00:00:00Z',
      updatedAt: '3025-06-15T00:00:00Z',
      ...overrides,
    };
}

function createTestLoan(overrides: Partial<ILoan> = {}): ILoan {
  return {
    id: 'loan-001',
    principal: new Money(100000),
    annualRate: 0.05,
    termMonths: 12,
    monthlyPayment: new Money(8560.75),
    remainingPrincipal: new Money(100000),
    startDate: new Date('3024-06-01'),
    nextPaymentDate: new Date('3025-01-01'),
    paymentsRemaining: 6,
    isDefaulted: false,
    ...overrides,
  };
}

// =============================================================================
// financialProcessor metadata
// =============================================================================

describe('financialProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(financialProcessor.id).toBe('financial');
    expect(financialProcessor.phase).toBe(DayPhase.FINANCES);
    expect(financialProcessor.displayName).toBe('Financial Processing');
  });
});

// =============================================================================
// Monthly salary processing
// =============================================================================

describe('financialProcessor - monthly salary', () => {
  it('should process salaries on 1st of month', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', totalXpEarned: 500 }));
    personnel.set('p2', createTestPerson({
      id: 'p2',
      name: 'Test Tech',
      primaryRole: CampaignPersonnelRole.TECH,
      totalXpEarned: 500,
    }));

    const campaign = createTestCampaign({
      currentDate: new Date('3025-01-01T00:00:00Z'),
      personnel,
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const salaryEvents = filterByTransactionType(result.events, TransactionType.Salary);
    expect(salaryEvents.length).toBe(1);
    expect(result.campaign.finances.balance.amount).toBeLessThan(campaign.finances.balance.amount);
  });

  it('should NOT process salaries on non-1st days', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const campaign = createTestCampaign({ personnel });

    const secondOfMonth = new Date('3025-01-02T00:00:00Z');
    const result = financialProcessor.process(campaign, secondOfMonth);

    const salaryEvents = filterByTransactionType(result.events, TransactionType.Salary);
    expect(salaryEvents.length).toBe(0);
  });

  it('should NOT process salaries on 15th of month', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const campaign = createTestCampaign({ personnel });

    const fifteenth = new Date('3025-01-15T00:00:00Z');
    const result = financialProcessor.process(campaign, fifteenth);

    const salaryEvents = filterByTransactionType(result.events, TransactionType.Salary);
    expect(salaryEvents.length).toBe(0);
  });

  it('should NOT process salaries on 31st of month', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const campaign = createTestCampaign({ personnel });

    const thirtyFirst = new Date('3025-01-31T00:00:00Z');
    const result = financialProcessor.process(campaign, thirtyFirst);

    const salaryEvents = filterByTransactionType(result.events, TransactionType.Salary);
    expect(salaryEvents.length).toBe(0);
  });
});

// =============================================================================
// Monthly overhead processing
// =============================================================================

describe('financialProcessor - monthly overhead', () => {
  it('should calculate overhead as 5% of total salary', () => {
    const personnel = new Map<string, IPerson>();
    // Regular pilot: base 1500 * xp 1.0 * mult 1.0 = 1500
    personnel.set('p1', createTestPerson({ id: 'p1', totalXpEarned: 500 }));

    const campaign = createTestCampaign({
      personnel,
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        payForSalaries: true,
        overheadPercent: 5,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const overheadEvents = filterByTransactionType(result.events, TransactionType.Overhead);
    expect(overheadEvents.length).toBe(1);

    // Salary = 1500, overhead = 5% of 1500 = 75
    expect(overheadEvents[0].data?.amount).toBe(75);
  });
});

// =============================================================================
// Monthly food & housing
// =============================================================================

describe('financialProcessor - food and housing', () => {
  it('should process food and housing costs on 1st of month', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const campaign = createTestCampaign({ personnel });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const foodEvents = filterByTransactionType(result.events, TransactionType.FoodAndHousing);
    expect(foodEvents.length).toBe(1);
  });
});

// =============================================================================
// Monthly loan payments
// =============================================================================

describe('financialProcessor - loan payments', () => {
  it('should deduct loan payment on 1st of month', () => {
    const loan = createTestLoan();
    const campaign = createTestCampaign({
      finances: {
        transactions: [],
        balance: new Money(1000000),
        loans: [loan],
      },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        useLoanSystem: true,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const loanEvents = filterByTransactionType(result.events, TransactionType.LoanPayment);
    expect(loanEvents.length).toBe(1);
    expect(result.campaign.finances.balance.amount).toBeLessThan(campaign.finances.balance.amount);
  });

  it('should update loan after payment', () => {
    const loan = createTestLoan({ paymentsRemaining: 6 });
    const campaign = createTestCampaign({
      finances: {
        transactions: [],
        balance: new Money(1000000),
        loans: [loan],
      },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        useLoanSystem: true,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const updatedLoans = result.campaign.finances.loans;
    expect(updatedLoans).toBeDefined();
    expect(updatedLoans![0].paymentsRemaining).toBe(5);
  });

  it('should skip paid-off loans', () => {
    const paidOffLoan = createTestLoan({
      paymentsRemaining: 0,
      remainingPrincipal: Money.ZERO,
    });
    const campaign = createTestCampaign({
      finances: {
        transactions: [],
        balance: new Money(1000000),
        loans: [paidOffLoan],
      },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        useLoanSystem: true,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const loanEvents = filterByTransactionType(result.events, TransactionType.LoanPayment);
    expect(loanEvents.length).toBe(0);
  });
});

describe('financialProcessor - taxes', () => {
  it('should calculate tax on profits when useTaxes is true', () => {
    const campaign = createTestCampaign({
      finances: { transactions: [], balance: new Money(1000000) },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        useTaxes: true,
        taxRate: 10,
        startingFunds: 500000,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const taxEvents = filterByTransactionType(result.events, TransactionType.Tax);
    expect(taxEvents.length).toBe(1);
    // Profit = 1,000,000 - 500,000 = 500,000. Tax = 10% = 50,000
    expect(taxEvents[0].data?.amount).toBe(50000);
  });

  it('should not calculate tax when useTaxes is false', () => {
    const campaign = createTestCampaign({
      finances: { transactions: [], balance: new Money(1000000) },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        useTaxes: false,
        startingFunds: 500000,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    const taxEvents = filterByTransactionType(result.events, TransactionType.Tax);
    expect(taxEvents.length).toBe(0);
  });
});

// =============================================================================
// Daily maintenance
// =============================================================================

describe('financialProcessor - daily maintenance', () => {
  it('should process maintenance costs every day when payForMaintenance is true', () => {
    const forces = new Map();
    forces.set('force-root', {
      id: 'force-root',
      name: 'Root Force',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-001', 'unit-002'],
      forceType: 'standard',
      formationLevel: 'lance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const campaign = createTestCampaign({
      forces,
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        payForMaintenance: true,
        maintenanceCostMultiplier: 1.0,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    // Test on a non-1st day to isolate daily maintenance
    const midMonth = new Date('3025-01-15T00:00:00Z');
    const result = financialProcessor.process(campaign, midMonth);

    const maintenanceEvents = filterByTransactionType(result.events, TransactionType.Maintenance);
    expect(maintenanceEvents.length).toBe(1);
  });

  it('should NOT process maintenance when payForMaintenance is false', () => {
    const forces = new Map();
    forces.set('force-root', {
      id: 'force-root',
      name: 'Root Force',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-001'],
      forceType: 'standard',
      formationLevel: 'lance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const campaign = createTestCampaign({
      forces,
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        payForMaintenance: false,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const midMonth = new Date('3025-01-15T00:00:00Z');
    const result = financialProcessor.process(campaign, midMonth);

    const maintenanceEvents = filterByTransactionType(result.events, TransactionType.Maintenance);
    expect(maintenanceEvents.length).toBe(0);
  });
});

// =============================================================================
// Negative balance handling
// =============================================================================

describe('financialProcessor - negative balance', () => {
  it('should continue processing even with negative balance (no abort)', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', totalXpEarned: 500 }));

    const campaign = createTestCampaign({
      personnel,
      finances: { transactions: [], balance: new Money(100) },
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        payForSalaries: true,
        startingFunds: 500000,
        useTaxes: false,
      },
    });

    const firstOfMonth = new Date('3025-01-01T00:00:00Z');
    const result = financialProcessor.process(campaign, firstOfMonth);

    // Balance should go negative but processing should complete
    expect(result.campaign.finances.balance.isNegative()).toBe(true);
    // Should still have salary event
    const salaryEvents = filterByTransactionType(result.events, TransactionType.Salary);
    expect(salaryEvents.length).toBe(1);
  });
});

describe('dailyCostsProcessor gate - double-deduction prevention', () => {
  it('should return early (no-op) when useRoleBasedSalaries is true', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const forces = new Map();
    forces.set('force-root', {
      id: 'force-root',
      name: 'Root Force',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-001'],
      forceType: 'standard',
      formationLevel: 'lance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const campaign = createTestCampaign({
      personnel,
      forces,
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: true,
        payForSalaries: true,
        payForMaintenance: true,
      },
    });

    const date = new Date('3025-01-15T00:00:00Z');
    const result = dailyCostsProcessor.process(campaign, date);

    expect(result.events.length).toBe(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should still work normally when useRoleBasedSalaries is false', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1' }));

    const forces = new Map();
    forces.set('force-root', {
      id: 'force-root',
      name: 'Root Force',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-001'],
      forceType: 'standard',
      formationLevel: 'lance',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const campaign = createTestCampaign({
      personnel,
      forces,
      options: {
        ...createDefaultCampaignOptions(),
        useRoleBasedSalaries: false,
        payForSalaries: true,
        payForMaintenance: true,
      },
    });

    const date = new Date('3025-01-15T00:00:00Z');
    const result = dailyCostsProcessor.process(campaign, date);

    // Should process normally - at least one event for costs
    expect(result.events.length).toBeGreaterThan(0);
  });
});
