/**
 * terrainCover — derive partial cover from hex terrain.
 *
 * Per Total Warfare, certain terrain in the target's hex grants the target
 * partial cover. The canonical terrain → cover mapping already lives in
 * `TERRAIN_PROPERTIES` (each `TerrainType` carries a `coverLevel`); this module
 * is the thin, typed accessor that the simulation runner's weapon-attack phase
 * uses to decide whether a target is in partial cover.
 *
 * @spec openspec/changes/complete-partial-cover-rules/specs/to-hit-resolution/spec.md
 *        Requirement: Partial Cover Modifier
 */

import type { IHex } from '@/types/gameplay';

import { CoverLevel, TerrainType, TERRAIN_PROPERTIES } from '@/types/gameplay';

/** Set of valid `TerrainType` string values, for narrowing the raw `IHex.terrain`. */
const TERRAIN_TYPE_VALUES: ReadonlySet<string> = new Set<string>(
  Object.values(TerrainType),
);

/**
 * Return whether a hex's terrain grants its occupant partial cover.
 *
 * `IHex.terrain` is a free `string` (forward-compat). An unrecognised or
 * absent terrain value — including the all-clear grid the simulation runner
 * currently builds — yields `false`, so this never throws and never
 * over-reports cover.
 */
export function hexProvidesPartialCover(hex: IHex | undefined): boolean {
  if (!hex || !TERRAIN_TYPE_VALUES.has(hex.terrain)) {
    return false;
  }
  return (
    TERRAIN_PROPERTIES[hex.terrain as TerrainType].coverLevel ===
    CoverLevel.Partial
  );
}

/**
 * Return whether a terrain tag grants partial cover OR better (i.e. any
 * cover level other than `None` — partial or full).
 *
 * The AI move scorer's cover term — per `add-ai-terrain-aware-movement`
 * design D5 — rewards a destination hex that offers "partial cover or
 * better", so it needs the partial-OR-full predicate rather than the
 * partial-only `hexProvidesPartialCover`. The argument is the raw
 * `IHex.terrain` string tag; an unrecognised or absent tag yields `false`.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Terrain-Aware Move Scoring
 */
export function terrainTagOffersCover(terrain: string | undefined): boolean {
  if (terrain === undefined || !TERRAIN_TYPE_VALUES.has(terrain)) {
    return false;
  }
  return (
    TERRAIN_PROPERTIES[terrain as TerrainType].coverLevel !== CoverLevel.None
  );
}
