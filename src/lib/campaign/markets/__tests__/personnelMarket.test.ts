import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelMarketStyle, ExperienceLevel } from '@/types/campaign/markets/marketTypes';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import type { IFinances } from '@/types/campaign/IFinances';

import {
  getExpirationDays,
  calculateDailyRecruits,
  selectRandomRole,
  selectExperienceLevel,
  generateDefaultSkills,
  calculateHireCost,
  generateRandomName,
  addDays,
  generatePersonnelForDay,
  removeExpiredOffers,
  hirePerson,
  RandomFn,
} from '../personnelMarket';

// =============================================================================
// Test Helpers
// =============================================================================

function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function createTestCampaign(overrides?: {
  personnelMarketStyle?: PersonnelMarketStyle;
  currentDate?: Date;
}): ICampaign {
  const options = {
    ...createDefaultCampaignOptions(),
    personnelMarketStyle: overrides?.personnelMarketStyle ?? PersonnelMarketStyle.MEKHQ,
  };

  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: overrides?.currentDate ?? new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: {
      transactions: [],
      balance: new Money(1000000),
    } as IFinances,
    factionStandings: {},
    shoppingList: { items: [] },
    options,
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
  };
}

function createTestOffer(overrides?: Partial<IPersonnelMarketOffer>): IPersonnelMarketOffer {
  return {
    id: overrides?.id ?? 'pmo-test-001',
    name: overrides?.name ?? 'Test Person',
    role: overrides?.role ?? CampaignPersonnelRole.PILOT,
    experienceLevel: overrides?.experienceLevel ?? ExperienceLevel.REGULAR,
    skills: overrides?.skills ?? { gunnery: 4, piloting: 4 },
    hireCost: overrides?.hireCost ?? 50000,
    expirationDate: overrides?.expirationDate ?? '3025-06-29',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Personnel Market', () => {
  describe('getExpirationDays', () => {
    it('should return 3 for ELITE', () => {
      expect(getExpirationDays(ExperienceLevel.ELITE)).toBe(3);
    });

    it('should return 7 for VETERAN', () => {
      expect(getExpirationDays(ExperienceLevel.VETERAN)).toBe(7);
    });

    it('should return 14 for REGULAR', () => {
      expect(getExpirationDays(ExperienceLevel.REGULAR)).toBe(14);
    });

    it('should return 30 for GREEN', () => {
      expect(getExpirationDays(ExperienceLevel.GREEN)).toBe(30);
    });
  });

  describe('calculateDailyRecruits', () => {
    it('should return a value between 1 and 3', () => {
      const random = createSeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const count = calculateDailyRecruits(random);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(3);
      }
    });

    it('should return an integer', () => {
      const random = createSeededRandom(99);
      for (let i = 0; i < 20; i++) {
        const count = calculateDailyRecruits(random);
        expect(Number.isInteger(count)).toBe(true);
      }
    });
  });

  describe('selectRandomRole', () => {
    it('should return a valid CampaignPersonnelRole', () => {
      const random = createSeededRandom(42);
      const allRoles = Object.values(CampaignPersonnelRole);
      for (let i = 0; i < 50; i++) {
        const role = selectRandomRole(random);
        expect(allRoles).toContain(role);
      }
    });

    it('should return both combat and support roles over many iterations', () => {
      const random = createSeededRandom(7);
      const roles = new Set<CampaignPersonnelRole>();
      for (let i = 0; i < 200; i++) {
        roles.add(selectRandomRole(random));
      }
      expect(roles.has(CampaignPersonnelRole.PILOT)).toBe(true);
      expect(roles.has(CampaignPersonnelRole.MEK_TECH)).toBe(true);
    });
  });

  describe('selectExperienceLevel', () => {
    it('should return a valid ExperienceLevel', () => {
      const random = createSeededRandom(42);
      const allLevels = Object.values(ExperienceLevel);
      for (let i = 0; i < 50; i++) {
        const level = selectExperienceLevel(random);
        expect(allLevels).toContain(level);
      }
    });

    it('should produce all experience levels over many iterations', () => {
      const random = createSeededRandom(1);
      const levels = new Set<ExperienceLevel>();
      for (let i = 0; i < 500; i++) {
        levels.add(selectExperienceLevel(random));
      }
      expect(levels.has(ExperienceLevel.GREEN)).toBe(true);
      expect(levels.has(ExperienceLevel.REGULAR)).toBe(true);
      expect(levels.has(ExperienceLevel.VETERAN)).toBe(true);
      expect(levels.has(ExperienceLevel.ELITE)).toBe(true);
    });
  });

  describe('generateDefaultSkills', () => {
    it('should return gunnery and piloting for combat roles', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.PILOT, ExperienceLevel.REGULAR);
      expect(skills).toHaveProperty('gunnery');
      expect(skills).toHaveProperty('piloting');
    });

    it('should return technician for support roles', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.MEK_TECH, ExperienceLevel.REGULAR);
      expect(skills).toHaveProperty('technician');
      expect(skills).not.toHaveProperty('gunnery');
    });

    it('should set skill level 5 for GREEN', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.PILOT, ExperienceLevel.GREEN);
      expect(skills.gunnery).toBe(5);
      expect(skills.piloting).toBe(5);
    });

    it('should set skill level 4 for REGULAR', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.PILOT, ExperienceLevel.REGULAR);
      expect(skills.gunnery).toBe(4);
      expect(skills.piloting).toBe(4);
    });

    it('should set skill level 3 for VETERAN', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.PILOT, ExperienceLevel.VETERAN);
      expect(skills.gunnery).toBe(3);
      expect(skills.piloting).toBe(3);
    });

    it('should set skill level 2 for ELITE', () => {
      const skills = generateDefaultSkills(CampaignPersonnelRole.PILOT, ExperienceLevel.ELITE);
      expect(skills.gunnery).toBe(2);
      expect(skills.piloting).toBe(2);
    });

    it('should set technician level based on experience for support', () => {
      expect(generateDefaultSkills(CampaignPersonnelRole.DOCTOR, ExperienceLevel.GREEN).technician).toBe(5);
      expect(generateDefaultSkills(CampaignPersonnelRole.DOCTOR, ExperienceLevel.ELITE).technician).toBe(2);
    });
  });

  describe('calculateHireCost', () => {
    it('should cost more for combat roles than support roles at same experience', () => {
      const combatCost = calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.REGULAR);
      const supportCost = calculateHireCost(CampaignPersonnelRole.MEK_TECH, ExperienceLevel.REGULAR);
      expect(combatCost).toBeGreaterThan(supportCost);
    });

    it('should cost more for elite than green at same role', () => {
      const eliteCost = calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.ELITE);
      const greenCost = calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.GREEN);
      expect(eliteCost).toBeGreaterThan(greenCost);
    });

    it('should calculate combat REGULAR as 50000', () => {
      expect(calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.REGULAR)).toBe(50000);
    });

    it('should calculate combat GREEN as 25000', () => {
      expect(calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.GREEN)).toBe(25000);
    });

    it('should calculate combat ELITE as 200000', () => {
      expect(calculateHireCost(CampaignPersonnelRole.PILOT, ExperienceLevel.ELITE)).toBe(200000);
    });

    it('should calculate support REGULAR as 30000', () => {
      expect(calculateHireCost(CampaignPersonnelRole.MEK_TECH, ExperienceLevel.REGULAR)).toBe(30000);
    });
  });

  describe('generateRandomName', () => {
    it('should return a string in "First Last" format', () => {
      const random = createSeededRandom(42);
      const name = generateRandomName(random);
      const parts = name.split(' ');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it('should produce different names with different seeds', () => {
      const name1 = generateRandomName(createSeededRandom(1));
      const name2 = generateRandomName(createSeededRandom(999));
      expect(name1).not.toBe(name2);
    });
  });

  describe('addDays', () => {
    it('should add days to a date string', () => {
      expect(addDays('3025-06-15', 7)).toBe('3025-06-22');
    });

    it('should handle month rollover', () => {
      expect(addDays('3025-06-28', 5)).toBe('3025-07-03');
    });

    it('should handle year rollover', () => {
      expect(addDays('3025-12-30', 5)).toBe('3026-01-04');
    });

    it('should handle zero days', () => {
      expect(addDays('3025-06-15', 0)).toBe('3025-06-15');
    });
  });

  describe('generatePersonnelForDay', () => {
    it('should return empty array when style is DISABLED', () => {
      const campaign = createTestCampaign({
        personnelMarketStyle: PersonnelMarketStyle.DISABLED,
      });
      const random = createSeededRandom(42);
      const offers = generatePersonnelForDay(campaign, random);
      expect(offers).toEqual([]);
    });

    it('should return 1-3 offers when style is MEKHQ', () => {
      const campaign = createTestCampaign({
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
      });
      const random = createSeededRandom(42);
      const offers = generatePersonnelForDay(campaign, random);
      expect(offers.length).toBeGreaterThanOrEqual(1);
      expect(offers.length).toBeLessThanOrEqual(3);
    });

    it('should generate offers with valid fields', () => {
      const campaign = createTestCampaign({
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
      });
      const random = createSeededRandom(42);
      const offers = generatePersonnelForDay(campaign, random);

      for (const offer of offers) {
        expect(offer.id).toMatch(/^pmo-/);
        expect(offer.name.split(' ')).toHaveLength(2);
        expect(Object.values(CampaignPersonnelRole)).toContain(offer.role);
        expect(Object.values(ExperienceLevel)).toContain(offer.experienceLevel);
        expect(offer.hireCost).toBeGreaterThan(0);
        expect(offer.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Object.keys(offer.skills).length).toBeGreaterThan(0);
      }
    });

    it('should set expiration based on experience level', () => {
      const campaign = createTestCampaign({
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
        currentDate: new Date('3025-01-01T00:00:00Z'),
      });

      // Run many iterations to get different experience levels
      for (let seed = 0; seed < 50; seed++) {
        const random = createSeededRandom(seed);
        const offers = generatePersonnelForDay(campaign, random);
        for (const offer of offers) {
          const expectedDays = getExpirationDays(offer.experienceLevel);
          const expectedDate = addDays('3025-01-01', expectedDays);
          expect(offer.expirationDate).toBe(expectedDate);
        }
      }
    });
  });

  describe('removeExpiredOffers', () => {
    it('should remove expired offers', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'expired', expirationDate: '3025-06-01' }),
        createTestOffer({ id: 'valid', expirationDate: '3025-06-30' }),
      ];
      const result = removeExpiredOffers(offers, '3025-06-15');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid');
    });

    it('should keep offers expiring on current date', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'today', expirationDate: '3025-06-15' }),
      ];
      const result = removeExpiredOffers(offers, '3025-06-15');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when all expired', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'a', expirationDate: '3025-01-01' }),
        createTestOffer({ id: 'b', expirationDate: '3025-02-01' }),
      ];
      const result = removeExpiredOffers(offers, '3025-06-15');
      expect(result).toHaveLength(0);
    });

    it('should return all offers when none expired', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'a', expirationDate: '3025-12-01' }),
        createTestOffer({ id: 'b', expirationDate: '3025-12-31' }),
      ];
      const result = removeExpiredOffers(offers, '3025-06-15');
      expect(result).toHaveLength(2);
    });
  });

  describe('hirePerson', () => {
    it('should return the offer when found', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'pmo-001' }),
        createTestOffer({ id: 'pmo-002' }),
      ];
      const result = hirePerson('pmo-001', offers);
      expect(result.hired).not.toBeNull();
      expect(result.hired!.id).toBe('pmo-001');
      expect(result.reason).toBeUndefined();
    });

    it('should return null with reason when not found', () => {
      const offers: IPersonnelMarketOffer[] = [
        createTestOffer({ id: 'pmo-001' }),
      ];
      const result = hirePerson('nonexistent', offers);
      expect(result.hired).toBeNull();
      expect(result.reason).toBeDefined();
    });

    it('should return null with reason for empty offers', () => {
      const result = hirePerson('pmo-001', []);
      expect(result.hired).toBeNull();
      expect(result.reason).toBeDefined();
    });
  });
});
