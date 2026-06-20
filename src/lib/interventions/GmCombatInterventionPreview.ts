import type {
  IGmCombatDamageCriticalCorrection,
  IGmCombatHeatAmmoCorrection,
  IGmCombatInterventionCommandPayload,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
  IGmCombatLifecycleCorrection,
  IGmCombatProjectedEffect,
  IGmCombatRepositionFacingCorrection,
  IGmCombatTurnOrderCorrection,
} from '@/types/interventions';

type LifecycleEffect = Extract<
  IGmCombatProjectedEffect,
  { readonly family: 'lifecycle' }
>;

type LifecyclePatch = LifecycleEffect['after'];

export interface IGmCombatProjectedEffectResult {
  readonly effect: IGmCombatProjectedEffect;
  readonly changedStateRefs: readonly string[];
  readonly summary: string;
}

export interface IGmCombatProjectedEffectFailure {
  readonly effect?: undefined;
  readonly code: string;
  readonly reason: string;
  readonly affectedRefs?: readonly string[];
}

export function buildGmCombatProjectedEffect(
  payload: IGmCombatInterventionCommandPayload,
  state: IGmCombatInterventionState,
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  const { correction } = payload;

  if (correction.family === 'turn-order') {
    return buildTurnOrderEffect(correction, state, payload.publicSummary);
  }

  const unit = state.units[correction.unitId];
  if (!unit) {
    return {
      code: 'combat-unit-not-found',
      reason: `Combat unit "${correction.unitId}" was not found.`,
      affectedRefs: [unitRef(correction.unitId)],
    };
  }

  switch (correction.family) {
    case 'reposition-facing':
      return buildRepositionFacingEffect(
        correction,
        unit,
        payload.publicSummary,
      );
    case 'damage-critical':
      return buildDamageCriticalEffect(correction, unit, payload.publicSummary);
    case 'heat-ammo':
      return buildHeatAmmoEffect(correction, unit, payload.publicSummary);
    case 'lifecycle':
      return buildLifecycleEffect(correction, unit, payload.publicSummary);
  }
}

function buildRepositionFacingEffect(
  correction: IGmCombatRepositionFacingCorrection,
  unit: IGmCombatInterventionUnitState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult {
  const after = {
    position: correction.position,
    facing: correction.facing,
    secondaryFacing: correction.secondaryFacing,
  };
  const changedStateRefs = [
    unitRef(unit.id),
    ...(correction.position ? [unitFieldRef(unit.id, 'position')] : []),
    ...(correction.facing !== undefined
      ? [unitFieldRef(unit.id, 'facing')]
      : []),
    ...(correction.secondaryFacing !== undefined
      ? [unitFieldRef(unit.id, 'secondaryFacing')]
      : []),
  ];
  const summary =
    summaryOverride ?? `Unit ${unit.id} position/facing corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.reposition_facing_corrected',
      family: 'reposition-facing',
      unitId: unit.id,
      before: {
        position: unit.position,
        facing: unit.facing,
        secondaryFacing: unit.secondaryFacing,
      },
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildDamageCriticalEffect(
  correction: IGmCombatDamageCriticalCorrection,
  unit: IGmCombatInterventionUnitState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult {
  const after = {
    armor: correction.armor
      ? { ...unit.armor, ...correction.armor }
      : undefined,
    structure: correction.structure
      ? { ...unit.structure, ...correction.structure }
      : undefined,
    componentDamage: correction.componentDamage,
    destroyedLocations: correction.destroyedLocations,
    destroyedEquipment: correction.destroyedEquipment,
  };
  const changedStateRefs = [
    unitRef(unit.id),
    unitFieldRef(unit.id, 'damage'),
    ...(correction.componentDamage
      ? [unitFieldRef(unit.id, 'componentDamage')]
      : []),
  ];
  const summary =
    summaryOverride ??
    `Unit ${unit.id} damage and critical state corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.damage_critical_corrected',
      family: 'damage-critical',
      unitId: unit.id,
      before: {
        armor: unit.armor,
        structure: unit.structure,
        componentDamage: unit.componentDamage,
        destroyedLocations: unit.destroyedLocations,
        destroyedEquipment: unit.destroyedEquipment,
      },
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildHeatAmmoEffect(
  correction: IGmCombatHeatAmmoCorrection,
  unit: IGmCombatInterventionUnitState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult {
  const after = {
    heat: correction.heat,
    ammo: correction.ammo ? { ...unit.ammo, ...correction.ammo } : undefined,
    ammoState: correction.ammoState
      ? { ...(unit.ammoState ?? {}), ...correction.ammoState }
      : undefined,
  };
  const changedStateRefs = [
    unitRef(unit.id),
    ...(correction.heat !== undefined ? [unitFieldRef(unit.id, 'heat')] : []),
    ...(correction.ammo ? [unitFieldRef(unit.id, 'ammo')] : []),
    ...(correction.ammoState ? [unitFieldRef(unit.id, 'ammoState')] : []),
  ];
  const summary =
    summaryOverride ?? `Unit ${unit.id} heat/ammo corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.heat_ammo_corrected',
      family: 'heat-ammo',
      unitId: unit.id,
      before: {
        heat: unit.heat,
        ammo: unit.ammo,
        ammoState: unit.ammoState,
      },
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildTurnOrderEffect(
  correction: IGmCombatTurnOrderCorrection,
  state: IGmCombatInterventionState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  const unknownOrderUnit = correction.initiativeOrder?.find(
    (unitId) => !state.units[unitId],
  );
  if (unknownOrderUnit) {
    return {
      code: 'combat-initiative-unit-not-found',
      reason: `Initiative order references unknown unit "${unknownOrderUnit}".`,
      affectedRefs: [unitRef(unknownOrderUnit)],
    };
  }

  if (correction.activeUnitId && !state.units[correction.activeUnitId]) {
    return {
      code: 'combat-active-unit-not-found',
      reason: `Active unit "${correction.activeUnitId}" was not found.`,
      affectedRefs: [unitRef(correction.activeUnitId)],
    };
  }

  const initiativeOrder = correction.initiativeOrder ?? state.initiativeOrder;
  const activeUnitIndex =
    correction.activationIndex ??
    resolveActivationIndex(initiativeOrder, correction.activeUnitId);
  const after = {
    phase: correction.phase,
    initiativeWinner: correction.initiativeWinner,
    firstMover: correction.firstMover,
    activationIndex: activeUnitIndex,
    initiativeOrder,
    activeUnitId:
      correction.activeUnitId ??
      resolveActiveUnitId(initiativeOrder, activeUnitIndex),
  };
  const changedStateRefs = [
    gameRef(state.gameId),
    gameFieldRef(state.gameId, 'turn-order'),
  ];
  const summary =
    summaryOverride ??
    `Combat phase, initiative, or active turn corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.turn_order_corrected',
      family: 'turn-order',
      before: {
        phase: state.phase,
        initiativeWinner: state.initiativeWinner,
        firstMover: state.firstMover,
        activationIndex: state.activationIndex,
        initiativeOrder: state.initiativeOrder,
        activeUnitId: state.activeUnitId,
      },
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildLifecycleEffect(
  correction: IGmCombatLifecycleCorrection,
  unit: IGmCombatInterventionUnitState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult {
  const after = lifecyclePatch(correction);
  const changedStateRefs = [
    unitRef(unit.id),
    unitFieldRef(unit.id, 'lifecycle'),
  ];
  const summary =
    summaryOverride ??
    `Unit ${unit.id} lifecycle state corrected to ${correction.lifecycle}.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.lifecycle_corrected',
      family: 'lifecycle',
      unitId: unit.id,
      before: {
        destroyed: unit.destroyed,
        destructionCause: unit.destructionCause,
        hasEjected: unit.hasEjected,
        isWithdrawing: unit.isWithdrawing,
        hasRetreated: unit.hasRetreated,
        shutdown: unit.shutdown,
        rescued: unit.rescued,
        retreatTargetEdge: unit.retreatTargetEdge,
      },
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function lifecyclePatch(
  correction: IGmCombatLifecycleCorrection,
): LifecyclePatch {
  switch (correction.lifecycle) {
    case 'active':
      return inactiveLifecyclePatch();
    case 'ejected':
      return { ...inactiveLifecyclePatch(), hasEjected: true };
    case 'withdrawing':
      return {
        ...inactiveLifecyclePatch(),
        isWithdrawing: true,
        retreatTargetEdge: correction.retreatTargetEdge,
      };
    case 'withdrawn':
      return { ...inactiveLifecyclePatch(), hasRetreated: true };
    case 'disabled':
      return { ...inactiveLifecyclePatch(), shutdown: true };
    case 'destroyed':
      return {
        ...inactiveLifecyclePatch(),
        destroyed: true,
        destructionCause: correction.destructionCause ?? 'damage',
      };
    case 'rescued':
      return {
        ...inactiveLifecyclePatch(),
        hasRetreated: true,
        rescued: true,
      };
  }
}

function inactiveLifecyclePatch(): LifecyclePatch {
  return {
    destroyed: false,
    destructionCause: undefined,
    hasEjected: false,
    isWithdrawing: false,
    hasRetreated: false,
    shutdown: false,
    rescued: false,
    retreatTargetEdge: undefined,
  };
}

function resolveActivationIndex(
  initiativeOrder: readonly string[] | undefined,
  activeUnitId: string | null | undefined,
): number | undefined {
  if (!initiativeOrder || !activeUnitId) return undefined;
  const index = initiativeOrder.indexOf(activeUnitId);
  return index >= 0 ? index : undefined;
}

function resolveActiveUnitId(
  initiativeOrder: readonly string[] | undefined,
  activationIndex: number | undefined,
): string | null | undefined {
  if (!initiativeOrder || activationIndex === undefined) return undefined;
  return initiativeOrder[activationIndex] ?? null;
}

function unitRef(unitId: string): string {
  return `unit:${unitId}`;
}

function unitFieldRef(unitId: string, field: string): string {
  return `unit:${unitId}:${field}`;
}

function gameRef(gameId: string): string {
  return `game:${gameId}`;
}

function gameFieldRef(gameId: string, field: string): string {
  return `game:${gameId}:${field}`;
}
