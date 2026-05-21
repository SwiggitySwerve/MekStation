/**
 * useTacticalLensState
 *
 * Manages the active tactical map lens and its intensity. A lens is a named
 * preset (movement / attack / intel / terrain / objective / survival) that
 * groups related `MapLayerId` values and toggles them as a unit when the
 * player switches lenses.
 *
 * Design decisions:
 * - The hook owns ONLY lens-level state (which lens is active, its intensity).
 *   Layer visibility is a side-effect applied via the `setLayerVisibility`
 *   callback returned from the parent's `useMapLayerState`. This keeps lens
 *   state decoupled from the map's layer state; GameplayLayout is the
 *   composition point (per add-tactical-map-lenses-feed-replay design.md
 *   "Lenses group layers by task" decision).
 * - `activeLens === null` means "no lens active" (default view). The caller
 *   must call `applyLensLayers` after initialising to push the null-lens
 *   reset if needed.
 * - `lensIntensity` is initialised from the preset's `defaultIntensity` when
 *   a lens is activated; the player can then adjust it via `setLensIntensity`.
 * - Locked layers (terrain, path, fog, effects) are never hidden by lens
 *   activation — `setMapLayerVisibility` in the types layer already guards this.
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Tactical Map Lenses" ADDED requirement — lens preset, layer toggling
 */

import { useCallback, useState } from 'react';

import {
  MAP_LAYER_IDS,
  type MapLayerId,
} from '@/types/gameplay/GameplayUIInterfaces';
import {
  LENS_PRESET_BY_ID,
  type TacticalLensId,
} from '@/types/gameplay/TacticalLensInterfaces';

// =============================================================================
// Public surface
// =============================================================================

/**
 * State + setters for the active tactical lens.
 *
 * `applyLensLayers(setLayerVisibility)` is a one-shot applicator: call it
 * whenever `activeLens` changes (via a `useEffect` in the host component)
 * with the live `setLayerVisibility` from `useMapLayerState`. It enables
 * every layer in the preset's `mapLayerIds` and disables all others
 * (excluding locked layers, which `setMapLayerVisibility` ignores).
 */
export interface ITacticalLensState {
  /** Currently active lens, or null for the default (no-lens) view. */
  readonly activeLens: TacticalLensId | null;
  /** Set or clear the active lens. Also resets intensity to the preset default. */
  readonly setActiveLens: (id: TacticalLensId | null) => void;
  /**
   * Intensity of the active lens overlay (0–1).
   * Initialised from the preset's `defaultIntensity`; user-adjustable.
   */
  readonly lensIntensity: number;
  /** Adjust overlay intensity (0–1 clamped). */
  readonly setLensIntensity: (intensity: number) => void;
  /**
   * Apply lens-derived layer visibility to the map layer state.
   *
   * Call this from a `useEffect` whenever `activeLens` changes:
   * ```
   * useEffect(() => {
   *   lensState.applyLensLayers(mapInteraction.setLayerVisibility);
   * }, [lensState.activeLens, mapInteraction]);
   * ```
   *
   * When `activeLens` is null, all non-locked layers are restored to their
   * default visibility (hidden except firingArcs, objectives, sensors —
   * matching DEFAULT_MAP_LAYER_STATE minus locked layers).
   */
  readonly applyLensLayers: (
    setLayerVisibility: (id: MapLayerId, visible: boolean) => void,
  ) => void;
}

// Default visibility for unlocked layers when no lens is active.
// Must stay in sync with DEFAULT_MAP_LAYER_STATE in GameplayUIInterfaces.ts.
const DEFAULT_UNLOCKED_VISIBILITY: Readonly<Record<MapLayerId, boolean>> = {
  terrain: true, // locked — guard is in setMapLayerVisibility, but list for completeness
  elevation: true,
  movement: false,
  path: true, // locked
  cover: false,
  los: false,
  firingArcs: true,
  objectives: true,
  fog: true, // locked
  effects: true, // locked
  sensors: true,
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns the current tactical lens state and its control surface.
 *
 * Mount this once at the GameplayLayout level; pass `applyLensLayers` into
 * a `useEffect` that runs whenever `activeLens` or `mapInteraction` changes.
 */
export function useTacticalLensState(): ITacticalLensState {
  const [activeLens, setActiveLensRaw] = useState<TacticalLensId | null>(null);
  const [lensIntensity, setLensIntensityRaw] = useState<number>(1.0);

  // Activate a lens: record it, reset intensity to preset default.
  // Clear (null): reset intensity to 1.0 (full, matches default view).
  const setActiveLens = useCallback((id: TacticalLensId | null) => {
    setActiveLensRaw(id);
    if (id !== null) {
      const preset = LENS_PRESET_BY_ID[id];
      setLensIntensityRaw(preset.defaultIntensity);
    } else {
      setLensIntensityRaw(1.0);
    }
  }, []);

  // Clamp intensity to [0, 1] to guard against slider edge cases.
  const setLensIntensity = useCallback((intensity: number) => {
    setLensIntensityRaw(Math.max(0, Math.min(1, intensity)));
  }, []);

  // Apply layer visibility to the map for the current activeLens.
  // Stable reference: uses captured activeLens via closure — callers should
  // call this from a useEffect with activeLens in the dep array.
  const applyLensLayers = useCallback(
    (setLayerVisibility: (id: MapLayerId, visible: boolean) => void) => {
      if (activeLens === null) {
        // No lens: restore default visibility for every unlocked layer.
        for (const layerId of MAP_LAYER_IDS) {
          setLayerVisibility(layerId, DEFAULT_UNLOCKED_VISIBILITY[layerId]);
        }
        return;
      }

      const preset = LENS_PRESET_BY_ID[activeLens];
      const enabledSet = new Set<MapLayerId>(preset.mapLayerIds);

      // Enable layers in the preset; disable all others.
      // setMapLayerVisibility (inside useMapLayerState) is a no-op for
      // locked layers so this is safe to call for all ids.
      for (const layerId of MAP_LAYER_IDS) {
        setLayerVisibility(layerId, enabledSet.has(layerId));
      }
    },
    [activeLens],
  );

  return {
    activeLens,
    setActiveLens,
    lensIntensity,
    setLensIntensity,
    applyLensLayers,
  };
}
