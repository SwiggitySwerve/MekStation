import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackPlan,
  IPlannedMovement,
} from '@/stores/useGameplayStore.combatFlowTypes';
import type { ISelectedUnitProjection } from '@/stores/useGameplayStore.selectors';
import type {
  IAttackerState,
  IGameSession,
  IHexCoordinate,
  ITargetState,
  WeaponFireMode,
} from '@/types/gameplay';
import type { IForecastInput } from '@/utils/gameplay/toHit/forecast';

import { MovementType } from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';

interface MovementPlanMetrics {
  readonly movementType: MovementType;
  readonly mpCost: number;
  readonly jumpHexes?: number;
}

export function createMovementPlan(
  movementType: MovementType,
  selected: ISelectedUnitProjection | null,
): IPlannedMovement | null {
  if (!selected) return null;

  return {
    unitId: selected.id,
    destination: selected.state.position,
    facing: selected.state.facing,
    movementType,
    path: [],
  };
}

export function isMovementPlanReady(
  plannedMovement: IPlannedMovement | null,
  selected: ISelectedUnitProjection | null,
): boolean {
  if (!plannedMovement || !selected) return false;
  return !sameHex(plannedMovement.destination, selected.state.position);
}

export function movementPlanMetrics(
  plannedMovement: IPlannedMovement | null,
): MovementPlanMetrics {
  const movementType = plannedMovement?.movementType ?? MovementType.Walk;
  const mpCost = plannedMovement?.mpCost ?? plannedMovement?.path.length ?? 0;

  return {
    movementType,
    mpCost,
    jumpHexes: movementType === MovementType.Jump ? mpCost : undefined,
  };
}

export function selectedWeaponModesForUnit(
  weaponModesByUnitId: Record<string, Readonly<Record<string, WeaponFireMode>>>,
  selected: ISelectedUnitProjection | null,
): Readonly<Record<string, WeaponFireMode>> {
  if (!selected) return {};
  return weaponModesByUnitId[selected.id] ?? {};
}

export function rangeToAttackTarget(
  selected: ISelectedUnitProjection | null,
  targetUnitId: string | null,
  session: IGameSession | null,
): number {
  if (!selected || !targetUnitId || !session) return 0;

  const targetState = session.currentState.units[targetUnitId];
  if (!targetState) return 0;

  return hexDistance(
    selected.state.position as IHexCoordinate,
    targetState.position as IHexCoordinate,
  );
}

export function attackerStateForSelected(
  selected: ISelectedUnitProjection | null,
): IAttackerState | null {
  if (!selected) return null;

  return {
    gunnery: selected.unit.gunnery,
    movementType: selected.state.movementThisTurn,
    heat: selected.state.heat,
    damageModifiers: [],
  };
}

export function targetStateForAttackPlan(
  targetUnitId: string | null,
  session: IGameSession | null,
): ITargetState | null {
  if (!targetUnitId || !session) return null;

  const targetState = session.currentState.units[targetUnitId];
  if (!targetState) return null;

  return {
    movementType: targetState.movementThisTurn,
    hexesMoved: targetState.hexesMovedThisTurn,
    prone: targetState.prone ?? false,
    immobile: false,
    partialCover: false,
  };
}

export function forecastWeaponsForPlan(
  weapons: readonly IWeapon[],
  attackPlan: IAttackPlan,
): readonly IForecastInput[] {
  return weapons
    .filter((weapon) => attackPlan.selectedWeapons.includes(weapon.id))
    .map(weaponToForecastInput);
}

function weaponToForecastInput(weapon: IWeapon): IForecastInput {
  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    minRange: weapon.minRange,
    shortRange: weapon.shortRange,
    mediumRange: weapon.mediumRange,
    longRange: weapon.longRange,
  };
}

function sameHex(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}
