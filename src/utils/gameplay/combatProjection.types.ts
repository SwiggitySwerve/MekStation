import type {
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

export interface ICombatProjectionInput {
  readonly attacker: IUnitToken | null;
  readonly targetUnitId?: string | null;
  readonly hexes: readonly IHexCoordinate[];
  readonly grid: IHexGrid;
  readonly tokens: readonly IUnitToken[];
  readonly weapons: readonly IWeaponStatus[];
  readonly combatState?: IGameState | null;
}
