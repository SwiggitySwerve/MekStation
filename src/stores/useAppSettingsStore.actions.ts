import { useAccessibilityStore } from './useAccessibilityStore';
import {
  useAppearanceStore,
  type AccentColor,
  type FontSize,
  type AnimationLevel,
  type UITheme,
} from './useAppearanceStore';
import {
  useCustomizerSettingsStore,
  type ArmorDiagramMode,
  type ArmorDiagramVariant,
} from './useCustomizerSettingsStore';
import { useUIBehaviorStore } from './useUIBehaviorStore';

export function createAppearanceActions(
  set: (partial: Partial<unknown>) => void,
): {
  setAccentColor: (color: AccentColor) => void;
  setFontSize: (size: FontSize) => void;
  setAnimationLevel: (level: AnimationLevel) => void;
  setCompactMode: (compact: boolean) => void;
  setUITheme: (theme: UITheme) => void;
} {
  return {
    setAccentColor: (color: AccentColor): void => {
      useAppearanceStore.getState().setAccentColor(color);
      set({ accentColor: color });
    },
    setFontSize: (size: FontSize): void => {
      useAppearanceStore.getState().setFontSize(size);
      set({ fontSize: size });
    },
    setAnimationLevel: (level: AnimationLevel): void => {
      useAppearanceStore.getState().setAnimationLevel(level);
      set({ animationLevel: level });
    },
    setCompactMode: (compact: boolean): void => {
      useAppearanceStore.getState().setCompactMode(compact);
      set({ compactMode: compact });
    },
    setUITheme: (theme: UITheme): void => {
      useAppearanceStore.getState().setUITheme(theme);
      set({ uiTheme: theme });
    },
  };
}

export function createDraftAppearanceActions(
  set: (partial: Partial<unknown>) => void,
): {
  setDraftAccentColor: (color: AccentColor) => void;
  setDraftFontSize: (size: FontSize) => void;
  setDraftAnimationLevel: (level: AnimationLevel) => void;
  setDraftCompactMode: (compact: boolean) => void;
  setDraftUITheme: (theme: UITheme) => void;
  initDraftAppearance: () => void;
  saveUITheme: () => void;
  saveOtherAppearance: () => void;
  revertAppearance: () => void;
  getEffectiveAccentColor: () => AccentColor;
  getEffectiveUITheme: () => UITheme;
  getEffectiveFontSize: () => FontSize;
} {
  return {
    setDraftAccentColor: (color: AccentColor): void => {
      useAppearanceStore.getState().setDraftAccentColor(color);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            ...(s.draftAppearance ?? {
              accentColor: s.accentColor,
              fontSize: s.fontSize,
              animationLevel: s.animationLevel,
              compactMode: s.compactMode,
              uiTheme: s.uiTheme,
            }),
            accentColor: color,
          },
          hasUnsavedOtherAppearance: true,
        };
      });
    },

    setDraftFontSize: (size: FontSize): void => {
      useAppearanceStore.getState().setDraftFontSize(size);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            ...(s.draftAppearance ?? {
              accentColor: s.accentColor,
              fontSize: s.fontSize,
              animationLevel: s.animationLevel,
              compactMode: s.compactMode,
              uiTheme: s.uiTheme,
            }),
            fontSize: size,
          },
          hasUnsavedOtherAppearance: true,
        };
      });
    },

    setDraftAnimationLevel: (level: AnimationLevel): void => {
      useAppearanceStore.getState().setDraftAnimationLevel(level);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            ...(s.draftAppearance ?? {
              accentColor: s.accentColor,
              fontSize: s.fontSize,
              animationLevel: s.animationLevel,
              compactMode: s.compactMode,
              uiTheme: s.uiTheme,
            }),
            animationLevel: level,
          },
          hasUnsavedOtherAppearance: true,
        };
      });
    },

    setDraftCompactMode: (compact: boolean): void => {
      useAppearanceStore.getState().setDraftCompactMode(compact);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            ...(s.draftAppearance ?? {
              accentColor: s.accentColor,
              fontSize: s.fontSize,
              animationLevel: s.animationLevel,
              compactMode: s.compactMode,
              uiTheme: s.uiTheme,
            }),
            compactMode: compact,
          },
          hasUnsavedOtherAppearance: true,
        };
      });
    },

    setDraftUITheme: (theme: UITheme): void => {
      useAppearanceStore.getState().setDraftUITheme(theme);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            ...(s.draftAppearance ?? {
              accentColor: s.accentColor,
              fontSize: s.fontSize,
              animationLevel: s.animationLevel,
              compactMode: s.compactMode,
              uiTheme: s.uiTheme,
            }),
            uiTheme: theme,
          },
          hasUnsavedUITheme: true,
        };
      });
    },

    initDraftAppearance: (): void => {
      useAppearanceStore.getState().initDraftAppearance();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftAppearance: {
            accentColor: s.accentColor,
            fontSize: s.fontSize,
            animationLevel: s.animationLevel,
            compactMode: s.compactMode,
            uiTheme: s.uiTheme,
          },
          hasUnsavedUITheme: false,
          hasUnsavedOtherAppearance: false,
        };
      });
    },

    saveUITheme: (): void => {
      useAppearanceStore.getState().saveUITheme();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        if (!s.draftAppearance) return s;
        return {
          uiTheme: s.draftAppearance.uiTheme,
          hasUnsavedUITheme: false,
        };
      });
    },

    saveOtherAppearance: (): void => {
      useAppearanceStore.getState().saveOtherAppearance();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        if (!s.draftAppearance) return s;
        return {
          accentColor: s.draftAppearance.accentColor,
          fontSize: s.draftAppearance.fontSize,
          animationLevel: s.draftAppearance.animationLevel,
          compactMode: s.draftAppearance.compactMode,
          hasUnsavedOtherAppearance: false,
        };
      });
    },

    revertAppearance: () => {
      useAppearanceStore.getState().revertAppearance();
      set({
        draftAppearance: null,
        hasUnsavedUITheme: false,
        hasUnsavedOtherAppearance: false,
      });
    },

    getEffectiveAccentColor: () => {
      return useAppearanceStore.getState().getEffectiveAccentColor();
    },

    getEffectiveUITheme: () => {
      return useAppearanceStore.getState().getEffectiveUITheme();
    },

    getEffectiveFontSize: () => {
      return useAppearanceStore.getState().getEffectiveFontSize();
    },
  };
}

export function createCustomizerActions(
  set: (partial: Partial<unknown>) => void,
): {
  setDraftArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  initDraftCustomizer: () => void;
  saveCustomizer: () => void;
  revertCustomizer: () => void;
  getEffectiveArmorDiagramMode: () => ArmorDiagramMode;
  getEffectiveArmorDiagramVariant: () => ArmorDiagramVariant;
  setArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  setShowArmorDiagramSelector: (show: boolean) => void;
} {
  return {
    setDraftArmorDiagramMode: (mode: ArmorDiagramMode): void => {
      useCustomizerSettingsStore.getState().setDraftArmorDiagramMode(mode);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftCustomizer: {
            armorDiagramMode: mode,
            armorDiagramVariant:
              s.draftCustomizer?.armorDiagramVariant ?? s.armorDiagramVariant,
          },
          hasUnsavedCustomizer: true,
        };
      });
    },

    setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant): void => {
      useCustomizerSettingsStore
        .getState()
        .setDraftArmorDiagramVariant(variant);
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftCustomizer: {
            armorDiagramMode:
              s.draftCustomizer?.armorDiagramMode ?? s.armorDiagramMode,
            armorDiagramVariant: variant,
          },
          hasUnsavedCustomizer: true,
        };
      });
    },

    initDraftCustomizer: (): void => {
      useCustomizerSettingsStore.getState().initDraftCustomizer();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          draftCustomizer: {
            armorDiagramMode: s.armorDiagramMode,
            armorDiagramVariant: s.armorDiagramVariant,
          },
          hasUnsavedCustomizer: false,
        };
      });
    },

    saveCustomizer: (): void => {
      useCustomizerSettingsStore.getState().saveCustomizer();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        if (!s.draftCustomizer) return s;
        return {
          armorDiagramMode: s.draftCustomizer.armorDiagramMode,
          armorDiagramVariant: s.draftCustomizer.armorDiagramVariant,
          hasUnsavedCustomizer: false,
        };
      });
    },

    revertCustomizer: () => {
      useCustomizerSettingsStore.getState().revertCustomizer();
      set({
        draftCustomizer: null,
        hasUnsavedCustomizer: false,
      });
    },

    getEffectiveArmorDiagramMode: () => {
      return useCustomizerSettingsStore
        .getState()
        .getEffectiveArmorDiagramMode();
    },

    getEffectiveArmorDiagramVariant: () => {
      return useCustomizerSettingsStore
        .getState()
        .getEffectiveArmorDiagramVariant();
    },

    setArmorDiagramMode: (mode: ArmorDiagramMode) => {
      useCustomizerSettingsStore.getState().setArmorDiagramMode(mode);
      set({ armorDiagramMode: mode });
    },
    setArmorDiagramVariant: (variant: ArmorDiagramVariant) => {
      useCustomizerSettingsStore.getState().setArmorDiagramVariant(variant);
      set({ armorDiagramVariant: variant });
    },
    setShowArmorDiagramSelector: (show: boolean) => {
      useCustomizerSettingsStore.getState().setShowArmorDiagramSelector(show);
      set({ showArmorDiagramSelector: show });
    },
  };
}

export function createOtherSettingsActions(
  set: (partial: Partial<unknown>) => void,
): {
  setSidebarDefaultCollapsed: (collapsed: boolean) => void;
  setConfirmOnClose: (confirm: boolean) => void;
  setShowTooltips: (show: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  resetToDefaults: () => void;
} {
  return {
    setSidebarDefaultCollapsed: (collapsed: boolean): void => {
      useUIBehaviorStore.getState().setSidebarDefaultCollapsed(collapsed);
      set({ sidebarDefaultCollapsed: collapsed });
    },
    setConfirmOnClose: (confirm: boolean): void => {
      useUIBehaviorStore.getState().setConfirmOnClose(confirm);
      set({ confirmOnClose: confirm });
    },
    setShowTooltips: (show: boolean): void => {
      useUIBehaviorStore.getState().setShowTooltips(show);
      set({ showTooltips: show });
    },
    setHighContrast: (enabled: boolean): void => {
      useAccessibilityStore.getState().setHighContrast(enabled);
      set({ highContrast: enabled });
    },
    setReduceMotion: (enabled: boolean): void => {
      useAccessibilityStore.getState().setReduceMotion(enabled);
      set({ reduceMotion: enabled });
    },

    resetToDefaults: (): void => {
      useAppearanceStore.getState().resetToDefaults();
      useCustomizerSettingsStore.getState().resetToDefaults();
      useAccessibilityStore.getState().resetToDefaults();
      useUIBehaviorStore.getState().resetToDefaults();
      set((state: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = state as any;
        return {
          ...s,
          draftAppearance: null,
          hasUnsavedUITheme: false,
          hasUnsavedOtherAppearance: false,
          draftCustomizer: null,
          hasUnsavedCustomizer: false,
        };
      });
    },
  };
}
