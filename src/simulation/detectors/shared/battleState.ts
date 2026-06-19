import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

export interface BasicBattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
}

export interface BasicBattleState<
  TUnit extends BasicBattleUnit = BasicBattleUnit,
> {
  readonly units: readonly TUnit[];
}

export function countOperationalUnits<TUnit extends BasicBattleUnit>(
  units: readonly TUnit[],
  destroyedUnits: Set<string>,
  side: GameSide,
): number {
  let count = 0;
  for (const unit of units) {
    if (unit.side === side && !destroyedUnits.has(unit.id)) count++;
  }
  return count;
}

export function getUnitName(
  units: readonly BasicBattleUnit[],
  unitId: string,
): string {
  return units.find((unit) => unit.id === unitId)?.name ?? unitId;
}

export function getUnitSide(
  units: readonly BasicBattleUnit[],
  unitId: string,
): GameSide | undefined {
  return units.find((unit) => unit.id === unitId)?.side;
}
