/**
 * Unit Critical Manager - Unit-level equipment tracking and management
 * Aggregates all critical sections and manages equipment allocation across the entire unit
 */

import { CriticalSection, LocationSlotConfiguration, FixedSystemComponent } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { SystemComponentRules, SystemAllocation } from './SystemComponentRules'
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/systemComponents'
import { CriticalSlotCalculator, CompleteBreakdownResult } from './CriticalSlotCalculator'
import { CriticalSlotBreakdown } from '../editor/UnitCalculationService'
import { ArmorAnalysis } from './UnitCalculationManager'
import { UserEquipmentSlotStatus, UnitSummary } from './UnitStateManager'
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
import { createDefaultTechProgression } from '../techProgression';





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
  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component
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


  constructor(configuration: UnitConfiguration | LegacyUnitConfiguration) {
    // Convert legacy configuration to new format if needed
    this.configuration = UnitConfigurationBuilder.buildConfiguration(configuration)
    
    // Ensure techProgression is always populated
    if (!this.configuration.techProgression) {
      // Resolve primary tech base for defaults
      const primaryTechBase = this.configuration.techBase === 'Clan' ? 'Clan' : 'Inner Sphere'
      this.configuration.techProgression = createDefaultTechProgression(primaryTechBase)
    }

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
    // Use ConfigurationManager to handle configuration updates
    const result = this.configurationManager.updateConfiguration(newConfiguration)
    
    if (result.success) {
      this.configuration = result.newConfiguration
      
      // Update ArmorManagementManager with new configuration
      this.armorManagementManager.updateConfiguration(result.newConfiguration)
      
      // Handle system component changes
      if (result.changes.engineChanged || result.changes.gyroChanged) {
        this.handleSystemComponentChange(result.oldConfiguration, result.newConfiguration)
      }
      
      // Handle special component changes
      if (result.changes.structureChanged || result.changes.armorChanged) {
        this.handleSpecialComponentConfigurationChange(result.oldConfiguration, result.newConfiguration)
      }
      
      // Notify state change
      this.eventManager.notifyStateChange()
    } else {
      console.error('[UnitCriticalManager] Configuration update failed:', result.validation.errors)
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
   * Handle special component changes (Endo Steel, Ferro-Fibrous, Jump Jets, Heat Sinks)
   * ULTIMATE FIX: Always clear ALL special components and recreate from scratch
   */
  private   handleSpecialComponentConfigurationChange(
    oldConfig: UnitConfiguration, 
    newConfig: UnitConfiguration
  ): void {
    // Always clear all special components before handling config change
    this.clearAllSpecialComponents();
    // Use SpecialComponentsManager for structure and armor components
    this.specialComponentsManager.handleSpecialComponentConfigurationChange(oldConfig, newConfig)
    // Ensure manager reference is up to date
    this.specialComponentsManager.updateUnallocatedEquipmentReference(this.unallocatedEquipment)
    // Use SystemComponentsManager for heat sink and jump jet components
    this.systemComponentsManager.updateJumpJetEquipment(oldConfig, newConfig)
    // Notify state change so UI updates
    this.eventManager.notifyStateChange()
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
    return this.equipmentAllocationManager.findEquipmentGroup(equipmentGroupId);
  }

  /**
   * Get equipment by location
   */
  getEquipmentByLocation(): Map<string, EquipmentAllocation[]> {
    return this.equipmentAllocationManager.getEquipmentByLocation();
  }

  /**
   * Get unallocated equipment
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return this.equipmentAllocationManager.getUnallocatedEquipment();
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
    const index = this.unallocatedEquipment.findIndex(eq => eq.equipmentGroupId === equipmentGroupId)
    
    if (index >= 0) {
      const removed = this.unallocatedEquipment[index]
      
      // CRITICAL FIX: Create new array to ensure React detects the change
      const filtered = this.unallocatedEquipment.filter(eq => eq.equipmentGroupId !== equipmentGroupId);
      this.unallocatedEquipment.length = 0;
      this.unallocatedEquipment.push(...filtered);
      
      // Notify listeners about state change
      this.notifyStateChange()
      
      return removed
    }
    
    console.error(`[UnitCriticalManager] FAILED to find equipment with groupId: ${equipmentGroupId}`)
    // console.error(`[UnitCriticalManager] Available group IDs:`, this.unallocatedEquipment.map(eq => eq.equipmentGroupId))
    return null
  }

  /**
   * Move equipment to unallocated pool
   */
  displaceEquipment(equipmentGroupId: string): boolean {
    return this.equipmentAllocationManager.displaceEquipment(equipmentGroupId);
  }

  /**
   * Check if equipment can be placed in specified location
   */
  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string): boolean {
    return this.equipmentAllocationManager.canPlaceEquipmentInLocation(equipment, location);
  }

  /**
   * Check if a location has engine slots
   */
  hasEngineSlots(location: string): boolean {
    return this.equipmentAllocationManager.hasEngineSlots(location);
  }

  /**
   * Get validation error message for equipment location restriction
   */
  getLocationRestrictionError(equipment: EquipmentObject, location: string): string {
    return this.equipmentAllocationManager.getLocationRestrictionError(equipment, location);
  }

  /**
   * Attempt to allocate equipment from unallocated pool
   */
  allocateEquipmentFromPool(equipmentGroupId: string, location: string, startSlot: number): boolean {
    return this.equipmentAllocationManager.allocateEquipmentFromPool(equipmentGroupId, location, startSlot);
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
    
    // Structure weight
    const structureWeight = this.calculationManager.calculateStructureWeight(this.configuration)
    
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
  getArmorWasteAnalysis(): ArmorAnalysis {
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
  getUserEquipmentSlotStatus(): UserEquipmentSlotStatus {
    return this.stateManager.getUserEquipmentSlotStatus();
  }


  /**
   * Get summary statistics
   */
  getSummary(): UnitSummary {
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
  getCriticalSlotBreakdown(): CompleteBreakdownResult {
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
    return this.getCriticalSlotBreakdown().totals.equipmentBurden
  }

  /**
   * Get over-capacity slots (how many slots over limit if all equipment allocated)
   */
  getOverCapacitySlots(): number {
    return this.getCriticalSlotBreakdown().totals.overCapacity
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
    const currentConfig = this.configuration
    
    // Step 1: Clear ALL equipment AND special components
    this.clearAllEquipment()
    this.clearAllSpecialComponents()
    
    // Step 2: Reset special components initialization flag
    this.specialComponentsInitialized = false
    
    // Step 3: Clear and rebuild ALL system reservations
    this.sections.forEach(section => {
      section.clearSystemReservations('engine')
      section.clearSystemReservations('gyro')
    })
    
    // Step 4: Rebuild system components from scratch
    this.allocateSystemComponents()
    
    // Step 5: Initialize special components fresh
    this.initializeSpecialComponents()
    
    // Step 6: Notify listeners about the reset
    this.notifyStateChange()
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
    const beforeUnallocated = this.unallocatedEquipment.length
    
    // Get complete inventory before clearing
    let totalEquipmentCount = 0
    this.sections.forEach(section => {
      totalEquipmentCount += section.getAllEquipment().length
    })
    totalEquipmentCount += this.unallocatedEquipment.length
    
    // STEP 1: Force clear ALL unallocated equipment
    this.unallocatedEquipment.length = 0
    
    // STEP 2: Force clear ALL equipment from sections (preserve system components)
    this.sections.forEach((section, location) => {
      const beforeSection = section.getAllEquipment().length
      
      // Get all equipment and remove each one
      const allEquipment = [...section.getAllEquipment()] // Copy array to avoid modification during iteration
      allEquipment.forEach(equipment => {
        section.removeEquipmentGroup(equipment.equipmentGroupId)
      })
      
      const afterSection = section.getAllEquipment().length
    })
    
    // STEP 3: Verify complete clearing
    let remainingEquipmentCount = 0
    this.sections.forEach(section => {
      remainingEquipmentCount += section.getAllEquipment().length
    })
    remainingEquipmentCount += this.unallocatedEquipment.length
    
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
    // Use SpecialComponentsManager to clear structure and armor components
    this.specialComponentsManager.clearAllSpecialComponents()
    
    // Also clear jump jet components (not handled by SpecialComponentsManager)
    this.systemComponentsManager.removeJumpJetEquipment()
  }


  /**
   * Rebuild system components after configuration change
   * @param skipSpecialComponents - Skip special component initialization during state restoration
   */
  private rebuildSystemComponents(skipSpecialComponents: boolean = false): void {
    // MIGRATED: Delegate to SystemComponentsManager
    this.systemComponentsManager.rebuildSystemComponents();
    
    if (!skipSpecialComponents) {
      this.initializeSpecialComponents();
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
        gyroType: 'Standard',
        armorType: 'Standard',
        armorTonnage: 0,
        externalHeatSinks: 0,
        heatSinkType: 'Single',
        jumpMP: 0,
        jumpJetType: 'Standard Jump Jet',
        techBase: 'Inner Sphere',
        structureType: 'Standard',
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

  static isLegacyConfigurationOnly(data: unknown): boolean {
    return data !== null && typeof data === 'object' && 'tonnage' in data && !('version' in data);
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

  /**
   * Auto-allocate armor points using ArmorManagementManager
   */
  autoAllocateArmor(): void {
    const newAllocation = this.armorManagementManager.autoAllocateArmor();
    
    const newConfiguration = {
      ...this.configuration,
      armorAllocation: newAllocation
    };
    
    this.updateConfiguration(newConfiguration);
  }

  // Update state manager references when sections or unallocated equipment change
  private updateStateManagerReferences(): void {
    this.stateManager.updateReferences(this.sections, this.unallocatedEquipment);
  }
}
