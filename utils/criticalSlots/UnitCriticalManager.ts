/**
 * Unit Critical Manager - Unit-level equipment tracking and management
 * Aggregates all critical sections and manages equipment allocation across the entire unit
 */

import { CriticalSection, LocationSlotConfiguration, FixedSystemComponent } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { EngineType, SystemComponentRules } from './SystemComponentRules'
import { CriticalSlotCalculator, CriticalSlotBreakdown } from './CriticalSlotCalculator'
import { 
  ComponentConfiguration, 
  TechBase, 
  ComponentCategory, 
  createComponentConfiguration,
  migrateStringToComponentConfiguration,
  getComponentTypeNames,
  getComponentDefinition
} from '../../types/componentConfiguration'

// Import types and builder from extracted files
import {
  UnitValidationResult,
  SpecialEquipmentObject,
  CompleteUnitState,
  SerializedEquipment,
  SerializedSlotAllocations,
  StateValidationResult,
  ArmorAllocation,
  UnitConfiguration,
  LegacyUnitConfiguration
} from './UnitCriticalManagerTypes'

import { UnitConfigurationBuilder } from './UnitConfigurationBuilder'
import { SpecialComponentsManager } from './SpecialComponentsManager'
import { SystemComponentsManager } from './SystemComponentsManager'
import { EquipmentAllocationManager } from './EquipmentAllocationManager'
import { WeightBalanceManager } from './WeightBalanceManager'
import { HeatManagementManager } from './HeatManagementManager'
import { ValidationManager } from './ValidationManager'
import { UnitSerializationManager } from './UnitSerializationManager'
import { UnitCalculationManager } from './UnitCalculationManager';
import { UnitStateManager } from './UnitStateManager';
import { ConfigurationManager } from './ConfigurationManager';
import { ComponentTypeManager } from './ComponentTypeManager';
import { CriticalSlotCalculationManager } from './CriticalSlotCalculationManager';
import { EquipmentQueryManager } from './EquipmentQueryManager';
import { EventManager } from './EventManager';
import { ArmorManagementManager } from './ArmorManagementManager';
import { SectionManagementManager } from './SectionManagementManager';
import { WeightCalculationManager } from './WeightCalculationManager';





// Standard mech location configurations
const MECH_LOCATION_CONFIGS: LocationSlotConfiguration[] = [
  {
    location: 'Head',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Life Support', slotIndex: 0, isRemovable: false, componentType: 'life_support' }],
      [1, { name: 'Sensors', slotIndex: 1, isRemovable: false, componentType: 'sensors' }],
      [2, { name: 'Standard Cockpit', slotIndex: 2, isRemovable: false, componentType: 'cockpit' }],
      [4, { name: 'Sensors', slotIndex: 4, isRemovable: false, componentType: 'sensors' }],
      [5, { name: 'Life Support', slotIndex: 5, isRemovable: false, componentType: 'life_support' }]
    ]),
    availableSlotIndices: [3], // Only slot 4 (index 3) available
    systemReservedSlots: []
  },
  {
    location: 'Center Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine/gyro
    systemReservedSlots: []
  },
  {
    location: 'Left Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine
    systemReservedSlots: []
  },
  {
    location: 'Right Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine
    systemReservedSlots: []
  },
  {
    location: 'Left Arm',
    totalSlots: 12,
    fixedSlots: new Map([
      [0, { name: 'Shoulder', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Arm Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Arm Actuator', slotIndex: 2, isRemovable: true, componentType: 'actuator' }],
      [3, { name: 'Hand Actuator', slotIndex: 3, isRemovable: true, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5, 6, 7, 8, 9, 10, 11], // Slots 5-12 available
    systemReservedSlots: []
  },
  {
    location: 'Right Arm',
    totalSlots: 12,
    fixedSlots: new Map([
      [0, { name: 'Shoulder', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Arm Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Arm Actuator', slotIndex: 2, isRemovable: true, componentType: 'actuator' }],
      [3, { name: 'Hand Actuator', slotIndex: 3, isRemovable: true, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5, 6, 7, 8, 9, 10, 11], // Slots 5-12 available
    systemReservedSlots: []
  },
  {
    location: 'Left Leg',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Hip', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Leg Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Leg Actuator', slotIndex: 2, isRemovable: false, componentType: 'actuator' }],
      [3, { name: 'Foot Actuator', slotIndex: 3, isRemovable: false, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5], // Only slots 5-6 available
    systemReservedSlots: []
  },
  {
    location: 'Right Leg',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Hip', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Leg Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Leg Actuator', slotIndex: 2, isRemovable: false, componentType: 'actuator' }],
      [3, { name: 'Foot Actuator', slotIndex: 3, isRemovable: false, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5], // Only slots 5-6 available
    systemReservedSlots: []
  }
]

// Critical slot constants
export const TOTAL_CRITICAL_SLOTS = 78; // Standard BattleMech total

export class UnitCriticalManager {
  private sections: Map<string, CriticalSection>
  public unallocatedEquipment: EquipmentAllocation[]
  public configuration: UnitConfiguration
  private listeners: (() => void)[] = []
  private specialComponentsInitialized: boolean = false // Track if special components created
  private static globalComponentCounter: number = 0 // CRITICAL FIX: Global counter for absolutely unique IDs
  private specialComponentsManager: SpecialComponentsManager
  private systemComponentsManager: SystemComponentsManager
  private equipmentAllocationManager: EquipmentAllocationManager
  private weightBalanceManager: WeightBalanceManager
  private heatManagementManager: HeatManagementManager
  private validationManager: ValidationManager
  private serializationManager: UnitSerializationManager
  private calculationManager: UnitCalculationManager;
  private stateManager: UnitStateManager;
  private configurationManager: ConfigurationManager;
  private equipmentQueryManager: EquipmentQueryManager;
  private eventManager: EventManager;
  private armorManagementManager: ArmorManagementManager;
  private sectionManagementManager: SectionManagementManager;
  private weightCalculationManager: WeightCalculationManager;

  // ===== HELPER METHODS FOR COMPONENT CONFIGURATION =====

  /**
   * Extract type string from ComponentConfiguration
   * @deprecated Use component.type directly instead
   */
  private static extractComponentType(component: ComponentConfiguration): string {
    return component.type
  }

  /**
   * Type guard to safely access componentType property on equipment
   */
  private static hasComponentType(equipment: EquipmentObject): equipment is EquipmentObject & { componentType: string } {
    return 'componentType' in equipment && typeof (equipment as EquipmentObject & { componentType: unknown }).componentType === 'string'
  }

  /**
   * Safely get componentType from equipment
   */
  private static getComponentType(equipment: EquipmentObject): string | undefined {
    return UnitCriticalManager.hasComponentType(equipment) ? equipment.componentType : undefined
  }

  /**
   * Extract tech base from ComponentConfiguration or infer from string
   */
  private static extractTechBase(component: ComponentConfiguration | string, fallback: TechBase = 'Inner Sphere'): TechBase {
    if (typeof component === 'string') {
      // Infer tech base from string (legacy compatibility)
      return component.includes('Clan') ? 'Clan' : fallback
    }
    return component.techBase
  }

  /**
   * Get structure type as string
   */
  private getStructureTypeString(): string {
    return UnitCriticalManager.extractComponentType(this.configuration.structureType)
  }

  /**
   * Get armor type as string
   */
  private getArmorTypeString(): string {
    return this.armorManagementManager.getArmorTypeString()
  }

  /**
   * Get heat sink type as string
   */
  private getHeatSinkTypeString(): string {
    return UnitCriticalManager.extractComponentType(this.configuration.heatSinkType)
  }

  /**
   * Get gyro type as string
   */
  private getGyroTypeString(): string {
    return UnitCriticalManager.extractComponentType(this.configuration.gyroType)
  }

  constructor(configuration: UnitConfiguration | LegacyUnitConfiguration) {
    // Convert legacy configuration to new format if needed
    this.configuration = UnitConfigurationBuilder.buildConfiguration(configuration)
    this.sections = new Map()
    this.unallocatedEquipment = []
    
    this.initializeSections()
    
    // Initialize special components manager
    this.specialComponentsManager = new SpecialComponentsManager(
      this.sections,
      this.unallocatedEquipment,
      this.configuration
    )
    
    // Initialize system components manager
    this.systemComponentsManager = new SystemComponentsManager(
      this,
      this.sections
    )
    
    // Allocate system components after managers are initialized
    this.allocateSystemComponents()
    
    // CRITICAL FIX: Create special components for initial configuration
    this.initializeSpecialComponents()
    
    // Initialize equipment allocation manager
    this.equipmentAllocationManager = new EquipmentAllocationManager(
      this,
      this.sections,
      this.configuration
    )
    
    // Initialize weight balance manager
    this.weightBalanceManager = new WeightBalanceManager(
      this.configuration,
      this.unallocatedEquipment
    )
    
    // Initialize heat management manager
    this.heatManagementManager = new HeatManagementManager(
      this.configuration,
      this.unallocatedEquipment
    )
    
    // Initialize validation manager
    this.validationManager = new ValidationManager(
      this.sections,
      this.unallocatedEquipment,
      this.configuration
    )
    
    this.serializationManager = new UnitSerializationManager()
    this.calculationManager = new UnitCalculationManager();
    this.stateManager = new UnitStateManager(this.sections, this.unallocatedEquipment, this);
    
    // Initialize new managers
    this.configurationManager = new ConfigurationManager(this.configuration);
    this.equipmentQueryManager = new EquipmentQueryManager(this.sections, this.unallocatedEquipment, this.configuration);
    this.eventManager = new EventManager();
    this.armorManagementManager = new ArmorManagementManager(this.configuration);
    this.sectionManagementManager = new SectionManagementManager(this.configuration);
    this.weightCalculationManager = new WeightCalculationManager(this.configuration);
  }

  /**
   * Get critical slot requirements for armor type
   */
  private getArmorCriticalSlots(armorType: ComponentConfiguration): number {
    const def = getComponentDefinition('armor', armorType.type);
    return def?.slots ?? 0;
  }

  /**
   * Get critical slot requirements for structure type
   */
  private getStructureCriticalSlots(structureType: ComponentConfiguration): number {
    const def = getComponentDefinition('structure', structureType.type);
    return def?.slots ?? 0;
  }

  /**
   * Initialize all critical sections for the unit
   */
  private initializeSections(): void {
    MECH_LOCATION_CONFIGS.forEach(config => {
      const section = new CriticalSection(config.location, config)
      this.sections.set(config.location, section)
    })
  }

  /**
   * Allocate system components (engine, gyro) to appropriate slots
   */
  private allocateSystemComponents(): void {
    this.systemComponentsManager.allocateSystemComponents()
  }

  /**
   * Allocate engine slots across torso sections
   */
  private allocateEngineSlots(engineAllocation: any): void {
    // Center Torso engine slots
    if (engineAllocation.centerTorso.length > 0) {
      const centerTorso = this.sections.get('Center Torso')
      if (centerTorso) {
        centerTorso.reserveSystemSlots('engine', engineAllocation.centerTorso)
      }
    }

    // Left Torso engine slots
    if (engineAllocation.leftTorso.length > 0) {
      const leftTorso = this.sections.get('Left Torso')
      if (leftTorso) {
        leftTorso.reserveSystemSlots('engine', engineAllocation.leftTorso)
      }
    }

    // Right Torso engine slots
    if (engineAllocation.rightTorso.length > 0) {
      const rightTorso = this.sections.get('Right Torso')
      if (rightTorso) {
        rightTorso.reserveSystemSlots('engine', engineAllocation.rightTorso)
      }
    }
  }

  /**
   * Allocate gyro slots in center torso
   */
  private allocateGyroSlots(gyroAllocation: any): void {
    if (gyroAllocation.centerTorso.length > 0) {
      const centerTorso = this.sections.get('Center Torso')
      if (centerTorso) {
        centerTorso.reserveSystemSlots('gyro', gyroAllocation.centerTorso)
      }
    }
  }

  /**
   * Initialize special components ONCE during unit factory creation
   * FACTORY PATTERN: Components are created exactly once based on initial configuration
   */
  private initializeSpecialComponents(): void {
    // Always clear all special components before creating new ones
    this.clearAllSpecialComponents();
    if (this.specialComponentsInitialized) {
      return
    }

    // CRITICAL FIX: Ensure SpecialComponentsManager uses current configuration
    this.specialComponentsManager.configuration = this.configuration

    // Use SpecialComponentsManager for structure and armor components
    this.specialComponentsManager.initializeSpecialComponents()
    
    // CRITICAL FIX: Ensure SpecialComponentsManager uses the same array reference
    this.specialComponentsManager.updateUnallocatedEquipmentReference(this.unallocatedEquipment)
    
    // Use SystemComponentsManager for heat sink and jump jet components
    this.systemComponentsManager.initializeEquipmentComponents()
    
    this.specialComponentsInitialized = true
  }

  /**
   * Update unit configuration and handle special component changes
   */
  updateConfiguration(newConfiguration: UnitConfiguration): void {
    console.log('🔧 [UNIT_CRITICAL_DEBUG] 🔧 updateConfiguration called with:', {
      structureType: newConfiguration.structureType,
      armorType: newConfiguration.armorType,
      techBase: newConfiguration.techBase
    })
    
    // Use ConfigurationManager to handle configuration updates
    const result = this.configurationManager.updateConfiguration(newConfiguration)
    
    if (result.success) {
      console.log('[UNIT_CRITICAL_DEBUG] 🔧 Configuration update successful, changes:', result.changes)
      
      this.configuration = result.newConfiguration
      
      // Update ArmorManagementManager with new configuration
      this.armorManagementManager.updateConfiguration(result.newConfiguration)
      
      // Handle system component changes
      if (result.changes.engineChanged || result.changes.gyroChanged) {
        console.log('[UNIT_CRITICAL_DEBUG] 🔧 Handling system component changes')
        this.handleSystemComponentChange(result.oldConfiguration, result.newConfiguration)
      }
      
      // Handle special component changes
      if (result.changes.structureChanged || result.changes.armorChanged) {
        console.log('[UNIT_CRITICAL_DEBUG] 🔧 Handling special component changes')
        this.handleSpecialComponentConfigurationChange(result.oldConfiguration, result.newConfiguration)
        console.log('[UNIT_CRITICAL_DEBUG] After handleSpecialComponentConfigurationChange, unallocated pool:', JSON.stringify(this.unallocatedEquipment, null, 2))
      }
      
      // Notify state change
      this.eventManager.notifyStateChange()
      
      console.log('[UNIT_CRITICAL_DEBUG] 🔧 Configuration update complete. Unallocated count:', this.unallocatedEquipment.length)
    } else {
      console.error('[UNIT_CRITICAL_DEBUG] 🔧 Configuration update failed:', result.validation.errors)
    }
    
    // Ensure system components (heat sinks, jump jets) are updated to match new config
    this.systemComponentsManager.initializeEquipmentComponents()
  }

  /**
   * Enforce BattleTech construction rules on configuration
   */
  private enforceConstructionRules(config: UnitConfiguration): UnitConfiguration {
    const enforcedConfig = { ...config }
    
    // Enforce head armor maximum (9 points)
    if (enforcedConfig.armorAllocation.HD.front > 9) {
      enforcedConfig.armorAllocation.HD = { front: 9, rear: 0 }
    }
    
    // Enforce no rear armor on head, arms, legs
    const noRearLocations = ['HD', 'LA', 'RA', 'LL', 'RL']
    noRearLocations.forEach(location => {
      if (enforcedConfig.armorAllocation[location as keyof typeof enforcedConfig.armorAllocation].rear > 0) {
        enforcedConfig.armorAllocation[location as keyof typeof enforcedConfig.armorAllocation] = {
          ...enforcedConfig.armorAllocation[location as keyof typeof enforcedConfig.armorAllocation],
          rear: 0
        }
      }
    })
    
    // Enforce maximum armor points per location
    Object.keys(enforcedConfig.armorAllocation).forEach(location => {
      const maxArmor = this.getMaxArmorPointsForLocation(location)
      const currentArmor = enforcedConfig.armorAllocation[location as keyof typeof enforcedConfig.armorAllocation]
      const totalArmor = currentArmor.front + currentArmor.rear
      
      if (totalArmor > maxArmor) {
        // Reduce proportionally
        const ratio = maxArmor / totalArmor
        enforcedConfig.armorAllocation[location as keyof typeof enforcedConfig.armorAllocation] = {
          front: Math.floor(currentArmor.front * ratio),
          rear: Math.floor(currentArmor.rear * ratio)
        }
      }
    })
    
    if (process.env.NODE_ENV === 'test') {
      console.log('[DEBUG] enforceConstructionRules final armorAllocation:', JSON.stringify(enforcedConfig.armorAllocation));
    }
    return enforcedConfig
  }

  /**
   * Handle system component changes with proper equipment displacement
   * CRITICAL FIX: Don't rebuild special components here - they're handled separately
   */
  private handleSystemComponentChange(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): void {
    // Use SystemComponentsManager to handle system component changes
    const allDisplacedEquipment = this.systemComponentsManager.handleSystemComponentChange(oldConfig, newConfig)
    
    // Add all displaced equipment to unallocated pool
    if (allDisplacedEquipment.length > 0) {
      this.addUnallocatedEquipment(allDisplacedEquipment)
    }
  }

  /**
   * Allocate ONLY system components (engine/gyro) without touching special components
   */
  private allocateSystemComponentsOnly(config: UnitConfiguration): void {
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      config.engineType,
      UnitCriticalManager.extractComponentType(config.gyroType) as GyroType
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
    
    // DO NOT call initializeSpecialComponents() here - special components
    // are handled separately by updateSpecialComponents()
  }

  /**
   * Allocate system components using specific configuration
   */
  private allocateSystemComponentsWithConfig(config: UnitConfiguration): void {
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      config.engineType,
      UnitCriticalManager.extractComponentType(config.gyroType) as GyroType
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
  }

  /**
   * Handle special component changes (Endo Steel, Ferro-Fibrous, Jump Jets, Heat Sinks)
   * ULTIMATE FIX: Always clear ALL special components and recreate from scratch
   */
  private handleSpecialComponentConfigurationChange(
    oldConfig: UnitConfiguration, 
    newConfig: UnitConfiguration
  ): void {
    console.log('[UNIT_CRITICAL_DEBUG] handleSpecialComponentConfigurationChange called')
    // Always clear all special components before handling config change
    this.clearAllSpecialComponents();
    console.log('[UNIT_CRITICAL_DEBUG] After clearAllSpecialComponents, unallocated pool:', JSON.stringify(this.unallocatedEquipment, null, 2))
    // Use SpecialComponentsManager for structure and armor components
    this.specialComponentsManager.handleSpecialComponentConfigurationChange(oldConfig, newConfig)
    console.log('[UNIT_CRITICAL_DEBUG] After specialComponentsManager.handleSpecialComponentConfigurationChange, unallocated pool:', JSON.stringify(this.unallocatedEquipment, null, 2))
    // Ensure manager reference is up to date
    this.specialComponentsManager.updateUnallocatedEquipmentReference(this.unallocatedEquipment)
    // Use SystemComponentsManager for heat sink and jump jet components
    this.systemComponentsManager.updateJumpJetEquipment(oldConfig, newConfig)
    // Notify state change so UI updates
    this.eventManager.notifyStateChange()
    console.log(`[UnitCriticalManager] ULTIMATE FIX: Special component update complete. Final unallocated count: ${this.unallocatedEquipment.length}`)
  }

  /**
   * FACTORY PATTERN: Update special components for structure or armor changes
   * CRITICAL FIX: Always clear and create exact number needed to prevent accumulation
   */
  private updateSpecialComponents(
    oldType: ComponentConfiguration,
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): void {
    console.log(`[UnitCriticalManager] COMPONENT UPDATE: ${oldType.type} -> ${newType.type} (${componentType})`)
    
    const newSlots = componentType === 'armor'
      ? this.getArmorCriticalSlots(newType)
      : this.getStructureCriticalSlots(newType)
    
    console.log(`[UnitCriticalManager] COMPONENT UPDATE: Need ${newSlots} slots for ${newType.type}`)
    
    // CRITICAL FIX: Always clear ALL components of this type first to prevent accumulation
    console.log(`[UnitCriticalManager] COMPONENT UPDATE: Clearing all ${componentType} components`)
    this.clearSpecialComponentsByType(componentType)
    
    // Create exactly the number of components needed for the new type
    if (newSlots > 0) {
      console.log(`[UnitCriticalManager] COMPONENT UPDATE: Creating ${newSlots} new ${newType.type} components`)
      this.addSpecialComponents(newType, componentType, newSlots)
    }
    
    console.log(`[UnitCriticalManager] COMPONENT UPDATE: Complete. Final unallocated count: ${this.unallocatedEquipment.length}`)
  }
  
  /**
   * Clear all special components of a specific type (structure or armor)
   */
  private clearSpecialComponentsByType(componentType: 'structure' | 'armor'): void {
    const beforeCount = this.unallocatedEquipment.length
    
    // Remove from unallocated equipment
    const filtered = this.unallocatedEquipment.filter(eq => {
      const specialEq = eq.equipmentData as SpecialEquipmentObject
      return !(specialEq.componentType === componentType)
    });
    this.unallocatedEquipment.length = 0;
    this.unallocatedEquipment.push(...filtered);
    
    // Remove from allocated slots across all sections
    let removedFromSlots = 0
    this.sections.forEach(section => {
      const equipmentToRemove = section.getAllEquipment().filter(eq => {
        const specialEq = eq.equipmentData as SpecialEquipmentObject
        return specialEq.componentType === componentType
      })
      
      equipmentToRemove.forEach(eq => {
        const removed = section.removeEquipmentGroup(eq.equipmentGroupId)
        if (removed) {
          removedFromSlots++
        }
      })
    })
    
    const afterCount = this.unallocatedEquipment.length
    console.log(`[UnitCriticalManager] Cleared ${componentType} components:`)
    console.log(`  - From unallocated: ${beforeCount - afterCount}`)
    console.log(`  - From allocated slots: ${removedFromSlots}`)
    console.log(`  - Total cleared: ${(beforeCount - afterCount) + removedFromSlots}`)
  }

  /**
   * FACTORY PATTERN: Transfer special components between types
   * This maintains the exact component instances, just updates their properties
   */
  private transferSpecialComponents(
    oldType: ComponentConfiguration,
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor',
    oldSlots: number,
    newSlots: number
  ): void {
    console.log(`[UnitCriticalManager] TRANSFER: Starting component transfer for ${componentType}`)
    
    // Collect all existing components of this type (allocated + unallocated)
    const existingComponents = this.collectExistingSpecialComponents(oldType, componentType)
    console.log(`[UnitCriticalManager] TRANSFER: Found ${existingComponents.length} existing components`)
    
    // Remove existing components from their current locations
    this.removeSpecialComponents(oldType, componentType)
    
    if (newSlots === 0) {
      // Configuration no longer requires special components
      console.log(`[UnitCriticalManager] TRANSFER: New type ${newType.type} requires no slots, components removed`)
      return
    }
    
    // Transfer/adjust components to match new requirements
    if (newSlots === oldSlots) {
      // Same number of slots: just update component properties and place in unallocated
      console.log(`[UnitCriticalManager] TRANSFER: Same slot count, updating component properties`)
      this.updateComponentProperties(existingComponents, newType, componentType)
      // Place updated components in unallocated pool for user to re-assign
      this.unallocatedEquipment.push(...existingComponents)
    } else if (newSlots < oldSlots) {
      // Fewer slots needed: keep first N components, update properties
      console.log(`[UnitCriticalManager] TRANSFER: Fewer slots needed (${newSlots}), keeping first ${newSlots} components`)
      const keptComponents = existingComponents.slice(0, newSlots)
      this.updateComponentProperties(keptComponents, newType, componentType)
      // Place kept components in unallocated pool for user to re-assign
      this.unallocatedEquipment.push(...keptComponents)
    } else {
      // More slots needed: keep all existing + create additional
      console.log(`[UnitCriticalManager] TRANSFER: More slots needed (${newSlots}), creating ${newSlots - oldSlots} additional components`)
      this.updateComponentProperties(existingComponents, newType, componentType)
      // Place existing components in unallocated pool
      this.unallocatedEquipment.push(...existingComponents)
      
      // Create additional components needed
      const additionalComponents = this.createSpecialComponentEquipment(
        newType, 
        componentType, 
        newSlots - oldSlots
      )
      
      additionalComponents.forEach(component => {
        const allocation: EquipmentAllocation = {
          equipmentData: component,
          equipmentGroupId: `${component.id}_group`,
          location: '',
          startSlotIndex: -1,
          endSlotIndex: -1,
          occupiedSlots: []
        }
        this.unallocatedEquipment.push(allocation)
      })
    }
  }

  /**
   * Collect all existing special components (allocated + unallocated)
   */
  private collectExistingSpecialComponents(
    type: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): EquipmentAllocation[] {
    const components: EquipmentAllocation[] = []
    
    // Collect from unallocated equipment
    this.unallocatedEquipment.forEach(eq => {
      const specialEq = eq.equipmentData as SpecialEquipmentObject
      if (specialEq.name === type.type && specialEq.componentType === componentType) {
        components.push(eq)
      }
    })
    
    // Collect from critical slots across all sections
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(eq => {
        const specialEq = eq.equipmentData as SpecialEquipmentObject
        if (specialEq.name === type.type && specialEq.componentType === componentType) {
          components.push(eq)
        }
      })
    })
    
    return components
  }

  /**
   * Update properties of existing components to match new type
   * CRITICAL FIX: Do NOT push components back to unallocated here - caller handles placement
   */
  private updateComponentProperties(
    components: EquipmentAllocation[],
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): void {
    components.forEach((allocation, index) => {
      // Update the equipment data properties
      const updatedEquipmentData: SpecialEquipmentObject = {
        ...allocation.equipmentData,
        id: `${newType.type.toLowerCase().replace(/\s+/g, '_')}_piece_${index + 1}`,
        name: newType.type,
        techBase: newType.type.includes('Clan') ? 'Clan' : 'Inner Sphere',
        componentType
      }
      
      // Update the allocation
      allocation.equipmentData = updatedEquipmentData
      allocation.equipmentGroupId = `${updatedEquipmentData.id}_group`
      
      // CRITICAL FIX: Do NOT push back to unallocated here!
      // The caller (transferSpecialComponents) will handle proper placement
      // This was causing 100+ component duplication because components 
      // from BOTH allocated and unallocated pools were being pushed to unallocated
    })
  }

  /**
   * Helper: Count assigned slots for a dynamic component (structure/armor)
   */
  private countAssignedSlots(type: string, componentType: 'structure' | 'armor'): number {
    let count = 0;
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(eq => {
        const eqData = eq.equipmentData as SpecialEquipmentObject;
        if (eqData.name === type && eqData.componentType === componentType) {
          count++;
        }
      });
    });
    return count;
  }

  /**
   * Add special component pieces to unallocated pool, only for unassigned slots
   */
  private addSpecialComponents(type: ComponentConfiguration, componentType: 'structure' | 'armor', requiredSlots: number): void {
    const assigned = this.countAssignedSlots(type.type, componentType);
    const unallocatedNeeded = Math.max(0, requiredSlots - assigned);
    if (unallocatedNeeded === 0) return;
    const components = this.createSpecialComponentEquipment(type, componentType, unallocatedNeeded);
    components.forEach((component, index) => {
      UnitCriticalManager.globalComponentCounter++;
      const uniqueGroupId = `${component.id}_group_${UnitCriticalManager.globalComponentCounter}_${Date.now()}_${index}`;
      const allocation: EquipmentAllocation = {
        equipmentData: component,
        equipmentGroupId: uniqueGroupId,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      };
      this.unallocatedEquipment.push(allocation);
    });
  }

  /**
   * Remove special component pieces from unallocated equipment and critical slots
   */
  private removeSpecialComponents(type: ComponentConfiguration, componentType: 'structure' | 'armor'): void {
    const filtered = this.unallocatedEquipment.filter(eq => {
      const specialEq = eq.equipmentData as SpecialEquipmentObject
      return !(specialEq.name === type.type && specialEq.componentType === componentType)
    });
    this.unallocatedEquipment.length = 0;
    this.unallocatedEquipment.push(...filtered);
    this.sections.forEach(section => {
      const equipmentToRemove = section.getAllEquipment().filter(eq => {
        const specialEq = eq.equipmentData as SpecialEquipmentObject
        return specialEq.name === type.type && specialEq.componentType === componentType
      })
      equipmentToRemove.forEach(eq => {
        section.removeEquipmentGroup(eq.equipmentGroupId)
      })
    })
  }

  /**
   * Create special component equipment pieces
   */
  private createSpecialComponentEquipment(
    type: ComponentConfiguration,
    componentType: 'structure' | 'armor',
    requiredSlots: number
  ): SpecialEquipmentObject[] {
    let canonicalId = '';
    if (componentType === 'structure') {
      if (type.type.includes('Endo Steel')) canonicalId = 'endo_steel';
      else if (type.type.includes('Composite')) canonicalId = 'composite';
      else if (type.type.includes('Reinforced')) canonicalId = 'reinforced';
      else if (type.type.includes('Industrial')) canonicalId = 'industrial';
      else canonicalId = type.type.toLowerCase().replace(/\s+/g, '_');
    } else if (componentType === 'armor') {
      if (type.type.includes('Ferro-Fibrous')) canonicalId = 'ferro_fibrous';
      else if (type.type.includes('Stealth')) canonicalId = 'stealth_armor';
      else if (type.type.includes('Reactive')) canonicalId = 'reactive_armor';
      else if (type.type.includes('Reflective')) canonicalId = 'reflective_armor';
      else if (type.type.includes('Hardened')) canonicalId = 'hardened_armor';
      else canonicalId = type.type.toLowerCase().replace(/\s+/g, '_');
    }
    return Array.from({ length: requiredSlots }, (_, index) => ({
      id: canonicalId,
      instanceId: `${canonicalId}_instance_${index + 1}`,
      name: type.type,
      type: 'equipment' as const,
      requiredSlots: 1,
      weight: 0,
      techBase: type.type.includes('Clan') ? 'Clan' : 'Inner Sphere',
      componentType,
      isGrouped: false
    }))
  }

  /**
   * Update jump jet equipment based on configuration changes
   */
  private updateJumpJetEquipment(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): void {
    // Remove existing jump jets
    this.removeJumpJetEquipment()
    
    // Add new jump jets if needed
    if (newConfig.jumpMP > 0) {
      this.addJumpJetEquipment(UnitCriticalManager.extractComponentType(newConfig.jumpJetType), newConfig.jumpMP, newConfig.tonnage, newConfig.techBase)
    }
  }

  /**
   * Remove all jump jet equipment from unallocated and allocated slots
   */
  private removeJumpJetEquipment(): void {
    // Remove from unallocated equipment
    const filtered = this.unallocatedEquipment.filter(eq => 
      !eq.equipmentData.name.includes('Jump') && 
      !eq.equipmentData.name.includes('UMU') &&
      !eq.equipmentData.name.includes('Booster') &&
      !eq.equipmentData.name.includes('Wing')
    );
    this.unallocatedEquipment.length = 0;
    this.unallocatedEquipment.push(...filtered);
    
    // Remove from critical slots across all sections
    this.sections.forEach(section => {
      const equipmentToRemove = section.getAllEquipment().filter(eq => 
        eq.equipmentData.name.includes('Jump') || 
        eq.equipmentData.name.includes('UMU') ||
        eq.equipmentData.name.includes('Booster') ||
        eq.equipmentData.name.includes('Wing')
      )
      
      equipmentToRemove.forEach(eq => {
        section.removeEquipmentGroup(eq.equipmentGroupId)
      })
    })
  }

  /**
   * Add jump jet equipment to unallocated pool
   */
  private addJumpJetEquipment(jumpJetType: string, jumpMP: number, tonnage: number, techBase: string): void {
    // Import jump jet calculations
    const { calculateJumpJetWeight, calculateJumpJetCriticalSlots, JUMP_JET_VARIANTS } = require('../jumpJetCalculations')
    
    const variant = JUMP_JET_VARIANTS[jumpJetType]
    if (!variant) return
    
    const jumpJets: EquipmentObject[] = []
    
    // Define location restrictions for jump jets
    const jumpJetLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
    
    for (let i = 0; i < jumpMP; i++) {
      jumpJets.push({
        id: `${jumpJetType.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
        name: variant.name,
        type: 'equipment' as const,
        requiredSlots: calculateJumpJetCriticalSlots(jumpJetType, tonnage),
        weight: calculateJumpJetWeight(jumpJetType, tonnage),
        techBase: variant.techBase === 'Both' ? techBase : variant.techBase,
        heat: variant.heatGeneration,
        allowedLocations: jumpJetLocations
      })
    }
    
    jumpJets.forEach(jumpJet => {
      const allocation: EquipmentAllocation = {
        equipmentData: jumpJet,
        equipmentGroupId: `${jumpJet.id}_group`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      }
      this.unallocatedEquipment.push(allocation)
    })
  }

  /**
   * Remove all heat sink equipment from unallocated and allocated slots
   */
  private removeHeatSinkEquipment(): void {
    console.log('[UnitCriticalManager] Removing ALL heat sink equipment')
    
    const beforeUnallocated = this.unallocatedEquipment.length
    
    // Remove from unallocated equipment
    const filtered = this.unallocatedEquipment.filter(eq => 
      !eq.equipmentData.name.includes('Heat Sink') && 
      eq.equipmentData.type !== 'heat_sink'
    );
    this.unallocatedEquipment.length = 0;
    this.unallocatedEquipment.push(...filtered);
    
    const afterUnallocated = this.unallocatedEquipment.length
    
    // Remove from critical slots across all sections
    let removedFromSlots = 0
    this.sections.forEach(section => {
      const equipmentToRemove = section.getAllEquipment().filter(eq => 
        eq.equipmentData.name.includes('Heat Sink') || 
        eq.equipmentData.type === 'heat_sink'
      )
      
      equipmentToRemove.forEach(eq => {
        const removed = section.removeEquipmentGroup(eq.equipmentGroupId)
        if (removed) {
          removedFromSlots++
        }
      })
    })
    
    console.log(`[UnitCriticalManager] Removed heat sink equipment:`)
    console.log(`  - From unallocated: ${beforeUnallocated - afterUnallocated}`)
    console.log(`  - From allocated slots: ${removedFromSlots}`)
    console.log(`  - Total removed: ${(beforeUnallocated - afterUnallocated) + removedFromSlots}`)
  }

  /**
   * Add heat sink equipment to unallocated pool
   */
  private addHeatSinkEquipment(heatSinkType: ComponentConfiguration, externalHeatSinks: number, techBase: string): void {
    console.log(`[UnitCriticalManager] Adding heat sink equipment: ${heatSinkType.type} - ${externalHeatSinks} external heat sinks`)
    
    // CRITICAL FIX: Don't generate any heat sinks if externalHeatSinks is 0
    if (externalHeatSinks <= 0) {
      console.log(`[UnitCriticalManager] No external heat sinks needed (${externalHeatSinks}), skipping generation`)
      return
    }
    
    // Import heat sink calculations
    const { getHeatSinkSpecification } = require('../heatSinkCalculations')
    
    // CRITICAL FIX: Map configuration heat sink types to calculation types
    let calculationHeatSinkType: string = heatSinkType.type
    if (heatSinkType.type === 'Double') {
      calculationHeatSinkType = techBase === 'Clan' ? 'Double (Clan)' : 'Double (IS)'
    }
    
    const heatSinkSpec = getHeatSinkSpecification(calculationHeatSinkType as HeatSinkType)
    if (!heatSinkSpec) {
      console.error(`[UnitCriticalManager] No specification found for heat sink type: ${calculationHeatSinkType} (original: ${heatSinkType.type})`)
      return
    }
    
    console.log(`[UnitCriticalManager] Using heat sink spec:`, {
      type: calculationHeatSinkType,
      slots: heatSinkSpec.criticalSlots,
      weight: heatSinkSpec.weight,
      dissipation: heatSinkSpec.dissipation
    })
    
    const heatSinks: EquipmentObject[] = []
    
    // Define location restrictions for heat sinks (can be placed anywhere except head)
    const heatSinkLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
    
    for (let i = 0; i < externalHeatSinks; i++) {
      heatSinks.push({
        id: `${heatSinkType.type.toLowerCase().replace(/\s+/g, '_')}_external_${i + 1}`,
        name: `${calculationHeatSinkType} Heat Sink`,
        type: 'heat_sink' as const,
        requiredSlots: heatSinkSpec.criticalSlots,
        weight: heatSinkSpec.weight,
        techBase: heatSinkSpec.techBase === 'Both' ? techBase : heatSinkSpec.techBase,
        heat: -heatSinkSpec.dissipation, // Negative because they dissipate heat
        allowedLocations: heatSinkLocations
      })
    }
    
    heatSinks.forEach((heatSink, index) => {
      // Generate unique group IDs for heat sinks
      UnitCriticalManager.globalComponentCounter++
      const uniqueGroupId = `${heatSink.id}_group_${UnitCriticalManager.globalComponentCounter}_${Date.now()}_${index}`
      
      const allocation: EquipmentAllocation = {
        equipmentData: heatSink,
        equipmentGroupId: uniqueGroupId,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      }
      this.unallocatedEquipment.push(allocation)
      
      console.log(`[UnitCriticalManager] Added heat sink to unallocated:`, {
        name: heatSink.name,
        groupId: uniqueGroupId,
        slots: heatSink.requiredSlots,
        weight: heatSink.weight
      })
    })
    
    console.log(`[UnitCriticalManager] Total heat sinks added: ${heatSinks.length}`)
  }

  /**
   * Get specific section by location name
   */
  getSection(location: string): CriticalSection | null {
    return this.sections.get(location) || null
  }

  /**
   * Get all sections
   */
  getAllSections(): CriticalSection[] {
    return Array.from(this.sections.values())
  }

  /**
   * Get all equipment across entire unit, organized by equipment ID
   */
  getAllEquipment(): Map<string, EquipmentAllocation[]> {
    return this.equipmentQueryManager.getAllEquipment()
  }

  /**
   * Get all equipment groups (each allocated instance)
   */
  getAllEquipmentGroups(): Array<{ groupId: string, equipmentReference: EquipmentAllocation }> {
    return this.equipmentQueryManager.getAllEquipmentGroups().map(group => ({
      groupId: group.groupId,
      equipmentReference: group.equipmentReference
    }))
  }

  /**
   * Find equipment group by ID across all sections
   */
  findEquipmentGroup(equipmentGroupId: string): { section: CriticalSection | null, allocation: EquipmentAllocation } | null {
    // Search allocated equipment
    for (const section of Array.from(this.sections.values())) {
      const allocation = section.getAllEquipment().find((eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId)
      if (allocation) {
        return { section, allocation }
      }
    }
    
    // Search unallocated equipment
    const filtered = this.unallocatedEquipment.filter(eq => eq.equipmentGroupId === equipmentGroupId);
    if (filtered.length > 0) {
      return { section: null, allocation: filtered[0] }
    }
    
    return null
  }

  /**
   * Get equipment by location
   */
  getEquipmentByLocation(): Map<string, EquipmentAllocation[]> {
    const equipmentByLocation = new Map<string, EquipmentAllocation[]>()
    
    this.sections.forEach((section, location) => {
      const equipment = section.getAllEquipment()
      if (equipment.length > 0) {
        equipmentByLocation.set(location, equipment)
      }
    })
    
    // Add unallocated as special location
    if (this.unallocatedEquipment.length > 0) {
      equipmentByLocation.set('Unallocated', [...this.unallocatedEquipment])
    }
    
    return equipmentByLocation
  }

  /**
   * Get unallocated equipment
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    console.log('[UNIT_CRITICAL_DEBUG] 📦 getUnallocatedEquipment called')
    console.log('[UNIT_CRITICAL_DEBUG] Count: ' + this.unallocatedEquipment.length)
    console.log('[UNIT_CRITICAL_DEBUG] Items: ' + (this.unallocatedEquipment.map(eq => eq.equipmentData.name).join(', ')))
    try {
      console.log('[UNIT_CRITICAL_DEBUG] Full: ' + JSON.stringify(this.unallocatedEquipment))
    } catch (e) {
      console.log('[UNIT_CRITICAL_DEBUG] Full: [unserializable]')
    }
    return [...this.unallocatedEquipment]
  }

  /**
   * Add equipment to unallocated pool
   */
  addUnallocatedEquipment(equipment: EquipmentAllocation[]): void {
    equipment.forEach(eq => {
      // Clear location info since it's unallocated
      eq.location = ''
      eq.occupiedSlots = []
      eq.startSlotIndex = -1
      eq.endSlotIndex = -1
    })
    
    this.unallocatedEquipment.push(...equipment)
  }

  /**
   * Remove equipment from unallocated pool
   * CRITICAL FIX: Ensure React detects array changes by creating new array reference
   */
  removeUnallocatedEquipment(equipmentGroupId: string): EquipmentAllocation | null {
    console.log(`[UnitCriticalManager] removeUnallocatedEquipment called with groupId: ${equipmentGroupId}`)
    console.log(`[UnitCriticalManager] Current unallocated equipment:`, this.unallocatedEquipment.map(eq => ({
      name: eq.equipmentData.name,
      groupId: eq.equipmentGroupId,
      componentType: UnitCriticalManager.getComponentType(eq.equipmentData)
    })))
    
    const index = this.unallocatedEquipment.findIndex(eq => eq.equipmentGroupId === equipmentGroupId)
    console.log(`[UnitCriticalManager] Found equipment at index: ${index}`)
    
    if (index >= 0) {
      const removed = this.unallocatedEquipment[index]
      
      // CRITICAL FIX: Create new array to ensure React detects the change
      const filtered = this.unallocatedEquipment.filter(eq => eq.equipmentGroupId !== equipmentGroupId);
      this.unallocatedEquipment.length = 0;
      this.unallocatedEquipment.push(...filtered);
      
      console.log(`[UnitCriticalManager] Successfully removed equipment:`, {
        name: removed.equipmentData.name,
        groupId: removed.equipmentGroupId,
        componentType: UnitCriticalManager.getComponentType(removed.equipmentData)
      })
      console.log(`[UnitCriticalManager] Remaining unallocated count: ${this.unallocatedEquipment.length}`)
      
      // Notify listeners about state change
      this.notifyStateChange()
      
      return removed
    }
    
    console.error(`[UnitCriticalManager] FAILED to find equipment with groupId: ${equipmentGroupId}`)
    console.error(`[UnitCriticalManager] Available group IDs:`, this.unallocatedEquipment.map(eq => eq.equipmentGroupId))
    return null
  }

  /**
   * Move equipment to unallocated pool
   */
  displaceEquipment(equipmentGroupId: string): boolean {
    const found = this.findEquipmentGroup(equipmentGroupId)
    if (!found || !found.section) return false
    
    const removedEquipment = found.section.removeEquipmentGroup(equipmentGroupId)
    if (removedEquipment) {
      this.addUnallocatedEquipment([removedEquipment])
      return true
    }
    return false
  }

  /**
   * Check if equipment can be placed in specified location
   */
  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string): boolean {
    // Check static location restrictions
    if (equipment.allowedLocations) {
      return equipment.allowedLocations.includes(location)
    }
    
    // Check dynamic location restrictions
    if (equipment.locationRestrictions) {
      switch (equipment.locationRestrictions.type) {
        case 'engine_slots':
          return this.hasEngineSlots(location)
        case 'custom':
          return equipment.locationRestrictions.validator?.(this, location) ?? false
        case 'static':
          // Should use allowedLocations instead, but handle gracefully
          return true
      }
    }
    
    // Default: allow anywhere (for backwards compatibility)
    return true
  }

  /**
   * Check if a location has engine slots
   */
  hasEngineSlots(location: string): boolean {
    const section = this.getSection(location)
    if (!section) return false
    
    // Check if this location has engine slots based on current engine configuration
    const engineAllocation = SystemComponentRules.getCompleteSystemAllocation(
      this.configuration.engineType,
      UnitCriticalManager.extractComponentType(this.configuration.gyroType) as GyroType
    )
    
    switch (location) {
      case 'Center Torso':
        return engineAllocation.engine.centerTorso.length > 0
      case 'Left Torso':
        return engineAllocation.engine.leftTorso.length > 0
      case 'Right Torso':
        return engineAllocation.engine.rightTorso.length > 0
      default:
        return false
    }
  }

  /**
   * Get validation error message for equipment location restriction
   */
  getLocationRestrictionError(equipment: EquipmentObject, location: string): string {
    if (equipment.allowedLocations) {
      return `${equipment.name} can only be placed in: ${equipment.allowedLocations.join(', ')}`
    }
    
    if (equipment.locationRestrictions?.type === 'engine_slots') {
      return `${equipment.name} can only be placed in locations with engine slots (depends on engine type)`
    }
    
    return `${equipment.name} cannot be placed in ${location}`
  }

  /**
   * Attempt to allocate equipment from unallocated pool
   */
  allocateEquipmentFromPool(equipmentGroupId: string, location: string, startSlot: number): boolean {
    console.log(`[UnitCriticalManager] allocateEquipmentFromPool called with:`, {
      equipmentGroupId,
      location,
      startSlot
    })
    
    const equipment = this.removeUnallocatedEquipment(equipmentGroupId)
    if (!equipment) {
      console.error(`[UnitCriticalManager] FAILED: Could not remove equipment ${equipmentGroupId} from unallocated pool`)
      return false
    }
    
    console.log(`[UnitCriticalManager] Successfully removed equipment from unallocated pool:`, {
      name: equipment.equipmentData.name,
      groupId: equipment.equipmentGroupId,
      componentType: UnitCriticalManager.getComponentType(equipment.equipmentData)
    })
    
    // Check location restrictions
    if (!this.canPlaceEquipmentInLocation(equipment.equipmentData, location)) {
      console.warn(`[UnitCriticalManager] Location restriction failed for ${equipment.equipmentData.name} in ${location}`)
      // Restore to unallocated if location is restricted
      this.addUnallocatedEquipment([equipment])
      console.warn(this.getLocationRestrictionError(equipment.equipmentData, location))
      return false
    }
    
    const section = this.getSection(location)
    if (!section) {
      console.error(`[UnitCriticalManager] FAILED: Section not found: ${location}`)
      // Restore to unallocated if section not found
      this.addUnallocatedEquipment([equipment])
      return false
    }
    
    console.log(`[UnitCriticalManager] Attempting to allocate equipment to section ${location} at slot ${startSlot}`)
    const success = section.allocateEquipment(equipment.equipmentData, startSlot, equipmentGroupId)
    
    if (!success) {
      console.error(`[UnitCriticalManager] FAILED: Section allocation failed for ${equipment.equipmentData.name}`)
      // Restore to unallocated if allocation failed
      this.addUnallocatedEquipment([equipment])
    } else {
      console.log(`[UnitCriticalManager] SUCCESS: Equipment ${equipment.equipmentData.name} allocated to ${location} slot ${startSlot}`)
    }
    
    console.log(`[UnitCriticalManager] Final unallocated equipment count: ${this.unallocatedEquipment.length}`)
    
    return success
  }

  /**
   * Get current unit configuration
   */
  getConfiguration(): UnitConfiguration {
    return { ...this.configuration }
  }

  // ===== COMPUTED PROPERTIES FOR CONSTRUCTION LIMITS =====
  // All BattleTech construction rules centralized here

  /**
   * Get maximum armor tonnage allowed for this unit
   */
  getMaxArmorTonnage(): number {
    return this.weightBalanceManager.getMaxArmorTonnage()
  }

  /**
   * Get the physical maximum armor tonnage based on BattleTech construction rules
   */
  getPhysicalMaxArmorTonnage(): number {
    return this.weightBalanceManager.getPhysicalMaxArmorTonnage()
  }

  /**
   * Get maximum armor points allowed for this unit
   */
  getMaxArmorPoints(): number {
    return this.weightBalanceManager.getMaxArmorPoints()
  }

  /**
   * Get internal structure points for each location using official BattleTech table
   */
  getInternalStructurePoints(): Record<string, number> {
    return this.weightBalanceManager.getInternalStructurePoints()
  }

  /**
   * Get armor efficiency for current armor type
   */
  getArmorEfficiency(): number {
    return this.armorManagementManager.getArmorEfficiency();
  }

  /**
   * Get maximum armor points for a specific location
   */
  getMaxArmorPointsForLocation(location: string): number {
    return this.armorManagementManager.getMaxArmorPointsForLocation(location);
  }

  /**
   * Get maximum walk MP for this tonnage
   */
  getMaxWalkMP(): number {
    return Math.floor(400 / this.configuration.tonnage)
  }

  /**
   * Get remaining tonnage available for equipment/armor
   */
  getRemainingTonnage(): number {
    const usedTonnage = this.getUsedTonnage()
    return Math.max(0, this.configuration.tonnage - usedTonnage)
  }

  /**
   * Get total tonnage used by structure, engine, gyro, cockpit, heat sinks
   */
  getUsedTonnage(): number {
    const config = this.configuration
    
    // Structure weight using proper calculation for structure type
    const { calculateStructureWeight } = require('../structureCalculations')
    const structureTypeString = this.getStructureTypeString()
    const structureWeight = calculateStructureWeight(config.tonnage, structureTypeString)
    
    // Engine weight
    const engineWeight = this.getEngineWeight()
    
    // Gyro weight
    const gyroWeight = this.getGyroWeight()
    
    // Cockpit weight (always 3 tons for standard)
    const cockpitWeight = 3.0
    
    // Heat sink weight (external only, internal are part of engine)
    const heatSinkWeight = config.externalHeatSinks * this.getHeatSinkTonnage()
    
    // Jump jet weight
    const jumpJetWeight = this.getJumpJetWeight()
    
    // Current armor weight
    const armorWeight = config.armorTonnage
    
    const total = structureWeight + engineWeight + gyroWeight + cockpitWeight + heatSinkWeight + jumpJetWeight + armorWeight
    
    // DEBUG: Log individual components for troubleshooting
    console.log(`[getUsedTonnage] Breakdown:`)
    console.log(`  Structure (${structureTypeString}): ${structureWeight}`)
    console.log(`  Engine (${config.engineType}): ${engineWeight}`)
    console.log(`  Gyro (${config.gyroType}): ${gyroWeight}`)
    console.log(`  Cockpit: ${cockpitWeight}`)
    console.log(`  Heat Sinks (${config.externalHeatSinks} external): ${heatSinkWeight}`)
    console.log(`  Jump Jets (${config.jumpMP || 0}): ${jumpJetWeight}`)
    console.log(`  Armor: ${armorWeight}`)
    console.log(`  TOTAL: ${total}`)
    
    return total
  }

  /**
   * Get engine weight based on type and rating
   */
  getEngineWeight(): number {
    return this.calculationManager.calculateEngineWeight(this.configuration);
  }

  /**
   * Get gyro weight based on type and engine rating
   */
  getGyroWeight(): number {
    return this.calculationManager.calculateGyroWeight(this.configuration);
  }

  /**
   * Get heat sink tonnage per unit
   */
  getHeatSinkTonnage(): number {
    return this.calculationManager.calculateHeatSinkTonnage(this.configuration);
  }

  /**
   * Get total jump jet weight
   */
  getJumpJetWeight(): number {
    return this.calculationManager.calculateJumpJetWeight(this.configuration);
  }

  /**
   * Get remaining tonnage that could be used for armor
   */
  getRemainingTonnageForArmor(): number {
    // Calculate what tonnage would be without current armor allocation
    const usedWithoutArmor = this.getUsedTonnage() - this.configuration.armorTonnage
    const availableForArmor = this.configuration.tonnage - usedWithoutArmor
    
    // Return raw available tonnage (no circular dependency)
    return Math.max(0, availableForArmor)
  }

  // ===== OPTION A: SINGLE SOURCE OF TRUTH + COMPUTED PROPERTIES =====
  // Clean armor points calculation - no data conflicts

  /**
   * Get available armor points from tonnage investment
   */
  getAvailableArmorPoints(): number {
    return this.calculationManager.calculateAvailableArmorPoints(this.configuration);
  }

  /**
   * Get allocated armor points from location assignments
   */
  getAllocatedArmorPoints(): number {
    return this.calculationManager.calculateAllocatedArmorPoints(this.configuration);
  }

  /**
   * Get unallocated armor points available for auto-allocation
   * ALLOWS NEGATIVE VALUES: Shows over-allocation relative to tonnage investment
   */
  getUnallocatedArmorPoints(): number {
    return this.calculationManager.calculateUnallocatedArmorPoints(this.configuration);
  }

  /**
   * Get armor points remaining for allocation (legacy compatibility)
   */
  getRemainingArmorPoints(): number {
    return this.calculationManager.calculateUnallocatedArmorPoints(this.configuration);
  }

  /**
   * Calculate wasted armor points using simple maximum comparison
   * CLEAN LOGIC: Pure comparison between tonnage maximum vs unit maximum
   */
  getArmorWasteAnalysis(): any {
    return this.calculationManager.calculateArmorWasteAnalysis(this.configuration);
  }

  /**
   * Check if armor allocation has any waste
   */
  hasArmorWaste(): boolean {
    return this.calculationManager.calculateArmorWasteAnalysis(this.configuration).totalWasted > 0;
  }

  /**
   * Get wasted armor points (simple version for quick checks)
   */
  getWastedArmorPoints(): number {
    return this.calculationManager.calculateArmorWasteAnalysis(this.configuration).totalWasted;
  }

  /**
   * Validate if current configuration exceeds any limits
   */
  isOverweight(): boolean {
    return this.calculationManager.isOverweight(this.configuration);
  }

  /**
   * Get weight validation status
   */
  getWeightValidation(): { isValid: boolean, overweight: number, warnings: string[] } {
    const usedTonnage = this.getUsedTonnage()
    const maxTonnage = this.configuration.tonnage
    const overweight = Math.max(0, usedTonnage - maxTonnage)
    
    const warnings: string[] = []
    
    if (overweight > 0) {
      warnings.push(`Unit is ${overweight.toFixed(1)} tons overweight`)
    }
    
    // Check if close to limit
    const remaining = maxTonnage - usedTonnage
    if (remaining > 0 && remaining < 1) {
      warnings.push(`Only ${remaining.toFixed(1)} tons remaining`)
    }
    
    return {
      isValid: overweight === 0,
      overweight,
      warnings
    }
  }

  /**
   * Get engine type
   */
  getEngineType(): EngineType {
    return this.configuration.engineType
  }

  /**
   * Get gyro type
   */
  getGyroType(): string {
    return UnitCriticalManager.extractComponentType(this.configuration.gyroType)
  }

  /**
   * Get total allocated equipment count
   */
  getAllocatedEquipmentCount(): number {
    let count = 0
    this.sections.forEach(section => {
      count += section.getAllEquipment().length
    })
    return count
  }

  /**
   * Get total unallocated equipment count
   */
  getUnallocatedEquipmentCount(): number {
    return this.unallocatedEquipment.length
  }

  /**
   * Validate entire unit
   */
  validate(): UnitValidationResult {
    const result: UnitValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      sectionResults: []
    }
    
    // Validate system components
    const systemValidation = SystemComponentRules.validateSystemComponents(
      this.configuration.engineType,
      UnitCriticalManager.extractComponentType(this.configuration.gyroType) as GyroType
    )
    
    if (!systemValidation.isValid) {
      result.isValid = false
      result.errors.push(...systemValidation.errors)
    }
    result.warnings.push(...systemValidation.warnings)
    
    // Validate each section
    this.sections.forEach((section, location) => {
      const sectionResult = section.validate()
      result.sectionResults.push({
        location,
        result: sectionResult
      })
      
      if (!sectionResult.isValid) {
        result.isValid = false
        result.errors.push(...sectionResult.errors.map(err => `${location}: ${err}`))
      }
      
      result.warnings.push(...sectionResult.warnings.map(warn => `${location}: ${warn}`))
    })
    
    return result
  }

  /**
   * Get slot status specifically for user equipment (excludes system components)
   * This is what the Equipment Tray should use for accurate capacity warnings
   */
  getUserEquipmentSlotStatus(): any {
    return this.stateManager.getUserEquipmentSlotStatus();
  }

  /**
   * Check if equipment is a system component (engine, gyro, actuators, etc.)
   */
  private isSystemComponent(equipment: EquipmentObject): boolean {
    const name = equipment.name.toLowerCase()
    
    // System component patterns
    const systemPatterns = [
      'engine', 'gyro', 'actuator', 'cockpit', 'life support', 'sensors',
      'shoulder', 'upper arm', 'lower arm', 'hand', 'hip', 'upper leg', 'lower leg', 'foot'
    ]
    
    return systemPatterns.some(pattern => name.includes(pattern))
  }

  /**
   * Get summary statistics
   */
  getSummary(): any {
    return this.stateManager.getSummary();
  }

  /**
   * Get total heat dissipation capacity
   */
  getHeatDissipation(): number {
    return this.heatManagementManager.getHeatDissipation()
  }

  /**
   * Get current heat generation from all equipment
   */
  getHeatGeneration(): number {
    return this.heatManagementManager.getHeatGeneration()
  }

  /**
   * Get heat sink efficiency based on type
   */
  private getHeatSinkEfficiency(): number {
    const type = UnitCriticalManager.extractComponentType(this.configuration.heatSinkType)
    
    switch (type) {
      case 'Double':
      case 'Double (Clan)':
        return 2.0
      case 'Compact':
        return 1.0 // Compact heat sinks are 1:1 but take 0.5 tons
      case 'Laser':
        return 1.0 // Laser heat sinks are 1:1 but immune to critical hits
      default: // Single
        return 1.0
    }
  }

  // ===== NEW CRITICAL SLOT BREAKDOWN SYSTEM =====

  /**
   * Get complete critical slot breakdown using new calculator
   */
  getCriticalSlotBreakdown(): CriticalSlotBreakdown {
    return CriticalSlotCalculator.getCompleteBreakdown(
      this.configuration,
      this.sections,
      this.unallocatedEquipment
    )
  }

  /**
   * Get total critical slots available on a standard BattleMech
   */
  getTotalCriticalSlots(): number {
    return this.getCriticalSlotBreakdown().totals.capacity;
  }

  /**
   * Get total critical slots used (including system components and user equipment)
   */
  getTotalUsedCriticalSlots(): number {
    return this.getCriticalSlotBreakdown().totals.used;
  }

  /**
   * Get remaining critical slots available for equipment
   */
  getRemainingCriticalSlots(): number {
    return this.getCriticalSlotBreakdown().totals.remaining;
  }

  /**
   * Get equipment burden (total if all unallocated equipment was allocated)
   */
  getEquipmentBurden(): number {
    return this.getCriticalSlotBreakdown().equipment
  }

  /**
   * Get over-capacity slots (how many slots over limit if all equipment allocated)
   */
  getOverCapacitySlots(): number {
    return 0 // or the correct property if available
  }

  // ===== OBSERVER PATTERN FOR STATE CHANGES =====

  /**
   * Subscribe to state changes
   */
  subscribe(callback: () => void): () => void {
    return this.stateManager.subscribe(callback);
  }

  /**
   * Notify all listeners about state changes
   */
  private notifyStateChange(): void {
    this.eventManager.notifyStateChange();
  }

  /**
   * RESET TO BASE: Reset unit to base configuration and rebuild everything fresh
   * This clears all equipment and reconstructs the unit from scratch
   */
  resetToBaseConfiguration(): void {
    console.log('[UnitCriticalManager] RESET TO BASE: Starting complete unit reset')
    
    const currentConfig = this.configuration
    
    // Step 1: Clear ALL equipment AND special components
    console.log('[UnitCriticalManager] RESET TO BASE: Clearing ALL equipment and components')
    this.clearAllEquipment()
    this.clearAllSpecialComponents()
    
    // Step 2: Reset special components initialization flag
    console.log('[UnitCriticalManager] RESET TO BASE: Resetting special components flag')
    this.specialComponentsInitialized = false
    
    // Step 3: Clear and rebuild ALL system reservations
    console.log('[UnitCriticalManager] RESET TO BASE: Clearing system reservations')
    this.sections.forEach(section => {
      section.clearSystemReservations('engine')
      section.clearSystemReservations('gyro')
    })
    
    // Step 4: Rebuild system components from scratch
    console.log('[UnitCriticalManager] RESET TO BASE: Rebuilding system components')
    this.allocateSystemComponents()
    
    // Step 5: Initialize special components fresh
    console.log('[UnitCriticalManager] RESET TO BASE: Initializing special components')
    this.initializeSpecialComponents()
    
    // Step 6: Notify listeners about the reset
    console.log('[UnitCriticalManager] RESET TO BASE: Notifying state change')
    this.notifyStateChange()
    
    console.log(`[UnitCriticalManager] RESET TO BASE: Complete! Final unallocated count: ${this.unallocatedEquipment.length}`)
    
    // Log what should be expected
    const structureSlots = this.getStructureCriticalSlots(UnitCriticalManager.extractComponentType(currentConfig.structureType) as StructureType)
    const armorSlots = this.getArmorCriticalSlots(UnitCriticalManager.extractComponentType(currentConfig.armorType) as ArmorType)
    const jumpSlots = currentConfig.jumpMP
    const expectedTotal = structureSlots + armorSlots + jumpSlots
    
    console.log(`[UnitCriticalManager] RESET TO BASE: Expected components:`)
    console.log(`  - Structure (${currentConfig.structureType}): ${structureSlots}`)
    console.log(`  - Armor (${currentConfig.armorType}): ${armorSlots}`)
    console.log(`  - Jump Jets: ${jumpSlots}`)
    console.log(`  - Total Expected: ${expectedTotal}`)
    console.log(`  - Actual Unallocated: ${this.unallocatedEquipment.length}`)
    
    // CRITICAL DEBUG: Check for duplicates after reset
    const nameCounts = this.unallocatedEquipment.reduce((acc, eq) => {
      const name = eq.equipmentData.name
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`[UnitCriticalManager] RESET TO BASE: Component counts by name:`, nameCounts)
    
    // Check for duplicate group IDs
    const groupIds = this.unallocatedEquipment.map(eq => eq.equipmentGroupId)
    const uniqueGroupIds = new Set(groupIds)
    if (groupIds.length !== uniqueGroupIds.size) {
      console.error('[UnitCriticalManager] RESET TO BASE: WARNING - Duplicate group IDs detected after reset!')
      console.error('Total:', groupIds.length, 'Unique:', uniqueGroupIds.size)
    }
  }

  // ===== ENHANCED STATE SERIALIZATION METHODS =====

  /**
   * Serialize the complete unit state for persistence
   */
  serializeCompleteState(): CompleteUnitState {
    return this.serializationManager.serializeCompleteState(this);
  }

  /**
   * Serialize individual equipment allocation
   */
  private serializeEquipment(allocation: EquipmentAllocation): SerializedEquipment {
    return this.serializationManager.serializeEquipment(allocation);
  }

  /**
   * Deserialize and restore complete unit state
   */
  deserializeCompleteState(state: CompleteUnitState): boolean {
    return this.serializationManager.deserializeCompleteState(this, state);
  }

  /**
   * Validate serialized state before deserialization
   */
  validateSerializedState(state: CompleteUnitState): StateValidationResult {
    return this.serializationManager.validateSerializedState(state);
  }

  /**
   * Clear all equipment from sections and unallocated pool - AGGRESSIVE CLEARING
   */
  private clearAllEquipment(): void {
    console.log('[UnitCriticalManager] AGGRESSIVE CLEAR: Clearing all equipment')
    
    const beforeUnallocated = this.unallocatedEquipment.length
    
    // Get complete inventory before clearing
    let totalEquipmentCount = 0
    this.sections.forEach(section => {
      totalEquipmentCount += section.getAllEquipment().length
    })
    totalEquipmentCount += this.unallocatedEquipment.length
    
    console.log(`[UnitCriticalManager] AGGRESSIVE CLEAR: Before clearing - Allocated: ${totalEquipmentCount - beforeUnallocated}, Unallocated: ${beforeUnallocated}, Total: ${totalEquipmentCount}`)
    
    // STEP 1: Force clear ALL unallocated equipment
    this.unallocatedEquipment.length = 0
    console.log('[UnitCriticalManager] AGGRESSIVE CLEAR: Forced clear of unallocated equipment')
    
    // STEP 2: Force clear ALL equipment from sections (preserve system components)
    this.sections.forEach((section, location) => {
      const beforeSection = section.getAllEquipment().length
      
      // Get all equipment and remove each one
      const allEquipment = [...section.getAllEquipment()] // Copy array to avoid modification during iteration
      allEquipment.forEach(equipment => {
        section.removeEquipmentGroup(equipment.equipmentGroupId)
      })
      
      const afterSection = section.getAllEquipment().length
      console.log(`[UnitCriticalManager] AGGRESSIVE CLEAR: ${location} - Removed ${beforeSection - afterSection} equipment pieces`)
    })
    
    // STEP 3: Verify complete clearing
    let remainingEquipmentCount = 0
    this.sections.forEach(section => {
      remainingEquipmentCount += section.getAllEquipment().length
    })
    remainingEquipmentCount += this.unallocatedEquipment.length
    
    console.log(`[UnitCriticalManager] AGGRESSIVE CLEAR: After clearing - Total remaining equipment: ${remainingEquipmentCount}`)
    
    if (remainingEquipmentCount > 0) {
      console.error('[UnitCriticalManager] AGGRESSIVE CLEAR: WARNING - Equipment still remains after clearing!')
      this.sections.forEach((section, location) => {
        const remaining = section.getAllEquipment()
        if (remaining.length > 0) {
          console.error(`  ${location}: ${remaining.length} pieces:`, remaining.map(eq => eq.equipmentData.name))
        }
      })
    }
  }

  /**
   * Clear all special components before rebuilding
   * ULTIMATE FIX: Clear from BOTH unallocated AND allocated slots using comprehensive detection
   */
  clearAllSpecialComponents(): void {
    console.log('[ULTIMATE FIX] Clearing ALL special components using SpecialComponentsManager')
    
    // Use SpecialComponentsManager to clear structure and armor components
    this.specialComponentsManager.clearAllSpecialComponents()
    
    // Also clear jump jet components (not handled by SpecialComponentsManager)
    this.removeJumpJetEquipment()
  }

  /**
   * Comprehensive detection of special components
   * Detects by component type, name patterns, and IDs to catch ALL variants
   * Heat sinks are NOT special components - they are regular equipment that happens to be auto-generated
   */
  private isSpecialComponent(equipment: EquipmentObject): boolean {
    const specialEq = equipment as SpecialEquipmentObject
    const name = equipment.name.toLowerCase()
    const id = equipment.id.toLowerCase()
    
    // CRITICAL: Heat sinks are NOT special components - exclude them explicitly
    if (name.includes('heat sink') || equipment.type === 'heat_sink') {
      return false
    }
    
    // Check by componentType field (preferred method)
    if (specialEq.componentType === 'structure' || specialEq.componentType === 'armor') {
      return true
    }
    
    // Check by name patterns for structure types
    const structureTypes = [
      'endo steel', 'endosteel', 'endo_steel',
      'composite', 'reinforced', 'industrial'
    ]
    
    // Check by name patterns for armor types  
    const armorTypes = [
      'ferro-fibrous', 'ferrofibrous', 'ferro_fibrous',
      'light ferro', 'heavy ferro', 'stealth', 'reactive', 'reflective', 'hardened'
    ]
    
    // Check by name patterns for jump jets
    const jumpJetTypes = [
      'jump', 'umu', 'booster', 'wing'
    ]
    
    // Check if name matches any special component pattern
    const isStructure = structureTypes.some(type => name.includes(type))
    const isArmor = armorTypes.some(type => name.includes(type))
    const isJumpJet = jumpJetTypes.some(type => name.includes(type))
    
    // Check if ID matches special component pattern (exclude heat sink IDs)
    const hasSpecialId = !name.includes('heat sink') && (id.includes('piece') || id.includes('endo') || id.includes('ferro') || id.includes('jump'))
    
    const isSpecial = isStructure || isArmor || isJumpJet || hasSpecialId
    
    if (isSpecial) {
      console.log(`[ULTIMATE FIX] Detected special component: ${equipment.name} (ID: ${equipment.id})`)
    }
    
    return isSpecial
  }

  /**
   * Rebuild system components after configuration change
   * @param skipSpecialComponents - Skip special component initialization during state restoration
   */
  private rebuildSystemComponents(skipSpecialComponents: boolean = false): void {
    console.log('[UnitCriticalManager] Rebuilding system components, skipSpecialComponents:', skipSpecialComponents)
    
    // CRITICAL FIX: Only clear special components during complete rebuild (state restoration)
    // Normal configuration changes should use transfer logic to preserve components
    if (skipSpecialComponents) {
      console.log('[UnitCriticalManager] Complete rebuild: Clearing ALL special components before restoration')
      this.clearAllSpecialComponents()
    }
    
    // Clear existing system reservations
    this.sections.forEach(section => {
      section.clearSystemReservations('engine')
      section.clearSystemReservations('gyro')
    })
    
    // Reallocate system components with current configuration
    this.allocateSystemComponents()
    
    // Reinitialize special components ONLY if not restoring state
    // During state restoration, special components will be restored from saved unallocated equipment
    if (!skipSpecialComponents) {
      console.log('[UnitCriticalManager] Initializing special components for new/modified configuration')
      this.initializeSpecialComponents()
    } else {
      console.log('[UnitCriticalManager] Skipping special component initialization during state restoration')
    }
  }

  /**
   * Restore allocated equipment to critical slots
   */
  private restoreAllocatedEquipment(allocations: SerializedSlotAllocations): void {
    this.serializationManager.restoreAllocatedEquipment(this, allocations);
  }

  /**
   * Restore unallocated equipment
   */
  private restoreUnallocatedEquipment(unallocatedEquipment: SerializedEquipment[]): void {
    this.serializationManager.restoreUnallocatedEquipment(this, unallocatedEquipment);
  }

  /**
   * Add serialized equipment to unallocated pool
   */
  private addToUnallocatedFromSerialized(serializedEquipment: SerializedEquipment): void {
    this.serializationManager.addToUnallocatedFromSerialized(this, serializedEquipment);
  }

  /**
   * Create a minimal state for backward compatibility
   */
  static createMinimalStateFromConfiguration(): CompleteUnitState {
    return {
      version: '1.0.0',
      configuration: {
        tonnage: 0,
        engineType: 'Standard',
        engineRating: 0,
        gyroType: createComponentConfiguration('gyro', 'Standard') || { type: 'Standard', techBase: 'Inner Sphere' },
        armorType: createComponentConfiguration('armor', 'Standard') || { type: 'Standard', techBase: 'Inner Sphere' },
        armorTonnage: 0,
        externalHeatSinks: 0,
        heatSinkType: createComponentConfiguration('heatSink', 'Single') || { type: 'Single', techBase: 'Inner Sphere' },
        jumpMP: 0,
        jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet') || { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
        techBase: 'Inner Sphere',
        structureType: createComponentConfiguration('structure', 'Standard') || { type: 'Standard', techBase: 'Inner Sphere' },
        // Add required fields with default values
        chassis: '',
        model: '',
        unitType: 'BattleMech',
        walkMP: 0,
        runMP: 0,
        armorAllocation: {
          HD: { front: 0, rear: 0 },
          CT: { front: 0, rear: 0 },
          LT: { front: 0, rear: 0 },
          RT: { front: 0, rear: 0 },
          LA: { front: 0, rear: 0 },
          RA: { front: 0, rear: 0 },
          LL: { front: 0, rear: 0 },
          RL: { front: 0, rear: 0 }
        },
        totalHeatSinks: 10,
        internalHeatSinks: 10,
        jumpJetCounts: {},
        hasPartialWing: false,
        enhancements: [],
        mass: 0
      },
      criticalSlotAllocations: {},
      unallocatedEquipment: [],
      timestamp: Date.now()
    };
  }

  static isLegacyConfigurationOnly(data: any): boolean {
    return data && typeof data === 'object' && 'tonnage' in data && !('version' in data);
  }

  static upgradeLegacyConfiguration(legacyConfig: UnitConfiguration): CompleteUnitState {
    return {
      version: '1.0.0',
      configuration: legacyConfig,
      criticalSlotAllocations: {},
      unallocatedEquipment: [],
      timestamp: Date.now()
    };
  }

  // ===== ENHANCED AUTO-ALLOCATION SYSTEM =====

  /**
   * Auto-allocate all unallocated equipment using EquipmentAllocationManager
   */
  autoAllocateEquipment(): {
    success: boolean
    message: string
    slotsModified: number
    placedEquipment: number
    failedEquipment: number
    failureReasons: string[]
  } {
    return this.equipmentAllocationManager.autoAllocateEquipment()
  }

  // Update state manager references when sections or unallocated equipment change
  private updateStateManagerReferences(): void {
    this.stateManager.updateReferences(this.sections, this.unallocatedEquipment);
  }
}

// Re-export types for external use
export type {
  UnitConfiguration,
  CompleteUnitState,
  SerializedEquipment,
  SerializedSlotAllocations,
  StateValidationResult,
  UnitValidationResult,
  SpecialEquipmentObject,
  ArmorAllocation,
  LegacyUnitConfiguration
}

// Re-export the builder
export { UnitConfigurationBuilder }
