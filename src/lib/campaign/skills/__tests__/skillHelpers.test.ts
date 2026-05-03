import { describe, it, expect } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  getSkillDesirabilityModifier,
  getTechSkillValue,
  getAdminSkillValue,
  getMedicineSkillValue,
  getNegotiationModifier,
  getLeadershipSkillValue,
  hasSkill,
  getPersonSkillLevel,
  getPersonBestCombatSkill,
} from '../skillHelpers';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Skill Helper Functions', () => {
  const baseEntry = makeEntry();
  const basePilot = makePilot();

  describe('getSkillDesirabilityModifier', () => {
    it('RED: returns sum of gunnery + piloting', () => {
      // gunnery 4 + piloting 5 = 9
      const modifier = getSkillDesirabilityModifier(baseEntry, basePilot);
      expect(modifier).toBe(9);
    });

    it('GREEN: returns 0 for NPC (null pilot)', () => {
      const modifier = getSkillDesirabilityModifier(baseEntry, null);
      expect(modifier).toBe(0);
    });

    it('GREEN: reflects different gunnery/piloting values', () => {
      const elite = makePilot({ skills: { gunnery: 2, piloting: 2 } });
      const modifier = getSkillDesirabilityModifier(baseEntry, elite);
      // 2 + 2 = 4
      expect(modifier).toBe(4);
    });
  });

  describe('getTechSkillValue', () => {
    it('RED: returns 10 (unskilled) — stub Plan 7', () => {
      // @stub Plan 7: IPilot has no tech skill fields yet
      const value = getTechSkillValue(baseEntry, basePilot);
      expect(value).toBe(10);
    });

    it('GREEN: returns 10 for NPC (null pilot)', () => {
      const value = getTechSkillValue(baseEntry, null);
      expect(value).toBe(10);
    });
  });

  describe('getAdminSkillValue', () => {
    it('GREEN: returns 10 (unskilled) — stub Plan 7', () => {
      const value = getAdminSkillValue(baseEntry, basePilot);
      expect(value).toBe(10);
    });

    it('GREEN: returns 10 for NPC (null pilot)', () => {
      const value = getAdminSkillValue(baseEntry, null);
      expect(value).toBe(10);
    });
  });

  describe('getMedicineSkillValue', () => {
    it('GREEN: returns 10 (unskilled) — stub Plan 7', () => {
      const value = getMedicineSkillValue(baseEntry, basePilot);
      expect(value).toBe(10);
    });

    it('GREEN: returns 10 for NPC (null pilot)', () => {
      const value = getMedicineSkillValue(baseEntry, null);
      expect(value).toBe(10);
    });
  });

  describe('getNegotiationModifier', () => {
    it('GREEN: returns 10 (unskilled) — stub Plan 7', () => {
      const modifier = getNegotiationModifier(baseEntry, basePilot);
      expect(modifier).toBe(10);
    });

    it('GREEN: returns 10 for NPC (null pilot)', () => {
      const modifier = getNegotiationModifier(baseEntry, null);
      expect(modifier).toBe(10);
    });
  });

  describe('getLeadershipSkillValue', () => {
    it('GREEN: returns 10 (unskilled) — stub Plan 7', () => {
      const value = getLeadershipSkillValue(baseEntry, basePilot);
      expect(value).toBe(10);
    });

    it('GREEN: returns 10 for NPC (null pilot)', () => {
      const value = getLeadershipSkillValue(baseEntry, null);
      expect(value).toBe(10);
    });
  });

  describe('hasSkill', () => {
    it('RED: returns true for gunnery (exists on IPilotSkills)', () => {
      const result = hasSkill(baseEntry, basePilot, 'gunnery');
      expect(result).toBe(true);
    });

    it('RED: returns true for piloting (exists on IPilotSkills)', () => {
      const result = hasSkill(baseEntry, basePilot, 'piloting');
      expect(result).toBe(true);
    });

    it('RED: returns false for skills not on IPilotSkills (stub Plan 7)', () => {
      // medicine, tech-mech, administration are not on IPilotSkills today
      expect(hasSkill(baseEntry, basePilot, 'medicine')).toBe(false);
      expect(hasSkill(baseEntry, basePilot, 'tech-mech')).toBe(false);
    });

    it('GREEN: returns false for NPC (null pilot)', () => {
      expect(hasSkill(baseEntry, null, 'gunnery')).toBe(false);
    });
  });

  describe('getPersonSkillLevel', () => {
    it('RED: returns gunnery level from IPilotSkills', () => {
      const level = getPersonSkillLevel(baseEntry, basePilot, 'gunnery');
      expect(level).toBe(4);
    });

    it('RED: returns piloting level from IPilotSkills', () => {
      const level = getPersonSkillLevel(baseEntry, basePilot, 'piloting');
      expect(level).toBe(5);
    });

    it('RED: returns -1 for skills not on IPilotSkills (stub Plan 7)', () => {
      const level = getPersonSkillLevel(baseEntry, basePilot, 'medicine');
      expect(level).toBe(-1);
    });

    it('GREEN: returns -1 for NPC (null pilot)', () => {
      const level = getPersonSkillLevel(baseEntry, null, 'gunnery');
      expect(level).toBe(-1);
    });
  });

  describe('getPersonBestCombatSkill', () => {
    it('RED: returns piloting when piloting > gunnery', () => {
      // basePilot has gunnery 4, piloting 5
      const best = getPersonBestCombatSkill(baseEntry, basePilot);
      expect(best).toBeDefined();
      expect(best?.skillId).toBe('piloting');
      expect(best?.level).toBe(5);
    });

    it('RED: returns gunnery when gunnery > piloting', () => {
      const sharpshooter = makePilot({ skills: { gunnery: 5, piloting: 2 } });
      const best = getPersonBestCombatSkill(baseEntry, sharpshooter);
      expect(best?.skillId).toBe('gunnery');
      expect(best?.level).toBe(5);
    });

    it('GREEN: returns gunnery on tie (gunnery >= piloting branch)', () => {
      const tied = makePilot({ skills: { gunnery: 4, piloting: 4 } });
      const best = getPersonBestCombatSkill(baseEntry, tied);
      expect(best?.skillId).toBe('gunnery');
      expect(best?.level).toBe(4);
    });

    it('GREEN: returns null for NPC (null pilot)', () => {
      const best = getPersonBestCombatSkill(baseEntry, null);
      expect(best).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('GREEN: all helpers work together for a vault pilot', () => {
      const desirability = getSkillDesirabilityModifier(baseEntry, basePilot);
      const techValue = getTechSkillValue(baseEntry, basePilot);
      const adminValue = getAdminSkillValue(baseEntry, basePilot);
      const medicineValue = getMedicineSkillValue(baseEntry, basePilot);
      const negotiationValue = getNegotiationModifier(baseEntry, basePilot);
      const leadershipValue = getLeadershipSkillValue(baseEntry, basePilot);

      expect(desirability).toBeGreaterThan(0);
      expect(techValue).toBe(10);
      expect(adminValue).toBe(10);
      expect(medicineValue).toBe(10);
      expect(negotiationValue).toBe(10);
      expect(leadershipValue).toBe(10);
    });

    it('GREEN: all helpers return NPC defaults for null pilot', () => {
      expect(getSkillDesirabilityModifier(baseEntry, null)).toBe(0);
      expect(getTechSkillValue(baseEntry, null)).toBe(10);
      expect(getAdminSkillValue(baseEntry, null)).toBe(10);
      expect(getMedicineSkillValue(baseEntry, null)).toBe(10);
      expect(getNegotiationModifier(baseEntry, null)).toBe(10);
      expect(getLeadershipSkillValue(baseEntry, null)).toBe(10);
      expect(hasSkill(baseEntry, null, 'gunnery')).toBe(false);
      expect(getPersonSkillLevel(baseEntry, null, 'gunnery')).toBe(-1);
      expect(getPersonBestCombatSkill(baseEntry, null)).toBeNull();
    });
  });
});
