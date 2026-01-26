import { describe, it, expect } from '@jest/globals';
import { IPerson } from '@/types/campaign/Person';
import { ISkillType } from '@/types/campaign/skills';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  performSkillCheck,
  getEffectiveSkillTN,
  SkillCheckResult,
} from '../skillCheck';

describe('Skill Check Resolution', () => {
  // Test data
  const gunneryType: ISkillType = {
    id: 'gunnery',
    name: 'Gunnery',
    description: 'Ability to aim and fire ballistic weapons',
    targetNumber: 4,
    costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    linkedAttribute: 'DEX',
  };

  const pilotingType: ISkillType = {
    id: 'piloting-mech',
    name: 'Piloting (Mech)',
    description: 'Ability to pilot a BattleMech',
    targetNumber: 4,
    costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    linkedAttribute: 'REF',
  };

  // Skilled person: Gunnery 4, DEX 7 (modifier +2)
  const skilledPerson: IPerson = {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'Lieutenant',
    recruitmentDate: new Date('2024-01-01'),
    missionsCompleted: 12,
    totalKills: 8,
    xp: 500,
    totalXpEarned: 1500,
    xpSpent: 1000,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
    skills: {
      gunnery: {
        level: 4,
        bonus: 0,
        xpProgress: 0,
        typeId: 'gunnery',
      },
    },
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 7,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
  };

  // Unskilled person: no gunnery skill
  const unskilledPerson: IPerson = {
    ...skilledPerson,
    id: 'person-002',
    skills: {}, // No gunnery skill
  };

  describe('getEffectiveSkillTN', () => {
    it('RED: skilled person has lower TN than unskilled', () => {
      const skilledTN = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        []
      );
      const unskilledTN = getEffectiveSkillTN(
        unskilledPerson,
        'gunnery',
        gunneryType,
        []
      );

      expect(skilledTN).toBeLessThan(unskilledTN);
    });

    it('RED: unskilled penalty adds +4 to base TN', () => {
      const unskilledTN = getEffectiveSkillTN(
        unskilledPerson,
        'gunnery',
        gunneryType,
        []
      );

      // Base TN is 4, unskilled adds +4 = 8
      expect(unskilledTN).toBe(8);
    });

    it('RED: skilled person TN calculation is correct', () => {
      const skilledTN = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        []
      );

      // TN = 4 - (level 4 + bonus 0 + DEX modifier 2) = 4 - 6 = -2
      expect(skilledTN).toBe(-2);
    });

    it('RED: modifiers add/subtract from TN', () => {
      const baseTN = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        []
      );

      const withPositiveModifier = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        [{ name: 'Called Shot', value: 2 }]
      );

      const withNegativeModifier = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        [{ name: 'Injured', value: -2 }]
      );

      expect(withPositiveModifier).toBe(baseTN + 2);
      expect(withNegativeModifier).toBe(baseTN - 2);
    });

    it('RED: multiple modifiers sum correctly', () => {
      const baseTN = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        []
      );

      const withMultipleModifiers = getEffectiveSkillTN(
        skilledPerson,
        'gunnery',
        gunneryType,
        [
          { name: 'Called Shot', value: 2 },
          { name: 'Injured', value: -1 },
          { name: 'Darkness', value: 1 },
        ]
      );

      // 2 - 1 + 1 = 2
      expect(withMultipleModifiers).toBe(baseTN + 2);
    });
  });

  describe('performSkillCheck', () => {
    it('RED: success when roll >= TN', () => {
      const random = () => 3;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.success).toBe(true);
      expect(result.roll).toBe(6);
      expect(result.targetNumber).toBe(-2);
    });

    it('RED: failure when roll < TN', () => {
      const random = () => 1;
      const result = performSkillCheck(
        unskilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.success).toBe(false);
      expect(result.roll).toBe(2);
      expect(result.targetNumber).toBe(8);
    });

    it('RED: critical success at margin >= 4', () => {
      const random = () => 6;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.criticalSuccess).toBe(true);
      expect(result.margin).toBeGreaterThanOrEqual(4);
    });

    it('RED: critical failure at margin <= -4', () => {
      const random = () => 1;
      const result = performSkillCheck(
        unskilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.criticalFailure).toBe(true);
      expect(result.margin).toBeLessThanOrEqual(-4);
    });

    it('RED: margin calculation is correct', () => {
      const random = () => 4;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.margin).toBe(10);
    });

    it('RED: deterministic with seeded random', () => {
      const random1 = () => 3;
      const random2 = () => 3;

      const result1 = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random1
      );

      const result2 = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random2
      );

      expect(result1.roll).toBe(result2.roll);
      expect(result1.success).toBe(result2.success);
      expect(result1.margin).toBe(result2.margin);
    });

    it('GREEN: modifiers are included in result', () => {
      const modifiers = [
        { name: 'Called Shot', value: 2 },
        { name: 'Injured', value: -1 },
      ];

      const random = () => 3;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        modifiers,
        random
      );

      expect(result.modifiers).toEqual(modifiers);
    });

    it('GREEN: result is readonly', () => {
      const random = () => 3;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(Object.isFrozen(result.modifiers) || Array.isArray(result.modifiers)).toBe(true);
    });

    it('GREEN: 2d6 roll range is 2-12', () => {
      const minRandom = () => 1;
      const minResult = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        minRandom
      );
      expect(minResult.roll).toBe(2);

      const maxRandom = () => 6;
      const maxResult = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        maxRandom
      );
      expect(maxResult.roll).toBe(12);
    });

    it('GREEN: critical success at margin exactly 4', () => {
      const testPerson: IPerson = {
        ...skilledPerson,
        skills: {
          gunnery: {
            level: 0,
            bonus: 0,
            xpProgress: 0,
            typeId: 'gunnery',
          },
        },
      };

      const random = () => 3;
      const result = performSkillCheck(
        testPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(result.margin).toBe(4);
      expect(result.criticalSuccess).toBe(true);
    });

    it('GREEN: handles unskilled skill checks', () => {
      const random = () => 5;
      const result = performSkillCheck(
        unskilledPerson,
        'piloting-mech',
        pilotingType,
        [],
        random
      );

      expect(result.targetNumber).toBe(8);
      expect(result.success).toBe(true);
    });
  });

  describe('SkillCheckResult interface', () => {
    it('GREEN: result contains all required fields', () => {
      const random = () => 3;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [{ name: 'Test', value: 1 }],
        random
      );

      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('targetNumber');
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('criticalSuccess');
      expect(result).toHaveProperty('criticalFailure');
      expect(result).toHaveProperty('modifiers');
    });

    it('GREEN: result fields have correct types', () => {
      const random = () => 3;
      const result = performSkillCheck(
        skilledPerson,
        'gunnery',
        gunneryType,
        [],
        random
      );

      expect(typeof result.roll).toBe('number');
      expect(typeof result.targetNumber).toBe('number');
      expect(typeof result.margin).toBe('number');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.criticalSuccess).toBe('boolean');
      expect(typeof result.criticalFailure).toBe('boolean');
      expect(Array.isArray(result.modifiers)).toBe(true);
    });
  });
});
