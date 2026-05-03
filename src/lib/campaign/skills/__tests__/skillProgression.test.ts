import { describe, it, expect } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import {
  ICampaignOptions,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { IPerson } from '@/types/campaign/Person';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  getSkillImprovementCost,
  canImproveSkill,
  improveSkill,
  addSkill,
} from '../skillProgression';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'John Smith',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 500,
    campaignXpEarned: 1500,
    campaignKills: 8,
    campaignMissions: 12,
    hireDate: new Date('3000-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'John Smith',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-01-25T00:00:00Z',
    ...overrides,
  };
}

/**
 * IPerson fixture for attribute + XP math in progression helpers.
 * Still IPerson-based because getSkillImprovementCost/canImproveSkill need
 * person.attributes and person.skills (ISkill objects), which IPilot doesn't carry.
 */
function makePerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'Lieutenant',
    recruitmentDate: new Date('3000-01-01'),
    missionsCompleted: 12,
    totalKills: 8,
    xp: 500,
    totalXpEarned: 1500,
    xpSpent: 1000,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-01-25T00:00:00Z',
    skills: {
      gunnery: { level: 3, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
      piloting: { level: 2, bonus: 0, xpProgress: 0, typeId: 'piloting' },
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Skill Progression and XP Costs', () => {
  const defaultOptions = createDefaultCampaignOptions();
  const baseEntry = makeEntry();
  const basePilot = makePilot();
  const basePerson = makePerson();

  describe('getSkillImprovementCost', () => {
    it('RED: gunnery level 3→4 costs 16 XP with default options', () => {
      const cost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      expect(cost).toBe(16);
    });

    it('RED: high DEX reduces cost', () => {
      const highDexPerson = makePerson({
        attributes: { ...basePerson.attributes, DEX: 8 },
      });

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

    it('RED: low DEX increases cost', () => {
      const lowDexPerson = makePerson({
        attributes: { ...basePerson.attributes, DEX: 2 },
      });

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
      const cost = getSkillImprovementCost(
        'gunnery',
        10,
        basePerson,
        defaultOptions,
      );
      expect(cost).toBe(Infinity);
    });
  });

  describe('canImproveSkill', () => {
    it('RED: can improve with enough XP', () => {
      expect(canImproveSkill(basePerson, 'gunnery', defaultOptions)).toBe(true);
    });

    it('RED: cannot improve without enough XP', () => {
      const poorPerson = makePerson({ xp: 5 });
      expect(canImproveSkill(poorPerson, 'gunnery', defaultOptions)).toBe(
        false,
      );
    });

    it('RED: cannot improve beyond level 10', () => {
      const maxLevelPerson = makePerson({
        skills: {
          gunnery: { level: 10, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
        },
      });
      expect(canImproveSkill(maxLevelPerson, 'gunnery', defaultOptions)).toBe(
        false,
      );
    });

    it('RED: cannot improve non-existent skill', () => {
      expect(canImproveSkill(basePerson, 'unknown-skill', defaultOptions)).toBe(
        false,
      );
    });
  });

  describe('improveSkill', () => {
    it('RED: returns vault delta with incremented skill level', () => {
      const delta = improveSkill(
        baseEntry,
        basePilot,
        basePerson,
        'gunnery',
        defaultOptions,
      );

      expect(delta.vault).not.toBeNull();
      expect(delta.vault?.pilotId).toBe('pilot-001');
      // gunnery was at level 3 → should be 4
      expect(delta.vault?.skillUpdates['gunnery']).toBe(4);
    });

    it('RED: returns roster delta with XP cost', () => {
      const cost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      const delta = improveSkill(
        baseEntry,
        basePilot,
        basePerson,
        'gunnery',
        defaultOptions,
      );

      expect(delta.roster).not.toBeNull();
      expect(delta.roster?.pilotId).toBe('pilot-001');
      expect(delta.roster?.xpDelta).toBe(cost);
    });

    it('RED: NPC (null pilot) returns null deltas', () => {
      const delta = improveSkill(
        baseEntry,
        null,
        basePerson,
        'gunnery',
        defaultOptions,
      );

      expect(delta.vault).toBeNull();
      expect(delta.roster).toBeNull();
    });

    it('RED: throws if skill not found on person', () => {
      expect(() =>
        improveSkill(
          baseEntry,
          basePilot,
          basePerson,
          'unknown-skill',
          defaultOptions,
        ),
      ).toThrow(/Skill unknown-skill not found/);
    });

    it('RED: throws if at max level', () => {
      const maxLevelPerson = makePerson({
        skills: {
          gunnery: { level: 10, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
        },
      });
      expect(() =>
        improveSkill(
          baseEntry,
          basePilot,
          maxLevelPerson,
          'gunnery',
          defaultOptions,
        ),
      ).toThrow(/already at maximum level/);
    });

    it('RED: throws if insufficient XP', () => {
      const poorPerson = makePerson({ xp: 5 });
      expect(() =>
        improveSkill(
          baseEntry,
          basePilot,
          poorPerson,
          'gunnery',
          defaultOptions,
        ),
      ).toThrow(/Insufficient XP/);
    });

    it('GREEN: does not mutate the original person', () => {
      const originalLevel = basePerson.skills.gunnery.level;
      improveSkill(baseEntry, basePilot, basePerson, 'gunnery', defaultOptions);

      // basePerson must be unchanged — delta pattern, no mutation
      expect(basePerson.skills.gunnery.level).toBe(originalLevel);
    });

    it('GREEN: xpDelta matches the cost helper', () => {
      const expectedCost = getSkillImprovementCost(
        'gunnery',
        3,
        basePerson,
        defaultOptions,
      );
      const delta = improveSkill(
        baseEntry,
        basePilot,
        basePerson,
        'gunnery',
        defaultOptions,
      );

      expect(delta.roster?.xpDelta).toBe(expectedCost);
    });

    it('GREEN: chaining two improvements yields consecutive levels', () => {
      // Level 3 → 4
      const delta1 = improveSkill(
        baseEntry,
        basePilot,
        basePerson,
        'gunnery',
        defaultOptions,
      );
      expect(delta1.vault?.skillUpdates['gunnery']).toBe(4);

      // Simulate applying the delta: advance person to level 4
      const personAfter = makePerson({
        skills: {
          gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
        },
        xp: basePerson.xp - (delta1.roster?.xpDelta ?? 0),
      });

      // Level 4 → 5
      const delta2 = improveSkill(
        baseEntry,
        basePilot,
        personAfter,
        'gunnery',
        defaultOptions,
      );
      expect(delta2.vault?.skillUpdates['gunnery']).toBe(5);
    });
  });

  describe('addSkill', () => {
    it('GREEN: returns vault delta with new skill record', () => {
      const delta = addSkill(baseEntry, basePilot, basePerson, 'small-arms', 1);

      expect(delta.vault).not.toBeNull();
      expect(delta.vault?.pilotId).toBe('pilot-001');
      expect(delta.vault?.skillId).toBe('small-arms');
      expect(delta.vault?.newSkill.level).toBe(1);
      expect(delta.vault?.newSkill.bonus).toBe(0);
      expect(delta.vault?.newSkill.xpProgress).toBe(0);
      expect(delta.vault?.newSkill.typeId).toBe('small-arms');
    });

    it('GREEN: roster is always null (no XP cost on acquisition)', () => {
      const delta = addSkill(baseEntry, basePilot, basePerson, 'small-arms', 1);
      expect(delta.roster).toBeNull();
    });

    it('GREEN: NPC (null pilot) returns null deltas', () => {
      const delta = addSkill(baseEntry, null, basePerson, 'small-arms', 1);
      expect(delta.vault).toBeNull();
      expect(delta.roster).toBeNull();
    });

    it('GREEN: throws if skill already exists on person', () => {
      expect(() =>
        addSkill(baseEntry, basePilot, basePerson, 'gunnery', 1),
      ).toThrow(/already exists/);
    });

    it('GREEN: throws if invalid initial level (negative)', () => {
      expect(() =>
        addSkill(baseEntry, basePilot, basePerson, 'small-arms', -1),
      ).toThrow(/Invalid initial skill level/);
    });

    it('GREEN: throws if invalid initial level (above 10)', () => {
      expect(() =>
        addSkill(baseEntry, basePilot, basePerson, 'small-arms', 11),
      ).toThrow(/Invalid initial skill level/);
    });

    it('GREEN: throws if unknown skill', () => {
      expect(() =>
        addSkill(baseEntry, basePilot, basePerson, 'unknown-skill', 1),
      ).toThrow(/Unknown skill/);
    });

    it('GREEN: can add skill at level 0', () => {
      const delta = addSkill(baseEntry, basePilot, basePerson, 'small-arms', 0);
      expect(delta.vault?.newSkill.level).toBe(0);
    });

    it('GREEN: can add skill at level 10', () => {
      const delta = addSkill(
        baseEntry,
        basePilot,
        basePerson,
        'small-arms',
        10,
      );
      expect(delta.vault?.newSkill.level).toBe(10);
    });
  });

  describe('Integration Tests', () => {
    it('GREEN: add skill then improve it produces correct delta sequence', () => {
      const addDelta = addSkill(
        baseEntry,
        basePilot,
        basePerson,
        'small-arms',
        1,
      );
      expect(addDelta.vault?.newSkill.level).toBe(1);

      // Simulate applying add: build a person that now has small-arms at level 1
      const personWithSmallArms = makePerson({
        skills: {
          ...basePerson.skills,
          'small-arms': {
            level: 1,
            bonus: 0,
            xpProgress: 0,
            typeId: 'small-arms',
          },
        },
      });

      const improveDelta = improveSkill(
        baseEntry,
        basePilot,
        personWithSmallArms,
        'small-arms',
        defaultOptions,
      );
      expect(improveDelta.vault?.skillUpdates['small-arms']).toBe(2);
    });

    it('GREEN: attribute modifier affects cost across improvements', () => {
      const highDexPerson = makePerson({
        attributes: { ...basePerson.attributes, DEX: 8 },
      });

      const cost1Base = getSkillImprovementCost(
        'piloting',
        2,
        basePerson,
        defaultOptions,
      );
      const cost1HighDex = getSkillImprovementCost(
        'piloting',
        2,
        highDexPerson,
        defaultOptions,
      );

      expect(cost1HighDex).toBeLessThan(cost1Base);

      const delta = improveSkill(
        baseEntry,
        basePilot,
        highDexPerson,
        'piloting',
        defaultOptions,
      );
      expect(delta.roster?.xpDelta).toBe(cost1HighDex);
    });
  });
});
