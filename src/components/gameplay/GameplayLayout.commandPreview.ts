import type {
  IGameSession,
  IGameUnit,
  IHexCoordinate,
  IHexGrid,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { GamePhase, MovementType } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';

import type { ICommandPreviewInputs } from './TacticalActionDock';

import { generateHexesInRadius } from './HexMapDisplay/renderHelpers';

export interface IBuildCommandPreviewInputsParams {
  readonly currentState: IGameSession['currentState'];
  readonly selectedUnitId: string | null;
  readonly activeTargetId: string | null;
  readonly tokens: readonly IUnitToken[];
  readonly unitBindings: readonly IGameUnit[];
  readonly mapRadius: number;
  readonly grid: IHexGrid | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly hitChance: number | null | undefined;
  readonly physicalAttackTargetId?: string | null;
  readonly physicalAttackType?: PhysicalAttackType | null;
  readonly physicalAttackLimb?: PhysicalAttackLimb | null;
  readonly hoveredHex?: IHexCoordinate | null;
  readonly movementInfo?: IMovementRangeHex;
  readonly highlightPath?: readonly IHexCoordinate[];
  readonly hoverMpCost?: number;
  readonly hoverUnreachable?: boolean;
}

export function buildCommandPreviewInputs({
  currentState,
  selectedUnitId,
  activeTargetId,
  tokens,
  unitBindings,
  mapRadius,
  grid,
  unitWeapons,
  hitChance,
  physicalAttackTargetId,
  physicalAttackType,
  physicalAttackLimb,
  hoveredHex,
  movementInfo,
  highlightPath,
  hoverMpCost,
  hoverUnreachable,
}: IBuildCommandPreviewInputsParams): ICommandPreviewInputs {
  const weaponStatuses = selectedUnitId
    ? (unitWeapons[selectedUnitId] ?? [])
    : undefined;
  const baseInputs: ICommandPreviewInputs = {
    weaponStatuses,
    hitChance,
    ...(movementInfo ? { movementInfo } : {}),
    ...(highlightPath ? { highlightPath } : {}),
    ...(hoverMpCost !== undefined ? { hoverMpCost } : {}),
    ...(hoverUnreachable !== undefined ? { hoverUnreachable } : {}),
  };
  if (
    currentState.phase === GamePhase.PhysicalAttack &&
    selectedUnitId &&
    physicalAttackTargetId &&
    physicalAttackType
  ) {
    const attackerState = currentState.units[selectedUnitId] ?? null;
    const targetState = currentState.units[physicalAttackTargetId] ?? null;
    const attackerBinding = unitBindings.find(
      (unit) => unit.id === selectedUnitId,
    );
    const targetBinding = unitBindings.find(
      (unit) => unit.id === physicalAttackTargetId,
    );
    const physicalOptions = getEligiblePhysicalAttacks(
      attackerState,
      targetState,
      {
        attackerTonnage: 65,
        attackerPilotingSkill:
          attackerState?.piloting ?? attackerBinding?.piloting ?? 5,
        targetTonnage: 65,
        weaponsFiredFromLeftArm: attackerState?.weaponsFiredThisTurn,
        weaponsFiredFromRightArm: attackerState?.weaponsFiredThisTurn,
        attackerRanThisTurn:
          attackerState?.movementThisTurn === MovementType.Run,
        attackerJumpedThisTurn:
          attackerState?.movementThisTurn === MovementType.Jump,
        elevationContext:
          attackerState && targetState && grid
            ? buildPhysicalElevationContext(attackerState, targetState, grid, {
                targetUnit: targetBinding,
              })
            : undefined,
      },
    );
    const physicalAttackOption =
      physicalOptions.find(
        (option) =>
          option.attackType === physicalAttackType &&
          (physicalAttackLimb === undefined ||
            physicalAttackLimb === null ||
            option.limb === physicalAttackLimb),
      ) ??
      physicalOptions.find(
        (option) => option.attackType === physicalAttackType,
      );

    return {
      ...baseInputs,
      physicalTargetUnitId: physicalAttackTargetId,
      physicalAttackType,
      physicalAttackLimb,
      ...(physicalAttackOption ? { physicalAttackOption } : {}),
    };
  }

  if (
    currentState.phase !== GamePhase.WeaponAttack ||
    !grid ||
    !selectedUnitId ||
    (!activeTargetId && !hoveredHex)
  ) {
    return baseInputs;
  }

  const attacker = tokens.find((token) => token.unitId === selectedUnitId);
  if (!attacker) return baseInputs;

  const target = activeTargetId
    ? tokens.find((token) => token.unitId === activeTargetId)
    : undefined;
  const targetKey = target ? coordToKey(target.position) : null;
  const hoveredKey = hoveredHex ? coordToKey(hoveredHex) : null;
  const projections = deriveCombatRangeHexes({
    attacker,
    targetUnitId: activeTargetId,
    hexes: generateHexesInRadius(mapRadius),
    grid,
    tokens,
    weapons: weaponStatuses ?? [],
    combatState: currentState,
  });
  const targetCombatInfo = activeTargetId
    ? projections.find(
        (projection) =>
          projection.targetUnitIds.includes(activeTargetId) ||
          projection.validTargetUnitIds.includes(activeTargetId) ||
          (targetKey !== null && coordToKey(projection.hex) === targetKey),
      )
    : undefined;
  const hoverCombatInfo =
    !targetCombatInfo && hoveredKey
      ? projections.find(
          (projection) => coordToKey(projection.hex) === hoveredKey,
        )
      : undefined;
  const combatInfo = targetCombatInfo ?? hoverCombatInfo;

  return { ...baseInputs, combatInfo };
}
