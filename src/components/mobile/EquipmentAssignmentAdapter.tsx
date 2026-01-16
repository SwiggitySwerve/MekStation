import React, { ReactNode, useState, useCallback } from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { tap as hapticTap, error as hapticError } from '../../utils/hapticFeedback';

/**
 * Equipment item data
 */
export interface EquipmentItem {
  id: string;
  name: string;
  // Additional equipment properties
  [key: string]: unknown;
}

/**
 * Equipment slot data
 */
export interface EquipmentSlot {
  id: string;
  slotType: string;
  // Additional slot properties
  [key: string]: unknown;
}

/**
 * Internal state for placement mode (just data, no functions)
 */
interface PlacementModeData {
  isActive: boolean;
  equipment: EquipmentItem | null;
}

/**
 * Placement mode state passed to children
 */
export interface PlacementModeState {
  isActive: boolean;
  equipment: EquipmentItem | null;
  activatePlacementMode: () => void;
  handleSlotTap: (slot: EquipmentSlot) => void;
  cancelPlacementMode: () => void;
}

/**
 * EquipmentAssignmentAdapter props
 */
export interface EquipmentAssignmentAdapterProps {
  /** Equipment item to be assigned */
  equipment: EquipmentItem;
  /** Valid slots for this equipment */
  validSlots: EquipmentSlot[];
  /** Callback when equipment is assigned to a slot */
  onAssign: (equipment: EquipmentItem, slot: EquipmentSlot) => void;
  /** Callback when placement mode is cancelled */
  onCancel?: () => void;
  /** Callback when invalid slot is tapped */
  onInvalidSlot?: (equipment: EquipmentItem, slot: EquipmentSlot) => void;
  /** Children to render (will receive mode state as prop) */
  children: (state: PlacementModeState) => ReactNode;
  /** Desktop drag-and-drop component (mouse mode) */
  dragComponent?: ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Adapter component that switches between drag-and-drop and tap-to-place
 * based on device capabilities.
 *
 * Automatically detects touch vs mouse input and switches interaction patterns:
 * - Mouse: Uses react-dnd drag-and-drop (via dragComponent prop)
 * - Touch: Uses tap-to-activate then tap-to-place
 *
 * @example
 * ```tsx
 * <EquipmentAssignmentAdapter
 *   equipment={equipmentItem}
 *   validSlots={validSlots}
 *   onAssign={(equipment, slot) => assignToSlot(equipment, slot)}
 *   dragComponent={<DraggableEquipment equipment={equipmentItem} />}
 * >
 *   {(placementState) => (
 *     <EquipmentItem
 *       equipment={equipmentItem}
 *       isInPlacementMode={placementState.isActive}
 *       onTap={() => activatePlacementMode()}
 *     />
 *   )}
 * </EquipmentAssignmentAdapter>
 * ```
 */
export function EquipmentAssignmentAdapter({
  equipment,
  validSlots,
  onAssign,
  onCancel,
  onInvalidSlot,
  children,
  dragComponent,
  className = '',
}: EquipmentAssignmentAdapterProps): React.ReactElement {
  const { isTouch: hasTouch } = useDeviceType();
  const [placementMode, setPlacementMode] = useState<PlacementModeData>({
    isActive: false,
    equipment: null,
  });

  // Determine if we should use touch mode
  // Use touch mode if device has touch capability, even if it also has mouse
  const useTouchMode = hasTouch;

  /**
   * Activate placement mode (touch only)
   */
  const activatePlacementMode = useCallback(() => {
    if (!useTouchMode) return;

    setPlacementMode({
      isActive: true,
      equipment,
    });
  }, [useTouchMode, equipment]);

  /**
   * Handle slot tap (touch mode)
   */
  const handleSlotTap = useCallback((slot: EquipmentSlot) => {
    if (!placementMode.isActive || !placementMode.equipment) {
      return;
    }

    // Check if slot is valid
    const isValid = validSlots.some((validSlot) => validSlot.id === slot.id);

    if (isValid) {
      // Valid slot - assign equipment
      onAssign(placementMode.equipment, slot);
      setPlacementMode({ isActive: false, equipment: null });
      hapticTap(); // Success feedback
    } else {
      // Invalid slot - show error
      hapticError(); // Error feedback
      onInvalidSlot?.(placementMode.equipment, slot);
      // Stay in placement mode
    }
  }, [placementMode, validSlots, onAssign, onInvalidSlot]);

  /**
   * Cancel placement mode
   */
  const cancelPlacementMode = useCallback(() => {
    setPlacementMode({ isActive: false, equipment: null });
    onCancel?.();
  }, [onCancel]);

  // Mouse mode: render drag component
  if (!useTouchMode) {
    if (dragComponent) {
      return <>{dragComponent}</>;
    }
    // No drag component provided, render nothing
    return <></>;
  }

  // Touch mode: render children with placement mode state
  return (
    <div className={`equipment-assignment-adapter ${className}`.trim()}>
      {children({
        isActive: placementMode.isActive,
        equipment: placementMode.equipment,
        activatePlacementMode,
        handleSlotTap,
        cancelPlacementMode,
      })}
    </div>
  );
}

/**
 * Return type for usePlacementMode hook
 */
interface UsePlacementModeReturn {
  isActive: boolean;
  equipment: EquipmentItem | null;
  activatePlacementMode: (equipment: EquipmentItem) => void;
  cancelPlacementMode: () => void;
}

/**
 * Hook to use placement mode state in child components
 *
 * @example
 * ```tsx
 * const { isActive, activatePlacementMode, cancelPlacementMode } = usePlacementMode();
 * ```
 */
export function usePlacementMode(): UsePlacementModeReturn {
  const [placementMode, setPlacementMode] = useState<PlacementModeData>({
    isActive: false,
    equipment: null,
  });

  const activatePlacementMode = useCallback((equipment: EquipmentItem) => {
    setPlacementMode({
      isActive: true,
      equipment,
    });
  }, []);

  const cancelPlacementMode = useCallback(() => {
    setPlacementMode({
      isActive: false,
      equipment: null,
    });
  }, []);

  return {
    isActive: placementMode.isActive,
    equipment: placementMode.equipment,
    activatePlacementMode,
    cancelPlacementMode,
  };
}
