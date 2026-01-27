import {
  mapRoleToProfession,
  getRankName,
  getRankNameByIndex,
  isOfficer,
  isOfficerByIndex,
  promoteToRank,
  demoteToRank,
  getTimeInRank,
  isRecentlyPromoted,
} from '../rankService';
import { Profession, IRankSystem, createRanks } from '@/types/campaign/ranks/rankTypes';
import type { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

const mockRankSystem: IRankSystem = {
  code: 'TEST',
  name: 'Test System',
  description: 'For testing',
  type: 'default',
  officerCut: 31,
  ranks: createRanks({
    0: { names: { mekwarrior: 'None', aerospace: 'None' }, officer: false, payMultiplier: 1.0 },
    1: { names: { mekwarrior: 'Private', aerospace: 'Airman', tech: 'Tech' }, officer: false, payMultiplier: 1.0 },
    5: { names: { mekwarrior: 'Sergeant' }, officer: false, payMultiplier: 1.1 },
    31: { names: { mekwarrior: 'Lieutenant' }, officer: true, payMultiplier: 1.4 },
    40: { names: { mekwarrior: 'Colonel' }, officer: true, payMultiplier: 2.0 },
  }),
};

const createMockPerson = (overrides: Partial<IPerson> = {}): IPerson => ({
  id: 'test-1',
  name: 'Test Person',
  callsign: undefined,
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
  attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
  pilotSkills: { gunnery: 4, piloting: 5 },
  missionsCompleted: 0,
  totalKills: 0,
  createdAt: '3025-01-01T00:00:00Z',
  updatedAt: '3025-01-01T00:00:00Z',
  ...overrides,
});

// =============================================================================
// mapRoleToProfession
// =============================================================================

describe('mapRoleToProfession', () => {
  it('maps PILOT to MEKWARRIOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.PILOT)).toBe(Profession.MEKWARRIOR);
  });

  it('maps LAM_PILOT to MEKWARRIOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.LAM_PILOT)).toBe(Profession.MEKWARRIOR);
  });

  it('maps PROTOMEK_PILOT to MEKWARRIOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.PROTOMEK_PILOT)).toBe(Profession.MEKWARRIOR);
  });

  it('maps AEROSPACE_PILOT to AEROSPACE', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.AEROSPACE_PILOT)).toBe(Profession.AEROSPACE);
  });

  it('maps CONVENTIONAL_AIRCRAFT_PILOT to AEROSPACE', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT)).toBe(Profession.AEROSPACE);
  });

  it('maps VEHICLE_DRIVER to VEHICLE', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VEHICLE_DRIVER)).toBe(Profession.VEHICLE);
  });

  it('maps VEHICLE_CREW_VTOL to VEHICLE', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VEHICLE_CREW_VTOL)).toBe(Profession.VEHICLE);
  });

  it('maps VEHICLE_CREW_NAVAL to NAVAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VEHICLE_CREW_NAVAL)).toBe(Profession.NAVAL);
  });

  it('maps VESSEL_PILOT to NAVAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VESSEL_PILOT)).toBe(Profession.NAVAL);
  });

  it('maps VESSEL_GUNNER to NAVAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VESSEL_GUNNER)).toBe(Profession.NAVAL);
  });

  it('maps VESSEL_CREW to NAVAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VESSEL_CREW)).toBe(Profession.NAVAL);
  });

  it('maps VESSEL_NAVIGATOR to NAVAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.VESSEL_NAVIGATOR)).toBe(Profession.NAVAL);
  });

  it('maps BATTLE_ARMOUR to INFANTRY', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.BATTLE_ARMOUR)).toBe(Profession.INFANTRY);
  });

  it('maps SOLDIER to INFANTRY', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.SOLDIER)).toBe(Profession.INFANTRY);
  });

  it('maps TECH to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.TECH)).toBe(Profession.TECH);
  });

  it('maps MEK_TECH to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.MEK_TECH)).toBe(Profession.TECH);
  });

  it('maps MECHANIC to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.MECHANIC)).toBe(Profession.TECH);
  });

  it('maps AERO_TEK to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.AERO_TEK)).toBe(Profession.TECH);
  });

  it('maps BA_TECH to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.BA_TECH)).toBe(Profession.TECH);
  });

  it('maps ASTECH to TECH', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ASTECH)).toBe(Profession.TECH);
  });

  it('maps DOCTOR to MEDICAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.DOCTOR)).toBe(Profession.MEDICAL);
  });

  it('maps MEDIC to MEDICAL', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.MEDIC)).toBe(Profession.MEDICAL);
  });

  it('maps ADMIN_COMMAND to ADMINISTRATOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ADMIN_COMMAND)).toBe(Profession.ADMINISTRATOR);
  });

  it('maps ADMIN_LOGISTICS to ADMINISTRATOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ADMIN_LOGISTICS)).toBe(Profession.ADMINISTRATOR);
  });

  it('maps ADMIN_TRANSPORT to ADMINISTRATOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ADMIN_TRANSPORT)).toBe(Profession.ADMINISTRATOR);
  });

  it('maps ADMIN_HR to ADMINISTRATOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ADMIN_HR)).toBe(Profession.ADMINISTRATOR);
  });

  it('maps ADMIN (legacy) to ADMINISTRATOR', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.ADMIN)).toBe(Profession.ADMINISTRATOR);
  });

  it('maps DEPENDENT to CIVILIAN', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.DEPENDENT)).toBe(Profession.CIVILIAN);
  });

  it('maps CIVILIAN_OTHER to CIVILIAN', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.CIVILIAN_OTHER)).toBe(Profession.CIVILIAN);
  });

  it('maps SUPPORT to CIVILIAN', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.SUPPORT)).toBe(Profession.CIVILIAN);
  });

  it('maps UNASSIGNED to CIVILIAN', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.UNASSIGNED)).toBe(Profession.CIVILIAN);
  });

  it('maps MERCHANT to CIVILIAN', () => {
    expect(mapRoleToProfession(CampaignPersonnelRole.MERCHANT)).toBe(Profession.CIVILIAN);
  });
});

// =============================================================================
// getRankName
// =============================================================================

describe('getRankName', () => {
  it('returns profession-specific name for PILOT at rank 1', () => {
    const person = createMockPerson({ rankIndex: 1, primaryRole: CampaignPersonnelRole.PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('Private');
  });

  it('returns aerospace-specific name for AEROSPACE_PILOT at rank 1', () => {
    const person = createMockPerson({ rankIndex: 1, primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('Airman');
  });

  it('returns tech-specific name for TECH at rank 1', () => {
    const person = createMockPerson({ rankIndex: 1, primaryRole: CampaignPersonnelRole.TECH });
    expect(getRankName(person, mockRankSystem)).toBe('Tech');
  });

  it('falls back to mekwarrior name when profession name is missing', () => {
    const person = createMockPerson({ rankIndex: 5, primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('Sergeant');
  });

  it('returns None for empty rank (no names defined)', () => {
    const person = createMockPerson({ rankIndex: 10, primaryRole: CampaignPersonnelRole.PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('None');
  });

  it('defaults to rankIndex 0 when rankIndex is undefined', () => {
    const person = createMockPerson({ rankIndex: undefined, primaryRole: CampaignPersonnelRole.PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('None');
  });

  it('returns officer rank name at index 31', () => {
    const person = createMockPerson({ rankIndex: 31, primaryRole: CampaignPersonnelRole.PILOT });
    expect(getRankName(person, mockRankSystem)).toBe('Lieutenant');
  });
});

// =============================================================================
// getRankNameByIndex
// =============================================================================

describe('getRankNameByIndex', () => {
  it('returns profession-specific name by index and role', () => {
    expect(getRankNameByIndex(1, CampaignPersonnelRole.AEROSPACE_PILOT, mockRankSystem)).toBe('Airman');
  });

  it('falls back to mekwarrior name when profession name is missing', () => {
    expect(getRankNameByIndex(5, CampaignPersonnelRole.DOCTOR, mockRankSystem)).toBe('Sergeant');
  });

  it('returns None for empty rank slot', () => {
    expect(getRankNameByIndex(10, CampaignPersonnelRole.PILOT, mockRankSystem)).toBe('None');
  });

  it('returns correct name at officer rank', () => {
    expect(getRankNameByIndex(40, CampaignPersonnelRole.PILOT, mockRankSystem)).toBe('Colonel');
  });
});

// =============================================================================
// isOfficer
// =============================================================================

describe('isOfficer', () => {
  it('returns false for enlisted rank (index 0)', () => {
    const person = createMockPerson({ rankIndex: 0 });
    expect(isOfficer(person, mockRankSystem)).toBe(false);
  });

  it('returns false for rank just below officer cut (index 30)', () => {
    const person = createMockPerson({ rankIndex: 30 });
    expect(isOfficer(person, mockRankSystem)).toBe(false);
  });

  it('returns true at exactly officer cut (index 31)', () => {
    const person = createMockPerson({ rankIndex: 31 });
    expect(isOfficer(person, mockRankSystem)).toBe(true);
  });

  it('returns true for rank above officer cut (index 40)', () => {
    const person = createMockPerson({ rankIndex: 40 });
    expect(isOfficer(person, mockRankSystem)).toBe(true);
  });

  it('returns false when rankIndex is undefined (defaults to 0)', () => {
    const person = createMockPerson({ rankIndex: undefined });
    expect(isOfficer(person, mockRankSystem)).toBe(false);
  });
});

// =============================================================================
// isOfficerByIndex
// =============================================================================

describe('isOfficerByIndex', () => {
  it('returns false for index 0', () => {
    expect(isOfficerByIndex(0, mockRankSystem)).toBe(false);
  });

  it('returns false for index 30', () => {
    expect(isOfficerByIndex(30, mockRankSystem)).toBe(false);
  });

  it('returns true for index 31', () => {
    expect(isOfficerByIndex(31, mockRankSystem)).toBe(true);
  });

  it('returns true for index 50', () => {
    expect(isOfficerByIndex(50, mockRankSystem)).toBe(true);
  });
});

// =============================================================================
// promoteToRank
// =============================================================================

describe('promoteToRank', () => {
  it('promotes from rank 0 to rank 1 successfully', () => {
    const person = createMockPerson({ rankIndex: 0 });
    const result = promoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.updatedPerson.rankIndex).toBe(1);
    expect(result.updatedPerson.rank).toBe('Private');
    expect(result.updatedPerson.lastRankChangeDate).toEqual(new Date('3025-06-15'));
    expect(result.updatedPerson.lastPromotionDate).toEqual(new Date('3025-06-15'));
  });

  it('promotes from enlisted to officer rank', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = promoteToRank(person, 31, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.rankIndex).toBe(31);
    expect(result.updatedPerson.rank).toBe('Lieutenant');
  });

  it('rejects invalid rank index (-1)', () => {
    const person = createMockPerson({ rankIndex: 0 });
    const result = promoteToRank(person, -1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Rank index out of range (0-50)');
    expect(result.updatedPerson).toBe(person);
  });

  it('rejects invalid rank index (51)', () => {
    const person = createMockPerson({ rankIndex: 0 });
    const result = promoteToRank(person, 51, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Rank index out of range (0-50)');
  });

  it('rejects non-integer rank index', () => {
    const person = createMockPerson({ rankIndex: 0 });
    const result = promoteToRank(person, 1.5, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Rank index out of range (0-50)');
  });

  it('rejects promotion to same rank', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = promoteToRank(person, 5, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('New rank must be higher than current rank');
    expect(result.updatedPerson).toBe(person);
  });

  it('rejects promotion to lower rank', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = promoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('New rank must be higher than current rank');
  });

  it('uses correct profession name for aerospace pilot promotion', () => {
    const person = createMockPerson({ rankIndex: 0, primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT });
    const result = promoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.rank).toBe('Airman');
  });

  it('handles undefined rankIndex (defaults to 0)', () => {
    const person = createMockPerson({ rankIndex: undefined });
    const result = promoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.rankIndex).toBe(1);
  });
});

// =============================================================================
// demoteToRank
// =============================================================================

describe('demoteToRank', () => {
  it('demotes from rank 5 to rank 1 successfully', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = demoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.updatedPerson.rankIndex).toBe(1);
    expect(result.updatedPerson.rank).toBe('Private');
    expect(result.updatedPerson.lastRankChangeDate).toEqual(new Date('3025-06-15'));
  });

  it('does NOT update lastPromotionDate on demotion', () => {
    const promotionDate = new Date('3025-03-01');
    const person = createMockPerson({ rankIndex: 5, lastPromotionDate: promotionDate });
    const result = demoteToRank(person, 1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.lastPromotionDate).toEqual(promotionDate);
  });

  it('demotes from officer to enlisted', () => {
    const person = createMockPerson({ rankIndex: 31 });
    const result = demoteToRank(person, 5, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.rankIndex).toBe(5);
    expect(result.updatedPerson.rank).toBe('Sergeant');
  });

  it('rejects invalid rank index (-1)', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = demoteToRank(person, -1, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Rank index out of range (0-50)');
    expect(result.updatedPerson).toBe(person);
  });

  it('rejects invalid rank index (51)', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = demoteToRank(person, 51, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Rank index out of range (0-50)');
  });

  it('rejects demotion to same rank', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = demoteToRank(person, 5, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('New rank must be lower than current rank');
    expect(result.updatedPerson).toBe(person);
  });

  it('rejects demotion to higher rank', () => {
    const person = createMockPerson({ rankIndex: 5 });
    const result = demoteToRank(person, 31, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('New rank must be lower than current rank');
  });

  it('can demote to rank 0', () => {
    const person = createMockPerson({ rankIndex: 1 });
    const result = demoteToRank(person, 0, '3025-06-15', mockRankSystem);

    expect(result.valid).toBe(true);
    expect(result.updatedPerson.rankIndex).toBe(0);
    expect(result.updatedPerson.rank).toBe('None');
  });
});

// =============================================================================
// getTimeInRank
// =============================================================================

describe('getTimeInRank', () => {
  it('calculates days for short duration', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3025-06-01'),
    });
    const result = getTimeInRank(person, '3025-06-15');

    expect(result.days).toBe(14);
    expect(result.months).toBe(0);
    expect(result.years).toBe(0);
    expect(result.display).toBe('14 days');
  });

  it('calculates months and days', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3025-01-15'),
    });
    const result = getTimeInRank(person, '3025-04-15');

    expect(result.months).toBe(3);
    expect(result.years).toBe(0);
    expect(result.display).toBe('3 months, 0 days');
  });

  it('calculates years and months', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3023-06-01'),
    });
    const result = getTimeInRank(person, '3025-09-01');

    expect(result.years).toBe(2);
    expect(result.months).toBe(3);
    expect(result.display).toBe('2 years, 3 months');
  });

  it('falls back to recruitmentDate when lastRankChangeDate is undefined', () => {
    const person = createMockPerson({
      recruitmentDate: new Date('3025-01-01'),
      lastRankChangeDate: undefined,
    });
    const result = getTimeInRank(person, '3025-01-11');

    expect(result.days).toBe(10);
    expect(result.display).toBe('10 days');
  });

  it('handles exactly 1 year', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3024-06-01'),
    });
    const result = getTimeInRank(person, '3025-06-01');

    expect(result.years).toBe(1);
    expect(result.months).toBe(0);
    expect(result.display).toBe('1 year, 0 months');
  });

  it('handles exactly 1 day', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3025-06-01'),
    });
    const result = getTimeInRank(person, '3025-06-02');

    expect(result.days).toBe(1);
    expect(result.display).toBe('1 day');
  });

  it('handles 0 days (same date)', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3025-06-01'),
    });
    const result = getTimeInRank(person, '3025-06-01');

    expect(result.days).toBe(0);
    expect(result.display).toBe('0 days');
  });

  it('handles exactly 1 month', () => {
    const person = createMockPerson({
      lastRankChangeDate: new Date('3025-06-01'),
    });
    const result = getTimeInRank(person, '3025-07-01');

    expect(result.months).toBe(1);
    expect(result.years).toBe(0);
    expect(result.display).toBe('1 month, 0 days');
  });
});

// =============================================================================
// isRecentlyPromoted
// =============================================================================

describe('isRecentlyPromoted', () => {
  it('returns true when promoted within default 6-month threshold', () => {
    const person = createMockPerson({
      lastPromotionDate: new Date('3025-04-01'),
    });
    expect(isRecentlyPromoted(person, '3025-06-15')).toBe(true);
  });

  it('returns false when promoted more than 6 months ago', () => {
    const person = createMockPerson({
      lastPromotionDate: new Date('3024-01-01'),
    });
    expect(isRecentlyPromoted(person, '3025-06-15')).toBe(false);
  });

  it('returns false when lastPromotionDate is undefined', () => {
    const person = createMockPerson({
      lastPromotionDate: undefined,
    });
    expect(isRecentlyPromoted(person, '3025-06-15')).toBe(false);
  });

  it('respects custom monthsThreshold', () => {
    const person = createMockPerson({
      lastPromotionDate: new Date('3025-04-01'),
    });
    expect(isRecentlyPromoted(person, '3025-06-15', 3)).toBe(true);
  });

  it('returns false when outside custom threshold', () => {
    const person = createMockPerson({
      lastPromotionDate: new Date('3025-01-01'),
    });
    expect(isRecentlyPromoted(person, '3025-06-15', 3)).toBe(false);
  });

  it('returns true at exactly the threshold boundary', () => {
    const person = createMockPerson({
      lastPromotionDate: new Date('3025-01-15'),
    });
    expect(isRecentlyPromoted(person, '3025-07-15', 6)).toBe(true);
  });
});
