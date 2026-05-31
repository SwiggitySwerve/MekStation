import { IGameState, IHexGrid, IPhysicalDisplacement } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  computeChargeDisplacementOutcome,
  computeBreakGrappleDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDisplacementWithDominoChain,
  computeMissedChargeDisplacement,
  computePushDisplacementOutcome,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

interface IPhysicalDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
}

export function elevationDifferenceBetween(
  grid: IHexGrid | undefined,
  attacker: IGameState['units'][string],
  target: IGameState['units'][string],
): number {
  if (!grid) return 0;
  const attackerHex = grid.hexes.get(
    `${attacker.position.q},${attacker.position.r}`,
  );
  const targetHex = grid.hexes.get(`${target.position.q},${target.position.r}`);
  return (targetHex?.elevation ?? 0) - (attackerHex?.elevation ?? 0);
}

export function displaceUnit(
  state: IGameState,
  unitId: string,
  to: IPhysicalDisplacement['to'],
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        position: to,
      },
    },
  };
}

export function applyPhysicalDisplacementsToGrid(
  grid: IHexGrid | undefined,
  displacements: readonly IPhysicalDisplacement[],
): IHexGrid | undefined {
  if (!grid || displacements.length === 0) return grid;

  let nextGrid = grid;
  for (const displacement of displacements) {
    const fromKey = coordToKey(displacement.from);
    const toKey = coordToKey(displacement.to);
    const hexes = new Map(nextGrid.hexes);
    const fromHex = hexes.get(fromKey);
    const toHex = hexes.get(toKey);

    if (fromHex?.occupantId === displacement.unitId) {
      hexes.set(fromKey, { ...fromHex, occupantId: null });
    }
    if (toHex) {
      hexes.set(toKey, { ...toHex, occupantId: displacement.unitId });
    }

    nextGrid = { ...nextGrid, hexes };
  }

  return nextGrid;
}

export function computePhysicalDisplacements(options: {
  grid?: IHexGrid;
  attackType: PhysicalAttackType;
  attacker: IGameState['units'][string];
  target: IGameState['units'][string];
  hit: boolean;
  d6Roller: () => number;
  targetFriendlyUnitIds?: readonly string[];
  targetSourceContainsGroundedDropShip?: boolean;
}): readonly IPhysicalDisplacement[] {
  return computePhysicalDisplacementOutcome(options).displacements;
}

export function computePhysicalDisplacementOutcome(options: {
  grid?: IHexGrid;
  attackType: PhysicalAttackType;
  attacker: IGameState['units'][string];
  target: IGameState['units'][string];
  hit: boolean;
  d6Roller: () => number;
  targetFriendlyUnitIds?: readonly string[];
  targetSourceContainsGroundedDropShip?: boolean;
}): IPhysicalDisplacementOutcome {
  const {
    attackType,
    attacker,
    d6Roller,
    grid,
    hit,
    target,
    targetFriendlyUnitIds,
  } = options;
  if (!grid) return { displacements: [] };

  if (!hit && attackType === 'charge') {
    const destination = computeMissedChargeDisplacement(
      grid,
      attacker.id,
      attacker.position,
      attacker.facing,
      d6Roller,
    );
    if (
      destination.q === attacker.position.q &&
      destination.r === attacker.position.r
    ) {
      return { displacements: [] };
    }
    const missedChargeDisplacements = computeDisplacementWithDominoChain({
      grid,
      unitId: attacker.id,
      from: attacker.position,
      to: destination,
      reason: 'charge_miss',
    });
    return {
      displacements: missedChargeDisplacements ?? [],
    };
  }

  if (attackType === 'dfa') {
    return computeDfaDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      hit,
      targetFriendlyUnitIds,
      targetSourceContainsGroundedDropShip:
        options.targetSourceContainsGroundedDropShip,
    });
  }

  if (hit && attackType === 'charge') {
    return computeChargeDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
    });
  }

  if (hit && attackType === 'break-grapple') {
    return computeBreakGrappleDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      targetId: target.id,
      attackerPosition: attacker.position,
      targetPosition: target.position,
      attackerIsGrappleAttacker: attacker.isGrappleAttacker,
    });
  }

  if (!hit || attackType !== 'push') {
    return { displacements: [] };
  }

  return computePushDisplacementOutcome({
    grid,
    attackerId: attacker.id,
    attackerPosition: attacker.position,
    attackerFacing: attacker.facing,
    targetId: target.id,
    targetPosition: target.position,
  });
}
