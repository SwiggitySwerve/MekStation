/**
 * Tests for useCustomizerStore
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import { act, renderHook } from '@testing-library/react';
import { useCustomizerStore, EquipmentSelection } from '@/stores/useCustomizerStore';
import { MechLocation } from '@/types/construction';

describe('useCustomizerStore', () => {
  // Reset store between tests
  beforeEach(() => {
    const { result } = renderHook(() => useCustomizerStore());
    act(() => {
      result.current.clearSelection();
      result.current.resetSettings();
    });
  });

  describe('Initial State', () => {
    it('should have null selected equipment initially', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.selectedEquipment).toBeNull();
    });

    it('should have null selected location initially', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.selectedLocation).toBeNull();
    });

    it('should have click selection mode initially', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.selectionMode).toBe('click');
    });

    it('should have default auto-mode settings', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.autoModeSettings).toEqual({
        autoFillUnhittables: false,
        autoCompact: false,
        autoSort: false,
        showPlacementPreview: true,
      });
    });

    it('should have equipment tray expanded initially', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.equipmentTrayCollapsed).toBe(false);
    });

    it('should have color legend collapsed initially', () => {
      const { result } = renderHook(() => useCustomizerStore());
      expect(result.current.colorLegendExpanded).toBe(false);
    });
  });

  describe('Equipment Selection', () => {
    const mockEquipment: EquipmentSelection = {
      equipmentId: 'eq-1',
      name: 'Medium Laser',
      criticalSlots: 1,
      source: 'browser',
    };

    it('should select equipment', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectEquipment(mockEquipment);
      });
      
      expect(result.current.selectedEquipment).toEqual(mockEquipment);
    });

    it('should clear location when selecting new equipment', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectLocation(MechLocation.LEFT_ARM);
        result.current.selectEquipment(mockEquipment);
      });
      
      expect(result.current.selectedLocation).toBeNull();
    });

    it('should clear equipment selection', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectEquipment(mockEquipment);
        result.current.selectEquipment(null);
      });
      
      expect(result.current.selectedEquipment).toBeNull();
    });

    it('should handle equipment from browser source', () => {
      const { result } = renderHook(() => useCustomizerStore());
      const browserEquipment: EquipmentSelection = {
        ...mockEquipment,
        source: 'browser',
      };
      
      act(() => {
        result.current.selectEquipment(browserEquipment);
      });
      
      expect(result.current.selectedEquipment?.source).toBe('browser');
    });

    it('should handle equipment from unallocated source', () => {
      const { result } = renderHook(() => useCustomizerStore());
      const unallocatedEquipment: EquipmentSelection = {
        ...mockEquipment,
        source: 'unallocated',
      };
      
      act(() => {
        result.current.selectEquipment(unallocatedEquipment);
      });
      
      expect(result.current.selectedEquipment?.source).toBe('unallocated');
    });
  });

  describe('Location Selection', () => {
    it('should select location', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectLocation(MechLocation.CENTER_TORSO);
      });
      
      expect(result.current.selectedLocation).toBe(MechLocation.CENTER_TORSO);
    });

    it('should change location', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectLocation(MechLocation.LEFT_ARM);
        result.current.selectLocation(MechLocation.RIGHT_ARM);
      });
      
      expect(result.current.selectedLocation).toBe(MechLocation.RIGHT_ARM);
    });

    it('should clear location', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectLocation(MechLocation.HEAD);
        result.current.selectLocation(null);
      });
      
      expect(result.current.selectedLocation).toBeNull();
    });
  });

  describe('Selection Mode', () => {
    it('should change to drag mode', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.setSelectionMode('drag');
      });
      
      expect(result.current.selectionMode).toBe('drag');
    });

    it('should change back to click mode', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.setSelectionMode('drag');
        result.current.setSelectionMode('click');
      });
      
      expect(result.current.selectionMode).toBe('click');
    });
  });

  describe('Auto-Mode Settings', () => {
    it('should toggle autoFillUnhittables', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.autoModeSettings.autoFillUnhittables).toBe(false);
      
      act(() => {
        result.current.toggleAutoFillUnhittables();
      });
      
      expect(result.current.autoModeSettings.autoFillUnhittables).toBe(true);
      
      act(() => {
        result.current.toggleAutoFillUnhittables();
      });
      
      expect(result.current.autoModeSettings.autoFillUnhittables).toBe(false);
    });

    it('should toggle autoCompact', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.autoModeSettings.autoCompact).toBe(false);
      
      act(() => {
        result.current.toggleAutoCompact();
      });
      
      expect(result.current.autoModeSettings.autoCompact).toBe(true);
    });

    it('should disable autoSort when autoCompact is disabled', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      // First enable both
      act(() => {
        result.current.toggleAutoSort(); // This enables compact + sort
      });
      
      expect(result.current.autoModeSettings.autoSort).toBe(true);
      expect(result.current.autoModeSettings.autoCompact).toBe(true);
      
      // Now disable compact
      act(() => {
        result.current.toggleAutoCompact();
      });
      
      // Sort should be disabled when compact is disabled
      expect(result.current.autoModeSettings.autoCompact).toBe(false);
      expect(result.current.autoModeSettings.autoSort).toBe(false);
    });

    it('should enable autoCompact when autoSort is enabled', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.autoModeSettings.autoCompact).toBe(false);
      expect(result.current.autoModeSettings.autoSort).toBe(false);
      
      act(() => {
        result.current.toggleAutoSort();
      });
      
      // Sort implies compact
      expect(result.current.autoModeSettings.autoSort).toBe(true);
      expect(result.current.autoModeSettings.autoCompact).toBe(true);
    });

    it('should toggle showPlacementPreview', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.autoModeSettings.showPlacementPreview).toBe(true);
      
      act(() => {
        result.current.toggleShowPlacementPreview();
      });
      
      expect(result.current.autoModeSettings.showPlacementPreview).toBe(false);
    });
  });

  describe('UI State', () => {
    it('should toggle equipment tray', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.equipmentTrayCollapsed).toBe(false);
      
      act(() => {
        result.current.toggleEquipmentTray();
      });
      
      expect(result.current.equipmentTrayCollapsed).toBe(true);
      
      act(() => {
        result.current.toggleEquipmentTray();
      });
      
      expect(result.current.equipmentTrayCollapsed).toBe(false);
    });

    it('should toggle color legend', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      expect(result.current.colorLegendExpanded).toBe(false);
      
      act(() => {
        result.current.toggleColorLegend();
      });
      
      expect(result.current.colorLegendExpanded).toBe(true);
    });
  });

  describe('Clear Selection', () => {
    it('should clear both equipment and location', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      act(() => {
        result.current.selectEquipment({
          equipmentId: 'eq-1',
          name: 'PPC',
          criticalSlots: 3,
          source: 'browser',
        });
        result.current.selectLocation(MechLocation.RIGHT_ARM);
      });
      
      expect(result.current.selectedEquipment).not.toBeNull();
      expect(result.current.selectedLocation).not.toBeNull();
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedEquipment).toBeNull();
      expect(result.current.selectedLocation).toBeNull();
    });
  });

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      // Change all settings
      act(() => {
        result.current.toggleAutoFillUnhittables();
        result.current.toggleAutoCompact();
        result.current.toggleShowPlacementPreview();
        result.current.toggleEquipmentTray();
        result.current.toggleColorLegend();
      });
      
      // Verify changes
      expect(result.current.autoModeSettings.autoFillUnhittables).toBe(true);
      expect(result.current.equipmentTrayCollapsed).toBe(true);
      expect(result.current.colorLegendExpanded).toBe(true);
      
      // Reset
      act(() => {
        result.current.resetSettings();
      });
      
      // Verify defaults
      expect(result.current.autoModeSettings).toEqual({
        autoFillUnhittables: false,
        autoCompact: false,
        autoSort: false,
        showPlacementPreview: true,
      });
      expect(result.current.equipmentTrayCollapsed).toBe(false);
      expect(result.current.colorLegendExpanded).toBe(false);
    });
  });

  describe('Equipment Selection Interface', () => {
    it('should store critical slots correctly', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      const largeEquipment: EquipmentSelection = {
        equipmentId: 'ac-20',
        name: 'AC/20',
        criticalSlots: 10,
        source: 'browser',
      };
      
      act(() => {
        result.current.selectEquipment(largeEquipment);
      });
      
      expect(result.current.selectedEquipment?.criticalSlots).toBe(10);
    });

    it('should store equipment ID correctly', () => {
      const { result } = renderHook(() => useCustomizerStore());
      
      const equipment: EquipmentSelection = {
        equipmentId: 'unique-id-123',
        name: 'Test Equipment',
        criticalSlots: 2,
        source: 'unallocated',
      };
      
      act(() => {
        result.current.selectEquipment(equipment);
      });
      
      expect(result.current.selectedEquipment?.equipmentId).toBe('unique-id-123');
    });
  });
});
