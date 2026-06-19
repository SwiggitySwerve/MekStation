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

  describe('touch mode', () => {
    it('should render children in touch mode', () => {
      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
        >
          {(state) => (
            <div data-testid="child" data-active={state.isActive}>
              {state.isActive ? 'Placing...' : 'Normal'}
            </div>
          )}
        </EquipmentAssignmentAdapter>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toHaveAttribute(
        'data-active',
        'false',
      );
    });

    it('should enter placement mode when activate is called', () => {
      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
        >
          {(state) => (
            <div>
              <div
                data-testid="child"
                data-active={state.isActive.toString()}
              />
              {state.isActive && (
                <div data-testid="placement-mode">Placing...</div>
              )}
              <button onClick={state.activatePlacementMode}>Activate</button>
            </div>
          )}
        </EquipmentAssignmentAdapter>,
      );

      expect(screen.getByTestId('child')).toHaveAttribute(
        'data-active',
        'false',
      );

      fireEvent.click(screen.getByText('Activate'));

      expect(screen.getByTestId('child')).toHaveAttribute(
        'data-active',
        'true',
      );
      expect(screen.getByTestId('placement-mode')).toBeInTheDocument();
    });

    it('should assign equipment to valid slot in placement mode', () => {
      const onAssign = jest.fn();
      let placementState: PlacementModeState | null = null;

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={onAssign}
        >
          {(state) => {
            placementState = state;
            return (
              <div>
                <button onClick={state.activatePlacementMode}>Activate</button>
                {state.isActive && (
                  <button
                    onClick={() => state.handleSlotTap(mockValidSlots[0])}
                  >
                    Assign to Slot
                  </button>
                )}
              </div>
            );
          }}
        </EquipmentAssignmentAdapter>,
      );

      // Activate placement mode
      fireEvent.click(screen.getByText('Activate'));

      // Assign to valid slot
      fireEvent.click(screen.getByText('Assign to Slot'));

      expect(onAssign).toHaveBeenCalledWith(mockEquipment, mockValidSlots[0]);
      expect(mockVibrateCustom).toHaveBeenCalledWith(50);

      // Placement mode should be exited
      expect((placementState as PlacementModeState | null)?.isActive).toBe(
        false,
      );
    });

    it('should show error and stay in placement mode for invalid slot', () => {
      const onAssign = jest.fn();
      const onInvalidSlot = jest.fn();
      let placementState: PlacementModeState | null = null;

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={onAssign}
          onInvalidSlot={onInvalidSlot}
        >
          {(state) => {
            placementState = state;
            return (
              <div>
                <button onClick={state.activatePlacementMode}>Activate</button>
                {state.isActive && (
                  <button onClick={() => state.handleSlotTap(mockInvalidSlot)}>
                    Assign to Invalid Slot
                  </button>
                )}
              </div>
            );
          }}
        </EquipmentAssignmentAdapter>,
      );

      // Activate placement mode
      fireEvent.click(screen.getByText('Activate'));

      // Try to assign to invalid slot
      fireEvent.click(screen.getByText('Assign to Invalid Slot'));

      expect(onAssign).not.toHaveBeenCalled();
      expect(onInvalidSlot).toHaveBeenCalledWith(
        mockEquipment,
        mockInvalidSlot,
      );
      expect(mockVibrateCustom).toHaveBeenCalledWith(200);

      // Should stay in placement mode
      expect((placementState as PlacementModeState | null)?.isActive).toBe(
        true,
      );
    });

    it('should cancel placement mode', () => {
      const onCancel = jest.fn();

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          onCancel={onCancel}
        >
          {(state) => (
            <div>
              <button onClick={state.activatePlacementMode}>Activate</button>
              {state.isActive && (
                <button onClick={state.cancelPlacementMode}>Cancel</button>
              )}
            </div>
          )}
        </EquipmentAssignmentAdapter>,
      );

      // Activate placement mode
      fireEvent.click(screen.getByText('Activate'));

      // Cancel placement mode
      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not activate placement mode in mouse mode', () => {
      mockUseDeviceType.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        hasMouse: true,
        isHybrid: false,
        viewportWidth: 1024,
      });

      const dragComponent = <div data-testid="drag-component">Drag Me</div>;

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          dragComponent={dragComponent}
        >
          {(_state) => <div data-testid="child">Child</div>}
        </EquipmentAssignmentAdapter>,
      );

      // Should render drag component instead of children
      expect(screen.getByTestId('drag-component')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });
  });

  describe('mouse mode', () => {
    it('should render drag component when not touch device', () => {
      mockUseDeviceType.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        hasMouse: true,
        isHybrid: false,
        viewportWidth: 1024,
      });

      const dragComponent = <div data-testid="drag-component">Drag Me</div>;

      render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
          dragComponent={dragComponent}
        >
          {(_state) => <div data-testid="child">Child</div>}
        </EquipmentAssignmentAdapter>,
      );

      expect(screen.getByTestId('drag-component')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });

    it('should render nothing when drag component not provided in mouse mode', () => {
      mockUseDeviceType.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        hasMouse: true,
        isHybrid: false,
        viewportWidth: 1024,
      });

      const { container } = render(
        <EquipmentAssignmentAdapter
          equipment={mockEquipment}
          validSlots={mockValidSlots}
          onAssign={jest.fn()}
        >
          {(_state) => <div data-testid="child">Child</div>}
        </EquipmentAssignmentAdapter>,
      );

      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });
});
