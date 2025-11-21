import { useState, useCallback, useRef, useEffect } from 'react';

export interface DragState {
  isDragging: boolean;
  startY: number;
  startValue: number;
  location: string;
  isRear: boolean;
}

export interface InteractionHandlers {
  onLocationHover: (location: string | null) => void;
  onLocationSelect: (location: string | null) => void;
  onDragStart: (e: React.MouseEvent, location: string, currentValue: number, isRear: boolean) => void;
  onDragMove: (e: MouseEvent) => void;
  onDragEnd: () => void;
  hoveredLocation: string | null;
  selectedLocation: string | null;
  dragState: DragState | null;
}

export function useArmorInteractions(
  readOnly: boolean,
  onArmorChange?: (location: string, front: number, rear: number) => void
): InteractionHandlers {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  const dragHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const endHandlerRef = useRef<(() => void) | null>(null);

  // Handle location hover
  const onLocationHover = useCallback((location: string | null) => {
    if (!dragState?.isDragging) {
      setHoveredLocation(location);
    }
  }, [dragState]);

  // Handle location selection
  const onLocationSelect = useCallback((location: string | null) => {
    if (readOnly) return;
    
    // If clicking the same location, deselect it
    if (location === selectedLocation) {
      setSelectedLocation(null);
    } else {
      setSelectedLocation(location);
    }
  }, [readOnly, selectedLocation]);

  // Handle drag start
  const onDragStart = useCallback((
    e: React.MouseEvent,
    location: string,
    currentValue: number,
    isRear: boolean
  ) => {
    if (readOnly) return;
    
    e.preventDefault();
    setDragState({
      isDragging: true,
      startY: e.clientY,
      startValue: currentValue,
      location,
      isRear,
    });
  }, [readOnly]);

  // Handle drag move
  const onDragMove = useCallback((e: MouseEvent) => {
    if (!dragState?.isDragging || !onArmorChange) return;
    
    const deltaY = dragState.startY - e.clientY;
    const deltaValue = Math.round(deltaY / 5); // 5 pixels = 1 armor point
    const newValue = Math.max(0, dragState.startValue + deltaValue);
    
    // We need to get the current front/rear values to update only one
    // This is a simplified approach - in the real component, we'd have access to the full armor data
    if (dragState.isRear) {
      onArmorChange(dragState.location, -1, newValue); // -1 indicates "don't change"
    } else {
      onArmorChange(dragState.location, newValue, -1);
    }
  }, [dragState, onArmorChange]);

  // Handle drag end
  const onDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  // Set up global drag handlers
  useEffect(() => {
    if (dragState?.isDragging) {
      const handleMove = (e: MouseEvent) => onDragMove(e);
      const handleEnd = () => onDragEnd();
      
      dragHandlerRef.current = handleMove;
      endHandlerRef.current = handleEnd;
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
      };
    }
  }, [dragState, onDragMove, onDragEnd]);

  return {
    onLocationHover,
    onLocationSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    hoveredLocation,
    selectedLocation,
    dragState,
  };
}

// Helper hook for keyboard interactions
export function useArmorKeyboardControls(
  selectedLocation: string | null,
  onArmorChange?: (location: string, front: number, rear: number) => void,
  getCurrentValues?: (location: string) => { front: number; rear: number; max: number }
) {
  useEffect(() => {
    if (!selectedLocation || !onArmorChange || !getCurrentValues) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const current = getCurrentValues(selectedLocation);
      if (!current) return;

      let deltaFront = 0;
      let deltaRear = 0;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          deltaFront = 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          deltaFront = -1;
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            deltaRear = 1;
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            deltaRear = -1;
          }
          break;
        default:
          return;
      }

      const newFront = Math.max(0, Math.min(current.max, current.front + deltaFront));
      const newRear = Math.max(0, Math.min(current.max, current.rear + deltaRear));
      
      // Ensure total doesn't exceed max
      const total = newFront + newRear;
      if (total <= current.max) {
        onArmorChange(selectedLocation, newFront, newRear);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedLocation, onArmorChange, getCurrentValues]);
}

// Helper for touch interactions
export function useArmorTouchControls(
  readOnly: boolean,
  onArmorChange?: (location: string, front: number, rear: number) => void
) {
  const [touchState, setTouchState] = useState<{
    location: string;
    startY: number;
    startValue: number;
    isRear: boolean;
  } | null>(null);

  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    location: string,
    currentValue: number,
    isRear: boolean
  ) => {
    if (readOnly) return;
    
    const touch = e.touches[0];
    setTouchState({
      location,
      startY: touch.clientY,
      startValue: currentValue,
      isRear,
    });
  }, [readOnly]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState || !onArmorChange) return;
    
    const touch = e.touches[0];
    const deltaY = touchState.startY - touch.clientY;
    const deltaValue = Math.round(deltaY / 10); // 10 pixels = 1 armor point for touch
    const newValue = Math.max(0, touchState.startValue + deltaValue);
    
    if (touchState.isRear) {
      onArmorChange(touchState.location, -1, newValue);
    } else {
      onArmorChange(touchState.location, newValue, -1);
    }
  }, [touchState, onArmorChange]);

  const handleTouchEnd = useCallback(() => {
    setTouchState(null);
  }, []);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    touchState,
  };
}
