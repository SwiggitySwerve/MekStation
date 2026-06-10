import type {
  IGameSession,
  IHexCoordinate,
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
  /**
   * Audit 2026-06-09 G (W5.1a): per-session fog contact memory,
   * threaded in by the host component (GameplayLayout keeps it in a
   * ref keyed by session id). While a fogged enemy is VISIBLE its
   * position is recorded here; once it drops out of sensor/visual
   * range the ghost token freezes at that last OBSERVED hex instead
   * of leaking the live position every render. Optional so legacy
   * callers without a memory map keep the old live-position fallback.
   */
  readonly fogContactMemory?: Map<string, IHexCoordinate>;
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
    // Fog contact memory (audit 2026-06-09 G, W5.1a): record the
    // position of every currently-visible fogged enemy; when the
    // contact is later hidden, freeze the ghost at the last OBSERVED
    // hex. A never-observed contact has no memory entry and falls
    // back to its live position (matches the legacy deployment-intel
    // behavior and callers that pass no memory map).
    if (isFogActive && !isOwnedSide && isVisibleEnemy) {
      params.fogContactMemory?.set(unitId, state.position);
    }
    const fogProjection = isFogActive
      ? isOwnedSide
        ? { sensorRange: DEFAULT_FOG_SENSOR_RANGE }
        : isVisibleEnemy
          ? {}
          : {
              fogStatus: 'lastKnown' as const,
              lastKnownPosition:
                params.fogContactMemory?.get(unitId) ?? state.position,
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
