/**
 * useTacticalViewport
 *
 * Returns the active `IViewportProfile` for the tactical command shell.
 *
 * Breakpoint detection is derived from the canonical layout breakpoints in
 * `src/constants/layout.ts`. The `constrained-height` variant takes priority
 * over width-based breakpoints when the viewport height falls below
 * `TACTICAL_MIN_HEIGHT_PX` (600 px).
 *
 * Input-mode detection uses the same fingerprinting approach as
 * `src/hooks/useDeviceType.ts` (ontouchstart + hover media query). User
 * density preference from `useTacticalSettingsStore` (§2.2) overlays the
 * breakpoint default when set.
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/mobile-interaction-patterns/spec.md
 *   "Tactical HUD Responsive Slot Reallocation" ADDED requirement — §1.1 + §1.2
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  IViewportProfile,
  InputMode,
  PanelDensity,
  TacticalBreakpoint,
} from '@/types/gameplay/TacticalViewportInterfaces';

import { BREAKPOINTS } from '@/constants/layout';
import {
  DEFAULT_DENSITY_PER_BREAKPOINT,
  RESPONSIVE_SLOT_PROFILES,
  TACTICAL_MIN_HEIGHT_PX,
} from '@/types/gameplay/TacticalViewportInterfaces';

// ---------------------------------------------------------------------------
// Resize debounce
// ---------------------------------------------------------------------------

/** Debounce delay for resize listener — mirrors useDeviceType.ts pattern. */
const RESIZE_DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// Breakpoint resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the `TacticalBreakpoint` from the current viewport dimensions.
 *
 * `constrained-height` is evaluated first so a narrow-height desktop still
 * gets the compact chrome treatment even if the width is ≥ 1280 px.
 */
function resolveBreakpoint(width: number, height: number): TacticalBreakpoint {
  // Height constraint overrides width classification.
  if (height < TACTICAL_MIN_HEIGHT_PX) {
    return 'constrained-height';
  }

  // Width-based tiers — thresholds from src/constants/layout.ts BREAKPOINTS.
  if (width < BREAKPOINTS.MD) {
    return 'phone'; // < 768 px
  }
  if (width < BREAKPOINTS.LG) {
    return 'tablet'; // 768–1023 px
  }
  if (width < BREAKPOINTS.XL) {
    return 'laptop'; // 1024–1279 px
  }
  if (width < BREAKPOINTS.XXL) {
    return 'desktop'; // 1280–1535 px
  }
  return 'ultrawide'; // >= 1536 px
}

/**
 * Detect the primary input modality via capability fingerprinting.
 *
 * Touch capability: `ontouchstart` in window OR maxTouchPoints > 0.
 * Hover capability: `(hover: hover)` media query.
 *
 * If both are present (hybrid device) we prefer `touch` so targets are
 * large enough for either input method.
 */
function detectInputMode(): InputMode {
  if (typeof window === 'undefined') return 'mouse';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) return 'touch';
  return 'mouse';
}

// ---------------------------------------------------------------------------
// SSR-safe default
// ---------------------------------------------------------------------------

/**
 * Safe profile emitted during SSR or before the first window measurement.
 * Defaults to desktop so the first server render is correct for most users.
 */
const SSR_DEFAULT: IViewportProfile = {
  breakpoint: 'desktop',
  slotReallocation: RESPONSIVE_SLOT_PROFILES.desktop,
  inputMode: 'mouse',
  density: DEFAULT_DENSITY_PER_BREAKPOINT.desktop,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the active `IViewportProfile` for the tactical HUD.
 *
 * The profile updates on every debounced `resize` event. Consumers can use
 * `profile.breakpoint`, `profile.slotReallocation`, `profile.inputMode`, and
 * `profile.density` to adapt their rendering without running independent media
 * queries.
 *
 * @param densityOverride - Optional user density preference from
 *   `useTacticalSettingsStore`. When provided, overrides the breakpoint
 *   default density.
 */
export function useTacticalViewport(
  densityOverride?: PanelDensity,
): IViewportProfile {
  // Build the profile from current window dimensions + input detection.
  const buildProfile = useCallback((): IViewportProfile => {
    if (typeof window === 'undefined') return SSR_DEFAULT;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = resolveBreakpoint(width, height);
    const inputMode = detectInputMode();
    const density: PanelDensity =
      densityOverride ?? DEFAULT_DENSITY_PER_BREAKPOINT[breakpoint];

    return {
      breakpoint,
      slotReallocation: RESPONSIVE_SLOT_PROFILES[breakpoint],
      inputMode,
      density,
    };
  }, [densityOverride]);

  const [profile, setProfile] = useState<IViewportProfile>(() =>
    buildProfile(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Trigger an immediate measurement to replace the lazy-init value.
    setProfile(buildProfile());

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setProfile(buildProfile());
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [buildProfile]);

  return profile;
}
