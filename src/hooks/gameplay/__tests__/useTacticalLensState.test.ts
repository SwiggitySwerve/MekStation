/**
 * Tests for useTacticalLensState
 *
 * Covers the "Tactical Map Lenses" ADDED requirement from:
 * openspec/changes/add-tactical-map-lenses-feed-replay/specs/
 *   tactical-map-interface/spec.md
 *
 * Scenarios verified:
 *   1. Default state — no lens active, intensity 1.0
 *   2. Activating a lens sets it and resets intensity to preset default
 *   3. Clearing a lens (null) restores default intensity
 *   4. setLensIntensity clamps to [0, 1]
 *   5. applyLensLayers with active lens enables preset layers, disables others
 *   6. applyLensLayers with null restores DEFAULT_UNLOCKED_VISIBILITY
 */

import { act, renderHook } from '@testing-library/react';

import {
  MAP_LAYER_IDS,
  type MapLayerId,
} from '@/types/gameplay/GameplayUIInterfaces';
import { LENS_PRESET_BY_ID } from '@/types/gameplay/TacticalLensInterfaces';

import { useTacticalLensState } from '../useTacticalLensState';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Captures every setLayerVisibility call into a record so tests can
 * assert the final visibility state without ordering concerns.
 */
function captureLayerVisibility(): {
  record: Record<string, boolean>;
  setter: (id: MapLayerId, visible: boolean) => void;
} {
  const record: Record<string, boolean> = {};
  return {
    record,
    setter: (id: MapLayerId, visible: boolean) => {
      record[id] = visible;
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useTacticalLensState', () => {
  it('initialises with no active lens and intensity 1.0', () => {
    const { result } = renderHook(() => useTacticalLensState());
    expect(result.current.activeLens).toBeNull();
    expect(result.current.lensIntensity).toBe(1.0);
  });

  it('activating a lens sets it and resets intensity to the preset default', () => {
    const { result } = renderHook(() => useTacticalLensState());
    act(() => {
      result.current.setActiveLens('movement');
    });
    expect(result.current.activeLens).toBe('movement');
    expect(result.current.lensIntensity).toBe(
      LENS_PRESET_BY_ID['movement'].defaultIntensity,
    );
  });

  it('clearing the lens (null) resets intensity to 1.0', () => {
    const { result } = renderHook(() => useTacticalLensState());
    act(() => {
      result.current.setActiveLens('attack');
    });
    act(() => {
      result.current.setActiveLens(null);
    });
    expect(result.current.activeLens).toBeNull();
    expect(result.current.lensIntensity).toBe(1.0);
  });

  it('setLensIntensity clamps values below 0 to 0', () => {
    const { result } = renderHook(() => useTacticalLensState());
    act(() => {
      result.current.setLensIntensity(-0.5);
    });
    expect(result.current.lensIntensity).toBe(0);
  });

  it('setLensIntensity clamps values above 1 to 1', () => {
    const { result } = renderHook(() => useTacticalLensState());
    act(() => {
      result.current.setLensIntensity(1.8);
    });
    expect(result.current.lensIntensity).toBe(1);
  });

  it('applyLensLayers enables preset layers and disables all others when a lens is active', () => {
    const { result } = renderHook(() => useTacticalLensState());
    act(() => {
      result.current.setActiveLens('attack');
    });

    const { record, setter } = captureLayerVisibility();
    act(() => {
      result.current.applyLensLayers(setter);
    });

    const attackPreset = LENS_PRESET_BY_ID['attack'];
    const enabledSet = new Set<string>(attackPreset.mapLayerIds);

    for (const layerId of MAP_LAYER_IDS) {
      if (enabledSet.has(layerId)) {
        expect(record[layerId]).toBe(true);
      } else {
        expect(record[layerId]).toBe(false);
      }
    }
  });

  it('applyLensLayers with null restores default unlocked visibility', () => {
    const { result } = renderHook(() => useTacticalLensState());
    // Start with a lens active then clear it
    act(() => {
      result.current.setActiveLens('intel');
    });
    act(() => {
      result.current.setActiveLens(null);
    });

    const { record, setter } = captureLayerVisibility();
    act(() => {
      result.current.applyLensLayers(setter);
    });

    // Default visible: elevation, firingArcs, objectives, sensors, locked layers
    expect(record['elevation']).toBe(true);
    expect(record['firingArcs']).toBe(true);
    expect(record['objectives']).toBe(true);
    expect(record['sensors']).toBe(true);
    // Default hidden
    expect(record['movement']).toBe(false);
    expect(record['cover']).toBe(false);
    expect(record['los']).toBe(false);
  });
});
