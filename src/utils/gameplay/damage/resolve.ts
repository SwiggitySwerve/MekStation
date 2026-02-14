import {
  CombatLocation,
  ICriticalHitResult,
  IPilotDamageResult,
} from '@/types/gameplay';

import { isHeadHit } from '../hitLocation';
import { checkCriticalHitTrigger } from './critical';
import { checkUnitDestruction } from './destruction';
import { applyDamageWithTransfer } from './location';
import { applyPilotDamage } from './pilot';
import { IResolveDamageResult, IUnitDamageState } from './types';

export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): IResolveDamageResult {
  let currentState = state;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(currentState, location, damage);
  currentState = stateAfterDamage;

  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  if (isHeadHit(location) && damage > 0) {
    const { state: stateAfterPilot, result } = applyPilotDamage(
      currentState,
      1,
      'head_hit',
    );
    currentState = stateAfterPilot;
    pilotDamage = result;
  }

  for (const locDamage of locationDamages) {
    if (locDamage.structureDamage > 0 && !locDamage.destroyed) {
      checkCriticalHitTrigger(locDamage.structureDamage);
    }
  }

  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(currentState);
  currentState = stateAfterDestruction;

  return {
    state: currentState,
    result: {
      locationDamages,
      criticalHits,
      pilotDamage,
      unitDestroyed: destroyed,
      destructionCause: cause,
    },
  };
}
