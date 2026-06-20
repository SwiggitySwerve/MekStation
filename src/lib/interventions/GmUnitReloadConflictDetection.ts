import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IGmUnitReloadInterventionState,
  IGmUnitReloadInterventionUnitState,
  IGmUnitReloadSourceSnapshot,
  IInterventionConflict,
} from '@/types/interventions';

import { LockState, MovementType } from '@/types/gameplay';

export interface IGmUnitReloadConflictInput {
  readonly currentUnit: IGmUnitReloadInterventionUnitState;
  readonly sessionUnit: IGameUnit;
  readonly source: IGmUnitReloadSourceSnapshot;
  readonly state: IGmUnitReloadInterventionState;
}

export function detectGmUnitReloadConflicts(
  input: IGmUnitReloadConflictInput,
): readonly IInterventionConflict[] {
  return [
    ...detectRemovedComponents(input.currentUnit, input.source.unit),
    ...detectArmorStructureConflicts(input.currentUnit, input.source),
    ...detectAmmoBinConflicts(input.currentUnit, input.source),
    ...detectMovementProfileConflict(input),
    ...detectQueuedTargetConflicts(input.currentUnit, input.state),
  ];
}

export function applyGmUnitReloadManualResolution(
  conflicts: readonly IInterventionConflict[],
  acceptedCodes: readonly string[],
): readonly IInterventionConflict[] {
  const accepted = new Set(acceptedCodes);
  return conflicts.map((entry) => ({
    ...entry,
    requiresManualTakeover: !accepted.has(entry.code),
  }));
}

function detectRemovedComponents(
  current: IGmUnitReloadInterventionUnitState,
  source: IGameUnit,
): readonly IInterventionConflict[] {
  if (!source.weaponLocationById) return [];
  const sourceWeaponIds = new Set(Object.keys(source.weaponLocationById));
  const liveWeaponRefs = [
    ...(current.destroyedEquipment ?? []),
    ...(current.weaponsFiredThisTurn ?? []),
    ...(current.jammedWeapons ?? []),
  ];
  const removed = liveWeaponRefs.filter(
    (weaponId) => !sourceWeaponIds.has(weaponId),
  );
  if (removed.length === 0) return [];

  return [
    conflict(
      'unit-reload-component-removed',
      `Source unit removed live component references: ${unique(removed).join(', ')}.`,
      [unitFieldRef(current.id, 'components')],
    ),
  ];
}

function detectArmorStructureConflicts(
  current: IGmUnitReloadInterventionUnitState,
  source: IGmUnitReloadSourceSnapshot,
): readonly IInterventionConflict[] {
  const armorConflict = detectMissingLocations(
    Object.keys(current.armor),
    source.armorLocations,
    'unit-reload-armor-map-incompatible',
    `Source unit no longer maps live armor locations.`,
    unitFieldRef(current.id, 'armor'),
  );
  const structureConflict = detectMissingLocations(
    Object.keys(current.structure),
    source.structureLocations,
    'unit-reload-structure-map-incompatible',
    `Source unit no longer maps live structure locations.`,
    unitFieldRef(current.id, 'structure'),
  );

  return [...armorConflict, ...structureConflict];
}

function detectAmmoBinConflicts(
  current: IGmUnitReloadInterventionUnitState,
  source: IGmUnitReloadSourceSnapshot,
): readonly IInterventionConflict[] {
  const sourceBinIds = new Set(
    source.ammoBinIds ??
      source.unit.ammoConstruction?.map((bin) => bin.binId) ??
      [],
  );
  if (sourceBinIds.size === 0 && !source.unit.ammoConstruction) return [];

  const removedBins = Object.keys(current.ammoState ?? {}).filter(
    (binId) => !sourceBinIds.has(binId),
  );
  if (removedBins.length === 0) return [];

  return [
    conflict(
      'unit-reload-ammo-bin-removed',
      `Source unit removed live ammo bins: ${removedBins.join(', ')}.`,
      [unitFieldRef(current.id, 'ammoState')],
    ),
  ];
}

function detectMovementProfileConflict(
  input: IGmUnitReloadConflictInput,
): readonly IInterventionConflict[] {
  const before = movementProfileKey(input.sessionUnit);
  const after =
    input.source.movementProfileKey ?? movementProfileKey(input.source.unit);
  if (before === after || !hasCommittedMovementState(input.currentUnit)) {
    return [];
  }

  return [
    conflict(
      'unit-reload-movement-profile-changed',
      `Source unit movement profile changed from "${before}" to "${after}" while live movement state exists.`,
      [unitFieldRef(input.currentUnit.id, 'movement')],
    ),
  ];
}

function detectQueuedTargetConflicts(
  current: IGmUnitReloadInterventionUnitState,
  state: IGmUnitReloadInterventionState,
): readonly IInterventionConflict[] {
  const conflicts: IInterventionConflict[] = [];
  if (current.pendingAction) {
    conflicts.push(
      conflict(
        'unit-reload-pending-action-present',
        'Unit has a pending action that must be reviewed after reload.',
        [unitFieldRef(current.id, 'pendingAction')],
      ),
    );
  }

  const missingTargets = targetRefsForUnit(current).filter(
    (targetId) => !state.units[targetId],
  );
  if (missingTargets.length > 0) {
    conflicts.push(
      conflict(
        'unit-reload-target-ref-invalid',
        `Unit has queued target references that are no longer valid: ${unique(missingTargets).join(', ')}.`,
        [unitFieldRef(current.id, 'targets')],
      ),
    );
  }

  return conflicts;
}

function detectMissingLocations(
  currentLocations: readonly string[],
  sourceLocations: readonly string[] | undefined,
  code: string,
  message: string,
  ref: string,
): readonly IInterventionConflict[] {
  if (!sourceLocations) return [];
  const sourceSet = new Set(sourceLocations);
  const missing = currentLocations.filter(
    (location) => !sourceSet.has(location),
  );
  return missing.length > 0
    ? [conflict(code, `${message} Missing: ${missing.join(', ')}.`, [ref])]
    : [];
}

function hasCommittedMovementState(
  unit: IGmUnitReloadInterventionUnitState,
): boolean {
  return (
    unit.movementThisTurn !== MovementType.Stationary ||
    unit.hexesMovedThisTurn > 0 ||
    unit.lockState !== LockState.Pending ||
    Boolean(unit.pendingAction) ||
    Boolean(unit.pendingConversionStepCount) ||
    Boolean(unit.pendingAltitudeControlStepCount)
  );
}

function movementProfileKey(unit: IGameUnit): string {
  return [
    unit.unitType ?? 'legacy',
    unit.movementMode ?? 'none',
    unit.motionType ?? 'none',
    unit.isQuad ? 'quad' : 'non-quad',
  ].join('|');
}

function targetRefsForUnit(
  unit: IGmUnitReloadInterventionUnitState,
): readonly string[] {
  return [
    unit.designatedTargetId,
    unit.displacementAttackTargetId,
    unit.targetedByDisplacementAttackerId,
    unit.spotTargetId,
    unit.grappledUnitId,
  ].filter((value): value is string => typeof value === 'string');
}

function conflict(
  code: string,
  message: string,
  affectedRefs: readonly string[],
): IInterventionConflict {
  return {
    code,
    message,
    affectedRefs,
    requiresManualTakeover: true,
  };
}

function unitFieldRef(unitId: string, field: string): string {
  return `unit:${unitId}:${field}`;
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}
