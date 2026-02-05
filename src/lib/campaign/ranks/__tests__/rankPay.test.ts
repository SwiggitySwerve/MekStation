import type { IPerson } from '@/types/campaign/Person';
import type { IRankSystem } from '@/types/campaign/ranks/rankTypes';

import {
  getRankPayMultiplier,
  getPersonMonthlySalaryWithRank,
  getOfficerShares,
} from '@/lib/campaign/ranks/rankPay';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { createRanks } from '@/types/campaign/ranks/rankTypes';

// =============================================================================
// Mock Rank System
// =============================================================================

const mockSystem: IRankSystem = {
  code: 'TEST',
  name: 'Test',
  description: 'Test',
  type: 'default',
  officerCut: 31,
  ranks: createRanks({
    0: { names: { mekwarrior: 'None' }, officer: false, payMultiplier: 1.0 },
    5: {
      names: { mekwarrior: 'Sergeant' },
      officer: false,
      payMultiplier: 1.1,
    },
    31: {
      names: { mekwarrior: 'Lieutenant' },
      officer: true,
      payMultiplier: 1.4,
    },
    35: { names: { mekwarrior: 'Captain' }, officer: true, payMultiplier: 1.6 },
    40: { names: { mekwarrior: 'Colonel' }, officer: true, payMultiplier: 2.0 },
  }),
};

// =============================================================================
// Mock Person Helper
// =============================================================================

const createMockPerson = (overrides: Partial<IPerson> = {}): IPerson => ({
  id: 'test-1',
  name: 'Test',
  status: PersonnelStatus.ACTIVE,
  primaryRole: CampaignPersonnelRole.PILOT,
  rank: 'None',
  rankIndex: 0,
  recruitmentDate: new Date('3025-01-01'),
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
  missionsCompleted: 0,
  totalKills: 0,
  createdAt: '3025-01-01T00:00:00Z',
  updatedAt: '3025-01-01T00:00:00Z',
  ...overrides,
});

// =============================================================================
// getRankPayMultiplier Tests
// =============================================================================

describe('getRankPayMultiplier', () => {
  it('should return 1.0 for rank 0 (None)', () => {
    const person = createMockPerson({ rankIndex: 0 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.0);
  });

  it('should return 1.1 for rank 5 (Sergeant)', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.1);
  });

  it('should return 1.4 for rank 31 (Lieutenant)', () => {
    const person = createMockPerson({ rankIndex: 31 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.4);
  });

  it('should return 1.6 for rank 35 (Captain)', () => {
    const person = createMockPerson({ rankIndex: 35 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.6);
  });

  it('should return 2.0 for rank 40 (Colonel)', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(2.0);
  });

  it('should return 1.0 for undefined rankIndex', () => {
    const person = createMockPerson({ rankIndex: undefined });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.0);
  });

  it('should return 1.0 for unpopulated rank (uses empty rank with 1.0 multiplier)', () => {
    const person = createMockPerson({ rankIndex: 15 });
    expect(getRankPayMultiplier(person, mockSystem)).toBe(1.0);
  });

  it('should return 1.0 for rank with payMultiplier of 0', () => {
    const systemWithZeroMultiplier: IRankSystem = {
      ...mockSystem,
      ranks: createRanks({
        0: { names: { mekwarrior: 'None' }, officer: false, payMultiplier: 0 },
      }),
    };
    const person = createMockPerson({ rankIndex: 0 });
    expect(getRankPayMultiplier(person, systemWithZeroMultiplier)).toBe(1.0);
  });

  it('should return 1.0 for rank with negative payMultiplier', () => {
    const systemWithNegativeMultiplier: IRankSystem = {
      ...mockSystem,
      ranks: createRanks({
        0: {
          names: { mekwarrior: 'None' },
          officer: false,
          payMultiplier: -0.5,
        },
      }),
    };
    const person = createMockPerson({ rankIndex: 0 });
    expect(getRankPayMultiplier(person, systemWithNegativeMultiplier)).toBe(
      1.0,
    );
  });
});

// =============================================================================
// getPersonMonthlySalaryWithRank Tests
// =============================================================================

describe('getPersonMonthlySalaryWithRank', () => {
  it('should calculate 1000 * 1.0 = 1000 for rank 0', () => {
    const person = createMockPerson({ rankIndex: 0 });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1000);
  });

  it('should calculate 1500 * 1.1 = 1650 for rank 5 (Sergeant)', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getPersonMonthlySalaryWithRank(1500, person, mockSystem)).toBe(1650);
  });

  it('should calculate 2000 * 2.0 = 4000 for rank 40 (Colonel)', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(getPersonMonthlySalaryWithRank(2000, person, mockSystem)).toBe(4000);
  });

  it('should round correctly: 1000 * 1.1 = 1100', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1100);
  });

  it('should round down: 1000 * 1.4 = 1400', () => {
    const person = createMockPerson({ rankIndex: 31 });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1400);
  });

  it('should round up: 1000 * 1.6 = 1600', () => {
    const person = createMockPerson({ rankIndex: 35 });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1600);
  });

  it('should handle decimal rounding: 1333 * 1.1 = 1466.3 rounds to 1466', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getPersonMonthlySalaryWithRank(1333, person, mockSystem)).toBe(1466);
  });

  it('should handle decimal rounding: 1333 * 1.1 = 1466.3 rounds to 1466', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = getPersonMonthlySalaryWithRank(1333, person, mockSystem);
    expect(result).toBe(1466);
  });

  it('should handle zero base salary', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(getPersonMonthlySalaryWithRank(0, person, mockSystem)).toBe(0);
  });

  it('should handle large base salary: 50000 * 2.0 = 100000', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(getPersonMonthlySalaryWithRank(50000, person, mockSystem)).toBe(
      100000,
    );
  });

  it('should use undefined rankIndex as 0', () => {
    const person = createMockPerson({ rankIndex: undefined });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1000);
  });

  it('should handle unpopulated rank (defaults to 1.0 multiplier)', () => {
    const person = createMockPerson({ rankIndex: 15 });
    expect(getPersonMonthlySalaryWithRank(1000, person, mockSystem)).toBe(1000);
  });

  it('should handle fractional base salary with rounding', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getPersonMonthlySalaryWithRank(999.5, person, mockSystem)).toBe(
      1099,
    );
  });

  it('should handle very small multiplier', () => {
    const systemWithSmallMultiplier: IRankSystem = {
      ...mockSystem,
      ranks: createRanks({
        0: {
          names: { mekwarrior: 'None' },
          officer: false,
          payMultiplier: 0.1,
        },
      }),
    };
    const person = createMockPerson({ rankIndex: 0 });
    expect(
      getPersonMonthlySalaryWithRank(1000, person, systemWithSmallMultiplier),
    ).toBe(100);
  });

  it('should handle large multiplier', () => {
    const systemWithLargeMultiplier: IRankSystem = {
      ...mockSystem,
      ranks: createRanks({
        0: {
          names: { mekwarrior: 'None' },
          officer: false,
          payMultiplier: 5.0,
        },
      }),
    };
    const person = createMockPerson({ rankIndex: 0 });
    expect(
      getPersonMonthlySalaryWithRank(1000, person, systemWithLargeMultiplier),
    ).toBe(5000);
  });
});

// =============================================================================
// getOfficerShares Tests
// =============================================================================

describe('getOfficerShares', () => {
  it('should return 0 for non-officer (rank 0)', () => {
    const person = createMockPerson({ rankIndex: 0 });
    expect(getOfficerShares(person, mockSystem)).toBe(0);
  });

  it('should return 0 for non-officer (rank 5, Sergeant)', () => {
    const person = createMockPerson({ rankIndex: 5 });
    expect(getOfficerShares(person, mockSystem)).toBe(0);
  });

  it('should return 1 for first officer rank (rank 31, Lieutenant at officerCut)', () => {
    const person = createMockPerson({ rankIndex: 31 });
    expect(getOfficerShares(person, mockSystem)).toBe(1);
  });

  it('should return 5 for rank 35 (Captain, 4 ranks above officerCut)', () => {
    const person = createMockPerson({ rankIndex: 35 });
    expect(getOfficerShares(person, mockSystem)).toBe(5);
  });

  it('should return 10 for rank 40 (Colonel, 9 ranks above officerCut)', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(getOfficerShares(person, mockSystem)).toBe(10);
  });

  it('should return 0 for undefined rankIndex (defaults to 0, non-officer)', () => {
    const person = createMockPerson({ rankIndex: undefined });
    expect(getOfficerShares(person, mockSystem)).toBe(0);
  });

  it('should return 0 for rank just below officerCut (rank 30)', () => {
    const person = createMockPerson({ rankIndex: 30 });
    expect(getOfficerShares(person, mockSystem)).toBe(0);
  });

  it('should return 2 for rank 32 (1 rank above officerCut)', () => {
    const person = createMockPerson({ rankIndex: 32 });
    expect(getOfficerShares(person, mockSystem)).toBe(2);
  });

  it('should return 3 for rank 33 (2 ranks above officerCut)', () => {
    const person = createMockPerson({ rankIndex: 33 });
    expect(getOfficerShares(person, mockSystem)).toBe(3);
  });

  it('should work with different officerCut values', () => {
    const systemWithDifferentCut: IRankSystem = {
      ...mockSystem,
      officerCut: 20,
      ranks: createRanks({
        20: {
          names: { mekwarrior: 'Officer' },
          officer: true,
          payMultiplier: 1.5,
        },
        25: {
          names: { mekwarrior: 'Senior Officer' },
          officer: true,
          payMultiplier: 2.0,
        },
      }),
    };
    const person = createMockPerson({ rankIndex: 25 });
    expect(getOfficerShares(person, systemWithDifferentCut)).toBe(6);
  });

  it('should return correct shares for high rank even if officer flag is false (isOfficer checks rankIndex >= officerCut)', () => {
    const systemWithNonOfficerHighRank: IRankSystem = {
      ...mockSystem,
      officerCut: 31,
      ranks: createRanks({
        40: {
          names: { mekwarrior: 'Warrant Officer' },
          officer: false,
          payMultiplier: 1.8,
        },
      }),
    };
    const person = createMockPerson({ rankIndex: 40 });
    expect(getOfficerShares(person, systemWithNonOfficerHighRank)).toBe(10);
  });
});
