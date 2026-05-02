/**
 * Settings stores — focused-store coverage.
 *
 * Replaces the legacy `useAppSettingsStore.test.ts` after the deprecated
 * combined shim was removed (PR3 cleanup). Each behavior previously asserted
 * through the shim now targets the focused store that owns the slice:
 *
 * - useAppearanceStore: accent color, font size, animation level, compact
 *   mode, UI theme + draft/save/revert lifecycle.
 * - useCustomizerSettingsStore: armor diagram mode + variant + draft/save
 *   lifecycle + selector flag.
 * - useAccessibilityStore: high contrast, reduce motion.
 * - useUIBehaviorStore: sidebar default, confirm-on-close, tooltips.
 *
 * Cross-slice independence (theme should not mutate armor diagram, etc.) is
 * inherent now that the slices live in physically separate stores, but we
 * still cover it explicitly to lock the public guarantee.
 */

import { act, renderHook } from '@testing-library/react';

import { useAccessibilityStore } from '@/stores/useAccessibilityStore';
import { useAppearanceStore } from '@/stores/useAppearanceStore';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { useUIBehaviorStore } from '@/stores/useUIBehaviorStore';

// Mock localStorage so persistence middleware doesn't bleed across tests.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useAppearanceStore.getState().resetToDefaults();
    useCustomizerSettingsStore.getState().resetToDefaults();
    useAccessibilityStore.getState().resetToDefaults();
    useUIBehaviorStore.getState().resetToDefaults();
  });
});

describe('useAppearanceStore', () => {
  describe('Default values', () => {
    it('defaults accentColor to amber', () => {
      const { result } = renderHook(() => useAppearanceStore());
      expect(result.current.accentColor).toBe('amber');
    });

    it('defaults fontSize to medium', () => {
      const { result } = renderHook(() => useAppearanceStore());
      expect(result.current.fontSize).toBe('medium');
    });

    it('defaults animationLevel to full', () => {
      const { result } = renderHook(() => useAppearanceStore());
      expect(result.current.animationLevel).toBe('full');
    });

    it('defaults uiTheme to default', () => {
      const { result } = renderHook(() => useAppearanceStore());
      expect(result.current.uiTheme).toBe('default');
    });

    it('defaults compactMode to false', () => {
      const { result } = renderHook(() => useAppearanceStore());
      expect(result.current.compactMode).toBe(false);
    });
  });

  describe('Accent color', () => {
    it('updates accent color', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setAccentColor('cyan'));
      expect(result.current.accentColor).toBe('cyan');
    });

    it('accepts every valid accent color', () => {
      const { result } = renderHook(() => useAppearanceStore());
      const colors = [
        'amber',
        'cyan',
        'emerald',
        'rose',
        'violet',
        'blue',
      ] as const;
      colors.forEach((color) => {
        act(() => result.current.setAccentColor(color));
        expect(result.current.accentColor).toBe(color);
      });
    });
  });

  describe('Font size', () => {
    it('updates font size', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setFontSize('large'));
      expect(result.current.fontSize).toBe('large');
    });

    it('accepts every valid font size', () => {
      const { result } = renderHook(() => useAppearanceStore());
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach((size) => {
        act(() => result.current.setFontSize(size));
        expect(result.current.fontSize).toBe(size);
      });
    });
  });

  describe('Animation level', () => {
    it('updates animation level', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setAnimationLevel('reduced'));
      expect(result.current.animationLevel).toBe('reduced');
    });

    it('accepts every valid level', () => {
      const { result } = renderHook(() => useAppearanceStore());
      const levels = ['full', 'reduced', 'none'] as const;
      levels.forEach((level) => {
        act(() => result.current.setAnimationLevel(level));
        expect(result.current.animationLevel).toBe(level);
      });
    });
  });

  describe('Compact mode', () => {
    it('toggles compact mode', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setCompactMode(true));
      expect(result.current.compactMode).toBe(true);
      act(() => result.current.setCompactMode(false));
      expect(result.current.compactMode).toBe(false);
    });
  });

  describe('UI theme', () => {
    it('updates ui theme', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setUITheme('neon'));
      expect(result.current.uiTheme).toBe('neon');
    });

    it('accepts every valid theme', () => {
      const { result } = renderHook(() => useAppearanceStore());
      const themes = ['default', 'neon', 'tactical', 'minimal'] as const;
      themes.forEach((theme) => {
        act(() => result.current.setUITheme(theme));
        expect(result.current.uiTheme).toBe(theme);
      });
    });
  });

  describe('Draft / save / revert lifecycle', () => {
    it('initializes draft from current saved state', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.initDraftAppearance());
      expect(result.current.draftAppearance).toEqual({
        accentColor: 'amber',
        fontSize: 'medium',
        animationLevel: 'full',
        compactMode: false,
        uiTheme: 'default',
      });
      expect(result.current.hasUnsavedUITheme).toBe(false);
      expect(result.current.hasUnsavedOtherAppearance).toBe(false);
    });

    it('setDraftAccentColor updates draft only and flags hasUnsavedOtherAppearance', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setDraftAccentColor('cyan'));
      expect(result.current.draftAppearance?.accentColor).toBe('cyan');
      expect(result.current.accentColor).toBe('amber');
      expect(result.current.hasUnsavedOtherAppearance).toBe(true);
      expect(result.current.hasUnsavedUITheme).toBe(false);
    });

    it('setDraftUITheme updates draft only and flags hasUnsavedUITheme', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => result.current.setDraftUITheme('neon'));
      expect(result.current.draftAppearance?.uiTheme).toBe('neon');
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.hasUnsavedUITheme).toBe(true);
      expect(result.current.hasUnsavedOtherAppearance).toBe(false);
    });

    it('saveUITheme commits only the theme slice and clears its unsaved flag', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setDraftAccentColor('cyan');
        result.current.setDraftUITheme('neon');
        result.current.saveUITheme();
      });
      expect(result.current.uiTheme).toBe('neon');
      expect(result.current.hasUnsavedUITheme).toBe(false);
      // Other appearance still draft-only.
      expect(result.current.accentColor).toBe('amber');
      expect(result.current.hasUnsavedOtherAppearance).toBe(true);
    });

    it('saveOtherAppearance commits non-theme settings only', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setDraftAccentColor('cyan');
        result.current.setDraftFontSize('large');
        result.current.setDraftUITheme('neon');
        result.current.saveOtherAppearance();
      });
      expect(result.current.accentColor).toBe('cyan');
      expect(result.current.fontSize).toBe('large');
      expect(result.current.hasUnsavedOtherAppearance).toBe(false);
      // Theme still draft-only.
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.hasUnsavedUITheme).toBe(true);
    });

    it('revertAppearance discards draft and clears flags', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setDraftAccentColor('cyan');
        result.current.setDraftUITheme('neon');
        result.current.revertAppearance();
      });
      expect(result.current.draftAppearance).toBeNull();
      expect(result.current.hasUnsavedUITheme).toBe(false);
      expect(result.current.hasUnsavedOtherAppearance).toBe(false);
    });

    it('getEffectiveAccentColor / UITheme / FontSize prefer draft over saved', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setDraftAccentColor('cyan');
        result.current.setDraftUITheme('neon');
        result.current.setDraftFontSize('large');
      });
      expect(result.current.getEffectiveAccentColor()).toBe('cyan');
      expect(result.current.getEffectiveUITheme()).toBe('neon');
      expect(result.current.getEffectiveFontSize()).toBe('large');
    });

    it('getEffective getters fall back to saved when no draft', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setAccentColor('rose');
        result.current.setUITheme('tactical');
        result.current.setFontSize('small');
      });
      expect(result.current.getEffectiveAccentColor()).toBe('rose');
      expect(result.current.getEffectiveUITheme()).toBe('tactical');
      expect(result.current.getEffectiveFontSize()).toBe('small');
    });
  });

  describe('Reset', () => {
    it('resetToDefaults restores defaults and clears draft state', () => {
      const { result } = renderHook(() => useAppearanceStore());
      act(() => {
        result.current.setAccentColor('violet');
        result.current.setFontSize('large');
        result.current.setAnimationLevel('none');
        result.current.setCompactMode(true);
        result.current.setUITheme('neon');
        result.current.setDraftAccentColor('cyan');
      });
      act(() => result.current.resetToDefaults());
      expect(result.current.accentColor).toBe('amber');
      expect(result.current.fontSize).toBe('medium');
      expect(result.current.animationLevel).toBe('full');
      expect(result.current.compactMode).toBe(false);
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.draftAppearance).toBeNull();
      expect(result.current.hasUnsavedUITheme).toBe(false);
      expect(result.current.hasUnsavedOtherAppearance).toBe(false);
    });
  });
});

describe('useCustomizerSettingsStore', () => {
  describe('Default values', () => {
    it('defaults armorDiagramMode to silhouette', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      expect(result.current.armorDiagramMode).toBe('silhouette');
    });

    it('defaults armorDiagramVariant to clean-tech', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      expect(result.current.armorDiagramVariant).toBe('clean-tech');
    });

    it('defaults showArmorDiagramSelector to true', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      expect(result.current.showArmorDiagramSelector).toBe(true);
    });
  });

  describe('Direct setters', () => {
    it('setArmorDiagramVariant accepts every variant', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      const variants = [
        'clean-tech',
        'neon-operator',
        'tactical-hud',
        'premium-material',
        'megamek',
      ] as const;
      variants.forEach((variant) => {
        act(() => result.current.setArmorDiagramVariant(variant));
        expect(result.current.armorDiagramVariant).toBe(variant);
      });
    });

    it('setArmorDiagramMode toggles between schematic and silhouette', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.setArmorDiagramMode('schematic'));
      expect(result.current.armorDiagramMode).toBe('schematic');
      act(() => result.current.setArmorDiagramMode('silhouette'));
      expect(result.current.armorDiagramMode).toBe('silhouette');
    });

    it('setShowArmorDiagramSelector toggles the flag', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.setShowArmorDiagramSelector(false));
      expect(result.current.showArmorDiagramSelector).toBe(false);
    });
  });

  describe('Draft / save / revert lifecycle', () => {
    it('initDraftCustomizer seeds draft from current saved state', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.initDraftCustomizer());
      expect(result.current.draftCustomizer).toEqual({
        armorDiagramMode: 'silhouette',
        armorDiagramVariant: 'clean-tech',
      });
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });

    it('setDraftArmorDiagramVariant flags unsaved without persisting', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
      });
      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'megamek',
      );
      expect(result.current.armorDiagramVariant).toBe('clean-tech');
      expect(result.current.hasUnsavedCustomizer).toBe(true);
    });

    it('setDraftArmorDiagramMode flags unsaved without persisting', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });
      expect(result.current.draftCustomizer?.armorDiagramMode).toBe(
        'schematic',
      );
      expect(result.current.armorDiagramMode).toBe('silhouette');
      expect(result.current.hasUnsavedCustomizer).toBe(true);
    });

    it('saveCustomizer persists both mode and variant atomically', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
        result.current.setDraftArmorDiagramVariant('megamek');
        result.current.saveCustomizer();
      });
      expect(result.current.armorDiagramMode).toBe('schematic');
      expect(result.current.armorDiagramVariant).toBe('megamek');
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });

    it('revertCustomizer drops draft and keeps saved state intact', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
        result.current.revertCustomizer();
      });
      expect(result.current.armorDiagramVariant).toBe('clean-tech');
      expect(result.current.draftCustomizer).toBeNull();
    });

    it('getEffectiveArmorDiagramVariant prefers draft over saved', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('tactical-hud');
      });
      expect(result.current.getEffectiveArmorDiagramVariant()).toBe(
        'tactical-hud',
      );
    });

    it('getEffectiveArmorDiagramVariant falls back to saved when no draft', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.setArmorDiagramVariant('neon-operator'));
      expect(result.current.getEffectiveArmorDiagramVariant()).toBe(
        'neon-operator',
      );
    });

    it('getEffectiveArmorDiagramMode prefers draft over saved', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });
      expect(result.current.getEffectiveArmorDiagramMode()).toBe('schematic');
    });

    it('getEffectiveArmorDiagramMode falls back to saved when no draft', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.setArmorDiagramMode('schematic'));
      expect(result.current.getEffectiveArmorDiagramMode()).toBe('schematic');
    });

    it('preserves the other draft field when only one is updated', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });
      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'clean-tech',
      );

      act(() => result.current.setDraftArmorDiagramVariant('megamek'));
      expect(result.current.draftCustomizer?.armorDiagramMode).toBe(
        'schematic',
      );
      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'megamek',
      );
    });

    it('saveCustomizer is a no-op when draftCustomizer is null', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => result.current.setArmorDiagramVariant('megamek'));
      act(() => result.current.saveCustomizer());
      expect(result.current.armorDiagramVariant).toBe('megamek');
    });

    it('resetToDefaults clears draft customizer state', () => {
      const { result } = renderHook(() => useCustomizerSettingsStore());
      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
      });
      expect(result.current.draftCustomizer).not.toBeNull();
      expect(result.current.hasUnsavedCustomizer).toBe(true);
      act(() => result.current.resetToDefaults());
      expect(result.current.draftCustomizer).toBeNull();
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });
  });
});

describe('useAccessibilityStore', () => {
  it('defaults highContrast / reduceMotion to false', () => {
    const { result } = renderHook(() => useAccessibilityStore());
    expect(result.current.highContrast).toBe(false);
    expect(result.current.reduceMotion).toBe(false);
  });

  it('toggles high contrast', () => {
    const { result } = renderHook(() => useAccessibilityStore());
    act(() => result.current.setHighContrast(true));
    expect(result.current.highContrast).toBe(true);
  });

  it('toggles reduce motion', () => {
    const { result } = renderHook(() => useAccessibilityStore());
    act(() => result.current.setReduceMotion(true));
    expect(result.current.reduceMotion).toBe(true);
  });

  it('resetToDefaults restores both flags', () => {
    const { result } = renderHook(() => useAccessibilityStore());
    act(() => {
      result.current.setHighContrast(true);
      result.current.setReduceMotion(true);
    });
    act(() => result.current.resetToDefaults());
    expect(result.current.highContrast).toBe(false);
    expect(result.current.reduceMotion).toBe(false);
  });
});

describe('useUIBehaviorStore', () => {
  it('defaults sidebarDefaultCollapsed to false, confirmOnClose / showTooltips to true', () => {
    const { result } = renderHook(() => useUIBehaviorStore());
    expect(result.current.sidebarDefaultCollapsed).toBe(false);
    expect(result.current.confirmOnClose).toBe(true);
    expect(result.current.showTooltips).toBe(true);
  });

  it('toggles sidebar default collapsed', () => {
    const { result } = renderHook(() => useUIBehaviorStore());
    act(() => result.current.setSidebarDefaultCollapsed(true));
    expect(result.current.sidebarDefaultCollapsed).toBe(true);
  });

  it('toggles confirm on close', () => {
    const { result } = renderHook(() => useUIBehaviorStore());
    act(() => result.current.setConfirmOnClose(false));
    expect(result.current.confirmOnClose).toBe(false);
  });

  it('toggles show tooltips', () => {
    const { result } = renderHook(() => useUIBehaviorStore());
    act(() => result.current.setShowTooltips(false));
    expect(result.current.showTooltips).toBe(false);
  });

  it('resetToDefaults restores all behavior flags', () => {
    const { result } = renderHook(() => useUIBehaviorStore());
    act(() => {
      result.current.setSidebarDefaultCollapsed(true);
      result.current.setConfirmOnClose(false);
      result.current.setShowTooltips(false);
    });
    act(() => result.current.resetToDefaults());
    expect(result.current.sidebarDefaultCollapsed).toBe(false);
    expect(result.current.confirmOnClose).toBe(true);
    expect(result.current.showTooltips).toBe(true);
  });
});

describe('Cross-slice independence', () => {
  it('changing the UI theme does not mutate armorDiagramVariant', () => {
    const appearance = renderHook(() => useAppearanceStore());
    const customizer = renderHook(() => useCustomizerSettingsStore());

    expect(customizer.result.current.armorDiagramVariant).toBe('clean-tech');

    act(() => appearance.result.current.setUITheme('neon'));
    expect(appearance.result.current.uiTheme).toBe('neon');
    expect(customizer.result.current.armorDiagramVariant).toBe('clean-tech');

    act(() => appearance.result.current.setUITheme('tactical'));
    expect(customizer.result.current.armorDiagramVariant).toBe('clean-tech');
  });

  it('reverting an appearance draft does not touch the armor variant', () => {
    const appearance = renderHook(() => useAppearanceStore());
    const customizer = renderHook(() => useCustomizerSettingsStore());

    act(() =>
      customizer.result.current.setArmorDiagramVariant('neon-operator'),
    );
    act(() => {
      appearance.result.current.initDraftAppearance();
      appearance.result.current.setDraftUITheme('tactical');
    });

    expect(customizer.result.current.armorDiagramVariant).toBe('neon-operator');

    act(() => appearance.result.current.revertAppearance());

    expect(appearance.result.current.draftAppearance).toBeNull();
    expect(appearance.result.current.uiTheme).toBe('default');
    expect(customizer.result.current.armorDiagramVariant).toBe('neon-operator');
  });

  it('changing armor variant after a theme change leaves the theme alone', () => {
    const appearance = renderHook(() => useAppearanceStore());
    const customizer = renderHook(() => useCustomizerSettingsStore());

    act(() => customizer.result.current.setArmorDiagramVariant('megamek'));
    expect(appearance.result.current.uiTheme).toBe('default');

    act(() => appearance.result.current.setUITheme('neon'));
    expect(customizer.result.current.armorDiagramVariant).toBe('megamek');
    expect(appearance.result.current.uiTheme).toBe('neon');
  });
});
