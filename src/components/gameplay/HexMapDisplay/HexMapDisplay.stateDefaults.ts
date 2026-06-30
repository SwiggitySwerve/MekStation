import type { IHexTerrain } from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import { coordToKey } from '@/utils/gameplay/hexMath';

import type { HexMapDisplayProps } from './HexMapDisplay.types';

// Stable empty defaults (audit 2026-06-09 G, W5.1a): inline `= []` /
// `= {}` default parameters mint a fresh identity on every render when
// the prop is omitted, which invalidates downstream memoized map state.
export const EMPTY_EVENTS: NonNullable<HexMapDisplayProps['events']> = [];
export const EMPTY_HEX_TERRAIN: NonNullable<HexMapDisplayProps['hexTerrain']> =
  [];
export const EMPTY_MOVEMENT_RANGE: NonNullable<
  HexMapDisplayProps['movementRange']
> = [];
export const EMPTY_ATTACK_RANGE: NonNullable<
  HexMapDisplayProps['attackRange']
> = [];
export const EMPTY_UNIT_WEAPONS: NonNullable<
  HexMapDisplayProps['unitWeapons']
> = {};
export const EMPTY_SELECTED_WEAPON_IDS: NonNullable<
  HexMapDisplayProps['selectedWeaponIds']
> = [];
export const EMPTY_HIGHLIGHT_PATH: NonNullable<
  HexMapDisplayProps['highlightPath']
> = [];

export function buildEffectiveHexTerrainFromProjectionFrame(
  hexTerrain: readonly IHexTerrain[],
  tacticalProjectionFrame: ITacticalMapProjectionFrame | undefined,
): readonly IHexTerrain[] {
  if (!tacticalProjectionFrame) return hexTerrain;

  const terrainByKey = new Map<string, IHexTerrain>();
  for (const terrain of hexTerrain) {
    terrainByKey.set(coordToKey(terrain.coordinate), terrain);
  }
  tacticalProjectionFrame.lookup.forEach((projection, key) => {
    terrainByKey.set(key, projection.terrain);
  });
  return Array.from(terrainByKey.values());
}
