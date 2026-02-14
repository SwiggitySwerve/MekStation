import { IToHitModifierDetail } from '@/types/gameplay';

export function calculateTargetingComputerModifier(
  hasTargetingComputer: boolean,
): IToHitModifierDetail | null {
  if (!hasTargetingComputer) {
    return null;
  }

  return {
    name: 'Targeting Computer',
    value: -1,
    source: 'equipment',
    description: 'Targeting computer: -1',
  };
}
