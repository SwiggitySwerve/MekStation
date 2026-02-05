/**
 * Customizer Store
 *
 * Manages the active customizer state including:
 * - Currently selected equipment for placement
 * - Selection modes (click-to-assign vs drag-and-drop)
 * - UI preferences and settings
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import { create } from 'zustand';

import { MechLocation } from '@/types/construction';

/**
 * Selection mode for equipment placement
 */
export type SelectionMode = 'click' | 'drag';

/**
 * Equipment selection state
 */
export interface EquipmentSelection {
  /** Equipment ID */
  readonly equipmentId: string;
  /** Equipment display name */
  readonly name: string;
  /** Number of critical slots required */
  readonly criticalSlots: number;
  /** Source (from equipment browser or unallocated pool) */
  readonly source: 'browser' | 'unallocated';
}

/**
 * Auto-mode settings for critical slot management
 */
export interface AutoModeSettings {
  /** Automatically fill empty slots when structure/armor changes */
  readonly autoFillUnhittables: boolean;
  /** Automatically compact equipment after placement */
  readonly autoCompact: boolean;
  /** Automatically sort equipment by size after placement */
  readonly autoSort: boolean;
  /** Show placement preview on hover */
  readonly showPlacementPreview: boolean;
}

/**
 * Customizer store state
 */
export interface CustomizerState {
  // Selection
  selectedEquipment: EquipmentSelection | null;
  selectedLocation: MechLocation | null;
  selectionMode: SelectionMode;

  // Auto-mode settings
  autoModeSettings: AutoModeSettings;

  // UI state
  equipmentTrayCollapsed: boolean;
  colorLegendExpanded: boolean;

  // Actions
  selectEquipment: (equipment: EquipmentSelection | null) => void;
  selectLocation: (location: MechLocation | null) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  toggleAutoFillUnhittables: () => void;
  toggleAutoCompact: () => void;
  toggleAutoSort: () => void;
  toggleShowPlacementPreview: () => void;
  toggleEquipmentTray: () => void;
  toggleColorLegend: () => void;
  clearSelection: () => void;
  resetSettings: () => void;
}

/**
 * Default auto-mode settings
 */
const DEFAULT_AUTO_SETTINGS: AutoModeSettings = {
  autoFillUnhittables: false,
  autoCompact: false,
  autoSort: false,
  showPlacementPreview: true,
};

/**
 * Customizer store for managing active editing state
 */
export const useCustomizerStore = create<CustomizerState>((set) => ({
  // Initial state
  selectedEquipment: null,
  selectedLocation: null,
  selectionMode: 'click',
  autoModeSettings: DEFAULT_AUTO_SETTINGS,
  equipmentTrayCollapsed: false,
  colorLegendExpanded: false,

  // Actions
  selectEquipment: (equipment) =>
    set({
      selectedEquipment: equipment,
      // Clear location selection when selecting new equipment
      selectedLocation: equipment ? null : undefined,
    }),

  selectLocation: (location) => set({ selectedLocation: location }),

  setSelectionMode: (mode) => set({ selectionMode: mode }),

  toggleAutoFillUnhittables: () =>
    set((state) => ({
      autoModeSettings: {
        ...state.autoModeSettings,
        autoFillUnhittables: !state.autoModeSettings.autoFillUnhittables,
      },
    })),

  toggleAutoCompact: () =>
    set((state) => ({
      autoModeSettings: {
        ...state.autoModeSettings,
        autoCompact: !state.autoModeSettings.autoCompact,
        // Auto sort implies auto compact, so disable sort if compact is being disabled
        autoSort: !state.autoModeSettings.autoCompact
          ? state.autoModeSettings.autoSort
          : false,
      },
    })),

  toggleAutoSort: () =>
    set((state) => ({
      autoModeSettings: {
        ...state.autoModeSettings,
        // Sort includes compact, so enable compact if sort is being enabled
        autoCompact: !state.autoModeSettings.autoSort
          ? true
          : state.autoModeSettings.autoCompact,
        autoSort: !state.autoModeSettings.autoSort,
      },
    })),

  toggleShowPlacementPreview: () =>
    set((state) => ({
      autoModeSettings: {
        ...state.autoModeSettings,
        showPlacementPreview: !state.autoModeSettings.showPlacementPreview,
      },
    })),

  toggleEquipmentTray: () =>
    set((state) => ({
      equipmentTrayCollapsed: !state.equipmentTrayCollapsed,
    })),

  toggleColorLegend: () =>
    set((state) => ({
      colorLegendExpanded: !state.colorLegendExpanded,
    })),

  clearSelection: () =>
    set({
      selectedEquipment: null,
      selectedLocation: null,
    }),

  resetSettings: () =>
    set({
      autoModeSettings: DEFAULT_AUTO_SETTINGS,
      equipmentTrayCollapsed: false,
      colorLegendExpanded: false,
    }),
}));
