import { useMemo } from 'react';

import type {
  GameSide,
  ICombatRangeHex,
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import { GamePhase } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { selectCombatProjectionWeapons } from '@/utils/gameplay/combatProjection.weaponSelection';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

import { withSameHexMovementOptions } from './HexMapDisplay/HexCell.movementOptionSummaries';
import { generateHexesInRadius } from './HexMapDisplay/renderHelpers';

export interface BuildGameplayTacticalProjectionFrameParams {
  readonly sessionId: string;
  readonly mapRadius: number;
  readonly currentState: IGameState;
  readonly selectedUnitId: string | null;
  readonly activeTargetId: string | null;
  readonly playerSide: GameSide;
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly movementRange: readonly IMovementRangeHex[];
  readonly hoverMovementInfo?: IMovementRangeHex;
  readonly grid: IHexGrid | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
}

export function useGameplayTacticalProjection({
  sessionId,
  mapRadius,
  currentState,
  selectedUnitId,
  activeTargetId,
  playerSide,
  tokens,
  hexTerrain,
  movementRange,
  hoverMovementInfo,
  grid,
  unitWeapons,
  selectedWeaponIds,
}: BuildGameplayTacticalProjectionFrameParams): {
  readonly tacticalProjectionFrame: ITacticalMapProjectionFrame;
  readonly movementProjectionByHex: Readonly<Record<string, IMovementRangeHex>>;
} {
  const tacticalProjectionFrame = useMemo(
    () =>
      buildGameplayTacticalProjectionFrame({
        sessionId,
        mapRadius,
        currentState,
        selectedUnitId,
        activeTargetId,
        playerSide,
        tokens,
        hexTerrain,
        movementRange,
        hoverMovementInfo,
        grid,
        unitWeapons,
        selectedWeaponIds,
      }),
    [
      activeTargetId,
      currentState,
      grid,
      hexTerrain,
      hoverMovementInfo,
      mapRadius,
      movementRange,
      playerSide,
      selectedUnitId,
      selectedWeaponIds,
      sessionId,
      tokens,
      unitWeapons,
    ],
  );
  const movementProjectionByHex = useMemo(
    () => movementProjectionByHexFromFrame(tacticalProjectionFrame),
    [tacticalProjectionFrame],
  );

  return { tacticalProjectionFrame, movementProjectionByHex };
}

export function buildGameplayTacticalProjectionFrame({
  sessionId,
  mapRadius,
  currentState,
  selectedUnitId,
  activeTargetId,
  playerSide,
  tokens,
  hexTerrain,
  movementRange,
  hoverMovementInfo,
  grid,
  unitWeapons,
  selectedWeaponIds,
}: BuildGameplayTacticalProjectionFrameParams): ITacticalMapProjectionFrame {
  const hexes = generateHexesInRadius(mapRadius);
  const terrainLookup = buildTerrainLookup(hexTerrain);
  const movementRangeLookup = buildMovementRangeLookup(
    movementRange,
    hoverMovementInfo,
  );
  const combatRangeLookup = buildCombatRangeLookup({
    currentState,
    selectedUnitId,
    activeTargetId,
    playerSide,
    tokens,
    hexes,
    grid,
    unitWeapons,
    selectedWeaponIds,
  });

  return {
    source: 'shared-engine-projection',
    sourceId: `${sessionId}:${currentState.phase}:${selectedUnitId ?? 'none'}`,
    label: 'GameplayLayout shared tactical projection frame',
    lookup: buildTacticalMapHexProjectionLookup({
      hexes,
      terrainLookup,
      movementRangeLookup,
      combatRangeLookup,
      legacyAttackRangeLookup: new Set(),
    }),
  };
}

export function movementProjectionByHexFromFrame(
  frame: ITacticalMapProjectionFrame,
): Readonly<Record<string, IMovementRangeHex>> {
  const byHex: Record<string, IMovementRangeHex> = {};
  frame.lookup.forEach((projection, key) => {
    if (projection.movement) byHex[key] = projection.movement;
  });
  return byHex;
}

function buildTerrainLookup(
  hexTerrain: readonly IHexTerrain[],
): ReadonlyMap<string, IHexTerrain> {
  return new Map(
    hexTerrain.map((terrain) => [coordToKey(terrain.coordinate), terrain]),
  );
}

function buildMovementRangeLookup(
  movementRange: readonly IMovementRangeHex[],
  hoverMovementInfo: IMovementRangeHex | undefined,
): ReadonlyMap<string, IMovementRangeHex> {
  const grouped = new Map<string, IMovementRangeHex[]>();
  for (const movement of movementRange) {
    const key = coordToKey(movement.hex);
    const entries = grouped.get(key) ?? [];
    entries.push(movement);
    grouped.set(key, entries);
  }
  if (hoverMovementInfo) {
    const key = coordToKey(hoverMovementInfo.hex);
    const entries = grouped.get(key) ?? [];
    entries.push(hoverMovementInfo);
    grouped.set(key, entries);
  }

  const lookup = new Map<string, IMovementRangeHex>();
  grouped.forEach((entries, key) => {
    lookup.set(key, withSameHexMovementOptions(entries));
  });
  return lookup;
}

function buildCombatRangeLookup({
  currentState,
  selectedUnitId,
  activeTargetId,
  playerSide,
  tokens,
  hexes,
  grid,
  unitWeapons,
  selectedWeaponIds,
}: {
  readonly currentState: IGameState;
  readonly selectedUnitId: string | null;
  readonly activeTargetId: string | null;
  readonly playerSide: GameSide;
  readonly tokens: readonly IUnitToken[];
  readonly hexes: readonly IHexCoordinate[];
  readonly grid: IHexGrid | null;
  readonly unitWeapons: Record<string, readonly IWeaponStatus[]>;
  readonly selectedWeaponIds?: readonly string[];
}): ReadonlyMap<string, ICombatRangeHex> {
  const lookup = new Map<string, ICombatRangeHex>();
  if (!selectedUnitId || !grid || currentState.phase !== GamePhase.WeaponAttack)
    return lookup;

  const attacker = tokens.find((token) => token.unitId === selectedUnitId);
  if (!attacker || attacker.side !== playerSide) return lookup;

  const weapons = selectCombatProjectionWeapons(
    unitWeapons[selectedUnitId] ?? [],
    selectedWeaponIds,
  );
  if (weapons.length === 0) return lookup;

  for (const combatInfo of deriveCombatRangeHexes({
    attacker,
    targetUnitId: activeTargetId,
    hexes,
    grid,
    tokens,
    weapons,
    combatState: currentState,
  })) {
    lookup.set(coordToKey(combatInfo.hex), combatInfo);
  }
  return lookup;
}
