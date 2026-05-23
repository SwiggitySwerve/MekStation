import { IGameState, IHexGrid, IPhysicalDisplacement } from '@/types/gameplay';
import {
  computeDfaDisplacements,
  computeMissedChargeDisplacement,
  computePushDisplacement,
  isValidDisplacement,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

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

export function computePhysicalDisplacements(options: {
  grid?: IHexGrid;
  attackType: PhysicalAttackType;
  attacker: IGameState['units'][string];
  target: IGameState['units'][string];
  hit: boolean;
  d6Roller: () => number;
}): readonly IPhysicalDisplacement[] {
  const { attackType, attacker, d6Roller, grid, hit, target } = options;
  if (!grid) return [];

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
      return [];
    }
    return [
      {
        unitId: attacker.id,
        from: attacker.position,
        to: destination,
        reason: 'charge_miss',
      },
    ];
  }

  if (attackType === 'dfa') {
    return computeDfaDisplacements({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      hit,
    });
  }

  if (!hit || (attackType !== 'push' && attackType !== 'charge')) return [];

  const targetDestination = computePushDisplacement(
    target.position,
    attacker.facing,
  );
  if (!isValidDisplacement(grid, targetDestination, target.id)) return [];

  return [
    {
      unitId: target.id,
      from: target.position,
      to: targetDestination,
      reason: attackType,
    },
    {
      unitId: attacker.id,
      from: attacker.position,
      to: target.position,
      reason: attackType,
    },
  ];
}
