import type { IUnitGameState, IUnitToken } from '@/types/gameplay';

import { TokenUnitType } from '@/types/gameplay';

/**
 * MegaMek applies minimum-range to-hit penalties only when neither side is
 * airborne. MekStation currently projects aerospace altitude into both UI
 * tokens and engine unit state, so this helper mirrors that represented
 * surface instead of inferring from motive labels.
 */
export function isAirborneCombatToken(token: IUnitToken): boolean {
  return token.unitType === TokenUnitType.Aerospace && token.altitude > 0;
}

export function isAirborneGameUnit(
  unit: Pick<IUnitGameState, 'combatState'>,
): boolean {
  return (
    unit.combatState?.kind === 'aero' && unit.combatState.state.altitude > 0
  );
}

export function isGroundToGroundTokenAttack(
  attacker: IUnitToken,
  target: IUnitToken,
): boolean {
  return !isAirborneCombatToken(attacker) && !isAirborneCombatToken(target);
}

export function isGroundToGroundGameAttack(
  attacker: Pick<IUnitGameState, 'combatState'>,
  target: Pick<IUnitGameState, 'combatState'>,
): boolean {
  return !isAirborneGameUnit(attacker) && !isAirborneGameUnit(target);
}
