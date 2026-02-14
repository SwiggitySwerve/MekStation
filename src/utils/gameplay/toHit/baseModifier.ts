import { IToHitModifierDetail } from '@/types/gameplay';

export function createBaseModifier(gunnery: number): IToHitModifierDetail {
  return {
    name: 'Gunnery Skill',
    value: gunnery,
    source: 'base',
    description: `Pilot gunnery skill: ${gunnery}`,
  };
}
