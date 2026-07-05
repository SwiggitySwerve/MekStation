import type {
  IGameSession,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import {
  unitStateToToken,
  type IFogProjection,
  type IUnitStateToTokenFlags,
} from '@/lib/gameplay/unitStateToToken';
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

interface ITokenVisibility {
  readonly isHidden: boolean;
  readonly isOwnedSide: boolean;
  readonly isVisibleEnemy: boolean;
  readonly canBeTargetedByViewer: boolean;
}

export interface IBuildGameplayTokensParams {
  readonly currentState: IGameSession['currentState'];
  readonly config: IGameSession['config'];
  readonly session: IGameSession;
  readonly unitInfoLookup: Record<string, { name: string; side: GameSide }>;
  readonly selectedUnitId: string | null;
  readonly validTargetIds: readonly string[];
  readonly activeTargetId: string | null;
  readonly validPhysicalTargetIds?: readonly string[];
  readonly activePhysicalTargetId?: string | null;
  /**
   * Composed-volley secondary targets (attack-phase-intent-composer, D6):
   * enemies carrying at least one weapon assignment beyond the primary.
   * The primary rides `activeTargetId` (the caller rebinds it to the
   * composer's primary while the composer is active).
   */
  readonly secondaryTargetIds?: readonly string[];
  /**
   * At-source feasibility while composing (twist-aware): unit id → the
   * rules-backed reason NO weapon of the composing unit can engage it.
   */
  readonly attackInfeasibleReasonByUnitId?: Readonly<Record<string, string>>;
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
}

function deriveTokenVisibility(
  params: IBuildGameplayTokensParams,
  unitId: string,
  unitInfo: { readonly name: string; readonly side: GameSide },
  state: IGameSession['currentState']['units'][string],
): ITokenVisibility {
  const isFogActive = params.config.fogOfWar === true;
  const isOwnedSide = unitInfo.side === params.playerSide;
  const isVisibleEnemy = canPlayerSeeUnit(
    params.localFogPlayerId,
    unitId,
    params.visibilityState,
  );
  const isHidden = isFogActive && !isOwnedSide && !isVisibleEnemy;
  return {
    isHidden,
    isOwnedSide,
    isVisibleEnemy,
    canBeTargetedByViewer: !isHidden && !state.destroyed,
  };
}

function recordVisibleFogContact(
  params: IBuildGameplayTokensParams,
  unitId: string,
  state: IGameSession['currentState']['units'][string],
  visibility: ITokenVisibility,
): void {
  if (
    params.config.fogOfWar === true &&
    !visibility.isOwnedSide &&
    visibility.isVisibleEnemy
  ) {
    params.fogContactMemory?.set(unitId, state.position);
  }
}

function buildFogProjection(
  params: IBuildGameplayTokensParams,
  unitId: string,
  state: IGameSession['currentState']['units'][string],
  visibility: ITokenVisibility,
): IFogProjection {
  if (params.config.fogOfWar !== true) return {};
  if (visibility.isOwnedSide) return { sensorRange: DEFAULT_FOG_SENSOR_RANGE };
  if (visibility.isVisibleEnemy) return {};
  return {
    fogStatus: 'lastKnown',
    lastKnownPosition: params.fogContactMemory?.get(unitId) ?? state.position,
  };
}

function isActiveTokenTarget(
  params: IBuildGameplayTokensParams,
  unitId: string,
  canBeTargetedByViewer: boolean,
): boolean {
  if (!canBeTargetedByViewer) return false;
  if (params.currentState.phase === GamePhase.WeaponAttack) {
    return params.activeTargetId !== null && unitId === params.activeTargetId;
  }
  if (params.currentState.phase === GamePhase.PhysicalAttack) {
    return (
      params.activePhysicalTargetId !== null &&
      unitId === params.activePhysicalTargetId
    );
  }
  return false;
}

function buildTokenFlags(
  params: IBuildGameplayTokensParams,
  unitId: string,
  unitInfo: { readonly name: string; readonly side: GameSide },
  visibility: ITokenVisibility,
): IUnitStateToTokenFlags {
  const isValidTarget =
    visibility.canBeTargetedByViewer &&
    (params.validTargetIds.includes(unitId) ||
      params.validPhysicalTargetIds?.includes(unitId));
  const isSecondaryTarget =
    visibility.canBeTargetedByViewer &&
    params.currentState.phase === GamePhase.WeaponAttack &&
    (params.secondaryTargetIds?.includes(unitId) ?? false);
  const attackInfeasibleReason =
    visibility.canBeTargetedByViewer && unitInfo.side !== params.playerSide
      ? params.attackInfeasibleReasonByUnitId?.[unitId]
      : undefined;

  return {
    isSelected: unitId === params.selectedUnitId,
    isValidTarget,
    isActiveTarget: isActiveTokenTarget(
      params,
      unitId,
      visibility.canBeTargetedByViewer,
    ),
    isSecondaryTarget,
    attackInfeasibleReason,
  };
}

export function buildGameplayTokens(
  params: IBuildGameplayTokensParams,
): IUnitToken[] {
  return Object.entries(params.currentState.units).map(([unitId, state]) => {
    const unitInfo = params.unitInfoLookup[unitId] || {
      name: 'Unknown',
      side: GameSide.Player,
    };
    const visibility = deriveTokenVisibility(params, unitId, unitInfo, state);
    // Fog contact memory (audit 2026-06-09 G, W5.1a): record the
    // position of every currently-visible fogged enemy; when the
    // contact is later hidden, freeze the ghost at the last OBSERVED
    // hex. A never-observed contact has no memory entry and falls
    // back to its live position (matches the legacy deployment-intel
    // behavior and callers that pass no memory map).
    recordVisibleFogContact(params, unitId, state, visibility);

    return unitStateToToken(
      unitId,
      state,
      unitInfo,
      buildTokenFlags(params, unitId, unitInfo, visibility),
      buildFogProjection(params, unitId, state, visibility),
      visibility.isHidden,
    );
  });
}
