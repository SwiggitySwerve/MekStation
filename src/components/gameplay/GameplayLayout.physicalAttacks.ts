import type { IGameSession, IHexGrid } from '@/types/gameplay';
import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import { GamePhase, MovementType } from '@/types/gameplay';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { getEligiblePhysicalAttacks } from '@/utils/gameplay/physicalAttacks/eligibility';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';

interface BuildPhysicalAttackOptionsParams {
  readonly currentState: IGameSession['currentState'];
  readonly unitBindings: IGameSession['units'];
  readonly selectedUnitId: string | null;
  readonly optionalRules?: readonly string[];
  readonly combatGrid: IHexGrid | null;
}

export function buildPhysicalAttackOptionsByTargetId({
  currentState,
  unitBindings,
  selectedUnitId,
  optionalRules,
  combatGrid,
}: BuildPhysicalAttackOptionsParams): Readonly<
  Record<string, readonly IPhysicalAttackOption[]>
> {
  if (currentState.phase !== GamePhase.PhysicalAttack || !selectedUnitId) {
    return {};
  }

  const attackerState = currentState.units[selectedUnitId] ?? null;
  const attackerBinding = unitBindings.find(
    (unit) => unit.id === selectedUnitId,
  );
  if (!attackerState) return {};

  return Object.entries(currentState.units)
    .filter(([, targetState]) => targetState.side !== attackerState.side)
    .filter(([, targetState]) => !targetState.destroyed)
    .reduce<Record<string, readonly IPhysicalAttackOption[]>>(
      (byTargetId, [targetId, targetState]) => {
        const targetBinding = unitBindings.find((unit) => unit.id === targetId);
        byTargetId[targetId] = getEligiblePhysicalAttacks(
          attackerState,
          targetState,
          {
            attackerTonnage: 65,
            attackerPilotingSkill:
              attackerState.piloting ?? attackerBinding?.piloting ?? 5,
            targetTonnage: 65,
            attackerUnitType: attackerBinding?.unitType,
            attackerMovementMode: attackerBinding?.movementMode,
            optionalRules,
            targetUnitType: targetBinding?.unitType,
            weaponsFiredFromLeftArm: attackerState.weaponsFiredThisTurn,
            weaponsFiredFromRightArm: attackerState.weaponsFiredThisTurn,
            attackerRanThisTurn:
              attackerState.movementThisTurn === MovementType.Run,
            attackerJumpedThisTurn:
              attackerState.movementThisTurn === MovementType.Jump,
            elevationContext: buildElevationContext(
              attackerState,
              targetState,
              combatGrid,
              targetBinding,
            ),
            terrainContext: buildTerrainContext(
              attackerState,
              targetState,
              combatGrid,
            ),
          },
        );
        return byTargetId;
      },
      {},
    );
}

export function deriveValidPhysicalTargetIds(
  optionsByTargetId: Readonly<Record<string, readonly IPhysicalAttackOption[]>>,
): string[] {
  return Object.entries(optionsByTargetId)
    .filter(([, options]) =>
      options.some(
        (option) =>
          option.toHit.allowed && option.restrictionsFailed.length === 0,
      ),
    )
    .map(([unitId]) => unitId);
}

function buildElevationContext(
  attackerState: IGameSession['currentState']['units'][string],
  targetState: IGameSession['currentState']['units'][string],
  combatGrid: IHexGrid | null,
  targetBinding: IGameSession['units'][number] | undefined,
): ReturnType<typeof buildPhysicalElevationContext> | undefined {
  if (!combatGrid) return undefined;
  return buildPhysicalElevationContext(attackerState, targetState, combatGrid, {
    targetUnit: targetBinding,
  });
}

function buildTerrainContext(
  attackerState: IGameSession['currentState']['units'][string],
  targetState: IGameSession['currentState']['units'][string],
  combatGrid: IHexGrid | null,
): ReturnType<typeof buildPhysicalTerrainContext> | undefined {
  if (!combatGrid) return undefined;
  return buildPhysicalTerrainContext(attackerState, targetState, combatGrid);
}
