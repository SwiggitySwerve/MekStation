import { TECH_SKILL_TYPE, getTechSkillValue, UNSKILLED_TECH_VALUE } from '../techSkill';
import { SKILL_CATALOG, getSkillType } from '../../../../constants/campaign/skillCatalog';
import { getSkillValue } from '../ISkill';
import type { IPerson } from '@/types/campaign/Person';
import type { ISkill } from '../ISkill';
import type { IAttributes } from '../IAttributes';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { createDefaultSkills } from '@/lib/campaign/skills/defaultSkills';
import { SkillExperienceLevel } from '../experienceLevels';

function makeAttributes(overrides: Partial<IAttributes> = {}): IAttributes {
  return { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0, ...overrides };
}

function makePerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'tech-001',
    name: 'Test Tech',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.TECH,
    rank: 'Technician',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: makeAttributes(),
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('TECH_SKILL_TYPE', () => {
  it('should have id "tech-general"', () => {
    expect(TECH_SKILL_TYPE.id).toBe('tech-general');
  });

  it('should have name "Tech"', () => {
    expect(TECH_SKILL_TYPE.name).toBe('Tech');
  });

  it('should have targetNumber 7', () => {
    expect(TECH_SKILL_TYPE.targetNumber).toBe(7);
  });

  it('should be linked to DEX attribute', () => {
    expect(TECH_SKILL_TYPE.linkedAttribute).toBe('DEX');
  });

  it('should have 11-element cost array starting with 0', () => {
    expect(TECH_SKILL_TYPE.costs).toHaveLength(11);
    expect(TECH_SKILL_TYPE.costs[0]).toBe(0);
  });

  it('should have expected XP cost progression', () => {
    expect(TECH_SKILL_TYPE.costs).toEqual([0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150]);
  });

  it('should be registered in SKILL_CATALOG', () => {
    expect(SKILL_CATALOG['tech-general']).toBeDefined();
    expect(SKILL_CATALOG['tech-general'].id).toBe('tech-general');
  });

  it('should be retrievable via getSkillType()', () => {
    const skill = getSkillType('tech-general');
    expect(skill).toBeDefined();
    expect(skill?.id).toBe('tech-general');
  });
});

describe('getTechSkillValue', () => {
  it('should return correct value for a skilled tech with level 5 and average DEX', () => {
    const techSkill: ISkill = { level: 5, bonus: 0, xpProgress: 0, typeId: 'tech-general' };
    const person = makePerson({
      skills: { 'tech-general': techSkill },
      attributes: makeAttributes({ DEX: 5 }),
    });

    expect(getTechSkillValue(person)).toBe(5);
  });

  it('should include DEX attribute modifier', () => {
    const techSkill: ISkill = { level: 5, bonus: 0, xpProgress: 0, typeId: 'tech-general' };
    const person = makePerson({
      skills: { 'tech-general': techSkill },
      attributes: makeAttributes({ DEX: 7 }),
    });

    expect(getTechSkillValue(person)).toBe(7);
  });

  it('should include skill bonus', () => {
    const techSkill: ISkill = { level: 5, bonus: 1, xpProgress: 0, typeId: 'tech-general' };
    const person = makePerson({
      skills: { 'tech-general': techSkill },
      attributes: makeAttributes({ DEX: 5 }),
    });

    expect(getTechSkillValue(person)).toBe(6);
  });

  it('should return UNSKILLED_TECH_VALUE (10) for person without tech skill', () => {
    const person = makePerson({ skills: {} });

    expect(getTechSkillValue(person)).toBe(UNSKILLED_TECH_VALUE);
    expect(UNSKILLED_TECH_VALUE).toBe(10);
  });

  it('should return UNSKILLED_TECH_VALUE for person with other skills but no tech-general', () => {
    const person = makePerson({
      skills: {
        gunnery: { level: 4, bonus: 0, xpProgress: 0, typeId: 'gunnery' },
      },
    });

    expect(getTechSkillValue(person)).toBe(10);
  });
});

describe('TECH role default skills', () => {
  it('should include tech-general skill for TECH role', () => {
    const skills = createDefaultSkills(CampaignPersonnelRole.TECH, SkillExperienceLevel.Regular);
    expect(skills['tech-general']).toBeDefined();
    expect(skills['tech-general'].level).toBe(5);
  });

  it('should include tech-general skill for MEK_TECH role', () => {
    const skills = createDefaultSkills(CampaignPersonnelRole.MEK_TECH, SkillExperienceLevel.Regular);
    expect(skills['tech-general']).toBeDefined();
  });

  it('should adjust tech-general level by experience modifier', () => {
    const greenSkills = createDefaultSkills(CampaignPersonnelRole.TECH, SkillExperienceLevel.Green);
    expect(greenSkills['tech-general'].level).toBe(6);

    const eliteSkills = createDefaultSkills(CampaignPersonnelRole.TECH, SkillExperienceLevel.Elite);
    expect(eliteSkills['tech-general'].level).toBe(3);
  });
});
