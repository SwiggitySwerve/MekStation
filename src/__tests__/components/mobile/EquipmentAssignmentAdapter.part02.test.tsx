import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from '@testing-library/react';
import React from 'react';

import {
  EquipmentAssignmentAdapter,
  usePlacementMode,
  PlacementModeState,
} from '@/components/mobile/EquipmentAssignmentAdapter';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useHaptics } from '@/hooks/useHaptics';

// PlacementModeState already includes activatePlacementMode, handleSlotTap, cancelPlacementMode
// so we don't need an extended interface

// Mock dependencies
jest.mock('../../../hooks/useDeviceType');
jest.mock('@/hooks/useHaptics');

describe('EquipmentAssignmentAdapter', () => {
  const mockUseDeviceType = useDeviceType as jest.MockedFunction<
    typeof useDeviceType
  >;

  const mockUseHaptics = useHaptics as jest.MockedFunction<typeof useHaptics>;

  const mockVibrateCustom = jest.fn();

  const mockEquipment = {
    id: 'equip-1',
    name: 'Medium Laser',
  };

  const mockValidSlots = [
    { id: 'slot-1', slotType: 'energy' },
    { id: 'slot-2', slotType: 'energy' },
  ];

  const mockInvalidSlot = {
    id: 'slot-3',
    slotType: 'ballistic',
  };

  beforeEach(() => {
    mockVibrateCustom.mockClear();
    mockUseHaptics.mockReturnValue({
      vibrate: jest.fn(),
      vibrateCustom: mockVibrateCustom,
      cancel: jest.fn(),
      isSupported: true,
    });

    // Default: touch device
    mockUseDeviceType.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isTouch: true,
      hasMouse: false,
      isHybrid: false,
      viewportWidth: 375,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('dual-mode devices', () => {
    it('should use touch mode when device has both touch and mouse', () => {
      mockUseDeviceType.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTouch: true,
        hasMouse: true,
        isHybrid: true,
        viewportWidth: 768,
      });

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          dragComponent={<div>Drag</div>}
        >
          {(_state) => <div data-testid="child">Child</div>}
        </EquipmentAssignmentAdapter>,
      );

      // Should render children (touch mode) despite drag component
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('usePlacementMode hook', () => {
    it('should provide placement mode state and functions', () => {
      const { result } = renderHook(() => usePlacementMode());

      expect(result.current.isActive).toBe(false);
      expect(result.current.equipment).toBeNull();
      expect(result.current.activatePlacementMode).toBeInstanceOf(Function);
      expect(result.current.cancelPlacementMode).toBeInstanceOf(Function);
    });

    it('should activate placement mode with equipment', () => {
      const { result } = renderHook(() => usePlacementMode());

      act(() => {
        result.current.activatePlacementMode(mockEquipment);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.equipment).toEqual(mockEquipment);
    });

    it('should cancel placement mode', () => {
      const { result } = renderHook(() => usePlacementMode());

      act(() => {
        result.current.activatePlacementMode(mockEquipment);
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.cancelPlacementMode();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.equipment).toBeNull();
    });

    it('should handle multiple activation cycles', () => {
      const { result } = renderHook(() => usePlacementMode());

      // First cycle
      act(() => {
        result.current.activatePlacementMode(mockEquipment);
      });
      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.cancelPlacementMode();
      });
      expect(result.current.isActive).toBe(false);

      // Second cycle
      act(() => {
        result.current.activatePlacementMode(mockEquipment);
      });
      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.cancelPlacementMode();
      });
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty validSlots array', () => {
      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={[]}
          onAssign={jest.fn()}
        >
          {(state) => (
            <div>
              <button onClick={state.activatePlacementMode}>Activate</button>
              {state.isActive && (
                <div data-testid="placement-mode">Placing</div>
              )}
            </div>
          )}
        </EquipmentAssignmentAdapter>,
      );

      fireEvent.click(screen.getByText('Activate'));
      expect(screen.getByTestId('placement-mode')).toBeInTheDocument();
    });

    it('should handle tap on slot when not in placement mode', () => {
      const onAssign = jest.fn();

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={onAssign}
        >
          {(state) => (
            <button onClick={() => state.handleSlotTap(mockValidSlots[0])}>
              Tap Slot
            </button>
          )}
        </EquipmentAssignmentAdapter>,
      );

      // Tap slot when not in placement mode
      fireEvent.click(screen.getByText('Tap Slot'));

      expect(onAssign).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          className="custom-class"
        >
          {(_state) => <div>Child</div>}
        </EquipmentAssignmentAdapter>,
      );

      const wrapper = container.querySelector('.equipment-assignment-adapter');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should handle missing onInvalidSlot callback', () => {
      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          // onInvalidSlot not provided
        >
          {(state) => (
            <div>
              <button onClick={state.activatePlacementMode}>Activate</button>
              {state.isActive && (
                <button onClick={() => state.handleSlotTap(mockInvalidSlot)}>
                  Assign to Invalid Slot
                </button>
              )}
            </div>
          )}
        </EquipmentAssignmentAdapter>,
      );

      fireEvent.click(screen.getByText('Activate'));

      // Should not throw
      expect(() => {
        fireEvent.click(screen.getByText('Assign to Invalid Slot'));
      }).not.toThrow();
    });
  });
});
