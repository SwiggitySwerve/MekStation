import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRankSystem } from '@/types/campaign/ranks/rankTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import {
  getRankPayMultiplier,
  getPersonMonthlySalaryWithRank,
  getOfficerShares,
} from '@/lib/campaign/ranks/rankPay';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { createRanks } from '@/types/campaign/ranks/rankTypes';
import { PilotStatus } from '@/types/pilot/PilotInterfaces';
import { PilotType } from '@/types/pilot/PilotInterfaces';

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
// Test factories
// =============================================================================

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'Test Person',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'Test Person',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// getRankPayMultiplier Tests
// =============================================================================

describe('getRankPayMultiplier', () => {
  it('should return 1.0 for rank 0 (None)', () => {
    const entry = makeEntry({ rankIndex: 0 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(1.0);
  });

  it('should return 1.1 for rank 5 (Sergeant)', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(1.1);
  });

  it('should return 1.4 for rank 31 (Lieutenant)', () => {
    const entry = makeEntry({ rankIndex: 31 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(1.4);
  });

  it('should return 1.6 for rank 35 (Captain)', () => {
    const entry = makeEntry({ rankIndex: 35 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(1.6);
  });

  it('should return 2.0 for rank 40 (Colonel)', () => {
    const entry = makeEntry({ rankIndex: 40 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(2.0);
  });

  it('should return 1.0 for unpopulated rank (uses empty rank with 1.0 multiplier)', () => {
    const entry = makeEntry({ rankIndex: 15 });
    expect(getRankPayMultiplier(entry, makePilot(), mockSystem)).toBe(1.0);
  });

  it('should return 1.0 for rank with payMultiplier of 0', () => {
    const systemWithZeroMultiplier: IRankSystem = {
      ...mockSystem,
      ranks: createRanks({
        0: { names: { mekwarrior: 'None' }, officer: false, payMultiplier: 0 },
      }),
    };
    const entry = makeEntry({ rankIndex: 0 });
    expect(
      getRankPayMultiplier(entry, makePilot(), systemWithZeroMultiplier),
    ).toBe(1.0);
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
    const entry = makeEntry({ rankIndex: 0 });
    expect(
      getRankPayMultiplier(entry, makePilot(), systemWithNegativeMultiplier),
    ).toBe(1.0);
  });

  it('NPC (pilot=null): PROCESS — returns multiplier from entry.rankIndex', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(getRankPayMultiplier(entry, null, mockSystem)).toBe(1.1);
  });
});

// =============================================================================
// getPersonMonthlySalaryWithRank Tests
// =============================================================================

describe('getPersonMonthlySalaryWithRank', () => {
  it('should calculate 1000 * 1.0 = 1000 for rank 0', () => {
    const entry = makeEntry({ rankIndex: 0 });
    expect(
      getPersonMonthlySalaryWithRank(1000, entry, makePilot(), mockSystem),
    ).toBe(1000);
  });

  it('should calculate 1500 * 1.1 = 1650 for rank 5 (Sergeant)', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(
      getPersonMonthlySalaryWithRank(1500, entry, makePilot(), mockSystem),
    ).toBe(1650);
  });

  it('should calculate 2000 * 2.0 = 4000 for rank 40 (Colonel)', () => {
    const entry = makeEntry({ rankIndex: 40 });
    expect(
      getPersonMonthlySalaryWithRank(2000, entry, makePilot(), mockSystem),
    ).toBe(4000);
  });

  it('should round correctly: 1000 * 1.1 = 1100', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(
      getPersonMonthlySalaryWithRank(1000, entry, makePilot(), mockSystem),
    ).toBe(1100);
  });

  it('should round down: 1000 * 1.4 = 1400', () => {
    const entry = makeEntry({ rankIndex: 31 });
    expect(
      getPersonMonthlySalaryWithRank(1000, entry, makePilot(), mockSystem),
    ).toBe(1400);
  });

  it('should round up: 1000 * 1.6 = 1600', () => {
    const entry = makeEntry({ rankIndex: 35 });
    expect(
      getPersonMonthlySalaryWithRank(1000, entry, makePilot(), mockSystem),
    ).toBe(1600);
  });

  it('should handle decimal rounding: 1333 * 1.1 = 1466.3 rounds to 1466', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(
      getPersonMonthlySalaryWithRank(1333, entry, makePilot(), mockSystem),
    ).toBe(1466);
  });

  it('should handle zero base salary', () => {
    const entry = makeEntry({ rankIndex: 40 });
    expect(
      getPersonMonthlySalaryWithRank(0, entry, makePilot(), mockSystem),
    ).toBe(0);
  });

  it('should handle large base salary: 50000 * 2.0 = 100000', () => {
    const entry = makeEntry({ rankIndex: 40 });
    expect(
      getPersonMonthlySalaryWithRank(50000, entry, makePilot(), mockSystem),
    ).toBe(100000);
  });

  it('should handle unpopulated rank (defaults to 1.0 multiplier)', () => {
    const entry = makeEntry({ rankIndex: 15 });
    expect(
      getPersonMonthlySalaryWithRank(1000, entry, makePilot(), mockSystem),
    ).toBe(1000);
  });

  it('should handle fractional base salary with rounding', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(
      getPersonMonthlySalaryWithRank(999.5, entry, makePilot(), mockSystem),
    ).toBe(1099);
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
    const entry = makeEntry({ rankIndex: 0 });
    expect(
      getPersonMonthlySalaryWithRank(
        1000,
        entry,
        makePilot(),
        systemWithSmallMultiplier,
      ),
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
    const entry = makeEntry({ rankIndex: 0 });
    expect(
      getPersonMonthlySalaryWithRank(
        1000,
        entry,
        makePilot(),
        systemWithLargeMultiplier,
      ),
    ).toBe(5000);
  });

  it('NPC (pilot=null): PROCESS — returns salary based on entry.rankIndex', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(getPersonMonthlySalaryWithRank(1000, entry, null, mockSystem)).toBe(
      1100,
    );
  });
});

// =============================================================================
// getOfficerShares Tests
// =============================================================================

describe('getOfficerShares', () => {
  it('should return 0 for non-officer (rank 0)', () => {
    const entry = makeEntry({ rankIndex: 0 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(0);
  });

  it('should return 0 for non-officer (rank 5, Sergeant)', () => {
    const entry = makeEntry({ rankIndex: 5 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(0);
  });

  it('should return 1 for first officer rank (rank 31, Lieutenant at officerCut)', () => {
    const entry = makeEntry({ rankIndex: 31 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(1);
  });

  it('should return 5 for rank 35 (Captain, 4 ranks above officerCut)', () => {
    const entry = makeEntry({ rankIndex: 35 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(5);
  });

  it('should return 10 for rank 40 (Colonel, 9 ranks above officerCut)', () => {
    const entry = makeEntry({ rankIndex: 40 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(10);
  });

  it('should return 0 for rank just below officerCut (rank 30)', () => {
    const entry = makeEntry({ rankIndex: 30 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(0);
  });

  it('should return 2 for rank 32 (1 rank above officerCut)', () => {
    const entry = makeEntry({ rankIndex: 32 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(2);
  });

  it('should return 3 for rank 33 (2 ranks above officerCut)', () => {
    const entry = makeEntry({ rankIndex: 33 });
    expect(getOfficerShares(entry, makePilot(), mockSystem)).toBe(3);
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
    const entry = makeEntry({ rankIndex: 25 });
    expect(getOfficerShares(entry, makePilot(), systemWithDifferentCut)).toBe(
      6,
    );
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
    const entry = makeEntry({ rankIndex: 40 });
    expect(
      getOfficerShares(entry, makePilot(), systemWithNonOfficerHighRank),
    ).toBe(10);
  });

  it('NPC (pilot=null): SKIP — returns 0 regardless of rankIndex', () => {
    // getOfficerShares delegates to isOfficer which returns false for NPCs (pilot===null)
    const entry = makeEntry({ rankIndex: 40 });
    expect(getOfficerShares(entry, null, mockSystem)).toBe(0);
  });
});
