/**
 * End-to-end persisted-store hydration boundary tests.
 *
 * These exercise the real settings stores' `persist` config against a
 * `localStorage` payload that has been deliberately corrupted, proving the
 * `validation-patterns` boundary behaviour: a malformed payload is discarded
 * and the store rehydrates to its default state without throwing.
 *
 * Each store is re-imported with `jest.isolateModules` after `localStorage`
 * is seeded, because `persist` reads `localStorage` at store-creation time.
 *
 * @spec openspec/specs/validation-patterns/spec.md
 */

describe('Persisted store hydration boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  describe('useThemeStore (theme-preference)', () => {
    it('hydrates a valid persisted payload', () => {
      localStorage.setItem(
        'theme-preference',
        JSON.stringify({ state: { theme: 'dark' }, version: 0 }),
      );
      jest.isolateModules(() => {
        const { useThemeStore } = require('@/stores/useThemeStore');
        expect(useThemeStore.getState().theme).toBe('dark');
      });
    });

    it('falls back to default state on a corrupt payload', () => {
      // `theme` is not a valid enum member — schema violation.
      localStorage.setItem(
        'theme-preference',
        JSON.stringify({ state: { theme: 'chartreuse' }, version: 0 }),
      );
      jest.isolateModules(() => {
        const { useThemeStore } = require('@/stores/useThemeStore');
        // Default theme is 'light'.
        expect(useThemeStore.getState().theme).toBe('light');
      });
    });

    it('does not throw while hydrating a corrupt payload', () => {
      localStorage.setItem(
        'theme-preference',
        JSON.stringify({ state: { theme: 42 }, version: 0 }),
      );
      expect(() => {
        jest.isolateModules(() => {
          require('@/stores/useThemeStore');
        });
      }).not.toThrow();
    });
  });

  describe('useAccessibilityStore (mekstation-accessibility)', () => {
    it('hydrates a valid persisted payload', () => {
      localStorage.setItem(
        'mekstation-accessibility',
        JSON.stringify({
          state: { highContrast: true, reduceMotion: true },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const {
          useAccessibilityStore,
        } = require('@/stores/useAccessibilityStore');
        expect(useAccessibilityStore.getState().highContrast).toBe(true);
        expect(useAccessibilityStore.getState().reduceMotion).toBe(true);
      });
    });

    it('falls back to default state on a corrupt payload', () => {
      // `highContrast` is a string — schema violation.
      localStorage.setItem(
        'mekstation-accessibility',
        JSON.stringify({
          state: { highContrast: 'yes', reduceMotion: false },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const {
          useAccessibilityStore,
        } = require('@/stores/useAccessibilityStore');
        // Defaults are both false.
        expect(useAccessibilityStore.getState().highContrast).toBe(false);
        expect(useAccessibilityStore.getState().reduceMotion).toBe(false);
      });
    });
  });

  describe('useAppearanceStore (mekstation-appearance)', () => {
    it('hydrates a valid persisted payload', () => {
      localStorage.setItem(
        'mekstation-appearance',
        JSON.stringify({
          state: {
            accentColor: 'cyan',
            fontSize: 'large',
            animationLevel: 'reduced',
            compactMode: true,
            uiTheme: 'neon',
          },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const { useAppearanceStore } = require('@/stores/useAppearanceStore');
        expect(useAppearanceStore.getState().accentColor).toBe('cyan');
        expect(useAppearanceStore.getState().uiTheme).toBe('neon');
      });
    });

    it('falls back to default state on a corrupt payload', () => {
      // `accentColor` is not a valid enum member, and `compactMode` is missing.
      localStorage.setItem(
        'mekstation-appearance',
        JSON.stringify({
          state: { accentColor: 'puce', fontSize: 'large' },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const { useAppearanceStore } = require('@/stores/useAppearanceStore');
        // Defaults: accentColor 'amber', uiTheme 'default'.
        expect(useAppearanceStore.getState().accentColor).toBe('amber');
        expect(useAppearanceStore.getState().uiTheme).toBe('default');
      });
    });
  });

  describe('useUIBehaviorStore (mekstation-ui-behavior)', () => {
    it('falls back to default state on a corrupt payload', () => {
      localStorage.setItem(
        'mekstation-ui-behavior',
        JSON.stringify({
          state: { sidebarDefaultCollapsed: 'maybe' },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const { useUIBehaviorStore } = require('@/stores/useUIBehaviorStore');
        // Defaults: confirmOnClose true, showTooltips true.
        expect(useUIBehaviorStore.getState().sidebarDefaultCollapsed).toBe(
          false,
        );
        expect(useUIBehaviorStore.getState().confirmOnClose).toBe(true);
      });
    });
  });

  describe('useCustomizerSettingsStore (mekstation-customizer-settings)', () => {
    it('falls back to default state on a corrupt payload', () => {
      localStorage.setItem(
        'mekstation-customizer-settings',
        JSON.stringify({
          state: { armorDiagramMode: 'wireframe' },
          version: 0,
        }),
      );
      jest.isolateModules(() => {
        const {
          useCustomizerSettingsStore,
        } = require('@/stores/useCustomizerSettingsStore');
        // Defaults: armorDiagramMode 'silhouette', armorDiagramVariant 'clean-tech'.
        expect(useCustomizerSettingsStore.getState().armorDiagramMode).toBe(
          'silhouette',
        );
        expect(useCustomizerSettingsStore.getState().armorDiagramVariant).toBe(
          'clean-tech',
        );
      });
    });
  });
});
