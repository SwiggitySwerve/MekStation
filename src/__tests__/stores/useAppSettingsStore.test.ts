import { act, renderHook } from '@testing-library/react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

// Mock localStorage
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

describe('useAppSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to defaults
    const { result } = renderHook(() => useAppSettingsStore());
    act(() => {
      result.current.resetToDefaults();
    });
  });

  describe('Default values', () => {
    it('should have amber as default accent color', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.accentColor).toBe('amber');
    });

    it('should have medium as default font size', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.fontSize).toBe('medium');
    });

    it('should have full as default animation level', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.animationLevel).toBe('full');
    });

    it('should have clean-tech as default armor diagram variant', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.armorDiagramVariant).toBe('clean-tech');
    });

    it('should have showArmorDiagramSelector enabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.showArmorDiagramSelector).toBe(true);
    });

    it('should have compactMode disabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.compactMode).toBe(false);
    });

    it('should have confirmOnClose enabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.confirmOnClose).toBe(true);
    });

    it('should have showTooltips enabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.showTooltips).toBe(true);
    });

    it('should have highContrast disabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.highContrast).toBe(false);
    });

    it('should have reduceMotion disabled by default', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      expect(result.current.reduceMotion).toBe(false);
    });
  });

  describe('Accent color', () => {
    it('should update accent color', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setAccentColor('cyan');
      });

      expect(result.current.accentColor).toBe('cyan');
    });

    it('should accept all valid accent colors', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      const colors = [
        'amber',
        'cyan',
        'emerald',
        'rose',
        'violet',
        'blue',
      ] as const;

      colors.forEach((color) => {
        act(() => {
          result.current.setAccentColor(color);
        });
        expect(result.current.accentColor).toBe(color);
      });
    });
  });

  describe('Font size', () => {
    it('should update font size', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setFontSize('large');
      });

      expect(result.current.fontSize).toBe('large');
    });

    it('should accept all valid font sizes', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      const sizes = ['small', 'medium', 'large'] as const;

      sizes.forEach((size) => {
        act(() => {
          result.current.setFontSize(size);
        });
        expect(result.current.fontSize).toBe(size);
      });
    });
  });

  describe('Animation level', () => {
    it('should update animation level', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setAnimationLevel('reduced');
      });

      expect(result.current.animationLevel).toBe('reduced');
    });

    it('should accept all valid animation levels', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      const levels = ['full', 'reduced', 'none'] as const;

      levels.forEach((level) => {
        act(() => {
          result.current.setAnimationLevel(level);
        });
        expect(result.current.animationLevel).toBe(level);
      });
    });
  });

  describe('Armor diagram variant', () => {
    it('should update armor diagram variant', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setArmorDiagramVariant('neon-operator');
      });

      expect(result.current.armorDiagramVariant).toBe('neon-operator');
    });

    it('should accept all valid variants', () => {
      const { result } = renderHook(() => useAppSettingsStore());
      const variants = [
        'clean-tech',
        'neon-operator',
        'tactical-hud',
        'premium-material',
      ] as const;

      variants.forEach((variant) => {
        act(() => {
          result.current.setArmorDiagramVariant(variant);
        });
        expect(result.current.armorDiagramVariant).toBe(variant);
      });
    });
  });

  describe('Boolean toggles', () => {
    it('should toggle compact mode', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setCompactMode(true);
      });
      expect(result.current.compactMode).toBe(true);

      act(() => {
        result.current.setCompactMode(false);
      });
      expect(result.current.compactMode).toBe(false);
    });

    it('should toggle sidebar default collapsed', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setSidebarDefaultCollapsed(true);
      });
      expect(result.current.sidebarDefaultCollapsed).toBe(true);
    });

    it('should toggle confirm on close', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setConfirmOnClose(false);
      });
      expect(result.current.confirmOnClose).toBe(false);
    });

    it('should toggle show tooltips', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setShowTooltips(false);
      });
      expect(result.current.showTooltips).toBe(false);
    });

    it('should toggle high contrast', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setHighContrast(true);
      });
      expect(result.current.highContrast).toBe(true);
    });

    it('should toggle reduce motion', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setReduceMotion(true);
      });
      expect(result.current.reduceMotion).toBe(true);
    });

    it('should toggle show armor diagram selector', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.setShowArmorDiagramSelector(false);
      });
      expect(result.current.showArmorDiagramSelector).toBe(false);
    });
  });

  describe('Reset to defaults', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Change multiple settings
      act(() => {
        result.current.setAccentColor('violet');
        result.current.setFontSize('large');
        result.current.setAnimationLevel('none');
        result.current.setArmorDiagramVariant('tactical-hud');
        result.current.setCompactMode(true);
        result.current.setHighContrast(true);
      });

      // Verify changes
      expect(result.current.accentColor).toBe('violet');
      expect(result.current.fontSize).toBe('large');
      expect(result.current.animationLevel).toBe('none');
      expect(result.current.armorDiagramVariant).toBe('tactical-hud');
      expect(result.current.compactMode).toBe(true);
      expect(result.current.highContrast).toBe(true);

      // Reset
      act(() => {
        result.current.resetToDefaults();
      });

      // Verify defaults
      expect(result.current.accentColor).toBe('amber');
      expect(result.current.fontSize).toBe('medium');
      expect(result.current.animationLevel).toBe('full');
      expect(result.current.armorDiagramVariant).toBe('clean-tech');
      expect(result.current.compactMode).toBe(false);
      expect(result.current.highContrast).toBe(false);
    });
  });

  describe('UITheme to ArmorDiagramVariant synchronization', () => {
    it('should sync armorDiagramVariant when setUITheme is called', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Default should be clean-tech for default theme
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.armorDiagramVariant).toBe('clean-tech');

      // Change to neon theme - armor diagram should NOT change (independent)
      act(() => {
        result.current.setUITheme('neon');
      });
      expect(result.current.uiTheme).toBe('neon');
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Unchanged

      // Change to tactical theme - armor diagram should still be unchanged
      act(() => {
        result.current.setUITheme('tactical');
      });
      expect(result.current.uiTheme).toBe('tactical');
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Still unchanged

      // Change back to default
      act(() => {
        result.current.setUITheme('default');
      });
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Still unchanged
    });

    it('should NOT sync armorDiagramVariant during draft preview with setDraftUITheme', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Initialize draft
      act(() => {
        result.current.initDraftAppearance();
      });

      // Change draft theme to neon - armor diagram should NOT change
      act(() => {
        result.current.setDraftUITheme('neon');
      });
      expect(result.current.draftAppearance?.uiTheme).toBe('neon');
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Unchanged

      // Change draft theme to tactical - armor diagram still unchanged
      act(() => {
        result.current.setDraftUITheme('tactical');
      });
      expect(result.current.draftAppearance?.uiTheme).toBe('tactical');
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Still unchanged
    });

    it('should preserve armorDiagramVariant when reverting appearance changes', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Verify initial state
      expect(result.current.uiTheme).toBe('default');
      expect(result.current.armorDiagramVariant).toBe('clean-tech');

      // Change armor diagram variant independently
      act(() => {
        result.current.setArmorDiagramVariant('neon-operator');
      });
      expect(result.current.armorDiagramVariant).toBe('neon-operator');

      // Initialize draft and change theme
      act(() => {
        result.current.initDraftAppearance();
        result.current.setDraftUITheme('tactical');
      });

      // Diagram variant should still be neon-operator (unchanged by theme)
      expect(result.current.armorDiagramVariant).toBe('neon-operator');

      // Revert - armor diagram variant should be preserved
      act(() => {
        result.current.revertAppearance();
      });

      expect(result.current.draftAppearance).toBeNull();
      expect(result.current.uiTheme).toBe('default'); // Saved theme unchanged
      expect(result.current.armorDiagramVariant).toBe('neon-operator'); // Preserved
    });

    it('should allow fully independent armorDiagramVariant changes', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Set armor diagram to megamek
      act(() => {
        result.current.setArmorDiagramVariant('megamek');
      });
      expect(result.current.armorDiagramVariant).toBe('megamek');
      expect(result.current.uiTheme).toBe('default'); // Theme unchanged

      // Change theme - diagram should NOT change
      act(() => {
        result.current.setUITheme('neon');
      });
      expect(result.current.armorDiagramVariant).toBe('megamek'); // Still megamek
      expect(result.current.uiTheme).toBe('neon');
    });
  });

  describe('Customizer draft/save system', () => {
    it('should initialize draft with current values', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
      });

      expect(result.current.draftCustomizer).toEqual({
        armorDiagramMode: 'silhouette',
        armorDiagramVariant: 'clean-tech',
      });
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });

    it('should update draft without persisting', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
      });

      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'megamek',
      );
      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Not persisted
      expect(result.current.hasUnsavedCustomizer).toBe(true);
    });

    it('should persist on save', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
        result.current.saveCustomizer();
      });

      expect(result.current.armorDiagramVariant).toBe('megamek');
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });

    it('should revert on revertCustomizer', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
        result.current.revertCustomizer();
      });

      expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Original
      expect(result.current.draftCustomizer).toBeNull();
    });

    it('getEffectiveArmorDiagramVariant returns draft when present', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('tactical-hud');
      });

      expect(result.current.getEffectiveArmorDiagramVariant()).toBe(
        'tactical-hud',
      );
    });

    it('getEffectiveArmorDiagramVariant returns saved when no draft', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Set a saved value
      act(() => {
        result.current.setArmorDiagramVariant('neon-operator');
      });

      // Without initializing draft, should return saved value
      expect(result.current.getEffectiveArmorDiagramVariant()).toBe(
        'neon-operator',
      );
    });

    it('should update draft armor diagram mode without persisting', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });

      expect(result.current.draftCustomizer?.armorDiagramMode).toBe(
        'schematic',
      );
      expect(result.current.armorDiagramMode).toBe('silhouette'); // Not persisted
      expect(result.current.hasUnsavedCustomizer).toBe(true);
    });

    it('getEffectiveArmorDiagramMode returns draft when present', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });

      expect(result.current.getEffectiveArmorDiagramMode()).toBe('schematic');
    });

    it('getEffectiveArmorDiagramMode returns saved when no draft', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Set a saved value
      act(() => {
        result.current.setArmorDiagramMode('schematic');
      });

      // Without initializing draft, should return saved value
      expect(result.current.getEffectiveArmorDiagramMode()).toBe('schematic');
    });

    it('should preserve both mode and variant when setting only one', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramMode('schematic');
      });

      // Variant should be preserved from initial state
      expect(result.current.draftCustomizer?.armorDiagramMode).toBe(
        'schematic',
      );
      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'clean-tech',
      );

      act(() => {
        result.current.setDraftArmorDiagramVariant('megamek');
      });

      // Mode should be preserved from draft
      expect(result.current.draftCustomizer?.armorDiagramMode).toBe(
        'schematic',
      );
      expect(result.current.draftCustomizer?.armorDiagramVariant).toBe(
        'megamek',
      );
    });

    it('should save both mode and variant together', () => {
      const { result } = renderHook(() => useAppSettingsStore());

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

    it('should reset draft customizer state on resetToDefaults', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      act(() => {
        result.current.initDraftCustomizer();
        result.current.setDraftArmorDiagramVariant('megamek');
      });

      expect(result.current.draftCustomizer).not.toBeNull();
      expect(result.current.hasUnsavedCustomizer).toBe(true);

      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.draftCustomizer).toBeNull();
      expect(result.current.hasUnsavedCustomizer).toBe(false);
    });

    it('saveCustomizer should do nothing when draftCustomizer is null', () => {
      const { result } = renderHook(() => useAppSettingsStore());

      // Set a custom value first
      act(() => {
        result.current.setArmorDiagramVariant('megamek');
      });

      // Call saveCustomizer without initializing draft
      act(() => {
        result.current.saveCustomizer();
      });

      // Should not change anything
      expect(result.current.armorDiagramVariant).toBe('megamek');
    });
  });
});
