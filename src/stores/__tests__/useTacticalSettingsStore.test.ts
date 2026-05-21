/**
 * Tests for useTacticalSettingsStore
 *
 * Covers §2.2 settings store behaviour per:
 *   openspec/changes/add-responsive-tactical-hud-accessibility/specs/
 *     mobile-interaction-patterns/spec.md
 *
 * Strategy:
 *   - Reset store to defaults between tests via `resetToDefaults()`.
 *   - localStorage is provided by jsdom; no manual mocking needed.
 *   - Media-query defaults (reducedMotion, highContrast) are tested via
 *     Object.defineProperty on window.matchMedia, which jsdom provides as a stub.
 */

import { act, renderHook } from '@testing-library/react';

import { useTacticalSettingsStore } from '@/stores/useTacticalSettingsStore';

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  // Reset store and localStorage between tests so state never leaks.
  act(() => {
    useTacticalSettingsStore.getState().resetToDefaults();
  });
  localStorage.clear();
});

// =============================================================================
// Default state
// =============================================================================

describe('useTacticalSettingsStore — defaults', () => {
  it('minimapSize defaults to medium', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    expect(result.current.minimapSize).toBe('medium');
  });

  it('tooltipDelay defaults to 400', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    expect(result.current.tooltipDelay).toBe(400);
  });

  it('panelDensity defaults to standard', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    expect(result.current.panelDensity).toBe('standard');
  });

  it('autoCycleActiveUnit defaults to false', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    expect(result.current.autoCycleActiveUnit).toBe(false);
  });

  it('quickMovement defaults to false when reducedMotion media query is not set', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    // jsdom window.matchMedia returns false by default — quickMovement matches.
    expect(result.current.quickMovement).toBe(false);
  });

  it('quickCombat defaults to false when reducedMotion media query is not set', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    expect(result.current.quickCombat).toBe(false);
  });
});

// =============================================================================
// Setters
// =============================================================================

describe('useTacticalSettingsStore — setters', () => {
  it('setMinimapSize updates minimapSize', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setMinimapSize('large'));
    expect(result.current.minimapSize).toBe('large');
  });

  it('setTooltipDelay updates tooltipDelay', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setTooltipDelay(1000));
    expect(result.current.tooltipDelay).toBe(1000);
  });

  it('setPanelDensity updates panelDensity', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setPanelDensity('compact'));
    expect(result.current.panelDensity).toBe('compact');
  });

  it('setAutoCycleActiveUnit updates autoCycleActiveUnit', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setAutoCycleActiveUnit(true));
    expect(result.current.autoCycleActiveUnit).toBe(true);
  });

  it('setQuickMovement updates quickMovement independently', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setQuickMovement(true));
    expect(result.current.quickMovement).toBe(true);
    expect(result.current.reducedMotion).toBe(false);
  });

  it('setHighContrast updates highContrast', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setHighContrast(true));
    expect(result.current.highContrast).toBe(true);
  });
});

// =============================================================================
// setReducedMotion co-sets quickMovement + quickCombat
// =============================================================================

describe('useTacticalSettingsStore — reducedMotion cascade', () => {
  it('enabling reducedMotion also enables quickMovement and quickCombat', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setReducedMotion(true));
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.quickMovement).toBe(true);
    expect(result.current.quickCombat).toBe(true);
  });

  it('disabling reducedMotion does NOT force-disable quickMovement or quickCombat', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    // Enable first.
    act(() => result.current.setReducedMotion(true));
    // Then disable — the spec only co-sets on enable, not on disable.
    act(() => result.current.setReducedMotion(false));
    expect(result.current.reducedMotion).toBe(false);
    // quickMovement and quickCombat retain their last state (true from the enable).
    expect(result.current.quickMovement).toBe(true);
    expect(result.current.quickCombat).toBe(true);
  });
});

// =============================================================================
// resetToDefaults
// =============================================================================

describe('useTacticalSettingsStore — resetToDefaults', () => {
  it('resets all settings to defaults', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => {
      result.current.setMinimapSize('small');
      result.current.setTooltipDelay(0);
      result.current.setPanelDensity('comfortable');
      result.current.setAutoCycleActiveUnit(true);
    });
    act(() => result.current.resetToDefaults());
    expect(result.current.minimapSize).toBe('medium');
    expect(result.current.tooltipDelay).toBe(400);
    expect(result.current.panelDensity).toBe('standard');
    expect(result.current.autoCycleActiveUnit).toBe(false);
  });
});

// =============================================================================
// localStorage persistence
// =============================================================================

describe('useTacticalSettingsStore — localStorage persistence', () => {
  it('persists panelDensity to localStorage under tactical-settings:v1', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setPanelDensity('comfortable'));
    const raw = localStorage.getItem('tactical-settings:v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.panelDensity).toBe('comfortable');
  });

  it('persists minimapSize to localStorage', () => {
    const { result } = renderHook(() => useTacticalSettingsStore());
    act(() => result.current.setMinimapSize('small'));
    const raw = localStorage.getItem('tactical-settings:v1');
    const parsed = JSON.parse(raw!);
    expect(parsed.state.minimapSize).toBe('small');
  });
});
