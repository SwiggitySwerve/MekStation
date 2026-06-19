import type { D6Roller, DiceRoller } from './diceTypes';

export function hasMaxTechHeatScaleRule(
  optionalRules: readonly string[],
): boolean {
  return optionalRules.some((rule) =>
    [
      'maxtech-heat-scale',
      'maxtech_heat_scale',
      'maxtech-heat',
      'tacops-heat-scale',
    ].includes(rule.toLowerCase()),
  );
}

export function createD6RollerFromDiceRoller(diceRoller: DiceRoller): D6Roller {
  let queuedDice: number[] = [];
  return () => {
    if (queuedDice.length === 0) {
      queuedDice = [...diceRoller().dice];
    }
    return queuedDice.shift() ?? 1;
  };
}
