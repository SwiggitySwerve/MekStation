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
import type {
  IForecastInput,
  IToHitForecastOptions,
} from '@/utils/gameplay/toHit/forecast';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { MovementType } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { selectCombatProjectionWeapons } from '@/utils/gameplay/combatProjection.weaponSelection';
import { getECMProtectedFlag } from '@/utils/gameplay/electronicWarfare';
import { isSemiGuidedLRM } from '@/utils/gameplay/specialWeaponMechanics';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from '@/utils/gameplay/toHit/stateHydration';

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

type EcmAwareTargetState = IGameSession['currentState']['units'][string] & {
  readonly ecmProtected?: boolean;
};

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
  weapon?: Pick<IForecastInput, 'weaponId' | 'weaponName'>,
): IAttackerState | null {
  if (!selected) return null;

  return buildWeaponAttackAttackerToHitState(
    selected.state,
    selected.unit.gunnery,
    weapon
      ? {
          id: weapon.weaponId,
          name: weapon.weaponName,
        }
      : undefined,
    undefined,
  );
}

export function targetStateForAttackPlan(
  targetUnitId: string | null,
  session: IGameSession | null,
  targetPartialCover = false,
): ITargetState | null {
  if (!targetUnitId || !session) return null;

  const targetState = session.currentState.units[targetUnitId];
  if (!targetState) return null;

  return buildWeaponAttackTargetToHitState(targetState, targetPartialCover);
}

export function forecastOptionsForAttackPlan({
  isIndirectFire,
  indirectFirePenalty,
  selected,
  session,
  targetUnitId,
}: {
  readonly isIndirectFire: boolean;
  readonly indirectFirePenalty?: number;
  readonly selected: ISelectedUnitProjection | null;
  readonly session: IGameSession | null;
  readonly targetUnitId: string | null;
}): IToHitForecastOptions | undefined {
  if (!selected || !session || !targetUnitId) return undefined;
  const targetUnit = session.currentState.units[targetUnitId];
  if (!targetUnit) return undefined;

  const targetEcmProtected = session.currentState.electronicWarfare
    ? getECMProtectedFlag(
        selected.state.position,
        selected.state.side as string,
        selected.id,
        targetUnit.position,
        targetUnit.side as string,
        targetUnitId,
        session.currentState.electronicWarfare,
      )
    : (targetUnit as EcmAwareTargetState).ecmProtected;

  return {
    attackerForWeapon: (weapon) =>
      buildWeaponAttackAttackerToHitState(
        selected.state,
        selected.unit.gunnery,
        { id: weapon.weaponId, name: weapon.weaponName },
        targetUnitId,
      ),
    semiGuidedTagContext: (weapon) => ({
      isSemiGuided:
        isSemiGuidedLRM(weapon.weaponId) || isSemiGuidedLRM(weapon.weaponName),
      targetTagDesignated: targetUnit.tagDesignated,
      targetEcmProtected,
      isIndirectFire,
      indirectFirePenalty: indirectFirePenalty ?? 0,
    }),
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
