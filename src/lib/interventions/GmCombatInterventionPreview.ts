import type {
  IGmCombatAttackResolutionCorrection,
  IGmCombatDamageCriticalCorrection,
  IGmCombatHeatAmmoCorrection,
  IGmCombatInterventionCommandPayload,
  IGmCombatInterventionState,
  IGmCombatInterventionUnitState,
  IGmCombatLifecycleCorrection,
  IGmCombatObjectiveStateCorrection,
  IGmCombatProjectedEffect,
  IGmCombatRepositionFacingCorrection,
  IGmCombatTurnOrderCorrection,
} from '@/types/interventions';

import {
  attackResolutionRef,
  buildObjectiveMarkerAfter,
  findObjectiveMarker,
  gameFieldRef,
  gameRef,
  hasObjectKeys,
  hasOwn,
  lifecyclePatch,
  objectiveHexRef,
  objectiveRef,
  resolveActivationIndex,
  resolveActiveUnitId,
  unitFieldRef,
  unitRef,
  validateAttackResolutionCorrection,
} from './GmCombatInterventionPreview.helpers';

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

  if (correction.family === 'attack-resolution') {
    return buildAttackResolutionEffect(
      correction,
      state,
      payload.publicSummary,
    );
  }

  if (correction.family === 'objective-state') {
    return buildObjectiveStateEffect(correction, state, payload.publicSummary);
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
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  if (
    !correction.position &&
    correction.facing === undefined &&
    correction.secondaryFacing === undefined
  ) {
    return {
      code: 'combat-reposition-facing-empty',
      reason:
        'Reposition/facing correction requires a position, facing, or secondary facing value.',
      affectedRefs: [unitRef(unit.id)],
    };
  }

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
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  if (
    !hasObjectKeys(correction.armor) &&
    !hasObjectKeys(correction.structure) &&
    correction.componentDamage === undefined &&
    correction.destroyedLocations === undefined &&
    correction.destroyedEquipment === undefined
  ) {
    return {
      code: 'combat-damage-critical-empty',
      reason:
        'Damage/critical correction requires armor, structure, component damage, destroyed location, or destroyed equipment detail.',
      affectedRefs: [unitRef(unit.id)],
    };
  }

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
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  if (
    correction.heat === undefined &&
    !hasObjectKeys(correction.ammo) &&
    !hasObjectKeys(correction.ammoState)
  ) {
    return {
      code: 'combat-heat-ammo-empty',
      reason: 'Heat/ammo correction requires heat, ammo, or ammo state detail.',
      affectedRefs: [unitRef(unit.id)],
    };
  }

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
  if (
    !hasOwn(correction, 'phase') &&
    !hasOwn(correction, 'initiativeWinner') &&
    !hasOwn(correction, 'firstMover') &&
    !hasOwn(correction, 'activationIndex') &&
    !hasOwn(correction, 'initiativeOrder') &&
    !hasOwn(correction, 'activeUnitId')
  ) {
    return {
      code: 'combat-turn-order-empty',
      reason:
        'Turn-order correction requires phase, initiative, activation, initiative order, or active-unit detail.',
      affectedRefs: [gameFieldRef(state.gameId, 'turn-order')],
    };
  }

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

function buildAttackResolutionEffect(
  correction: IGmCombatAttackResolutionCorrection,
  state: IGmCombatInterventionState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  const invalidReason = validateAttackResolutionCorrection(correction);
  if (invalidReason) {
    return {
      code: 'combat-attack-resolution-invalid',
      reason: invalidReason,
      affectedRefs: [gameFieldRef(state.gameId, 'attack-resolution')],
    };
  }

  if (!state.units[correction.attackerId]) {
    return {
      code: 'combat-attack-attacker-not-found',
      reason: `Attack-resolution correction references unknown attacker "${correction.attackerId}".`,
      affectedRefs: [unitRef(correction.attackerId)],
    };
  }

  if (!state.units[correction.targetId]) {
    return {
      code: 'combat-attack-target-not-found',
      reason: `Attack-resolution correction references unknown target "${correction.targetId}".`,
      affectedRefs: [unitRef(correction.targetId)],
    };
  }

  const before = state.attackResolutionCorrections?.[correction.attackId];
  const after = {
    attackId: correction.attackId,
    attackerId: correction.attackerId,
    targetId: correction.targetId,
    weaponId: correction.weaponId,
    roll: correction.roll,
    toHitNumber: correction.toHitNumber,
    hit: correction.hit,
    location: correction.location,
    damage: correction.damage,
    heat: correction.heat,
    attackerArc: correction.attackerArc,
    ammoBinId: correction.ammoBinId,
    rolls: correction.rolls,
    relatedEventIds: correction.relatedEventIds,
    supersededEventIds: correction.supersededEventIds,
  };
  const changedStateRefs = [
    gameRef(state.gameId),
    attackResolutionRef(correction.attackId),
    unitRef(correction.attackerId),
    unitRef(correction.targetId),
  ];
  const summary =
    summaryOverride ??
    `Attack ${correction.attackId} result corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.attack_resolution_corrected',
      family: 'attack-resolution',
      attackId: correction.attackId,
      before,
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildObjectiveStateEffect(
  correction: IGmCombatObjectiveStateCorrection,
  state: IGmCombatInterventionState,
  summaryOverride?: string,
): IGmCombatProjectedEffectResult | IGmCombatProjectedEffectFailure {
  const before = findObjectiveMarker(state, correction);
  const after = buildObjectiveMarkerAfter(correction, before);

  if (!after) {
    return {
      code: 'combat-objective-marker-not-found',
      reason:
        'Objective correction requires an existing marker by objective id or hex key, or a complete replacement marker.',
      affectedRefs: [gameFieldRef(state.gameId, 'objectives')],
    };
  }

  const changedStateRefs = [
    gameRef(state.gameId),
    objectiveRef(after.id),
    objectiveHexRef(after.hexKey),
  ];
  const summary =
    summaryOverride ?? `Objective ${after.id} state corrected by the GM.`;

  return {
    summary,
    changedStateRefs,
    effect: {
      type: 'gm.combat.objective_state_corrected',
      family: 'objective-state',
      objectiveId: after.id,
      before,
      after,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}
