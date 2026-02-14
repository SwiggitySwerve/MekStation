import { getPilotSkillModifier } from '../../types/validation/BattleValue';

export function calculateAdjustedBV(
  baseBV: number,
  gunnery: number,
  piloting: number,
): number {
  const modifier = getPilotSkillModifier(gunnery, piloting);
  return Math.round(baseBV * modifier);
}
