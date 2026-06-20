import type {
  IAmmoSlotState,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IGmUnitReloadInterventionCommandPayload,
  IGmUnitReloadInterventionState,
  IGmUnitReloadInterventionUnitState,
  IGmUnitReloadPilotSnapshot,
  IGmUnitReloadProjectedEffect,
  IGmUnitReloadSourceSnapshot,
  IInterventionConflict,
} from '@/types/interventions';

import { createInitialUnitState } from '@/utils/gameplay/gameState';

import {
  applyGmUnitReloadManualResolution,
  detectGmUnitReloadConflicts,
} from './GmUnitReloadConflictDetection';

export interface IGmUnitReloadProjectionResult {
  readonly effect: IGmUnitReloadProjectedEffect;
  readonly changedStateRefs: readonly string[];
  readonly summary: string;
  readonly conflicts: readonly IInterventionConflict[];
}

export interface IGmUnitReloadProjectionFailure {
  readonly effect?: undefined;
  readonly code: string;
  readonly reason: string;
  readonly affectedRefs?: readonly string[];
}

const PRESERVED_OVERLAY_FIELDS = [
  'position',
  'facing',
  'secondaryFacing',
  'torsoTwist',
  'heat',
  'externalHeatThisTurn',
  'pendingExternalHeat',
  'movementThisTurn',
  'hexesMovedThisTurn',
  'movedBackwardThisTurn',
  'usedMechanicalJumpBoosterThisTurn',
  'armor',
  'structure',
  'startingInternalStructure',
  'destroyedLocations',
  'destroyedEquipment',
  'destroyedArtemisFcs',
  'componentDamage',
  'ammo',
  'pilotWounds',
  'pilotConscious',
  'destroyed',
  'destructionCause',
  'lockState',
  'pendingAction',
  'damageThisPhase',
  'prone',
  'isStuck',
  'hullDown',
  'shutdown',
  'pendingPSRs',
  'weaponsFiredThisTurn',
  'jammedWeapons',
  'narcedBy',
  'iNarcPods',
  'tagDesignated',
  'isRetreating',
  'retreatTargetEdge',
  'hasRetreated',
  'hasEjected',
  'isWithdrawing',
  'edgePointsRemaining',
  'unitHeight',
  'conversionMode',
  'pendingConversionStepCount',
  'pendingConversionMpCost',
  'pendingAltitudeControlStepCount',
  'pendingAltitudeControlMpCost',
  'lamAirMekAltitude',
  'combatState',
] as const satisfies readonly (keyof IGmUnitReloadInterventionUnitState)[];

export function buildGmUnitReloadProjectedEffect(
  payload: IGmUnitReloadInterventionCommandPayload,
  state: IGmUnitReloadInterventionState,
): IGmUnitReloadProjectionResult | IGmUnitReloadProjectionFailure {
  const currentUnit = state.units[payload.unitId];
  if (!currentUnit) {
    return failure(
      'unit-reload-active-unit-not-found',
      `Active unit "${payload.unitId}" was not found.`,
      [unitRef(payload.unitId)],
    );
  }

  const sessionUnit = state.sessionUnits?.find(
    (unit) => unit.id === payload.unitId,
  );
  if (!sessionUnit) {
    return failure(
      'unit-reload-session-unit-not-found',
      `Session unit binding "${payload.unitId}" was not found.`,
      [unitRef(payload.unitId)],
    );
  }

  const unitRefId = payload.unitRef ?? sessionUnit.unitRef;
  const pilotRefId = payload.pilotRef ?? sessionUnit.pilotRef;
  const source = payload.sourceUnitsByRef[unitRefId];
  if (!source) {
    return failure(
      'unit-reload-source-unit-not-found',
      `Source unit "${unitRefId}" was not found.`,
      [unitFieldRef(payload.unitId, 'unitRef')],
    );
  }

  const pilot = payload.pilotsByRef?.[pilotRefId] ?? source.pilot;
  const nextSessionUnit = buildReloadedSessionUnit(
    sessionUnit,
    source,
    unitRefId,
    pilotRefId,
    pilot,
  );
  const seededUnit = createInitialUnitState(
    nextSessionUnit,
    currentUnit.position,
    currentUnit.facing,
  );
  const detectedConflicts = detectGmUnitReloadConflicts({
    currentUnit,
    sessionUnit,
    source,
    state,
  });
  const conflicts = applyGmUnitReloadManualResolution(
    detectedConflicts,
    payload.manualResolution?.acceptedConflictCodes ?? [],
  );
  const nextUnit = preserveCompatibleOverlays(
    currentUnit,
    seededUnit,
    conflicts,
  );
  const changedStateRefs = [
    unitRef(payload.unitId),
    unitFieldRef(payload.unitId, 'loadout'),
    unitFieldRef(payload.unitId, 'pilot'),
    unitFieldRef(payload.unitId, 'live-overlays'),
  ];
  const summary =
    payload.publicSummary ??
    `Unit ${payload.unitId} source data reloaded by the GM.`;

  return {
    summary,
    changedStateRefs,
    conflicts,
    effect: {
      type: 'gm.unit_reload.rehydrated',
      family: 'unit-reload',
      unitId: payload.unitId,
      unitRef: unitRefId,
      pilotRef: pilotRefId,
      before: {
        unit: currentUnit,
        sessionUnit,
      },
      after: {
        unit: nextUnit,
        sessionUnit: nextSessionUnit,
      },
      preservedOverlayFields: PRESERVED_OVERLAY_FIELDS,
      changedStateRefs,
      publicSummary: summary,
    },
  };
}

function buildReloadedSessionUnit(
  current: IGameUnit,
  source: IGmUnitReloadSourceSnapshot,
  unitRef: string,
  pilotRef: string,
  pilot: IGmUnitReloadPilotSnapshot | undefined,
): IGameUnit {
  return {
    ...current,
    ...source.unit,
    id: current.id,
    side: current.side,
    unitRef,
    pilotRef,
    gunnery: pilot?.gunnery ?? source.unit.gunnery,
    piloting: pilot?.piloting ?? source.unit.piloting,
    pilotSpas: pilot?.pilotSpas ?? source.unit.pilotSpas,
    abilities: pilot?.abilities ?? source.unit.abilities,
    pilotToughness: pilot?.pilotToughness ?? source.unit.pilotToughness,
    edgePointsRemaining:
      pilot?.edgePointsRemaining ?? source.unit.edgePointsRemaining,
    neuralInterfaceActive:
      pilot?.neuralInterfaceActive ?? source.unit.neuralInterfaceActive,
  };
}

function preserveCompatibleOverlays(
  current: IGmUnitReloadInterventionUnitState,
  seeded: IGmUnitReloadInterventionUnitState,
  conflicts: readonly IInterventionConflict[],
): IGmUnitReloadInterventionUnitState {
  const patch: Record<string, unknown> = {};
  for (const field of PRESERVED_OVERLAY_FIELDS) {
    patch[field] = current[field];
  }

  return {
    ...seeded,
    ...patch,
    ammoState: reconcileAmmoState(
      current.ammoState,
      seeded.ammoState,
      conflicts,
    ),
  };
}

function reconcileAmmoState(
  current: Record<string, IAmmoSlotState> | undefined,
  seeded: Record<string, IAmmoSlotState> | undefined,
  conflicts: readonly IInterventionConflict[],
): Record<string, IAmmoSlotState> | undefined {
  if (!seeded) return current;
  const preserveRemovedBins = !isConflictAccepted(
    conflicts,
    'unit-reload-ammo-bin-removed',
  );
  const next: Record<string, IAmmoSlotState> = {};

  for (const [binId, sourceBin] of Object.entries(seeded)) {
    const liveBin = current?.[binId];
    next[binId] = liveBin
      ? {
          ...sourceBin,
          remainingRounds: Math.min(
            liveBin.remainingRounds,
            sourceBin.maxRounds,
          ),
        }
      : sourceBin;
  }

  if (preserveRemovedBins) {
    for (const [binId, liveBin] of Object.entries(current ?? {})) {
      if (!next[binId]) next[binId] = liveBin;
    }
  }

  return next;
}

function failure(
  code: string,
  reason: string,
  affectedRefs: readonly string[],
): IGmUnitReloadProjectionFailure {
  return { code, reason, affectedRefs };
}

function unitRef(unitId: string): string {
  return `unit:${unitId}`;
}

function unitFieldRef(unitId: string, field: string): string {
  return `unit:${unitId}:${field}`;
}

function isConflictAccepted(
  conflicts: readonly IInterventionConflict[],
  code: string,
): boolean {
  return conflicts.some(
    (conflictEntry) =>
      conflictEntry.code === code &&
      conflictEntry.requiresManualTakeover === false,
  );
}
