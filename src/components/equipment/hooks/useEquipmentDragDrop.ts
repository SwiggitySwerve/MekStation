import { useState, useCallback, useRef, useEffect } from 'react';
import { FullEquipment } from '../../../types';
import { EditableUnit } from '../../../types/editor';

export interface DragItem {
  equipment: FullEquipment;
  sourceLocation?: string;
  sourceSlot?: number;
  isNew: boolean;
}

export interface DropTarget {
  location: string;
  slotIndex?: number;
  isValid: boolean;
  highlightColor?: string;
}

export interface DragState {
  isDragging: boolean;
  draggedItem?: DragItem;
  dropTargets: DropTarget[];
  previewLocation?: string;
  previewSlot?: number;
}

export interface UseEquipmentDragDropReturn {
  dragState: DragState;
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  handleDrop: (location: string, slotIndex?: number) => void;
  updateDropTargets: (targets: DropTarget[]) => void;
  setPreviewLocation: (location?: string, slot?: number) => void;
  canDrop: (location: string, slotIndex?: number) => boolean;
  getDragHandleProps: (equipment: FullEquipment, sourceLocation?: string) => any;
  getDropZoneProps: (location: string, slotIndex?: number) => any;
}

export function useEquipmentDragDrop(
  onDrop?: (item: DragItem, location: string, slotIndex?: number) => void,
  validateDrop?: (item: DragItem, location: string, slotIndex?: number) => boolean
): UseEquipmentDragDropReturn {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dropTargets: [],
  });

  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Start dragging
  const startDrag = useCallback((item: DragItem) => {
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedItem: item,
      dropTargets: [],
    }));
  }, []);

  // End dragging
  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dropTargets: [],
    });
  }, []);

  // Handle drop
  const handleDrop = useCallback((location: string, slotIndex?: number) => {
    if (dragState.draggedItem && canDrop(location, slotIndex)) {
      onDrop?.(dragState.draggedItem, location, slotIndex);
    }
    endDrag();
  }, [dragState.draggedItem, onDrop, endDrag]);

  // Update drop targets
  const updateDropTargets = useCallback((targets: DropTarget[]) => {
    setDragState(prev => ({
      ...prev,
      dropTargets: targets,
    }));
  }, []);

  // Set preview location
  const setPreviewLocation = useCallback((location?: string, slot?: number) => {
    setDragState(prev => ({
      ...prev,
      previewLocation: location,
      previewSlot: slot,
    }));
  }, []);

  // Check if can drop at location
  const canDrop = useCallback((location: string, slotIndex?: number): boolean => {
    if (!dragState.draggedItem) return false;
    
    // Use custom validation if provided
    if (validateDrop) {
      return validateDrop(dragState.draggedItem, location, slotIndex);
    }
    
    // Default validation
    const target = dragState.dropTargets.find(
      t => t.location === location && t.slotIndex === slotIndex
    );
    
    return target?.isValid ?? false;
  }, [dragState.draggedItem, dragState.dropTargets, validateDrop]);

  // Get drag handle props
  const getDragHandleProps = useCallback((
    equipment: FullEquipment,
    sourceLocation?: string
  ) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', equipment.id);
        
        // Create custom drag image
        if (dragImageRef.current) {
          dragImageRef.current.textContent = equipment.name;
          dragImageRef.current.style.position = 'absolute';
          dragImageRef.current.style.top = '-1000px';
          document.body.appendChild(dragImageRef.current);
          e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
        }
        
        startDrag({
          equipment,
          sourceLocation,
          isNew: !sourceLocation,
        });
      },
      onDragEnd: () => {
        // Clean up drag image
        if (dragImageRef.current && dragImageRef.current.parentNode) {
          dragImageRef.current.parentNode.removeChild(dragImageRef.current);
        }
        endDrag();
      },
      style: {
        cursor: 'move',
      },
    };
  }, [startDrag, endDrag]);

  // Get drop zone props
  const getDropZoneProps = useCallback((
    location: string,
    slotIndex?: number
  ) => {
    const isValidDrop = canDrop(location, slotIndex);
    const isPreview = dragState.previewLocation === location && 
                     dragState.previewSlot === slotIndex;
    
    return {
      onDragOver: (e: React.DragEvent) => {
        if (isValidDrop) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      },
      onDragEnter: (e: React.DragEvent) => {
        if (isValidDrop) {
          e.preventDefault();
          setPreviewLocation(location, slotIndex);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        // Only clear preview if leaving the actual drop zone
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
          setPreviewLocation(undefined, undefined);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        handleDrop(location, slotIndex);
      },
      style: {
        backgroundColor: isPreview ? 'rgba(59, 130, 246, 0.1)' : undefined,
        borderColor: isValidDrop && dragState.isDragging ? '#3b82f6' : undefined,
        borderStyle: isValidDrop && dragState.isDragging ? 'dashed' : undefined,
        transition: 'all 0.2s ease',
      },
      'data-valid-drop': isValidDrop,
      'data-preview': isPreview,
    };
  }, [canDrop, dragState, setPreviewLocation, handleDrop]);

  // Create drag image element
  useEffect(() => {
    if (!dragImageRef.current) {
      const div = document.createElement('div');
      div.style.cssText = `
        position: absolute;
        padding: 4px 8px;
        background: #3b82f6;
        color: white;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      `;
      dragImageRef.current = div;
    }
    
    return () => {
      if (dragImageRef.current && dragImageRef.current.parentNode) {
        dragImageRef.current.parentNode.removeChild(dragImageRef.current);
      }
    };
  }, []);

  return {
    dragState,
    startDrag,
    endDrag,
    handleDrop,
    updateDropTargets,
    setPreviewLocation,
    canDrop,
    getDragHandleProps,
    getDropZoneProps,
  };
}

// Helper hook for managing multiple drag sources
export function useEquipmentDragSources() {
  const [dragSources, setDragSources] = useState<Map<string, DragItem>>(new Map());

  const registerDragSource = useCallback((id: string, item: DragItem) => {
    setDragSources(prev => new Map(prev).set(id, item));
  }, []);

  const unregisterDragSource = useCallback((id: string) => {
    setDragSources(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getDragSource = useCallback((id: string): DragItem | undefined => {
    return dragSources.get(id);
  }, [dragSources]);

  return {
    registerDragSource,
    unregisterDragSource,
    getDragSource,
    dragSources: Array.from(dragSources.values()),
  };
}

// Helper hook for managing drop zones
export function useDropZones(unit: EditableUnit) {
  const [dropZones, setDropZones] = useState<DropTarget[]>([]);

  // Calculate available drop zones based on unit
  const calculateDropZones = useCallback((draggedItem?: DragItem): DropTarget[] => {
    if (!draggedItem) return [];
    
    const zones: DropTarget[] = [];
    const locations = [
      'Head',
      'Left Arm',
      'Right Arm', 
      'Left Torso',
      'Center Torso',
      'Right Torso',
      'Left Leg',
      'Right Leg',
    ];

    locations.forEach(location => {
      // Find available slots in location
      const locationSlots = unit.criticalSlots.filter(
        slot => slot.location === location
      );
      
      const slotsNeeded = draggedItem.equipment.space || 1;
      const occupiedSlots = new Set(
        locationSlots.filter(s => !s.isEmpty).map(s => s.slotIndex)
      );
      
      // Check each potential starting slot
      for (let i = 0; i <= 12 - slotsNeeded; i++) {
        let canFit = true;
        
        // Check if all needed slots are available
        for (let j = 0; j < slotsNeeded; j++) {
          if (occupiedSlots.has(i + j)) {
            canFit = false;
            break;
          }
        }
        
        if (canFit) {
          zones.push({
            location,
            slotIndex: i,
            isValid: true,
            highlightColor: '#3b82f6',
          });
          break; // Only need one valid zone per location
        }
      }
    });
    
    return zones;
  }, [unit]);

  // Update drop zones when drag starts
  const updateDropZonesForDrag = useCallback((draggedItem?: DragItem) => {
    const zones = calculateDropZones(draggedItem);
    setDropZones(zones);
  }, [calculateDropZones]);

  // Clear drop zones
  const clearDropZones = useCallback(() => {
    setDropZones([]);
  }, []);

  return {
    dropZones,
    updateDropZonesForDrag,
    clearDropZones,
  };
}
