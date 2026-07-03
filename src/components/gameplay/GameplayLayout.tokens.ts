import type { MutableRefObject } from 'react';

import type {
  GameSide,
  IGameSession,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';
import { deriveValidWeaponTargetIds } from '@/utils/gameplay/combatTargetIds';

import { buildGameplayTokens } from './GameplayLayout.viewModel';

export interface GameplayFogContactMemory {
  readonly sessionId: string;
  readonly memory: Map<string, IHexCoordinate>;
}

export type GameplayVisibilityState = IGameSession['currentState'] & {
  readonly sideOwners: IGameSession['sideOwners'] | null;
  readonly grid?: IHexGrid;
};

interface BuildGameplayTokenProjectionParams {
  readonly currentState: IGameSession['currentState'];
  readonly config: IGameSession['config'];
  readonly session: IGameSession;
  readonly unitInfoLookup: Record<
    string,
    { readonly name: string; readonly side: GameSide }
  >;
  readonly selectedUnitId: string | null;
  readonly validTargetIds: readonly string[];
  readonly activeTargetId: string | null;
  readonly validPhysicalTargetIds: readonly string[];
  readonly activePhysicalTargetId: string | null;
  /** Composer secondary targets (attack-phase-intent-composer, D6). */
  readonly secondaryTargetIds?: readonly string[];
  /** Composer at-source infeasibility reasons by enemy unit id. */
  readonly attackInfeasibleReasonByUnitId?: Readonly<Record<string, string>>;
  readonly playerSide: GameSide;
  readonly localFogPlayerId: string;
  readonly visibilityState: GameplayVisibilityState;
  readonly fogContactMemory: Map<string, IHexCoordinate>;
  readonly combatGrid: IHexGrid | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
  readonly hasInteractiveSession: boolean;
}

export function buildGameplayVisibilityState(
  currentState: IGameSession['currentState'],
  sideOwners: IGameSession['sideOwners'] | null | undefined,
  combatGrid: IHexGrid | null,
): GameplayVisibilityState {
  return {
    ...currentState,
    sideOwners: sideOwners ?? null,
    ...(combatGrid ? { grid: combatGrid } : {}),
  };
}

export function resolveLocalFogPlayerId(
  sideOwners: IGameSession['sideOwners'] | null | undefined,
  playerSide: GameSide,
): string {
  return sideOwners?.[playerSide] ?? playerSide.toString();
}

export function resolveFogContactMemory(
  ref: MutableRefObject<GameplayFogContactMemory | null>,
  sessionId: string,
): Map<string, IHexCoordinate> {
  if (ref.current?.sessionId !== sessionId) {
    ref.current = { sessionId, memory: new Map() };
  }
  return ref.current.memory;
}

export function buildGameplayTokenProjection({
  currentState,
  config,
  session,
  unitInfoLookup,
  selectedUnitId,
  validTargetIds,
  activeTargetId,
  validPhysicalTargetIds,
  activePhysicalTargetId,
  secondaryTargetIds,
  attackInfeasibleReasonByUnitId,
  playerSide,
  localFogPlayerId,
  visibilityState,
  fogContactMemory,
  combatGrid,
  unitWeapons,
  selectedWeaponIds,
  hasInteractiveSession,
}: BuildGameplayTokenProjectionParams): readonly IUnitToken[] {
  const baseTokens = buildGameplayTokens({
    currentState,
    config,
    session,
    unitInfoLookup,
    selectedUnitId,
    validTargetIds:
      currentState.phase === GamePhase.WeaponAttack ? [] : validTargetIds,
    activeTargetId,
    validPhysicalTargetIds,
    activePhysicalTargetId,
    playerSide,
    localFogPlayerId,
    visibilityState,
    fogContactMemory,
  });

  const weaponTargetIds = deriveValidWeaponTargetIds({
    currentState,
    selectedUnitId,
    tokens: baseTokens,
    mapRadius: config.mapRadius,
    grid: combatGrid,
    unitWeapons,
    selectedWeaponIds,
  });

  return buildGameplayTokens({
    currentState,
    config,
    session,
    unitInfoLookup,
    selectedUnitId,
    validTargetIds: selectEffectiveTargetIds({
      currentState,
      hasInteractiveSession,
      validTargetIds,
      weaponTargetIds,
    }),
    activeTargetId,
    validPhysicalTargetIds,
    activePhysicalTargetId,
    secondaryTargetIds,
    attackInfeasibleReasonByUnitId,
    playerSide,
    localFogPlayerId,
    visibilityState,
    fogContactMemory,
  });
}

function selectEffectiveTargetIds({
  currentState,
  hasInteractiveSession,
  validTargetIds,
  weaponTargetIds,
}: {
  readonly currentState: IGameSession['currentState'];
  readonly hasInteractiveSession: boolean;
  readonly validTargetIds: readonly string[];
  readonly weaponTargetIds: readonly string[];
}): readonly string[] {
  if (currentState.phase === GamePhase.WeaponAttack && hasInteractiveSession) {
    return weaponTargetIds;
  }
  return validTargetIds;
}
