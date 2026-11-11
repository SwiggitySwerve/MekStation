import type {
  IGmCombatInterventionDomainPayload,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
  IGmCombatProjectedEffect,
  IGmCombatPublicEffect,
  IGmPrivateMetadata,
  IInterventionLedgerRecord,
} from '@/types/interventions';

type CombatRecord = IInterventionLedgerRecord<
  IGmPrivateMetadata,
  IGmCombatPublicEffect,
  IGmCombatInterventionDomainPayload
>;

type TurnOrderEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'turn-order' }
>;

type ObjectiveStateEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'objective-state' }
>;

type ResolvedEffect<T extends IGmCombatProjectedEffect = IGmCombatProjectedEffect> =
  T extends ObjectiveStateEffect
    ? Pick<T, 'family' | 'objectiveId' | 'after'> & { readonly previousHexKey?: string }
    : Pick<T, Extract<keyof T, 'family' | 'unitId' | 'attackId' | 'after'>>;

export function projectCombatEffectsForRecord(
  record: CombatRecord,
): readonly IGmCombatProjectedEffect[] {
  if (!record.domainPayload) return [];

  return record.domainPayload.projectedEffects.map(
    (effect) =>
      ({
        ...effect,
        interventionId: record.id,
      }) as IGmCombatProjectedEffect,
  );
}

export function applyGmCombatProjectedEffects(
  state: IGmCombatInterventionState,
  effects: readonly IGmCombatProjectedEffect[],
): IGmCombatInterventionState {
  return effects.reduce(applyGmCombatProjectedEffect, state);
}

function applyGmCombatProjectedEffect(
  state: IGmCombatInterventionState,
  effect: IGmCombatProjectedEffect,
): IGmCombatInterventionState {
  // Retain the ledger adapter's historical explicit-undefined lifecycle shape.
  // The combat-event adapter supplies only its approved after/clear keys.
  const resolved = effect.family === 'lifecycle'
    ? { ...effect, after: {
        destroyed: effect.after.destroyed,
        destructionCause: effect.after.destructionCause,
        hasEjected: effect.after.hasEjected,
        isWithdrawing: effect.after.isWithdrawing,
        hasRetreated: effect.after.hasRetreated,
        shutdown: effect.after.shutdown,
        rescued: effect.after.rescued,
        retreatTargetEdge: effect.after.retreatTargetEdge,
      } }
    : effect.family === 'objective-state'
      ? { ...effect, previousHexKey: effect.before?.hexKey }
      : effect;
  return appendGmCombatEvent(applyGmCombatResolvedEffect(state, resolved), effect);
}

/** Value application shared by private-ledger and combat-event adapters. */
export function applyGmCombatResolvedEffect(
  state: IGmCombatInterventionState,
  effect: ResolvedEffect,
): IGmCombatInterventionState {
  switch (effect.family) {
    case 'reposition-facing':
      return patchUnit(state, effect.unitId, definedUnitPatch(effect.after));
    case 'damage-critical':
      return patchUnit(state, effect.unitId, definedUnitPatch(effect.after));
    case 'heat-ammo':
      return patchUnit(state, effect.unitId, definedUnitPatch(effect.after));
    case 'turn-order':
      return applyTurnOrderEffect(state, effect);
    case 'lifecycle':
      return patchUnit(state, effect.unitId, effect.after);
    case 'attack-resolution':
      return applyAttackResolutionEffect(state, effect);
    case 'objective-state':
      return applyObjectiveStateEffect(state, effect);
  }
}

function applyTurnOrderEffect(
  state: IGmCombatInterventionState,
  effect: Pick<TurnOrderEffect, 'after'>,
): IGmCombatInterventionState {
  return {
    ...state,
    ...(effect.after.phase !== undefined ? { phase: effect.after.phase } : {}),
    ...(effect.after.initiativeWinner !== undefined
      ? { initiativeWinner: effect.after.initiativeWinner }
      : {}),
    ...(effect.after.firstMover !== undefined
      ? { firstMover: effect.after.firstMover }
      : {}),
    ...(effect.after.activationIndex !== undefined
      ? { activationIndex: effect.after.activationIndex }
      : {}),
    ...(effect.after.initiativeOrder !== undefined
      ? { initiativeOrder: effect.after.initiativeOrder }
      : {}),
    ...(effect.after.activeUnitId !== undefined
      ? { activeUnitId: effect.after.activeUnitId }
      : {}),
  };
}

function applyAttackResolutionEffect(
  state: IGmCombatInterventionState,
  effect: Pick<Extract<IGmCombatProjectedEffect, { readonly family: 'attack-resolution' }>, 'attackId' | 'after'>,
): IGmCombatInterventionState {
  return {
    ...state,
    attackResolutionCorrections: {
      ...(state.attackResolutionCorrections ?? {}),
      [effect.attackId]: effect.after,
    },
  };
}

function applyObjectiveStateEffect(
  state: IGmCombatInterventionState,
  effect: Pick<ObjectiveStateEffect, 'after'> & { readonly previousHexKey?: string },
): IGmCombatInterventionState {
  const objectives = { ...(state.objectives ?? {}) };
  if (effect.previousHexKey && effect.previousHexKey !== effect.after.hexKey) {
    delete objectives[effect.previousHexKey];
  }
  objectives[effect.after.hexKey] = effect.after;

  return {
    ...state,
    objectives,
  };
}

function patchUnit(
  state: IGmCombatInterventionState,
  unitId: string,
  patch: Partial<IGmCombatInterventionUnitState>,
): IGmCombatInterventionState {
  const unit = state.units[unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        ...patch,
      },
    },
  };
}

function appendGmCombatEvent(
  state: IGmCombatInterventionState,
  effect: IGmCombatProjectedEffect,
): IGmCombatInterventionState {
  return {
    ...state,
    gmInterventionEvents: [...(state.gmInterventionEvents ?? []), effect],
  };
}

function definedUnitPatch<T extends Partial<IGmCombatInterventionUnitState>>(
  value: T,
): Partial<IGmCombatInterventionUnitState> {
  const entries = Object.entries(value).filter(
    ([, entryValue]) => entryValue !== undefined,
  );
  return Object.fromEntries(entries) as Partial<IGmCombatInterventionUnitState>;
}
