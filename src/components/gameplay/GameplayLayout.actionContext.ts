import type { IPlannedMovement } from '@/stores/useGameplayStore.combatFlows';
import type {
  IHex,
  IMovementCapability,
  IMovementRangeHex,
  ITacticalCommandContext,
  IUnitGameState,
} from '@/types/gameplay';
import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import type { ICommandPreviewInputs } from './TacticalActionDock';

interface BuildTacticalActionContextParams {
  readonly selectedUnitId: string | null;
  readonly activeTargetId: string | null;
  readonly commandPreviewInputs: ICommandPreviewInputs;
  readonly movementProjectionByHex: Readonly<Record<string, IMovementRangeHex>>;
  readonly physicalAttackTargetId: string | null;
  readonly physicalAttackOptionsByTargetId: Readonly<
    Record<string, readonly IPhysicalAttackOption[]>
  >;
  readonly phase: ITacticalCommandContext['phase'];
  readonly canAct: boolean;
  readonly selectedUnit: IUnitGameState | null;
  readonly selectedUnitMapHex: IHex | null;
  readonly plannedMovement: IPlannedMovement | null;
  readonly selectedStandUpImpossibleReason: string | undefined;
  readonly optionalRules?: readonly string[];
  readonly selectedMovementCapability: IMovementCapability | null;
}

export function buildTacticalActionContext({
  selectedUnitId,
  activeTargetId,
  commandPreviewInputs,
  movementProjectionByHex,
  physicalAttackTargetId,
  physicalAttackOptionsByTargetId,
  phase,
  canAct,
  selectedUnit,
  selectedUnitMapHex,
  plannedMovement,
  selectedStandUpImpossibleReason,
  optionalRules,
  selectedMovementCapability,
}: BuildTacticalActionContextParams): ITacticalCommandContext {
  return {
    activeUnitId: selectedUnitId,
    selectedUnitId,
    targetUnitId: activeTargetId ?? null,
    targetCombatProjection: getTargetCombatProjection(
      activeTargetId,
      commandPreviewInputs,
    ),
    combatProjectionByTargetId: commandPreviewInputs.combatInfoByTargetId,
    targetMovementProjection: commandPreviewInputs.movementInfo ?? null,
    movementProjectionByHex,
    targetPhysicalAttackOptions: getTargetPhysicalAttackOptions(
      physicalAttackTargetId,
      physicalAttackOptionsByTargetId,
    ),
    physicalAttackOptionsByTargetId,
    hoveredHex: null,
    phase,
    canAct,
    activeUnitProne: selectedUnit?.prone ?? false,
    activeUnitHullDown: selectedUnit?.hullDown ?? false,
    activeUnitLockState: selectedUnit?.lockState,
    activeUnitHeat: selectedUnit?.heat ?? 0,
    activeUnitHasPlannedMovement: hasPlannedMovement(
      plannedMovement,
      selectedUnit,
    ),
    activeUnitHasMASC: selectedUnit?.hasMASC ?? false,
    activeUnitHasSupercharger: selectedUnit?.hasSupercharger ?? false,
    activeUnitVibroClawCount: getVibroClawCount(selectedUnit),
    activeUnitConversionMode: selectedUnit?.conversionMode,
    activeUnitVehicleMotionType: getVehicleMotionType(selectedUnit),
    activeUnitVehicleAltitude: getVehicleAltitude(selectedUnit),
    activeUnitProtoGlider: getProtoGliderState(selectedUnit),
    activeUnitProtoAltitude: getProtoAltitude(selectedUnit),
    activeUnitLamAirMekAltitude: selectedUnit?.lamAirMekAltitude,
    activeUnitTerrain: selectedUnitMapHex?.terrain,
    activeUnitElevation: selectedUnitMapHex?.elevation,
    activeUnitInfantryMounted: selectedUnit?.infantryMounted,
    activeUnitInfantryMountHeight: selectedUnit?.infantryMountHeight,
    activeUnitStandUpImpossibleReason: selectedStandUpImpossibleReason,
    activeUnitComponentDamage: selectedUnit?.componentDamage,
    activeUnitGyroType: selectedUnit?.gyroType,
    activeUnitDestroyedLocations: selectedUnit?.destroyedLocations,
    optionalRules,
    movementCapability: selectedMovementCapability,
  };
}

function getTargetCombatProjection(
  activeTargetId: string | null,
  commandPreviewInputs: ICommandPreviewInputs,
): ITacticalCommandContext['targetCombatProjection'] {
  if (!activeTargetId) return null;
  return (
    commandPreviewInputs.combatInfoByTargetId?.[activeTargetId] ??
    commandPreviewInputs.combatInfo ??
    null
  );
}

function getTargetPhysicalAttackOptions(
  targetUnitId: string | null,
  optionsByTargetId: Readonly<Record<string, readonly IPhysicalAttackOption[]>>,
): readonly IPhysicalAttackOption[] | null {
  if (!targetUnitId) return null;
  return optionsByTargetId[targetUnitId] ?? null;
}

function hasPlannedMovement(
  plannedMovement: IPlannedMovement | null,
  selectedUnit: IUnitGameState | null,
): boolean {
  return Boolean(
    plannedMovement &&
    (!plannedMovement.unitId || plannedMovement.unitId === selectedUnit?.id),
  );
}

// Vibro-claw count for the equipment-reality gate on the vibro-claw
// physical command (0 for non-squads and claw-less squads — the command
// builder drops the button entirely, per battle-armor-combat's
// "UI MUST hide" clause).
function getVibroClawCount(selectedUnit: IUnitGameState | null): number {
  if (selectedUnit?.combatState?.kind !== 'squad') return 0;
  const squad = selectedUnit.combatState.state;
  return squad.hasVibroClaws ? squad.vibroClawCount : 0;
}

function getVehicleMotionType(
  selectedUnit: IUnitGameState | null,
): ITacticalCommandContext['activeUnitVehicleMotionType'] {
  if (selectedUnit?.combatState?.kind !== 'vehicle') return undefined;
  return selectedUnit.combatState.state.motionType;
}

function getVehicleAltitude(
  selectedUnit: IUnitGameState | null,
): number | undefined {
  if (selectedUnit?.combatState?.kind !== 'vehicle') return undefined;
  return selectedUnit.combatState.state.altitude ?? 0;
}

function getProtoGliderState(
  selectedUnit: IUnitGameState | null,
): boolean | undefined {
  if (selectedUnit?.combatState?.kind !== 'proto') return undefined;
  return selectedUnit.combatState.state.chassisType === ProtoChassis.GLIDER;
}

function getProtoAltitude(
  selectedUnit: IUnitGameState | null,
): number | undefined {
  if (selectedUnit?.combatState?.kind !== 'proto') return undefined;
  return selectedUnit.combatState.state.altitude ?? 0;
}
