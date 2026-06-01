import type {
  IGameSession,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { GamePhase, GameSide } from '@/types/gameplay';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';

const DEFAULT_FOG_SENSOR_RANGE = 10;

export function buildUnitInfoLookup(
  units: IGameSession['units'],
): Record<string, { name: string; side: GameSide }> {
  const lookup: Record<string, { name: string; side: GameSide }> = {};
  for (const unit of units) {
    lookup[unit.id] = { name: unit.name, side: unit.side };
  }
  return lookup;
}

export function buildEventActorLookup(
  units: IGameSession['units'],
): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const unit of units) {
    lookup[unit.id] = unit.unitRef || unit.name;
  }
  return lookup;
}

export function buildEventWeaponLookup(
  unitWeapons: Record<string, readonly IWeaponStatus[]>,
): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const weapons of Object.values(unitWeapons)) {
    for (const weapon of weapons) {
      lookup[weapon.id] = weapon.name;
    }
  }
  return lookup;
}

export function buildGameplayTokens(params: {
  readonly currentState: IGameSession['currentState'];
  readonly config: IGameSession['config'];
  readonly session: IGameSession;
  readonly unitInfoLookup: Record<string, { name: string; side: GameSide }>;
  readonly selectedUnitId: string | null;
  readonly validTargetIds: readonly string[];
  readonly activeTargetId: string | null;
  readonly validPhysicalTargetIds?: readonly string[];
  readonly activePhysicalTargetId?: string | null;
  readonly playerSide: GameSide;
  readonly localFogPlayerId: string;
  readonly visibilityState: IGameSession['currentState'] & {
    readonly sideOwners: IGameSession['sideOwners'] | null;
    readonly grid?: IHexGrid;
  };
}): IUnitToken[] {
  return Object.entries(params.currentState.units).map(([unitId, state]) => {
    const unitInfo = params.unitInfoLookup[unitId] || {
      name: 'Unknown',
      side: GameSide.Player,
    };
    const isSelected = unitId === params.selectedUnitId;
    const isFogActive = params.config.fogOfWar === true;
    const isOwnedSide = unitInfo.side === params.playerSide;
    const isVisibleEnemy = canPlayerSeeUnit(
      params.localFogPlayerId,
      unitId,
      params.visibilityState,
    );
    const isHidden = isFogActive && !isOwnedSide && !isVisibleEnemy;
    const canBeTargetedByViewer = !isHidden && !state.destroyed;
    const isValidTarget =
      canBeTargetedByViewer &&
      (params.validTargetIds.includes(unitId) ||
        params.validPhysicalTargetIds?.includes(unitId));
    const isActiveTarget =
      canBeTargetedByViewer &&
      ((params.currentState.phase === GamePhase.WeaponAttack &&
        params.activeTargetId !== null &&
        unitId === params.activeTargetId) ||
        (params.currentState.phase === GamePhase.PhysicalAttack &&
          params.activePhysicalTargetId !== null &&
          unitId === params.activePhysicalTargetId));
    const fogProjection = isFogActive
      ? isOwnedSide
        ? { sensorRange: DEFAULT_FOG_SENSOR_RANGE }
        : isVisibleEnemy
          ? {}
          : {
              fogStatus: 'lastKnown' as const,
              lastKnownPosition: state.position,
            }
      : {};

    return unitStateToToken(
      unitId,
      state,
      unitInfo,
      { isSelected, isValidTarget, isActiveTarget },
      fogProjection,
      isHidden,
    );
  });
}
