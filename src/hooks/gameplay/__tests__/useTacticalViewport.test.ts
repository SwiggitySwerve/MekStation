/**
 * Tests for useTacticalViewport
 *
 * Covers §1.1 breakpoint resolution and §1.2 hook behaviour per:
 *   openspec/changes/add-responsive-tactical-hud-accessibility/specs/
 *     mobile-interaction-patterns/spec.md
 *
 * Strategy:
 *   - `window.innerWidth` / `window.innerHeight` are set via Object.defineProperty
 *     before each test so we can exercise the full breakpoint matrix without
 *     triggering real resize events.
 *   - `densityOverride` is threaded through to verify the user-preference overlay.
 *   - SSR path (typeof window === 'undefined') is not tested here because Jest
 *     runs in jsdom which always has `window`.
 */

import { renderHook } from '@testing-library/react';

import { useTacticalViewport } from '../useTacticalViewport';

// =============================================================================
// Helpers
// =============================================================================

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
}

// =============================================================================
// Breakpoint resolution tests
// =============================================================================

describe('useTacticalViewport — breakpoint resolution', () => {
  it('returns phone breakpoint for width < 768 px', () => {
    setViewport(375, 812);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('phone');
  });

  it('returns tablet breakpoint for width 768–1023 px', () => {
    setViewport(768, 1024);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('tablet');
  });

  it('returns laptop breakpoint for width 1024–1279 px', () => {
    setViewport(1024, 768);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('laptop');
  });

  it('returns desktop breakpoint for width 1280–1535 px', () => {
    setViewport(1280, 900);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('desktop');
  });

  it('returns ultrawide breakpoint for width >= 1536 px', () => {
    setViewport(1536, 900);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('ultrawide');
  });

  it('constrained-height overrides width breakpoint when height < 600 px', () => {
    // Width would be desktop (1280 px) but height is below threshold.
    setViewport(1280, 599);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('constrained-height');
  });

  it('does NOT trigger constrained-height at exactly 600 px height', () => {
    setViewport(1280, 600);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.breakpoint).toBe('desktop');
  });
});

// =============================================================================
// Slot reallocation tests
// =============================================================================

describe('useTacticalViewport — slot reallocation', () => {
  it('phone profile hides morale-band', () => {
    setViewport(375, 812);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.slotReallocation['morale-band']).toBe('hide');
  });

  it('phone profile merges right-tray into mobile-drawer', () => {
    setViewport(375, 812);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.slotReallocation['right-tray']).toBe('merge');
  });

  it('laptop profile collapses minimap-cluster', () => {
    setViewport(1100, 800);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.slotReallocation['minimap-cluster']).toBe('collapse');
  });

  it('desktop profile has no slot reallocations', () => {
    setViewport(1280, 900);
    const { result } = renderHook(() => useTacticalViewport());
    expect(Object.keys(result.current.slotReallocation)).toHaveLength(0);
  });
});

// =============================================================================
// Density tests
// =============================================================================

describe('useTacticalViewport — density', () => {
  it('uses compact density by default on phone', () => {
    setViewport(375, 812);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.density).toBe('compact');
  });

  it('uses comfortable density by default on ultrawide', () => {
    setViewport(1920, 1080);
    const { result } = renderHook(() => useTacticalViewport());
    expect(result.current.density).toBe('comfortable');
  });

  it('densityOverride replaces breakpoint default', () => {
    setViewport(375, 812); // phone defaults to compact
    const { result } = renderHook(() => useTacticalViewport('comfortable'));
    expect(result.current.density).toBe('comfortable');
  });
});
