/**
 * useMechLabStore.ts
 * Simple React hook for managing Mech Lab state (for now).
 * Can be upgraded to Redux/Zustand later if complexity grows.
 */

import { useState, useCallback, useMemo } from 'react';
import { IMechLabState, DEFAULT_MECH_STATE, IInstalledEquipmentState } from '../store/MechLabState';
import { TechBase } from '../../../types/TechBase';
import { StructureMechanics } from '../../../mechanics/Structure';
import { EngineMechanics } from '../../../mechanics/Engine';
import { GyroMechanics } from '../../../mechanics/Gyro';
import { ArmorMechanics } from '../../../mechanics/Armor';
import { EngineType, GyroType, StructureType, ArmorType } from '../../../types/SystemComponents';
import { getWeaponById } from '../../../data/weapons';

export function useMechLabStore(initialState: IMechLabState = DEFAULT_MECH_STATE) {
  const [state, setState] = useState<IMechLabState>(initialState);

  // --- Actions ---

  const setTonnage = useCallback((tonnage: number) => {
    setState(prev => ({ ...prev, tonnage }));
  }, []);

  const setTechBase = useCallback((techBase: TechBase) => {
    setState(prev => ({ ...prev, techBase }));
  }, []);

  const setWalkingMP = useCallback((mp: number) => {
    setState(prev => ({ ...prev, walkingMP: mp }));
  }, []);
  
  const setStructureType = useCallback((type: StructureType) => {
    setState(prev => ({ ...prev, structureType: type }));
  }, []);

  const setEngineType = useCallback((type: EngineType) => {
    setState(prev => ({ ...prev, engineType: type }));
  }, []);

  const addEquipment = useCallback((equipmentId: string) => {
    setState(prev => {
      const newItem: IInstalledEquipmentState = {
        id: crypto.randomUUID(),
        equipmentId,
        location: 'unallocated',
        slotIndex: -1,
        count: 1,
      };
      return { ...prev, equipment: [...prev.equipment, newItem] };
    });
  }, []);

  const removeEquipment = useCallback((instanceId: string) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e.id !== instanceId)
    }));
  }, []);

  // --- Derived Metrics Calculation ---
  
  const metrics = useMemo(() => {
    // 1. Structure Weight
    const structureWeight = StructureMechanics.calculateWeight(state.tonnage, state.structureType);
    
    // 2. Engine Weight
    const rating = EngineMechanics.calculateRating(state.tonnage, state.walkingMP);
    const engineWeight = EngineMechanics.calculateWeight(rating, state.engineType);
    
    // 3. Gyro Weight
    const gyroWeight = GyroMechanics.calculateWeight(rating, state.gyroType);
    
    // 4. Cockpit Weight (Placeholder)
    const cockpitWeight = 3.0;

    // 5. Equipment Weight
    const equipmentWeight = state.equipment.reduce((total, item) => {
      const def = getWeaponById(item.equipmentId);
      return total + (def ? def.weight * item.count : 0);
    }, 0);
    
    // 6. Total Weight
    const currentWeight = structureWeight + engineWeight + gyroWeight + cockpitWeight + equipmentWeight; // + others...
    
    const remainingTonnage = state.tonnage - currentWeight;
    
    return {
      structureWeight,
      engineWeight,
      gyroWeight,
      cockpitWeight,
      equipmentWeight,
      currentWeight,
      remainingTonnage,
      engineRating: rating,
    };
  }, [state]);

  const assignEquipment = useCallback((instanceId: string, location: string, slotIndex: number) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.map(item => 
        item.id === instanceId 
          ? { ...item, location, slotIndex } 
          : item
      )
    }));
  }, []);

  const unassignEquipment = useCallback((instanceId: string) => {
    setState(prev => ({
      ...prev,
      equipment: prev.equipment.map(item => 
        item.id === instanceId 
          ? { ...item, location: 'unallocated', slotIndex: -1 } 
          : item
      )
    }));
  }, []);

  return {
    state,
    metrics,
    actions: {
      setTonnage,
      setTechBase,
      setWalkingMP,
      setStructureType,
      setEngineType,
      addEquipment,
      removeEquipment,
      assignEquipment,
      unassignEquipment,
    }
  };
}

