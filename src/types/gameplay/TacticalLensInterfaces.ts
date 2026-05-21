/**
 * Tactical Lens Interfaces
 *
 * Defines the lens model for task-oriented map overlays. A lens is a named
 * preset that groups related map layers and expresses them as a single player-
 * facing mode. Lenses do NOT change BattleTech rules — they only control
 * which underlying map layers are visible and at what intensity.
 *
 * Design: lenses reference existing `MapLayerId` values from
 * `GameplayUIInterfaces.ts`. Adding a lens requires no new layer ids; lenses
 * are purely a composition / grouping mechanism over the existing layer stack.
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Tactical Map Lenses" ADDED requirement
 */

import type { MapLayerId } from './GameplayUIInterfaces';

// =============================================================================
// Lens Identifiers
// =============================================================================

/**
 * Named task-oriented map lens.
 *
 * Each value corresponds to a distinct battlefield concern:
 *   movement  — reachable hexes, path preview, MP cost, terrain/elevation cues
 *   attack    — firing arcs, LOS, range bands, cover, valid targets
 *   intel     — visible / last-known / sensor / hidden areas
 *   terrain   — elevation, terrain type, ground composition
 *   objective — objective hex ownership and capture state
 *   survival  — heat thresholds, fall-risk hexes, damage/effects readout
 */
export type TacticalLensId =
  | 'movement'
  | 'attack'
  | 'intel'
  | 'terrain'
  | 'objective'
  | 'survival';

// =============================================================================
// Preset Shape
// =============================================================================

/**
 * A single lens preset — the configuration that maps a player-facing lens
 * button to a set of underlying map layers and an intensity suggestion.
 *
 * `mapLayerIds` lists every MapLayerId that should become visible when this
 * lens is activated. All other non-locked layers are hidden. Locked layers
 * (terrain, path, fog, effects) are always visible regardless of the active
 * lens.
 *
 * `defaultIntensity` (0–1) is a hint for the intensity slider's initial
 * position when this lens is activated. 1.0 = full opacity; 0.5 = dimmed.
 */
export interface ITacticalLensPreset {
  /** Stable lens identifier. */
  readonly id: TacticalLensId;
  /** Human-readable label for the lens button. */
  readonly label: string;
  /**
   * Default intensity for the lens overlay.
   * Range 0 (fully transparent) to 1 (fully opaque).
   */
  readonly defaultIntensity: number;
  /**
   * Map layer ids that are made visible when this lens is active.
   * Unlocked layers NOT in this list are hidden when the lens activates.
   * Locked layers (terrain, path, fog, effects) remain visible regardless.
   */
  readonly mapLayerIds: readonly MapLayerId[];
}

// =============================================================================
// Lens Presets Registry
// =============================================================================

/**
 * The six canonical lens presets. Each maps one `TacticalLensId` to the
 * underlying `MapLayerId` values it brings into focus.
 *
 * Layer id reference (from MAP_LAYER_IDS in GameplayUIInterfaces.ts):
 *   terrain, elevation, movement, path, cover, los, firingArcs, objectives,
 *   fog, effects, sensors
 *
 * Locked layers (terrain / path / fog / effects) are always on — setMapLayerVisibility
 * ignores them — so they do not need to be listed in `mapLayerIds`, but
 * listing them makes each preset's intended surface explicit.
 */
export const LENS_PRESETS: readonly ITacticalLensPreset[] = [
  {
    id: 'movement',
    label: 'Movement',
    defaultIntensity: 0.9,
    // movement overlay + elevation (terrain cost context) + path preview
    mapLayerIds: ['movement', 'elevation', 'path'],
  },
  {
    id: 'attack',
    label: 'Attack',
    defaultIntensity: 0.85,
    // LOS, firing arcs, cover — the full attack-decision surface
    mapLayerIds: ['los', 'firingArcs', 'cover'],
  },
  {
    id: 'intel',
    label: 'Intel',
    defaultIntensity: 0.8,
    // sensor contacts + fog overlay distinguishes visible / last-known / hidden
    mapLayerIds: ['sensors', 'fog'],
  },
  {
    id: 'terrain',
    label: 'Terrain',
    defaultIntensity: 1.0,
    // elevation + terrain — the base board read
    mapLayerIds: ['terrain', 'elevation'],
  },
  {
    id: 'objective',
    label: 'Objective',
    defaultIntensity: 0.9,
    // objective hexes in focus; elevation for context
    mapLayerIds: ['objectives', 'elevation'],
  },
  {
    id: 'survival',
    label: 'Survival',
    defaultIntensity: 0.85,
    // damage/effects + cover to assess defensive value
    mapLayerIds: ['effects', 'cover'],
  },
] as const;

/**
 * Index LENS_PRESETS by id for O(1) lookup.
 */
export const LENS_PRESET_BY_ID: Readonly<
  Record<TacticalLensId, ITacticalLensPreset>
> = Object.fromEntries(LENS_PRESETS.map((p) => [p.id, p])) as Readonly<
  Record<TacticalLensId, ITacticalLensPreset>
>;
