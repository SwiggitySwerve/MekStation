import { roll2d6 } from '../hitLocation';

export function checkCriticalHitTrigger(structureDamage: number): {
  triggered: boolean;
  roll: ReturnType<typeof roll2d6>;
} {
  if (structureDamage <= 0) {
    return {
      triggered: false,
      roll: { dice: [0, 0], total: 0, isSnakeEyes: false, isBoxcars: false },
    };
  }

  const roll = roll2d6();
  return {
    triggered: roll.total >= 8,
    roll,
  };
}

export function getCriticalHitCount(roll: number): number {
  if (roll >= 12) return 3;
  if (roll >= 10) return 2;
  if (roll >= 8) return 1;
  return 0;
}
