import type { IGameState } from '@/types/gameplay/GameSessionStateTypes';
import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';

import { applyGmCombatResolvedEffect } from './GmCombatInterventionProjection';

/** Assignment/removal only: no resolver, random source or finalization hook. */
export function applyGmReplayCorrectionEffects(
  state: IGameState,
  effects: readonly GmReplayCorrectionEffect[],
): IGameState {
  return effects.reduce((current, effect) => {
    if ('unitId' in effect && !Object.hasOwn(current.units, effect.unitId))
      throw new Error('gm-correction-unknown-unit');
    const applied = applyGmCombatResolvedEffect(current, effect);
    if (!('clear' in effect) || !effect.clear?.length) return applied;
    if ('unitId' in effect) {
      const unit = { ...applied.units[effect.unitId] };
      for (const key of effect.clear) delete unit[key];
      return { ...applied, units: { ...applied.units, [effect.unitId]: unit } };
    }
    const cleared = { ...applied };
    for (const key of effect.clear) delete cleared[key];
    return cleared;
  }, state);
}
