import { describe, it, expect } from '@jest/globals';

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { SkillExperienceLevel } from '@/types/campaign/skills/experienceLevels';

import {
  DEFAULT_SKILLS_BY_ROLE,
  EXPERIENCE_SKILL_MODIFIER,
  createDefaultSkills,
} from '../defaultSkills';

describe('Default Skills by Role and Experience Level', () => {
  describe('DEFAULT_SKILLS_BY_ROLE', () => {
    it('RED: PILOT has gunnery and piloting skills', () => {
      const pilotSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.PILOT];

      expect(pilotSkills.skills.gunnery).toBe(4);
      expect(pilotSkills.skills.piloting).toBe(5);
    });

    it('RED: TECH has tech-mech and tech-general skills', () => {
      const techSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.TECH];

      expect(techSkills.skills['tech-mech']).toBe(5);
      expect(techSkills.skills['tech-general']).toBe(5);
      expect(Object.keys(techSkills.skills).length).toBe(2);
    });

    it('RED: AEROSPACE_PILOT has aerospace skills', () => {
      const aerospaceSkills =
        DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.AEROSPACE_PILOT];

      expect(aerospaceSkills.skills['gunnery-aerospace']).toBe(4);
      expect(aerospaceSkills.skills['piloting-aerospace']).toBe(5);
    });

    it('RED: VEHICLE_DRIVER has vehicle skills', () => {
      const vehicleSkills =
        DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.VEHICLE_DRIVER];

      expect(vehicleSkills.skills['gunnery-vehicle']).toBe(4);
      expect(vehicleSkills.skills.driving).toBe(5);
    });

    it('RED: DOCTOR has medicine skill', () => {
      const doctorSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.DOCTOR];

      expect(doctorSkills.skills.medicine).toBe(5);
    });

    it('RED: ADMIN has administration skill', () => {
      const adminSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.ADMIN];

      expect(adminSkills.skills.administration).toBe(5);
    });

    it('RED: MEDIC has medtech skill', () => {
      const medicSkills = DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.MEDIC];

      expect(medicSkills.skills.medtech).toBe(5);
    });

    it('RED: SUPPORT has astech and administration skills', () => {
      const supportSkills =
        DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.SUPPORT];

      expect(supportSkills.skills.astech).toBe(5);
      expect(supportSkills.skills.administration).toBe(7);
    });

    it('RED: SOLDIER has small-arms and anti-mek skills', () => {
      const soldierSkills =
        DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.SOLDIER];

      expect(soldierSkills.skills['small-arms']).toBe(5);
      expect(soldierSkills.skills['anti-mek']).toBe(7);
    });

    it('RED: UNASSIGNED has no skills', () => {
      const unassignedSkills =
        DEFAULT_SKILLS_BY_ROLE[CampaignPersonnelRole.UNASSIGNED];

      expect(Object.keys(unassignedSkills.skills).length).toBe(0);
    });

    it('GREEN: all 10 roles are defined', () => {
      const roles = Object.values(CampaignPersonnelRole);
      expect(Object.keys(DEFAULT_SKILLS_BY_ROLE).length).toBe(roles.length);

      for (const role of roles) {
        expect(DEFAULT_SKILLS_BY_ROLE[role]).toBeDefined();
      }
    });
  });

  describe('EXPERIENCE_SKILL_MODIFIER', () => {
    it('RED: GREEN adds +1 to skill levels', () => {
      expect(EXPERIENCE_SKILL_MODIFIER[SkillExperienceLevel.Green]).toBe(1);
    });

    it('RED: REGULAR adds 0 (no change)', () => {
      expect(EXPERIENCE_SKILL_MODIFIER[SkillExperienceLevel.Regular]).toBe(0);
    });

    it('RED: VETERAN subtracts -1 from skill levels', () => {
      expect(EXPERIENCE_SKILL_MODIFIER[SkillExperienceLevel.Veteran]).toBe(-1);
    });

    it('RED: ELITE subtracts -2 from skill levels', () => {
      expect(EXPERIENCE_SKILL_MODIFIER[SkillExperienceLevel.Elite]).toBe(-2);
    });

    it('GREEN: all 4 experience levels are defined', () => {
      const levels = Object.values(SkillExperienceLevel);
      expect(Object.keys(EXPERIENCE_SKILL_MODIFIER).length).toBe(levels.length);

      for (const level of levels) {
        expect(EXPERIENCE_SKILL_MODIFIER[level]).toBeDefined();
      }
    });
  });

  describe('createDefaultSkills', () => {
    it('RED: PILOT gets gunnery + piloting at default levels', () => {
      const skills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Regular,
      );

      expect(skills.gunnery).toBeDefined();
      expect(skills.gunnery.level).toBe(4);
      expect(skills.gunnery.bonus).toBe(0);
      expect(skills.gunnery.xpProgress).toBe(0);
      expect(skills.gunnery.typeId).toBe('gunnery');

      expect(skills.piloting).toBeDefined();
      expect(skills.piloting.level).toBe(5);
      expect(skills.piloting.bonus).toBe(0);
      expect(skills.piloting.xpProgress).toBe(0);
      expect(skills.piloting.typeId).toBe('piloting');
    });

    it('RED: TECH gets tech-mech and tech-general skills', () => {
      const skills = createDefaultSkills(
        CampaignPersonnelRole.TECH,
        SkillExperienceLevel.Regular,
      );

      expect(skills['tech-mech']).toBeDefined();
      expect(skills['tech-mech'].level).toBe(5);
      expect(skills['tech-general']).toBeDefined();
      expect(skills['tech-general'].level).toBe(5);
      expect(Object.keys(skills).length).toBe(2);
    });

    it('RED: GREEN experience adds +1 to skill values', () => {
      const regularSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Regular,
      );
      const greenSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Green,
      );

      expect(greenSkills.gunnery.level).toBe(regularSkills.gunnery.level + 1);
      expect(greenSkills.piloting.level).toBe(regularSkills.piloting.level + 1);
    });

    it('RED: ELITE experience subtracts -2 from skill values', () => {
      const regularSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Regular,
      );
      const eliteSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Elite,
      );

      expect(eliteSkills.gunnery.level).toBe(regularSkills.gunnery.level - 2);
      expect(eliteSkills.piloting.level).toBe(regularSkills.piloting.level - 2);
    });

    it('RED: VETERAN experience subtracts -1 from skill values', () => {
      const regularSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Regular,
      );
      const veteranSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Veteran,
      );

      expect(veteranSkills.gunnery.level).toBe(regularSkills.gunnery.level - 1);
      expect(veteranSkills.piloting.level).toBe(
        regularSkills.piloting.level - 1,
      );
    });

    it('GREEN: skill levels never go below 0', () => {
      const eliteSkills = createDefaultSkills(
        CampaignPersonnelRole.SOLDIER,
        SkillExperienceLevel.Elite,
      );

      for (const skill of Object.values(eliteSkills)) {
        expect(skill.level).toBeGreaterThanOrEqual(0);
      }
    });

    it('GREEN: UNASSIGNED role returns empty skills', () => {
      const skills = createDefaultSkills(
        CampaignPersonnelRole.UNASSIGNED,
        SkillExperienceLevel.Regular,
      );

      expect(Object.keys(skills).length).toBe(0);
    });

    it('GREEN: all roles work with all experience levels', () => {
      const roles = Object.values(CampaignPersonnelRole);
      const levels = Object.values(SkillExperienceLevel);

      for (const role of roles) {
        for (const level of levels) {
          const skills = createDefaultSkills(role, level);
          expect(skills).toBeDefined();
          expect(typeof skills).toBe('object');
        }
      }
    });

    it('GREEN: returned skills have correct structure', () => {
      const skills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Regular,
      );

      for (const [skillId, skill] of Object.entries(skills)) {
        expect(skill.level).toBeGreaterThanOrEqual(0);
        expect(skill.level).toBeLessThanOrEqual(10);
        expect(skill.bonus).toBe(0);
        expect(skill.xpProgress).toBe(0);
        expect(skill.typeId).toBe(skillId);
      }
    });

    it('GREEN: GREEN pilot has higher skill levels than ELITE', () => {
      const greenSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Green,
      );
      const eliteSkills = createDefaultSkills(
        CampaignPersonnelRole.PILOT,
        SkillExperienceLevel.Elite,
      );

      expect(greenSkills.gunnery.level).toBeGreaterThan(
        eliteSkills.gunnery.level,
      );
      expect(greenSkills.piloting.level).toBeGreaterThan(
        eliteSkills.piloting.level,
      );
    });

    it('GREEN: SUPPORT role with multiple skills applies modifier to all', () => {
      const regularSkills = createDefaultSkills(
        CampaignPersonnelRole.SUPPORT,
        SkillExperienceLevel.Regular,
      );
      const veteranSkills = createDefaultSkills(
        CampaignPersonnelRole.SUPPORT,
        SkillExperienceLevel.Veteran,
      );

      expect(veteranSkills.astech.level).toBe(regularSkills.astech.level - 1);
      expect(veteranSkills.administration.level).toBe(
        regularSkills.administration.level - 1,
      );
    });
  });

  describe('Integration Tests', () => {
    it('GREEN: all roles produce valid skill records', () => {
      const roles = Object.values(CampaignPersonnelRole);

      for (const role of roles) {
        const skills = createDefaultSkills(role, SkillExperienceLevel.Regular);

        for (const [skillId, skill] of Object.entries(skills)) {
          expect(skill.typeId).toBe(skillId);
          expect(skill.bonus).toBe(0);
          expect(skill.xpProgress).toBe(0);
          expect(skill.level).toBeGreaterThanOrEqual(0);
          expect(skill.level).toBeLessThanOrEqual(10);
        }
      }
    });

    it('GREEN: experience modifiers are consistent across roles', () => {
      const roles = [
        CampaignPersonnelRole.PILOT,
        CampaignPersonnelRole.TECH,
        CampaignPersonnelRole.DOCTOR,
      ];

      for (const role of roles) {
        const regularSkills = createDefaultSkills(
          role,
          SkillExperienceLevel.Regular,
        );
        const greenSkills = createDefaultSkills(
          role,
          SkillExperienceLevel.Green,
        );
        const veteranSkills = createDefaultSkills(
          role,
          SkillExperienceLevel.Veteran,
        );
        const eliteSkills = createDefaultSkills(
          role,
          SkillExperienceLevel.Elite,
        );

        const skillIds = Object.keys(regularSkills);

        for (const skillId of skillIds) {
          const regularLevel = regularSkills[skillId].level;
          const greenLevel = greenSkills[skillId].level;
          const veteranLevel = veteranSkills[skillId].level;
          const eliteLevel = eliteSkills[skillId].level;

          expect(greenLevel).toBe(regularLevel + 1);
          expect(veteranLevel).toBe(regularLevel - 1);
          expect(eliteLevel).toBe(regularLevel - 2);
        }
      }
    });
  });
});
