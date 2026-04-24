/**
 * useCameraControls — thin facade hook over `useMapInteraction`.
 *
 * Why this hook exists:
 *   - Callers that only need the camera action surface (keyboard
 *     hotkeys, minimap, unit-focus double-click) should not see the
 *     full 30-field `MapInteractionState`. A narrow surface keeps
 *     unit tests cheap and prevents accidental coupling to the
 *     overlay-toggle state bag.
 *   - Reduced-motion handling lives here so the single primitive
 *     (`centerOn`) gets the "animate" flag right once. Every consumer
 *     that calls `centerOn` gets snap-instead-of-ease for free when
 *     `prefers-reduced-motion: reduce` is set.
 *
 * The hook does NOT own any state of its own — it forwards actions
 * to an underlying `MapInteractionState` passed in by the map host.
 * That keeps the camera state single-sourced (inside the map hook)
 * while still letting the minimap and the GameplayLayout call the
 * same actions.
 *
 * @spec openspec/changes/add-minimap-and-camera-controls/specs/camera-controls/spec.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MapInteractionState } from '@/components/gameplay/HexMapDisplay/useMapInteraction';
import type { IHexCoordinate } from '@/types/gameplay';

/**
 * Per `camera-controls` spec "Keyboard zoom": 10% per keystroke.
 * Kept as a module constant so the hotkey layer and tests agree.
 */
export const ZOOM_KEYSTROKE_FACTOR = 1.1;

/**
 * Per task 3.1: WASD / arrow keys pan "by one hex worth of pixels".
 * We use `HEX_WIDTH` from the hex math module — the map's flat-top
 * hexagon orientation means one hex width is the canonical unit.
 */
import { HEX_WIDTH } from '@/constants/hexMap';

/**
 * Re-export for ergonomics — consumers that want the clamp bounds
 * (e.g., on-screen readouts) should not have to import from the
 * internal map hook.
 */
export {
  ZOOM_MIN,
  ZOOM_MAX,
  FOCUS_MIN_ZOOM,
  FOCUS_BUMP_ZOOM,
} from '@/components/gameplay/HexMapDisplay/useMapInteraction';

export interface CameraControls {
  /** Read-only current zoom. */
  readonly zoom: number;
  /** Read-only current pan. */
  readonly pan: { readonly x: number; readonly y: number };
  /** Pan by a screen-space delta. Clamps to map bounds. */
  readonly panBy: (dx: number, dy: number) => void;
  /** Pan by exactly one hex-width in a direction. */
  readonly panByHex: (dir: 'up' | 'down' | 'left' | 'right') => void;
  /** Set zoom to absolute scale with optional cursor-anchor. */
  readonly zoomTo: (
    scale: number,
    cursorPoint?: { x: number; y: number },
  ) => void;
  /** Zoom in by one keystroke (`+`). */
  readonly zoomIn: () => void;
  /** Zoom out by one keystroke (`-`). */
  readonly zoomOut: () => void;
  /**
   * Center camera on a hex. Respects `prefers-reduced-motion` —
   * snaps instantly when the user has requested reduced motion.
   */
  readonly centerOn: (hex: IHexCoordinate) => void;
  /** Whether reduced motion is currently requested by the OS. */
  readonly prefersReducedMotion: boolean;
}

/**
 * Hook that reads the OS `prefers-reduced-motion` media query. A
 * plain boolean wouldn't react to user-initiated changes mid-session;
 * the listener keeps the flag live.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(mq.matches);
    // Modern browsers
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    // Legacy Safari fallback — same shape as GameplayLayout's media listener.
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    legacy.addListener?.(update);
    return () => legacy.removeListener?.(update);
  }, []);

  return reduced;
}

/**
 * Build the facade over a `MapInteractionState`. The map host passes
 * its interaction state in — this hook is host-agnostic.
 */
export function useCameraControls(
  interaction: MapInteractionState,
): CameraControls {
  const prefersReducedMotion = useReducedMotion();

  const panBy = useCallback(
    (dx: number, dy: number) => interaction.panBy(dx, dy),
    [interaction],
  );

  const panByHex = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      // One hex width per keystroke per task 3.1. Up/down use the
      // same unit so diagonal pans are visually symmetrical.
      switch (dir) {
        case 'up':
          return interaction.panBy(0, HEX_WIDTH);
        case 'down':
          return interaction.panBy(0, -HEX_WIDTH);
        case 'left':
          return interaction.panBy(HEX_WIDTH, 0);
        case 'right':
          return interaction.panBy(-HEX_WIDTH, 0);
      }
    },
    [interaction],
  );

  const zoomTo = useCallback(
    (scale: number, cursorPoint?: { x: number; y: number }) =>
      interaction.zoomTo(scale, cursorPoint),
    [interaction],
  );

  const zoomIn = useCallback(
    () => interaction.zoomTo(interaction.zoom * ZOOM_KEYSTROKE_FACTOR),
    [interaction],
  );

  const zoomOut = useCallback(
    () => interaction.zoomTo(interaction.zoom / ZOOM_KEYSTROKE_FACTOR),
    [interaction],
  );

  const centerOn = useCallback(
    (hex: IHexCoordinate) =>
      // Reduced motion: snap instantly per camera-controls spec.
      interaction.centerOn(hex, { animate: !prefersReducedMotion }),
    [interaction, prefersReducedMotion],
  );

  return useMemo<CameraControls>(
    () => ({
      zoom: interaction.zoom,
      pan: interaction.pan,
      panBy,
      panByHex,
      zoomTo,
      zoomIn,
      zoomOut,
      centerOn,
      prefersReducedMotion,
    }),
    [
      interaction.zoom,
      interaction.pan,
      panBy,
      panByHex,
      zoomTo,
      zoomIn,
      zoomOut,
      centerOn,
      prefersReducedMotion,
    ],
  );
}
