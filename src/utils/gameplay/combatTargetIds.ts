import type {
  IGameSession,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import { deriveCombatRangeHexes } from './combatProjection';
import { selectCombatProjectionWeapons } from './combatProjection.weaponSelection';
import { hexesInRange } from './hexMath';

export interface IDeriveValidWeaponTargetIdsParams {
  readonly currentState: IGameSession['currentState'];
  readonly selectedUnitId: string | null;
  readonly tokens: readonly IUnitToken[];
  readonly mapRadius: number;
  readonly grid: IHexGrid | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
}

export function deriveValidWeaponTargetIds({
  currentState,
  selectedUnitId,
  tokens,
  mapRadius,
  grid,
  unitWeapons,
  selectedWeaponIds,
}: IDeriveValidWeaponTargetIdsParams): readonly string[] {
  if (
    currentState.phase !== GamePhase.WeaponAttack ||
    !selectedUnitId ||
    !grid
  ) {
    return [];
  }

  const attacker = tokens.find((token) => token.unitId === selectedUnitId);
  if (!attacker) return [];

  const targetIds = new Set<string>();
  const projectedWeapons = selectCombatProjectionWeapons(
    unitWeapons[selectedUnitId] ?? [],
    selectedWeaponIds,
  );
  for (const projection of deriveCombatRangeHexes({
    attacker,
    hexes: hexesInRange({ q: 0, r: 0 }, mapRadius),
    grid,
    tokens,
    weapons: projectedWeapons,
    combatState: currentState,
  })) {
    for (const targetId of projection.validTargetUnitIds) {
      targetIds.add(targetId);
    }
  }

  return Array.from(targetIds);
}
