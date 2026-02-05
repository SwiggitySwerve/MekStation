import { describe, it, expect } from '@jest/globals';

import {
  ICampaignOptions,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { IPerson } from '@/types/campaign/Person';

import {
  getSkillImprovementCost,
  canImproveSkill,
  improveSkill,
  addSkill,
} from '../skillProgression';

describe('Skill Progression and XP Costs', () => {
  const defaultOptions = createDefaultCampaignOptions();

  const basePerson: IPerson = {
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
        level: 3,
        bonus: 0,
        xpProgress: 0,
        typeId: 'gunnery',
      },
      piloting: {
        level: 2,
        bonus: 0,
        xpProgress: 0,
        typeId: 'piloting',
      },
    },
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
  };

  describe('getSkillImprovementCost', () => {
    it('RED: gunnery level 3→4 costs 16 XP', () => {
      const cost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      expect(cost).toBe(16);
    });

    it('RED: high attribute reduces cost', () => {
      const highDexPerson: IPerson = {
        ...basePerson,
        attributes: {
          ...basePerson.attributes,
          DEX: 8,
        },
      };

      const baseCost = getSkillImprovementCost(
        'piloting',
        3,
        basePerson,
        defaultOptions,
      );
      const reducedCost = getSkillImprovementCost(
        'piloting',
        3,
        highDexPerson,
        defaultOptions,
      );

      expect(reducedCost).toBeLessThan(baseCost);
    });

    it('RED: low attribute increases cost', () => {
      const lowDexPerson: IPerson = {
        ...basePerson,
        attributes: {
          ...basePerson.attributes,
          DEX: 2,
        },
      };

      const baseCost = getSkillImprovementCost(
        'piloting',
        3,
        basePerson,
        defaultOptions,
      );
      const increasedCost = getSkillImprovementCost(
        'piloting',
        3,
        lowDexPerson,
        defaultOptions,
      );

      expect(increasedCost).toBeGreaterThan(baseCost);
    });

    it('RED: xpCostMultiplier affects cost', () => {
      const doubleOptions: ICampaignOptions = {
        ...defaultOptions,
        xpCostMultiplier: 2.0,
      };

      const normalCost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      const doubleCost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        doubleOptions,
      );

      expect(doubleCost).toBe(normalCost * 2);
    });

    it('RED: unknown skill returns Infinity', () => {
      const cost = getSkillImprovementCost(
        'unknown-skill',
        3,
        basePerson,
        defaultOptions,
      );
      expect(cost).toBe(Infinity);
    });

    it('RED: level 10 returns Infinity', () => {
      const maxLevelPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: {
            level: 10,
            bonus: 0,
            xpProgress: 0,
            typeId: 'gunnery',
          },
        },
      };

      const cost = getSkillImprovementCost(
        'gunnery',
        10,
        maxLevelPerson,
        defaultOptions,
      );
      expect(cost).toBe(Infinity);
    });
  });

  describe('canImproveSkill', () => {
    it('RED: can improve with enough XP', () => {
      const result = canImproveSkill(basePerson, 'gunnery', defaultOptions);
      expect(result).toBe(true);
    });

    it('RED: cannot improve without enough XP', () => {
      const poorPerson: IPerson = {
        ...basePerson,
        xp: 5,
      };

      const result = canImproveSkill(poorPerson, 'gunnery', defaultOptions);
      expect(result).toBe(false);
    });

    it('RED: cannot improve beyond level 10', () => {
      const maxLevelPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: {
            level: 10,
            bonus: 0,
            xpProgress: 0,
            typeId: 'gunnery',
          },
        },
      };

      const result = canImproveSkill(maxLevelPerson, 'gunnery', defaultOptions);
      expect(result).toBe(false);
    });

    it('RED: cannot improve non-existent skill', () => {
      const result = canImproveSkill(
        basePerson,
        'unknown-skill',
        defaultOptions,
      );
      expect(result).toBe(false);
    });
  });

  describe('improveSkill', () => {
    it('RED: improveSkill deducts XP and increments level', () => {
      const cost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      const newPerson = improveSkill(basePerson, 'gunnery', defaultOptions);

      expect(newPerson.skills.gunnery.level).toBe(4);
      expect(newPerson.xp).toBe(basePerson.xp - cost);
      expect(newPerson.xpSpent).toBe(basePerson.xpSpent + cost);
    });

    it('RED: improveSkill throws if skill not found', () => {
      expect(() =>
        improveSkill(basePerson, 'unknown-skill', defaultOptions),
      ).toThrow(/Skill unknown-skill not found/);
    });

    it('RED: improveSkill throws if at max level', () => {
      const maxLevelPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: {
            level: 10,
            bonus: 0,
            xpProgress: 0,
            typeId: 'gunnery',
          },
        },
      };

      expect(() =>
        improveSkill(maxLevelPerson, 'gunnery', defaultOptions),
      ).toThrow(/already at maximum level/);
    });

    it('RED: improveSkill throws if insufficient XP', () => {
      const poorPerson: IPerson = {
        ...basePerson,
        xp: 5,
      };

      expect(() => improveSkill(poorPerson, 'gunnery', defaultOptions)).toThrow(
        /Insufficient XP/,
      );
    });

    it('GREEN: improveSkill returns new person object', () => {
      const newPerson = improveSkill(basePerson, 'gunnery', defaultOptions);

      expect(newPerson).not.toBe(basePerson);
      expect(basePerson.skills.gunnery.level).toBe(3);
      expect(newPerson.skills.gunnery.level).toBe(4);
    });

    it('GREEN: improveSkill preserves other skills', () => {
      const newPerson = improveSkill(basePerson, 'gunnery', defaultOptions);

      expect(newPerson.skills.piloting).toEqual(basePerson.skills.piloting);
    });

    it('GREEN: improveSkill preserves other person properties', () => {
      const newPerson = improveSkill(basePerson, 'gunnery', defaultOptions);

      expect(newPerson.id).toBe(basePerson.id);
      expect(newPerson.name).toBe(basePerson.name);
      expect(newPerson.attributes).toEqual(basePerson.attributes);
    });
  });

  describe('addSkill', () => {
    it('GREEN: addSkill adds new skill at initial level', () => {
      const newPerson = addSkill(basePerson, 'small-arms', 1);

      expect(newPerson.skills['small-arms']).toBeDefined();
      expect(newPerson.skills['small-arms'].level).toBe(1);
      expect(newPerson.skills['small-arms'].bonus).toBe(0);
      expect(newPerson.skills['small-arms'].xpProgress).toBe(0);
      expect(newPerson.skills['small-arms'].typeId).toBe('small-arms');
    });

    it('GREEN: addSkill preserves existing skills', () => {
      const newPerson = addSkill(basePerson, 'small-arms', 1);

      expect(newPerson.skills.gunnery).toEqual(basePerson.skills.gunnery);
      expect(newPerson.skills.piloting).toEqual(basePerson.skills.piloting);
    });

    it('GREEN: addSkill throws if skill already exists', () => {
      expect(() => addSkill(basePerson, 'gunnery', 1)).toThrow(
        /already exists/,
      );
    });

    it('GREEN: addSkill throws if invalid initial level', () => {
      expect(() => addSkill(basePerson, 'small-arms', -1)).toThrow(
        /Invalid initial skill level/,
      );

      expect(() => addSkill(basePerson, 'small-arms', 11)).toThrow(
        /Invalid initial skill level/,
      );
    });

    it('GREEN: addSkill throws if unknown skill', () => {
      expect(() => addSkill(basePerson, 'unknown-skill', 1)).toThrow(
        /Unknown skill/,
      );
    });

    it('GREEN: addSkill returns new person object', () => {
      const newPerson = addSkill(basePerson, 'small-arms', 1);

      expect(newPerson).not.toBe(basePerson);
      expect(basePerson.skills['small-arms']).toBeUndefined();
      expect(newPerson.skills['small-arms']).toBeDefined();
    });

    it('GREEN: addSkill can add skill at level 0', () => {
      const newPerson = addSkill(basePerson, 'small-arms', 0);

      expect(newPerson.skills['small-arms'].level).toBe(0);
    });

    it('GREEN: addSkill can add skill at level 10', () => {
      const newPerson = addSkill(basePerson, 'small-arms', 10);

      expect(newPerson.skills['small-arms'].level).toBe(10);
    });
  });

  describe('Integration Tests', () => {
    it('GREEN: can add skill and then improve it', () => {
      let person = addSkill(basePerson, 'small-arms', 1);
      expect(person.skills['small-arms'].level).toBe(1);

      person = improveSkill(person, 'small-arms', defaultOptions);
      expect(person.skills['small-arms'].level).toBe(2);
    });

    it('GREEN: multiple improvements work correctly', () => {
      let person = basePerson;

      const cost1 = getSkillImprovementCost(
        'gunnery',
        3,
        person,
        defaultOptions,
      );
      person = improveSkill(person, 'gunnery', defaultOptions);
      expect(person.skills.gunnery.level).toBe(4);
      expect(person.xp).toBe(basePerson.xp - cost1);

      const cost2 = getSkillImprovementCost(
        'gunnery',
        4,
        person,
        defaultOptions,
      );
      person = improveSkill(person, 'gunnery', defaultOptions);
      expect(person.skills.gunnery.level).toBe(5);
      expect(person.xp).toBe(basePerson.xp - cost1 - cost2);
    });

    it('GREEN: attribute modifier persists across improvements', () => {
      const highDexPerson: IPerson = {
        ...basePerson,
        attributes: {
          ...basePerson.attributes,
          DEX: 8,
        },
      };

      const cost1 = getSkillImprovementCost(
        'piloting',
        2,
        highDexPerson,
        defaultOptions,
      );
      const newPerson = improveSkill(highDexPerson, 'piloting', defaultOptions);

      const cost2 = getSkillImprovementCost(
        'piloting',
        3,
        newPerson,
        defaultOptions,
      );

      expect(cost1).toBeLessThan(
        getSkillImprovementCost('piloting', 2, basePerson, defaultOptions),
      );
      expect(cost2).toBeLessThan(
        getSkillImprovementCost('piloting', 3, basePerson, defaultOptions),
      );
    });
  });
});
