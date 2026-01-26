import { describe, it, expect } from '@jest/globals';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
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

describe('Skill Helper Functions', () => {
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
        level: 4,
        bonus: 0,
        xpProgress: 0,
        typeId: 'gunnery',
      },
      piloting: {
        level: 5,
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

  describe('getSkillDesirabilityModifier', () => {
    it('RED: returns sum of all skill levels', () => {
      const modifier = getSkillDesirabilityModifier(basePerson);
      expect(modifier).toBe(9);
    });

    it('GREEN: returns 0 for person with no skills', () => {
      const noSkillsPerson: IPerson = {
        ...basePerson,
        skills: {},
      };

      const modifier = getSkillDesirabilityModifier(noSkillsPerson);
      expect(modifier).toBe(0);
    });

    it('GREEN: handles multiple skills correctly', () => {
      const multiSkillPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
          piloting: { level: 5, bonus: 0, xpProgress: 0, typeId: 'piloting' },
          'tech-mech': { level: 3, bonus: 0, xpProgress: 0, typeId: 'tech-mech' },
        },
      };

      const modifier = getSkillDesirabilityModifier(multiSkillPerson);
      expect(modifier).toBe(12);
    });
  });

  describe('getTechSkillValue', () => {
    it('RED: returns skill value for person with tech skill', () => {
      const techPerson: IPerson = {
        ...basePerson,
        skills: {
          'tech-mech': {
            level: 5,
            bonus: 0,
            xpProgress: 0,
            typeId: 'tech-mech',
          },
        },
      };

      const value = getTechSkillValue(techPerson);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('RED: returns 10 (unskilled) for person without tech skill', () => {
      const noTechPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
        },
      };

      const value = getTechSkillValue(noTechPerson);
      expect(value).toBe(10);
    });

    it('GREEN: checks multiple tech skill types', () => {
      const astechPerson: IPerson = {
        ...basePerson,
        skills: {
          astech: {
            level: 4,
            bonus: 0,
            xpProgress: 0,
            typeId: 'astech',
          },
        },
      };

      const value = getTechSkillValue(astechPerson);
      expect(value).toBeLessThanOrEqual(10);
    });
  });

  describe('getAdminSkillValue', () => {
    it('GREEN: returns skill value for person with admin skill', () => {
      const adminPerson: IPerson = {
        ...basePerson,
        skills: {
          administration: {
            level: 5,
            bonus: 0,
            xpProgress: 0,
            typeId: 'administration',
          },
        },
      };

      const value = getAdminSkillValue(adminPerson);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('GREEN: returns 10 (unskilled) for person without admin skill', () => {
      const noAdminPerson: IPerson = {
        ...basePerson,
        skills: {},
      };

      const value = getAdminSkillValue(noAdminPerson);
      expect(value).toBe(10);
    });
  });

  describe('getMedicineSkillValue', () => {
    it('GREEN: returns skill value for person with medicine skill', () => {
      const doctorPerson: IPerson = {
        ...basePerson,
        skills: {
          medicine: {
            level: 5,
            bonus: 0,
            xpProgress: 0,
            typeId: 'medicine',
          },
        },
      };

      const value = getMedicineSkillValue(doctorPerson);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('GREEN: returns 10 (unskilled) for person without medicine skill', () => {
      const noMedicinePerson: IPerson = {
        ...basePerson,
        skills: {},
      };

      const value = getMedicineSkillValue(noMedicinePerson);
      expect(value).toBe(10);
    });
  });

  describe('getNegotiationModifier', () => {
    it('GREEN: returns skill value for person with negotiation skill', () => {
      const negotiatorPerson: IPerson = {
        ...basePerson,
        skills: {
          negotiation: {
            level: 4,
            bonus: 0,
            xpProgress: 0,
            typeId: 'negotiation',
          },
        },
      };

      const modifier = getNegotiationModifier(negotiatorPerson);
      expect(modifier).toBeLessThanOrEqual(10);
    });

    it('GREEN: returns 10 (unskilled) for person without negotiation skill', () => {
      const noNegotiationPerson: IPerson = {
        ...basePerson,
        skills: {},
      };

      const modifier = getNegotiationModifier(noNegotiationPerson);
      expect(modifier).toBe(10);
    });
  });

  describe('getLeadershipSkillValue', () => {
    it('GREEN: returns skill value for person with leadership skill', () => {
      const leaderPerson: IPerson = {
        ...basePerson,
        skills: {
          leadership: {
            level: 6,
            bonus: 0,
            xpProgress: 0,
            typeId: 'leadership',
          },
        },
      };

      const value = getLeadershipSkillValue(leaderPerson);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('GREEN: returns 10 (unskilled) for person without leadership skill', () => {
      const noLeadershipPerson: IPerson = {
        ...basePerson,
        skills: {},
      };

      const value = getLeadershipSkillValue(noLeadershipPerson);
      expect(value).toBe(10);
    });
  });

  describe('hasSkill', () => {
    it('RED: returns true for existing skill', () => {
      const result = hasSkill(basePerson, 'gunnery');
      expect(result).toBe(true);
    });

    it('RED: returns false for missing skill', () => {
      const result = hasSkill(basePerson, 'medicine');
      expect(result).toBe(false);
    });

    it('GREEN: works with multiple skills', () => {
      expect(hasSkill(basePerson, 'gunnery')).toBe(true);
      expect(hasSkill(basePerson, 'piloting')).toBe(true);
      expect(hasSkill(basePerson, 'tech-mech')).toBe(false);
    });
  });

  describe('getPersonSkillLevel', () => {
    it('RED: returns skill level for existing skill', () => {
      const level = getPersonSkillLevel(basePerson, 'gunnery');
      expect(level).toBe(4);
    });

    it('RED: returns -1 for missing skill', () => {
      const level = getPersonSkillLevel(basePerson, 'medicine');
      expect(level).toBe(-1);
    });

    it('GREEN: returns correct levels for multiple skills', () => {
      expect(getPersonSkillLevel(basePerson, 'gunnery')).toBe(4);
      expect(getPersonSkillLevel(basePerson, 'piloting')).toBe(5);
      expect(getPersonSkillLevel(basePerson, 'unknown')).toBe(-1);
    });
  });

  describe('getPersonBestCombatSkill', () => {
    it('RED: finds highest combat skill', () => {
      const best = getPersonBestCombatSkill(basePerson);

      expect(best).toBeDefined();
      expect(best?.skillId).toBe('piloting');
      expect(best?.level).toBe(5);
    });

    it('RED: returns null for person with no combat skills', () => {
      const noCombatPerson: IPerson = {
        ...basePerson,
        skills: {
          medicine: {
            level: 5,
            bonus: 0,
            xpProgress: 0,
            typeId: 'medicine',
          },
        },
      };

      const best = getPersonBestCombatSkill(noCombatPerson);
      expect(best).toBeNull();
    });

    it('GREEN: handles multiple combat skills', () => {
      const multiCombatPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
          piloting: { level: 5, bonus: 0, xpProgress: 0, typeId: 'piloting' },
          'small-arms': { level: 3, bonus: 0, xpProgress: 0, typeId: 'small-arms' },
        },
      };

      const best = getPersonBestCombatSkill(multiCombatPerson);
      expect(best?.skillId).toBe('piloting');
      expect(best?.level).toBe(5);
    });

    it('GREEN: finds best among different combat skill types', () => {
      const aerospaceGunnerPerson: IPerson = {
        ...basePerson,
        skills: {
          'gunnery-aerospace': {
            level: 6,
            bonus: 0,
            xpProgress: 0,
            typeId: 'gunnery-aerospace',
          },
          'piloting-aerospace': {
            level: 4,
            bonus: 0,
            xpProgress: 0,
            typeId: 'piloting-aerospace',
          },
        },
      };

      const best = getPersonBestCombatSkill(aerospaceGunnerPerson);
      expect(best?.skillId).toBe('gunnery-aerospace');
      expect(best?.level).toBe(6);
    });

    it('GREEN: returns first skill if tied', () => {
      const tiedSkillsPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: { level: 5, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
          piloting: { level: 5, bonus: 0, xpProgress: 0, typeId: 'piloting' },
        },
      };

      const best = getPersonBestCombatSkill(tiedSkillsPerson);
      expect(best?.level).toBe(5);
      expect(['gunnery', 'piloting']).toContain(best?.skillId);
    });
  });

  describe('Integration Tests', () => {
    it('GREEN: all helpers work together', () => {
      const desirability = getSkillDesirabilityModifier(basePerson);
      const techValue = getTechSkillValue(basePerson);
      const adminValue = getAdminSkillValue(basePerson);
      const medicineValue = getMedicineSkillValue(basePerson);
      const negotiationValue = getNegotiationModifier(basePerson);
      const leadershipValue = getLeadershipSkillValue(basePerson);

      expect(desirability).toBeGreaterThan(0);
      expect(techValue).toBe(10);
      expect(adminValue).toBe(10);
      expect(medicineValue).toBe(10);
      expect(negotiationValue).toBe(10);
      expect(leadershipValue).toBe(10);
    });

    it('GREEN: helpers work with person with many skills', () => {
      const multiSkillPerson: IPerson = {
        ...basePerson,
        skills: {
          gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
          piloting: { level: 5, bonus: 0, xpProgress: 0, typeId: 'piloting' },
          'tech-mech': { level: 3, bonus: 0, xpProgress: 0, typeId: 'tech-mech' },
          administration: { level: 2, bonus: 0, xpProgress: 0, typeId: 'administration' },
          medicine: { level: 1, bonus: 0, xpProgress: 0, typeId: 'medicine' },
        },
      };

      expect(getSkillDesirabilityModifier(multiSkillPerson)).toBe(15);
      expect(hasSkill(multiSkillPerson, 'gunnery')).toBe(true);
      expect(getPersonSkillLevel(multiSkillPerson, 'piloting')).toBe(5);
      expect(getPersonBestCombatSkill(multiSkillPerson)?.skillId).toBe('piloting');
    });
  });
});
