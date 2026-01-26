import type { ISkillType } from './ISkillType';
import { getSkillValue } from './ISkill';
import type { IPerson } from '@/types/campaign/Person';

export const UNSKILLED_TECH_VALUE = 10;

export const TECH_SKILL_TYPE: ISkillType = {
  id: 'tech-general',
  name: 'Tech',
  description: 'General technical maintenance and repair ability',
  targetNumber: 7,
  costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
  linkedAttribute: 'DEX',
};

export function getTechSkillValue(person: IPerson): number {
  const techSkill = person.skills['tech-general'];
  if (!techSkill) return UNSKILLED_TECH_VALUE;
  return getSkillValue(techSkill, TECH_SKILL_TYPE, person.attributes);
}
