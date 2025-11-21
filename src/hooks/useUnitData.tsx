/**
 * Unified Unit Data Hook
 * Provides a centralized data model with automatic UI updates
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { EditableUnit } from '../types/editor';
import { SystemComponents, CriticalAllocationMap, CriticalSlot, EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../types/systemComponents';
import { migrateUnitToSystemComponents, validateUnit } from '../utils/componentValidation';
import { 
  syncEngineChange, 
  syncGyroChange, 
  syncStructureChange,
  syncArmorChange,
  syncHeatSinkChange 
} from '../utils/componentSync';
import { removeActuator, addActuator } from '../utils/componentRules';

// Action types
export enum UnitActionType {
  SET_UNIT = 'SET_UNIT',
  UPDATE_BASIC_INFO = 'UPDATE_BASIC_INFO',
  UPDATE_ENGINE = 'UPDATE_ENGINE',
  UPDATE_GYRO = 'UPDATE_GYRO',
  UPDATE_STRUCTURE = 'UPDATE_STRUCTURE',
  UPDATE_ARMOR = 'UPDATE_ARMOR',
  UPDATE_HEAT_SINKS = 'UPDATE_HEAT_SINKS',
  UPDATE_EQUIPMENT = 'UPDATE_EQUIPMENT',
  UPDATE_CRITICAL_SLOTS = 'UPDATE_CRITICAL_SLOTS',
  UPDATE_ARMOR_ALLOCATION = 'UPDATE_ARMOR_ALLOCATION',
  UPDATE_ACTUATOR = 'UPDATE_ACTUATOR',
  VALIDATE_UNIT = 'VALIDATE_UNIT',
  MIGRATE_UNIT = 'MIGRATE_UNIT',
}

// Action interfaces
interface SetUnitAction {
  type: UnitActionType.SET_UNIT;
  payload: EditableUnit;
}

interface UpdateBasicInfoAction {
  type: UnitActionType.UPDATE_BASIC_INFO;
  payload: Partial<Pick<EditableUnit, 'chassis' | 'model' | 'mass' | 'tech_base' | 'era'>>;
}

interface UpdateEngineAction {
  type: UnitActionType.UPDATE_ENGINE;
  payload: {
    type: string;
    rating: number;
  };
}

interface UpdateGyroAction {
  type: UnitActionType.UPDATE_GYRO;
  payload: {
    type: string;
  };
}

interface UpdateStructureAction {
  type: UnitActionType.UPDATE_STRUCTURE;
  payload: {
    type: string;
  };
}

interface UpdateArmorAction {
  type: UnitActionType.UPDATE_ARMOR;
  payload: {
    type: string;
  };
}

interface UpdateHeatSinksAction {
  type: UnitActionType.UPDATE_HEAT_SINKS;
  payload: {
    type: string;
    count: number;
  };
}

interface UpdateEquipmentAction {
  type: UnitActionType.UPDATE_EQUIPMENT;
  payload: {
    action: 'add' | 'remove' | 'update' | 'relocate';
    equipment?: any;
    index?: number;
    location?: string;
  };
}

interface UpdateCriticalSlotsAction {
  type: UnitActionType.UPDATE_CRITICAL_SLOTS;
  payload: {
    location: string;
    slots: string[];
  };
}

interface UpdateArmorAllocationAction {
  type: UnitActionType.UPDATE_ARMOR_ALLOCATION;
  payload: {
    location: string;
    front?: number;
    rear?: number;
  };
}

interface ValidateUnitAction {
  type: UnitActionType.VALIDATE_UNIT;
}

interface UpdateActuatorAction {
  type: UnitActionType.UPDATE_ACTUATOR;
  payload: {
    location: string;
    actuatorType: 'Lower Arm Actuator' | 'Hand Actuator';
    action: 'add' | 'remove';
  };
}

interface MigrateUnitAction {
  type: UnitActionType.MIGRATE_UNIT;
}

type UnitAction = 
  | SetUnitAction
  | UpdateBasicInfoAction
  | UpdateEngineAction
  | UpdateGyroAction
  | UpdateStructureAction
  | UpdateArmorAction
  | UpdateHeatSinksAction
  | UpdateEquipmentAction
  | UpdateCriticalSlotsAction
  | UpdateArmorAllocationAction
  | UpdateActuatorAction
  | ValidateUnitAction
  | MigrateUnitAction;

// State interface
interface UnitState {
  unit: EditableUnit;
  isDirty: boolean;
  isValidating: boolean;
  lastAction?: UnitActionType;
  lastValidatedUnit?: EditableUnit; // Track what we last validated
}

// Reducer
function unitReducer(state: UnitState, action: UnitAction): UnitState {
  switch (action.type) {
    case UnitActionType.SET_UNIT:
      return {
        ...state,
        unit: action.payload,
        isDirty: false,
        lastAction: action.type,
      };

    case UnitActionType.UPDATE_BASIC_INFO:
      return {
        ...state,
        unit: {
          ...state.unit,
          ...action.payload,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };

    case UnitActionType.UPDATE_ENGINE: {
      const updates = syncEngineChange(
        state.unit,
        action.payload.type as EngineType,
        action.payload.rating
      );
      
      // Extract what we need from updates
      const { systemComponents, criticalAllocations, data } = updates;
      
      return {
        ...state,
        unit: {
          ...state.unit,
          systemComponents: systemComponents || state.unit.systemComponents,
          criticalAllocations: criticalAllocations || state.unit.criticalAllocations,
          data: {
            ...state.unit.data,
            engine: data?.engine || state.unit.data?.engine,
            weapons_and_equipment: data?.weapons_and_equipment || state.unit.data?.weapons_and_equipment,
            criticals: data?.criticals || state.unit.data?.criticals,
          },
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_GYRO: {
      const updates = syncGyroChange(state.unit, action.payload.type as GyroType);
      
      // Extract what we need from updates
      const { systemComponents, criticalAllocations, data } = updates;
      
      return {
        ...state,
        unit: {
          ...state.unit,
          systemComponents: systemComponents || state.unit.systemComponents,
          criticalAllocations: criticalAllocations || state.unit.criticalAllocations,
          data: {
            ...state.unit.data,
            gyro: data?.gyro || state.unit.data?.gyro,
            weapons_and_equipment: data?.weapons_and_equipment || state.unit.data?.weapons_and_equipment,
            criticals: data?.criticals || state.unit.data?.criticals,
          },
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_STRUCTURE: {
      const updates = syncStructureChange(state.unit, action.payload.type as StructureType);
      
      // Extract what we need from updates
      const { systemComponents, data } = updates;
      
      // Build new state preserving critical allocations
      const newUnit = {
        ...state.unit,
        systemComponents: systemComponents || state.unit.systemComponents,
        // IMPORTANT: Always preserve existing criticalAllocations
        criticalAllocations: state.unit.criticalAllocations,
        data: {
          ...state.unit.data,
          // Update structure type and equipment list
          structure: data?.structure || state.unit.data?.structure,
          weapons_and_equipment: data?.weapons_and_equipment || state.unit.data?.weapons_and_equipment,
          // IMPORTANT: Preserve existing criticals
          criticals: state.unit.data?.criticals,
        },
        editorMetadata: {
          ...state.unit.editorMetadata,
          lastModified: new Date(),
          isDirty: true,
        },
      };
      
      return {
        ...state,
        unit: newUnit,
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_ARMOR: {
      const updates = syncArmorChange(state.unit, action.payload.type as ArmorType);
      
      // Don't overwrite criticalAllocations or criticals
      const { criticalAllocations, data, ...otherUpdates } = updates;
      
      return {
        ...state,
        unit: {
          ...state.unit,
          ...otherUpdates,
          data: {
            ...state.unit.data,
            ...data,
            // Preserve existing criticals
            criticals: state.unit.data?.criticals || data?.criticals,
          },
          // Preserve existing criticalAllocations
          criticalAllocations: state.unit.criticalAllocations,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_HEAT_SINKS: {
      const updates = syncHeatSinkChange(
        state.unit,
        action.payload.type as HeatSinkType,
        action.payload.count
      );
      
      return {
        ...state,
        unit: {
          ...state.unit,
          ...updates,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_EQUIPMENT: {
      const { action: equipAction, equipment, index, location } = action.payload;
      const weapons_and_equipment = [...(state.unit.data?.weapons_and_equipment || [])];
      
      switch (equipAction) {
        case 'add':
          weapons_and_equipment.push(equipment);
          break;
        case 'remove':
          if (index !== undefined) {
            weapons_and_equipment.splice(index, 1);
          }
          break;
        case 'update':
          if (index !== undefined && equipment) {
            weapons_and_equipment[index] = equipment;
          }
          break;
        case 'relocate':
          if (index !== undefined && location !== undefined) {
            weapons_and_equipment[index] = {
              ...weapons_and_equipment[index],
              location,
            };
          }
          break;
      }
      
      return {
        ...state,
        unit: {
          ...state.unit,
          data: {
            ...state.unit.data,
            weapons_and_equipment,
          },
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_CRITICAL_SLOTS: {
      const criticals = state.unit.data?.criticals?.map(loc => 
        loc.location === action.payload.location
          ? { 
              ...loc, 
              slots: action.payload.slots.map(slot => ({
                index: 0,
                name: slot,
                type: slot === '-Empty-' ? 'empty' as const : 'equipment' as const,
                isFixed: false
              }))
            }
          : loc
      ) || [];
      
      // Also update criticalAllocations if present
      let criticalAllocations = state.unit.criticalAllocations;
      if (criticalAllocations && criticalAllocations[action.payload.location]) {
        criticalAllocations = {
          ...criticalAllocations,
          [action.payload.location]: action.payload.slots.map((content, index): CriticalSlot => ({
            index,
            name: content,
            type: content === '-Empty-' ? 'empty' : 'equipment',
            isFixed: false,
            isManuallyPlaced: true,
          })),
        };
      }
      
      return {
        ...state,
        unit: {
          ...state.unit,
          data: {
            ...state.unit.data,
            criticals,
          },
          criticalAllocations,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_ARMOR_ALLOCATION: {
      const { location, front, rear } = action.payload;
      const armorAllocation = {
        ...state.unit.armorAllocation,
        [location]: {
          ...state.unit.armorAllocation?.[location],
          front: front ?? state.unit.armorAllocation?.[location]?.front ?? 0,
          rear: rear ?? state.unit.armorAllocation?.[location]?.rear ?? 0,
        },
      };
      
      return {
        ...state,
        unit: {
          ...state.unit,
          armorAllocation,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.UPDATE_ACTUATOR: {
      const { location, actuatorType, action: actuatorAction } = action.payload;
      const criticalAllocations = { ...state.unit.criticalAllocations };
      const systemComponents = state.unit.systemComponents || {
        engine: { type: 'Standard', rating: 300 },
        gyro: { type: 'Standard' },
        cockpit: { type: 'Standard' },
        structure: { type: 'Standard' },
        armor: { type: 'Standard' },
        heatSinks: { type: 'Single', total: 10, engineIntegrated: 10, externalRequired: 0 },
      };
      
      if (actuatorAction === 'remove') {
        removeActuator(criticalAllocations, systemComponents, location, actuatorType);
      } else {
        addActuator(criticalAllocations, systemComponents, location, actuatorType);
      }
      
      // Convert to legacy criticals format
      const criticals = Object.entries(criticalAllocations).map(([loc, slots]) => ({
        location: loc,
        slots: slots.map(slot => ({
          index: slot.index,
          name: slot.name || '-Empty-',
          type: slot.type || 'empty' as const,
          isFixed: slot.isFixed || false
        })),
      }));
      
      return {
        ...state,
        unit: {
          ...state.unit,
          systemComponents,
          criticalAllocations,
          data: {
            ...state.unit.data,
            criticals,
          },
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    case UnitActionType.VALIDATE_UNIT: {
      const validation = validateUnit(state.unit);
      
      // IMPORTANT: validateUnit should NOT modify the unit
      // Only update validation state, preserve everything else
      return {
        ...state,
        unit: {
          ...state.unit,
          validationState: {
            isValid: validation.valid,
            errors: validation.errors.filter(e => e.category === 'error'),
            warnings: validation.errors.filter(e => e.category === 'warning'),
          },
          // Ensure critical allocations are preserved
          criticalAllocations: state.unit.criticalAllocations,
          data: {
            ...state.unit.data,
            criticals: state.unit.data?.criticals,
          },
        },
        isValidating: false,
        // Don't change isDirty during validation - validation is a side effect
        isDirty: state.isDirty,
        lastAction: action.type,
        // Record what we validated to prevent re-validation loops
        lastValidatedUnit: state.unit,
      };
    }

    case UnitActionType.MIGRATE_UNIT: {
      const migratedUnit = migrateUnitToSystemComponents(state.unit);
      
      return {
        ...state,
        unit: {
          ...migratedUnit,
          editorMetadata: {
            ...state.unit.editorMetadata,
            lastModified: new Date(),
            isDirty: true,
          },
        },
        isDirty: true,
        lastAction: action.type,
      };
    }

    default:
      return state;
  }
}

// Context
interface UnitDataContextValue {
  state: UnitState;
  dispatch: React.Dispatch<UnitAction>;
  
  // Convenience methods
  setUnit: (unit: EditableUnit) => void;
  updateEngine: (type: string, rating: number) => void;
  updateGyro: (type: string) => void;
  updateStructure: (type: string) => void;
  updateArmor: (type: string) => void;
  updateHeatSinks: (type: string, count: number) => void;
  addEquipment: (equipment: any) => void;
  removeEquipment: (index: number) => void;
  updateEquipmentLocation: (index: number, location: string) => void;
  updateCriticalSlots: (location: string, slots: string[]) => void;
  updateArmorAllocation: (location: string, front?: number, rear?: number) => void;
  updateActuator: (location: string, actuatorType: 'Lower Arm Actuator' | 'Hand Actuator', action: 'add' | 'remove') => void;
  validateUnit: () => void;
  migrateUnit: () => void;
}

const UnitDataContext = createContext<UnitDataContextValue | null>(null);

// Provider component
interface UnitDataProviderProps {
  children: React.ReactNode;
  initialUnit: EditableUnit;
  onUnitChange?: (unit: EditableUnit) => void;
}

export function UnitDataProvider({ 
  children, 
  initialUnit, 
  onUnitChange 
}: UnitDataProviderProps) {
  // Initialize with migrated unit if needed
  const initializeState = (): UnitState => {
    let unit = initialUnit;
    
    // Always migrate if needed
    if (!unit.systemComponents || !unit.criticalAllocations) {
      unit = migrateUnitToSystemComponents(unit);
    }
    
    // Clean up "-Empty-" strings in criticalAllocations even if already migrated
    if (unit.criticalAllocations) {
      const cleanedAllocations = { ...unit.criticalAllocations };
      Object.entries(cleanedAllocations).forEach(([location, slots]) => {
        cleanedAllocations[location] = slots.map((slot, index) => ({
          index: slot.index || index,
          name: (slot.name === '-Empty-' || slot.name === '' || !slot.name) ? '-Empty-' : slot.name,
          type: (slot.name === '-Empty-' || slot.name === '' || !slot.name) ? 'empty' : (slot.type || 'equipment'),
          isFixed: slot.isFixed || false,
          isManuallyPlaced: slot.isManuallyPlaced || false,
        }));
      });
      unit = { ...unit, criticalAllocations: cleanedAllocations };
    }
    
    return {
      unit,
      isDirty: false,
      isValidating: false,
    };
  };

  const [state, dispatch] = useReducer(unitReducer, null, initializeState);

  // Notify parent component of changes
  useEffect(() => {
    if (state.isDirty && onUnitChange && 
        state.lastAction !== UnitActionType.SET_UNIT && 
        state.lastAction !== UnitActionType.MIGRATE_UNIT) {
      onUnitChange(state.unit);
    }
  }, [state.unit, state.isDirty, state.lastAction, onUnitChange]);

  // Auto-validate on changes
  useEffect(() => {
    // Only validate if unit has actually changed since last validation
    if (state.isDirty && !state.isValidating && state.unit !== state.lastValidatedUnit) {
      const timer = setTimeout(() => {
        dispatch({ type: UnitActionType.VALIDATE_UNIT });
      }, 500); // Debounce validation
      
      return () => clearTimeout(timer);
    }
  }, [state.isDirty, state.isValidating, state.unit, state.lastValidatedUnit]);

  // Convenience methods
  const contextValue: UnitDataContextValue = {
    state,
    dispatch,
    
    setUnit: useCallback((unit: EditableUnit) => {
      dispatch({ type: UnitActionType.SET_UNIT, payload: unit });
    }, []),
    
    updateEngine: useCallback((type: string, rating: number) => {
      dispatch({ type: UnitActionType.UPDATE_ENGINE, payload: { type, rating } });
    }, []),
    
    updateGyro: useCallback((type: string) => {
      dispatch({ type: UnitActionType.UPDATE_GYRO, payload: { type } });
    }, []),
    
    updateStructure: useCallback((type: string) => {
      dispatch({ type: UnitActionType.UPDATE_STRUCTURE, payload: { type } });
    }, []),
    
    updateArmor: useCallback((type: string) => {
      dispatch({ type: UnitActionType.UPDATE_ARMOR, payload: { type } });
    }, []),
    
    updateHeatSinks: useCallback((type: string, count: number) => {
      dispatch({ type: UnitActionType.UPDATE_HEAT_SINKS, payload: { type, count } });
    }, []),
    
    addEquipment: useCallback((equipment: any) => {
      dispatch({ 
        type: UnitActionType.UPDATE_EQUIPMENT, 
        payload: { action: 'add', equipment } 
      });
    }, []),
    
    removeEquipment: useCallback((index: number) => {
      dispatch({ 
        type: UnitActionType.UPDATE_EQUIPMENT, 
        payload: { action: 'remove', index } 
      });
    }, []),
    
    updateEquipmentLocation: useCallback((index: number, location: string) => {
      dispatch({ 
        type: UnitActionType.UPDATE_EQUIPMENT, 
        payload: { action: 'relocate', index, location } 
      });
    }, []),
    
    updateCriticalSlots: useCallback((location: string, slots: string[]) => {
      dispatch({ 
        type: UnitActionType.UPDATE_CRITICAL_SLOTS, 
        payload: { location, slots } 
      });
    }, []),
    
    updateArmorAllocation: useCallback((location: string, front?: number, rear?: number) => {
      dispatch({ 
        type: UnitActionType.UPDATE_ARMOR_ALLOCATION, 
        payload: { location, front, rear } 
      });
    }, []),
    
    updateActuator: useCallback((location: string, actuatorType: 'Lower Arm Actuator' | 'Hand Actuator', action: 'add' | 'remove') => {
      dispatch({
        type: UnitActionType.UPDATE_ACTUATOR,
        payload: { location, actuatorType, action }
      });
    }, []),
    
    validateUnit: useCallback(() => {
      dispatch({ type: UnitActionType.VALIDATE_UNIT });
    }, []),
    
    migrateUnit: useCallback(() => {
      dispatch({ type: UnitActionType.MIGRATE_UNIT });
    }, []),
  };

  return (
    <UnitDataContext.Provider value={contextValue}>
      {children}
    </UnitDataContext.Provider>
  );
}

// Hook to use the unit data
export function useUnitData() {
  const context = useContext(UnitDataContext);
  if (!context) {
    throw new Error('useUnitData must be used within a UnitDataProvider');
  }
  return context;
}

// Hook for specific component data
export function useSystemComponents() {
  const { state } = useUnitData();
  return state.unit.systemComponents;
}

export function useCriticalAllocations() {
  const { state } = useUnitData();
  return state.unit.criticalAllocations;
}

export function useEquipment() {
  const { state } = useUnitData();
  return state.unit.data?.weapons_and_equipment || [];
}

export function useArmorAllocation() {
  const { state } = useUnitData();
  return state.unit.armorAllocation || {};
}

export function useValidationState() {
  const { state } = useUnitData();
  return state.unit.validationState;
}
