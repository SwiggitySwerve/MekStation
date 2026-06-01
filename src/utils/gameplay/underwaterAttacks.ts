import type {
  IAttackInvalidPayload,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay';

import { hexLine } from './hexMath';
import { waterDepthAtPosition } from './waterDepth';

// Source-pinned subset of MegaMek underwater weapon checks:
// ComputeToHit.java treats torpedoes/SRT/LRT as underwater attacks, while
// ComputeToHitIsImpossible.java rejects torpedoes whose LOS leaves water.
export interface IRepresentedWaterWeapon {
  readonly isTorpedo?: boolean;
}

export interface IRepresentedWaterAttackInput<
  TWeapon extends IRepresentedWaterWeapon,
> {
  readonly grid: IHexGrid;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly weapons: readonly TWeapon[];
}

export interface IRepresentedWaterAttackInvalidState {
  readonly reason: IAttackInvalidPayload['reason'];
  readonly details: string;
}

export function isTorpedoWeapon(weapon: IRepresentedWaterWeapon): boolean {
  return weapon.isTorpedo === true;
}

export function isRepresentedUnderwaterTarget(
  grid: IHexGrid,
  position: IHexCoordinate,
): boolean {
  return waterDepthAtPosition(grid, position) > 1;
}

export function isRepresentedWaterTarget(
  grid: IHexGrid,
  position: IHexCoordinate,
): boolean {
  return waterDepthAtPosition(grid, position) > 0;
}

export function representedTorpedoPathLeavesWater({
  grid,
  attackerPosition,
  targetPosition,
}: Pick<
  IRepresentedWaterAttackInput<IRepresentedWaterWeapon>,
  'grid' | 'attackerPosition' | 'targetPosition'
>): boolean {
  return hexLine(attackerPosition, targetPosition).some(
    (coord) => waterDepthAtPosition(grid, coord) < 1,
  );
}

export function representedWaterAttackInvalidStateForWeapon({
  grid,
  attackerPosition,
  targetPosition,
  weapon,
}: Omit<IRepresentedWaterAttackInput<IRepresentedWaterWeapon>, 'weapons'> & {
  readonly weapon: IRepresentedWaterWeapon;
}): IRepresentedWaterAttackInvalidState | undefined {
  const targetIsWater = isRepresentedWaterTarget(grid, targetPosition);
  const targetIsUnderwater = isRepresentedUnderwaterTarget(
    grid,
    targetPosition,
  );

  if (isTorpedoWeapon(weapon)) {
    if (!targetIsWater) {
      return {
        reason: 'InvalidTarget',
        details: 'Weapon can only fire underwater.',
      };
    }
    if (
      representedTorpedoPathLeavesWater({
        grid,
        attackerPosition,
        targetPosition,
      })
    ) {
      return {
        reason: 'InvalidTarget',
        details: 'Torpedo path leaves water.',
      };
    }
    return undefined;
  }

  if (targetIsUnderwater) {
    return {
      reason: 'InvalidTarget',
      details: 'Target underwater, but not weapon.',
    };
  }

  return undefined;
}

export function representedWaterAttackInvalidState<
  TWeapon extends IRepresentedWaterWeapon,
>({
  grid,
  attackerPosition,
  targetPosition,
  weapons,
}: IRepresentedWaterAttackInput<TWeapon>):
  | IRepresentedWaterAttackInvalidState
  | undefined {
  if (weapons.length === 0) return undefined;

  let firstInvalid: IRepresentedWaterAttackInvalidState | undefined;
  for (const weapon of weapons) {
    const invalid = representedWaterAttackInvalidStateForWeapon({
      grid,
      attackerPosition,
      targetPosition,
      weapon,
    });
    if (!invalid) return undefined;
    firstInvalid ??= invalid;
  }

  return firstInvalid;
}

export function weaponPassesRepresentedWaterAttackRules(
  input: Omit<
    IRepresentedWaterAttackInput<IRepresentedWaterWeapon>,
    'weapons'
  > & {
    readonly weapon: IRepresentedWaterWeapon;
  },
): boolean {
  return representedWaterAttackInvalidStateForWeapon(input) === undefined;
}
