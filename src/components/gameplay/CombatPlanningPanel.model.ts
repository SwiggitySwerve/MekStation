import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackPlan,
  IPlannedMovement,
} from '@/stores/useGameplayStore.combatFlowTypes';
import type { ISelectedUnitProjection } from '@/stores/useGameplayStore.selectors';
import type {
  ICombatRangeHex,
  IAttackerState,
  IGameSession,
  IHexGrid,
  IHexCoordinate,
  ITargetState,
  IUnitToken,
  IWeaponStatus,
  WeaponFireMode,
} from '@/types/gameplay';
import type { IForecastInput } from '@/utils/gameplay/toHit/forecast';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { MovementType } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { selectCombatProjectionWeapons } from '@/utils/gameplay/combatProjection.weaponSelection';

interface MovementPlanMetrics {
  readonly movementType: MovementType;
  readonly mpCost: number;
  readonly jumpHexes?: number;
}

interface AttackTargetProjectionInput {
  readonly selected: ISelectedUnitProjection | null;
  readonly targetUnitId: string | null;
  readonly session: IGameSession | null;
  readonly grid: IHexGrid | null;
  readonly unitWeaponStatuses: readonly IWeaponStatus[];
  readonly selectedWeaponIds?: readonly string[];
  readonly combatProjectionByTargetId?: Readonly<
    Record<string, ICombatRangeHex>
  >;
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

export function combatProjectionForAttackTarget({
  selected,
  targetUnitId,
  session,
  grid,
  unitWeaponStatuses,
  selectedWeaponIds,
  combatProjectionByTargetId,
}: AttackTargetProjectionInput): ICombatRangeHex | null {
  if (!targetUnitId) return null;

  const lookupProjection = combatProjectionByTargetId?.[targetUnitId];
  if (lookupProjection) return lookupProjection;

  if (!selected || !session || !grid) return null;

  const targetState = session.currentState.units[targetUnitId];
  if (!targetState) return null;

  const tokens = buildCombatProjectionTokens({
    selectedUnitId: selected.id,
    targetUnitId,
    session,
  });
  const attacker = tokens.find((token) => token.unitId === selected.id);
  if (!attacker) return null;

  return (
    deriveCombatRangeHexes({
      attacker,
      targetUnitId,
      hexes: [targetState.position as IHexCoordinate],
      grid,
      tokens,
      weapons: selectCombatProjectionWeapons(
        unitWeaponStatuses,
        selectedWeaponIds,
      ),
      combatState: session.currentState,
    })[0] ?? null
  );
}

export function rangeToAttackTarget(
  input: AttackTargetProjectionInput,
): number {
  return combatProjectionForAttackTarget(input)?.distance ?? 0;
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

function buildCombatProjectionTokens({
  selectedUnitId,
  targetUnitId,
  session,
}: {
  readonly selectedUnitId: string;
  readonly targetUnitId: string;
  readonly session: IGameSession;
}): readonly IUnitToken[] {
  return Object.entries(session.currentState.units).map(([unitId, state]) => {
    const unit = session.units.find((candidate) => candidate.id === unitId);
    return unitStateToToken(
      unitId,
      state,
      {
        name: unit?.name ?? unitId,
        side: unit?.side ?? state.side,
      },
      {
        isSelected: unitId === selectedUnitId,
        isActiveTarget: unitId === targetUnitId,
        isValidTarget: unitId === targetUnitId,
      },
    );
  });
}
