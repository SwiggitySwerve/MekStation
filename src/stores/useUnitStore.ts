/**
 * Unit Store Factory
 * 
 * Creates isolated Zustand stores for individual units.
 * Each unit has its own store instance with independent persistence.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';

// =============================================================================
// Client-Safe Storage
// =============================================================================

/**
 * Storage wrapper that safely handles SSR (no localStorage on server)
 */
const clientSafeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};
import { TechBase } from '@/types/enums/TechBase';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import {
  UnitState,
  UnitActions,
  UnitStore,
  CreateUnitOptions,
  createDefaultUnitState,
  ISelectionMemory,
  ITechBaseMemory,
  createEmptySelectionMemory,
  IArmorAllocation,
  createEmptyArmorAllocation,
  getTotalAllocatedArmor,
  IMountedEquipmentInstance,
  createMountedEquipment,
} from './unitState';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  calculateArmorPoints,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  calculateOptimalArmorAllocation,
} from '@/utils/construction/armorCalculations';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import {
  getValidatedSelectionUpdates,
  getFullyValidatedSelections,
  getSelectionWithMemory,
  ComponentSelections,
} from '@/utils/techBaseValidation';
import { JumpJetType, getMaxJumpMP, getJumpJetDefinition } from '@/utils/construction/movementCalculations';
import { HeatSinkType, getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { calculateIntegralHeatSinks, calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { EquipmentCategory } from '@/types/equipment';
import { equipmentCalculatorService, VARIABLE_EQUIPMENT } from '@/services/equipment/EquipmentCalculatorService';
import {
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
} from '@/utils/construction/displacementUtils';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  createJumpJetEquipmentList,
  filterOutJumpJets,
  createInternalStructureEquipmentList,
  filterOutInternalStructure,
  INTERNAL_STRUCTURE_EQUIPMENT_ID,
  createArmorEquipmentList,
  filterOutArmorSlots,
  ARMOR_SLOTS_EQUIPMENT_ID,
  createHeatSinkEquipmentList,
  filterOutHeatSinks,
  HEAT_SINK_EQUIPMENT_IDS,
  createEnhancementEquipmentList,
  filterOutEnhancementEquipment,
  calculateEnhancementWeight,
  calculateEnhancementSlots,
  ENHANCEMENT_EQUIPMENT_IDS,
} from '@/utils/equipment/equipmentListUtils';

// Re-export UnitStore type for convenience
export type { UnitStore } from './unitState';

// =============================================================================
// Equipment List Helpers - Imported from utils/equipment/equipmentListUtils.ts
// =============================================================================
// The following functions are imported from the utilities file:
// - createJumpJetEquipmentList, filterOutJumpJets
// - createInternalStructureEquipmentList, filterOutInternalStructure
// - createArmorEquipmentList, filterOutArmorSlots
// - createHeatSinkEquipmentList, filterOutHeatSinks
// - createEnhancementEquipmentList, filterOutEnhancementEquipment
// - calculateEnhancementWeight, calculateEnhancementSlots
// =============================================================================

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single unit
 * 
 * Each unit gets its own store instance that:
 * - Contains only that unit's state
 * - Persists independently to localStorage
 * - Has a clean API without tabId parameters
 */
export function createUnitStore(initialState: UnitState): StoreApi<UnitStore> {
  return create<UnitStore>()(
    persist(
      (set) => ({
        // Spread initial state
        ...initialState,
        
        // =================================================================
        // Identity Actions
        // =================================================================
        
        setName: (name) => set({
          name,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setChassis: (chassis) => set((state) => ({
          chassis,
          // Update derived name
          name: `${chassis}${state.model ? ' ' + state.model : ''}`,
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setClanName: (clanName) => set({
          clanName,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setModel: (model) => set((state) => ({
          model,
          // Update derived name
          name: `${state.chassis}${model ? ' ' + model : ''}`,
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setMulId: (mulId) => set({
          mulId,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setYear: (year) => set({
          year,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setRulesLevel: (rulesLevel) => set({
          rulesLevel,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Chassis Actions
        // =================================================================
        
        setTonnage: (tonnage) => set((state) => {
          // Recalculate engine rating to maintain same Walk MP
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const newEngineRating = tonnage * walkMP;
          // Clamp engine rating to valid range
          const clampedRating = Math.max(10, Math.min(400, newEngineRating));
          
          // Re-sync enhancement equipment since MASC depends on tonnage, Supercharger on engine
          const engineWeight = calculateEngineWeight(clampedRating, state.engineType);
          
          // Filter out equipment that needs to be recalculated based on tonnage
          let updatedEquipment = filterOutEnhancementEquipment(state.equipment);
          updatedEquipment = filterOutJumpJets(updatedEquipment);
          
          // Recreate enhancement equipment with new tonnage
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            tonnage,
            state.techBase,
            engineWeight
          );
          
          // Recreate jump jet equipment with new tonnage (weight varies by tonnage class)
          const jumpJetEquipment = createJumpJetEquipmentList(
            tonnage,
            state.jumpMP,
            state.jumpJetType
          );
          
          return {
            tonnage,
            engineRating: clampedRating,
            equipment: [...updatedEquipment, ...enhancementEquipment, ...jumpJetEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setConfiguration: (configuration) => set({
          configuration,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setIsOmni: (isOmni) => set({
          isOmni,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Tech Base Actions
        // =================================================================
        
        setTechBaseMode: (mode) => set((state) => {
          // When switching to MIXED mode, preserve current techBase
          // When switching to non-mixed mode, reset all components to match the new tech base
          const newTechBase = mode === TechBaseMode.MIXED 
            ? state.techBase  // Preserve current techBase in MIXED mode
            : (mode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE);
          const newComponentTechBases = mode === TechBaseMode.MIXED
            ? state.componentTechBases
            : createDefaultComponentTechBases(newTechBase);
          
          // Determine old tech base for saving to memory
          const oldTechBase = state.techBaseMode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
          const memoryTechBase = mode === TechBaseMode.MIXED ? undefined : newTechBase;
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base (if not mixed)
          let updatedMemory = { ...state.selectionMemory };
          if (state.techBaseMode !== TechBaseMode.MIXED) {
            updatedMemory = {
              engine: { ...updatedMemory.engine, [oldTechBase]: state.engineType },
              gyro: { ...updatedMemory.gyro, [oldTechBase]: state.gyroType },
              structure: { ...updatedMemory.structure, [oldTechBase]: state.internalStructureType },
              cockpit: { ...updatedMemory.cockpit, [oldTechBase]: state.cockpitType },
              heatSink: { ...updatedMemory.heatSink, [oldTechBase]: state.heatSinkType },
              armor: { ...updatedMemory.armor, [oldTechBase]: state.armorType },
            };
          }
          
          // Validate and update all component selections for the new tech bases
          // Try to restore from memory if switching to a non-mixed mode
          const validatedSelections = getFullyValidatedSelections(
            newComponentTechBases,
            currentSelections,
            memoryTechBase ? updatedMemory : undefined,
            memoryTechBase
          );
          
          // Re-sync enhancement equipment since MASC calculation differs by tech base
          const engineWeight = calculateEngineWeight(state.engineRating, validatedSelections.engineType ?? state.engineType);
          const nonEnhancementEquipment = filterOutEnhancementEquipment(state.equipment);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            newTechBase,
            engineWeight
          );
          
          return {
            techBaseMode: mode,
            techBase: newTechBase,
            componentTechBases: newComponentTechBases,
            selectionMemory: updatedMemory,
            ...validatedSelections,
            equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setComponentTechBase: (component, techBase) => set((state) => {
          const oldTechBase = state.componentTechBases[component];
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base
          const updatedMemory: ISelectionMemory = {
            ...state.selectionMemory,
          };
          
          // Map component to memory key and save current value using TechBase enum
          if (component === TechBaseComponent.ENGINE) {
            updatedMemory.engine = { ...updatedMemory.engine, [oldTechBase]: state.engineType };
          } else if (component === TechBaseComponent.GYRO) {
            updatedMemory.gyro = { ...updatedMemory.gyro, [oldTechBase]: state.gyroType };
          } else if (component === TechBaseComponent.CHASSIS) {
            updatedMemory.structure = { ...updatedMemory.structure, [oldTechBase]: state.internalStructureType };
            updatedMemory.cockpit = { ...updatedMemory.cockpit, [oldTechBase]: state.cockpitType };
          } else if (component === TechBaseComponent.HEATSINK) {
            updatedMemory.heatSink = { ...updatedMemory.heatSink, [oldTechBase]: state.heatSinkType };
          } else if (component === TechBaseComponent.ARMOR) {
            updatedMemory.armor = { ...updatedMemory.armor, [oldTechBase]: state.armorType };
          }
          
          // Get validated selection updates, using memory if available
          const selectionUpdates = getSelectionWithMemory(
            component as TechBaseComponent,
            techBase,
            currentSelections,
            updatedMemory
          );
          
          return {
            componentTechBases: {
              ...state.componentTechBases,
              [component]: techBase,
            },
            selectionMemory: updatedMemory,
            ...selectionUpdates,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setAllComponentTechBases: (techBases) => set({
          componentTechBases: techBases,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Component Actions
        // =================================================================
        
        setEngineType: (type) => set((state) => {
          // Find equipment displaced by new engine's slot requirements
          const displaced = getEquipmentDisplacedByEngineChange(
            state.equipment,
            state.engineType,
            type,
            state.gyroType
          );
          
          // Unallocate displaced equipment
          let updatedEquipment = applyDisplacement(
            state.equipment,
            displaced.displacedEquipmentIds
          );
          
          // Re-sync heat sink equipment since integral capacity may have changed
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, type);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          const nonHeatSinkEquipment = filterOutHeatSinks(updatedEquipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          updatedEquipment = [...nonHeatSinkEquipment, ...heatSinkEquipment];
          
          // Re-sync enhancement equipment since Supercharger depends on engine weight
          const engineWeight = calculateEngineWeight(state.engineRating, type);
          const nonEnhancementEquipment = filterOutEnhancementEquipment(updatedEquipment);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            state.techBase,
            engineWeight
          );
          updatedEquipment = [...nonEnhancementEquipment, ...enhancementEquipment];
          
          return {
            engineType: type,
            equipment: updatedEquipment,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setEngineRating: (rating) => set((state) => {
          // Re-sync heat sink equipment since integral capacity changes with rating
          const integralHeatSinks = calculateIntegralHeatSinks(rating, state.engineType);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          
          // Re-sync enhancement equipment since Supercharger depends on engine weight
          const engineWeight = calculateEngineWeight(rating, state.engineType);
          const nonEnhancementEquipment = filterOutEnhancementEquipment([...nonHeatSinkEquipment, ...heatSinkEquipment]);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            state.techBase,
            engineWeight
          );
          
          return {
            engineRating: rating,
            equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setGyroType: (type) => set((state) => {
          // Find equipment displaced by new gyro's slot requirements
          const displaced = getEquipmentDisplacedByGyroChange(
            state.equipment,
            state.engineType,
            state.gyroType,
            type
          );
          
          // Unallocate displaced equipment
          const updatedEquipment = applyDisplacement(
            state.equipment,
            displaced.displacedEquipmentIds
          );
          
          return {
            gyroType: type,
            equipment: updatedEquipment,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setInternalStructureType: (type) => set((state) => {
          // Sync equipment - remove old structure equipment, add new ones
          const nonStructureEquipment = filterOutInternalStructure(state.equipment);
          const structureEquipment = createInternalStructureEquipmentList(type);
          
          return {
            internalStructureType: type,
            equipment: [...nonStructureEquipment, ...structureEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setCockpitType: (type) => set({
          cockpitType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setHeatSinkType: (type) => set((state) => {
          // Calculate external heat sinks based on engine capacity
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, state.engineType);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          
          // Sync equipment - remove old heat sinks, add new ones with new type
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(type, externalHeatSinks);
          
          return {
            heatSinkType: type,
            equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setHeatSinkCount: (count) => set((state) => {
          // Calculate external heat sinks based on engine capacity
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, state.engineType);
          const externalHeatSinks = Math.max(0, count - integralHeatSinks);
          
          // Sync equipment - remove old heat sinks, add new ones with updated count
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          
          return {
            heatSinkCount: count,
            equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setArmorType: (type) => set((state) => {
          // Sync equipment - remove old armor slot equipment, add new ones
          const nonArmorEquipment = filterOutArmorSlots(state.equipment);
          const armorEquipment = createArmorEquipmentList(type);
          
          return {
            armorType: type,
            equipment: [...nonArmorEquipment, ...armorEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setEnhancement: (enhancement) => set((state) => {
          // Sync equipment - remove old enhancement equipment, add new ones
          const nonEnhancementEquipment = filterOutEnhancementEquipment(state.equipment);
          const engineWeight = calculateEngineWeight(state.engineRating, state.engineType);
          const enhancementEquipment = createEnhancementEquipmentList(
            enhancement,
            state.tonnage,
            state.techBase,
            engineWeight
          );
          
          return {
            enhancement,
            equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setJumpMP: (jumpMP) => set((state) => {
          // Calculate walk MP for validation
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const maxJump = getMaxJumpMP(walkMP, state.jumpJetType);
          const clampedJumpMP = Math.max(0, Math.min(jumpMP, maxJump));
          
          // Sync equipment - remove old jump jets, add new ones
          const nonJumpEquipment = filterOutJumpJets(state.equipment);
          const jumpJetEquipment = createJumpJetEquipmentList(state.tonnage, clampedJumpMP, state.jumpJetType);
          
          return {
            jumpMP: clampedJumpMP,
            equipment: [...nonJumpEquipment, ...jumpJetEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setJumpJetType: (jumpJetType) => set((state) => {
          // Calculate walk MP for validation
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const maxJump = getMaxJumpMP(walkMP, jumpJetType);
          
          // Clamp current jump MP to new max if needed
          const clampedJumpMP = Math.min(state.jumpMP, maxJump);
          
          // Sync equipment with new jet type
          const nonJumpEquipment = filterOutJumpJets(state.equipment);
          const jumpJetEquipment = createJumpJetEquipmentList(state.tonnage, clampedJumpMP, jumpJetType);
          
          return {
            jumpJetType,
            jumpMP: clampedJumpMP,
            equipment: [...nonJumpEquipment, ...jumpJetEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        // =================================================================
        // Armor Allocation Actions
        // =================================================================
        
        setArmorTonnage: (tonnage) => set({
          armorTonnage: Math.max(0, tonnage),
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setLocationArmor: (location, front, rear) => set((state) => {
          const newAllocation = { ...state.armorAllocation };
          const maxArmor = getMaxArmorForLocation(state.tonnage, location);
          
          // Clamp front armor to valid range
          const clampedFront = Math.max(0, Math.min(front, maxArmor));
          newAllocation[location] = clampedFront;
          
          // Handle rear armor for torso locations
          if (rear !== undefined) {
            // Front + rear cannot exceed location max
            const maxRear = maxArmor - clampedFront;
            const clampedRear = Math.max(0, Math.min(rear, maxRear));
            
            switch (location) {
              case MechLocation.CENTER_TORSO:
                newAllocation.centerTorsoRear = clampedRear;
                break;
              case MechLocation.LEFT_TORSO:
                newAllocation.leftTorsoRear = clampedRear;
                break;
              case MechLocation.RIGHT_TORSO:
                newAllocation.rightTorsoRear = clampedRear;
                break;
            }
          }
          
          return {
            armorAllocation: newAllocation,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        autoAllocateArmor: () => set((state) => {
          const availablePoints = calculateArmorPoints(state.armorTonnage, state.armorType);
          
          // Use the optimal allocation algorithm
          // Priority: 1) Max head, 2) Weighted distribution, 3) Even remainder distribution
          const allocation = calculateOptimalArmorAllocation(availablePoints, state.tonnage);
          
          const newAllocation: IArmorAllocation = {
            [MechLocation.HEAD]: allocation.head,
            [MechLocation.CENTER_TORSO]: allocation.centerTorsoFront,
            centerTorsoRear: allocation.centerTorsoRear,
            [MechLocation.LEFT_TORSO]: allocation.leftTorsoFront,
            leftTorsoRear: allocation.leftTorsoRear,
            [MechLocation.RIGHT_TORSO]: allocation.rightTorsoFront,
            rightTorsoRear: allocation.rightTorsoRear,
            [MechLocation.LEFT_ARM]: allocation.leftArm,
            [MechLocation.RIGHT_ARM]: allocation.rightArm,
            [MechLocation.LEFT_LEG]: allocation.leftLeg,
            [MechLocation.RIGHT_LEG]: allocation.rightLeg,
          };
          
          return {
            armorAllocation: newAllocation,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        maximizeArmor: () => set((state) => {
          // Calculate max armor points needed for the mech
          const maxTotalArmor = getMaxTotalArmor(state.tonnage);
          const armorDef = getArmorDefinition(state.armorType);
          const pointsPerTon = armorDef?.pointsPerTon ?? 16;
          
          // Calculate tonnage needed for max armor
          const tonnageNeeded = ceilToHalfTon(maxTotalArmor / pointsPerTon);
          
          return {
            armorTonnage: tonnageNeeded,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        clearAllArmor: () => set({
          armorAllocation: createEmptyArmorAllocation(),
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Equipment Actions
        // =================================================================
        
        addEquipment: (item: IEquipmentItem) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createMountedEquipment(item, instanceId);
          
          set((state) => ({
            equipment: [...state.equipment, mountedEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          }));
          
          return instanceId;
        },
        
        removeEquipment: (instanceId: string) => set((state) => ({
          equipment: state.equipment.filter(e => e.instanceId !== instanceId),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        updateEquipmentLocation: (instanceId: string, location: MechLocation, slots: readonly number[]) => 
          set((state) => ({
            equipment: state.equipment.map(e => 
              e.instanceId === instanceId
                ? { ...e, location, slots }
                : e
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),
        
        bulkUpdateEquipmentLocations: (updates: ReadonlyArray<{ instanceId: string; location: MechLocation; slots: readonly number[] }>) =>
          set((state) => {
            // Create a map for O(1) lookup
            const updateMap = new Map(updates.map(u => [u.instanceId, u]));
            return {
              equipment: state.equipment.map(e => {
                const update = updateMap.get(e.instanceId);
                return update
                  ? { ...e, location: update.location, slots: update.slots }
                  : e;
              }),
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),
        
        clearEquipmentLocation: (instanceId: string) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === instanceId
              ? { ...e, location: undefined, slots: undefined }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === instanceId
              ? { ...e, isRearMounted }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === weaponInstanceId
              ? { ...e, linkedAmmoId: ammoInstanceId }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        clearAllEquipment: () => set({
          equipment: [],
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Metadata Actions
        // =================================================================
        
        markModified: (modified = true) => set({
          isModified: modified,
          lastModifiedAt: Date.now(),
        }),
      }),
      {
        name: `megamek-unit-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true, // We manually hydrate after client mount
        // Only persist state, not actions
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          chassis: state.chassis,
          clanName: state.clanName,
          model: state.model,
          mulId: state.mulId,
          year: state.year,
          rulesLevel: state.rulesLevel,
          tonnage: state.tonnage,
          techBase: state.techBase,
          unitType: state.unitType,
          configuration: state.configuration,
          isOmni: state.isOmni,
          techBaseMode: state.techBaseMode,
          componentTechBases: state.componentTechBases,
          selectionMemory: state.selectionMemory,
          engineType: state.engineType,
          engineRating: state.engineRating,
          gyroType: state.gyroType,
          internalStructureType: state.internalStructureType,
          cockpitType: state.cockpitType,
          heatSinkType: state.heatSinkType,
          heatSinkCount: state.heatSinkCount,
          armorType: state.armorType,
          armorTonnage: state.armorTonnage,
          armorAllocation: state.armorAllocation,
          enhancement: state.enhancement,
          jumpMP: state.jumpMP,
          jumpJetType: state.jumpJetType,
          equipment: state.equipment,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      }
    )
  );
}

/**
 * Create a new unit store from options
 */
export function createNewUnitStore(options: CreateUnitOptions): StoreApi<UnitStore> {
  const initialState = createDefaultUnitState(options);
  return createUnitStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active unit's store
 */
export const UnitStoreContext = createContext<StoreApi<UnitStore> | null>(null);

/**
 * Hook to access the unit store from context
 * 
 * This is the primary way components access unit state.
 * No tabId is needed - the context provides the active unit's store.
 * 
 * @example
 * const engineType = useUnitStore((s) => s.engineType);
 * const setEngineType = useUnitStore((s) => s.setEngineType);
 */
export function useUnitStore<T>(selector: (state: UnitStore) => T): T {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStore must be used within a UnitStoreProvider. ' +
      'Wrap your component tree with <UnitStoreProvider>.'
    );
  }
  
  return useStore(store, selector);
}

/**
 * Hook to get the entire unit store API
 * Useful when you need direct access to the store
 */
export function useUnitStoreApi(): StoreApi<UnitStore> {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStoreApi must be used within a UnitStoreProvider.'
    );
  }
  
  return store;
}

