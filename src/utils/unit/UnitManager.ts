/**
 * Unit Manager - Coordinating facade for all unit services
 * Provides simplified high-level API and coordinates between services
 * Following SOLID principles - Facade pattern with service composition
 */

import { UnitConfiguration, UnitConfigurationBuilder } from '../criticalSlots/UnitCriticalManager'
import { BattleTechConstructionCalculator, IConstructionCalculator, WeightValidationResult } from './BattleTechConstructionCalculator'
import { BattleTechComponentFactory, IComponentFactory, SpecialEquipmentObject } from './BattleTechComponentFactory'
import { CriticalSlotOrchestrator, ISlotOrchestrator } from './CriticalSlotOrchestrator'
import { UnitStatePersistence, IUnitStatePersistence, UnitState } from './UnitStatePersistence'
import { UnitEventBus, IUnitEventBus, UnitEventType, UnitEventCallback } from './UnitEventBus'
import { SystemComponentRules } from '../criticalSlots/SystemComponentRules'
import { CriticalSection } from '../criticalSlots/CriticalSection'
import { EquipmentObject, EquipmentAllocation } from '../criticalSlots/CriticalSlot'

export interface UnitSummary {
  configuration: UnitConfiguration
  weight: {
    used: number
    remaining: number
    isOverweight: boolean
    validation: WeightValidationResult
  }
  equipment: {
    allocated: number
    unallocated: number
    total: number
  }
  slots: {
    total: number
    occupied: number
    available: number
  }
  heat: {
    generated: number
    dissipated: number
    efficiency: number
  }
}

export interface IUnitManager {
  // Configuration management
  getConfiguration(): UnitConfiguration
  updateConfiguration(newConfig: Partial<UnitConfiguration>): void
  resetToBaseConfiguration(): void
  
  // Equipment management
  allocateEquipment(groupId: string, location: string, slot: number): boolean
  removeEquipment(groupId: string): boolean
  moveEquipment(groupId: string, newLocation: string, newSlot: number): boolean
  getUnallocatedEquipment(): EquipmentAllocation[]
  
  // State management
  saveState(): any
  loadState(state: any): boolean
  
  // Information queries
  getSummary(): UnitSummary
  getWeightValidation(): WeightValidationResult
  canPlaceEquipment(equipment: EquipmentObject, location: string): boolean
  
  // Event handling
  subscribe(event: UnitEventType, callback: UnitEventCallback): () => void
  
  // Service access (for advanced usage)
  getCalculator(): IConstructionCalculator
  getFactory(): IComponentFactory
  getOrchestrator(): ISlotOrchestrator
  getEventBus(): IUnitEventBus
}

export class UnitManager implements IUnitManager {
  private configuration: UnitConfiguration
  private calculator: IConstructionCalculator
  private factory: IComponentFactory
  private orchestrator: ISlotOrchestrator
  private persistence: IUnitStatePersistence
  private eventBus: IUnitEventBus
  private sections: Map<string, CriticalSection>

  constructor(
    initialConfiguration: UnitConfiguration,
    sections: Map<string, CriticalSection>
  ) {
    console.log('[UnitManager] Initializing unit manager')
    
    // Store references
    this.sections = new Map(sections)
    this.configuration = UnitConfigurationBuilder.buildConfiguration(initialConfiguration)
    
    // Initialize services
    this.calculator = new BattleTechConstructionCalculator()
    this.factory = new BattleTechComponentFactory()
    this.orchestrator = new CriticalSlotOrchestrator(this.sections)
    this.persistence = new UnitStatePersistence()
    this.eventBus = new UnitEventBus()
    
    // Initialize system components and special components
    this.initializeSystemComponents()
    this.initializeSpecialComponents()
    
    console.log('[UnitManager] Unit manager initialized successfully')
  }

  /**
   * Get current unit configuration
   */
  getConfiguration(): UnitConfiguration {
    return { ...this.configuration }
  }

  /**
   * Update unit configuration with proper service coordination
   */
  updateConfiguration(newConfig: Partial<UnitConfiguration>): void {
    console.log('[UnitManager] Updating configuration:', newConfig)
    
    const oldConfig = this.configuration
    const validatedConfig = UnitConfigurationBuilder.buildConfiguration({
      ...this.configuration,
      ...newConfig
    })
    
    // Use event bus batch mode for complex updates
    this.eventBus.startBatch()
    
    try {
      // Handle system component changes (engine/gyro)
      if (oldConfig.engineType !== validatedConfig.engineType || 
          oldConfig.gyroType !== validatedConfig.gyroType) {
        this.handleSystemComponentChange(oldConfig, validatedConfig)
      }
      
      // Handle special component changes (structure/armor/jump jets)
      this.handleSpecialComponentChange(oldConfig, validatedConfig)
      
      // Update configuration
      this.configuration = validatedConfig
      
      // Emit events
      this.eventBus.emit('configuration_changed', {
        oldConfig,
        newConfig: validatedConfig,
        changes: newConfig
      }, 'UnitManager')
      
      if (this.calculator.isOverweight(validatedConfig)) {
        this.eventBus.emit('weight_changed', {
          isOverweight: true,
          validation: this.calculator.validateWeight(validatedConfig)
        }, 'UnitManager')
      }
      
    } finally {
      this.eventBus.endBatch()
    }
    
    console.log('[UnitManager] Configuration update complete')
  }

  /**
   * Reset unit to base configuration
   */
  resetToBaseConfiguration(): void {
    console.log('[UnitManager] Resetting to base configuration')
    
    this.eventBus.startBatch()
    
    try {
      // Clear all equipment
      this.orchestrator.clearAllEquipment()
      
      // Reinitialize system and special components
      this.clearSystemReservations()
      this.initializeSystemComponents()
      this.initializeSpecialComponents()
      
      this.eventBus.emit('state_reset', {
        configuration: this.configuration
      }, 'UnitManager')
      
    } finally {
      this.eventBus.endBatch()
    }
    
    console.log('[UnitManager] Reset complete')
  }

  /**
   * Allocate equipment with event coordination
   */
  allocateEquipment(groupId: string, location: string, slot: number): boolean {
    console.log(`[UnitManager] Allocating equipment ${groupId} to ${location} slot ${slot}`)
    
    // Check location restrictions first
    const equipment = this.findEquipmentInUnallocated(groupId)
    if (equipment && !this.canPlaceEquipment(equipment.equipmentData, location)) {
      console.warn(`[UnitManager] Equipment ${equipment.equipmentData.name} cannot be placed in ${location}`)
      return false
    }
    
    const success = this.orchestrator.allocateEquipment(groupId, location, slot)
    
    if (success) {
      this.eventBus.emit('equipment_allocated', {
        groupId,
        location,
        slot,
        equipment: equipment?.equipmentData
      }, 'UnitManager')
    }
    
    return success
  }

  /**
   * Remove equipment with event coordination
   */
  removeEquipment(groupId: string): boolean {
    console.log(`[UnitManager] Removing equipment ${groupId}`)
    
    const equipment = this.orchestrator.removeEquipment(groupId)
    
    if (equipment) {
      // Add to unallocated pool
      this.orchestrator.addToUnallocatedPool([equipment])
      
      this.eventBus.emit('equipment_removed', {
        groupId,
        equipment: equipment.equipmentData,
        previousLocation: equipment.location
      }, 'UnitManager')
      
      return true
    }
    
    return false
  }

  /**
   * Move equipment with event coordination
   */
  moveEquipment(groupId: string, newLocation: string, newSlot: number): boolean {
    console.log(`[UnitManager] Moving equipment ${groupId} to ${newLocation} slot ${newSlot}`)
    
    // Find current equipment
    const currentLocation = this.orchestrator.findEquipmentGroup(groupId)
    if (!currentLocation) {
      console.warn(`[UnitManager] Equipment ${groupId} not found`)
      return false
    }
    
    // Check location restrictions
    if (!this.canPlaceEquipment(currentLocation.allocation.equipmentData, newLocation)) {
      console.warn(`[UnitManager] Equipment cannot be moved to ${newLocation}`)
      return false
    }
    
    const success = this.orchestrator.moveEquipment(groupId, newLocation, newSlot)
    
    if (success) {
      this.eventBus.emit('equipment_moved', {
        groupId,
        equipment: currentLocation.allocation.equipmentData,
        oldLocation: currentLocation.allocation.location,
        newLocation,
        newSlot
      }, 'UnitManager')
    }
    
    return success
  }

  /**
   * Get unallocated equipment
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return this.orchestrator.getUnallocatedEquipment()
  }

  /**
   * Save complete unit state
   */
  saveState(): any {
    console.log('[UnitManager] Saving unit state')
    
    const unitState: UnitState = {
      configuration: this.configuration,
      allocatedEquipment: this.orchestrator.getEquipmentByLocation(),
      unallocatedEquipment: this.orchestrator.getUnallocatedEquipment()
    }
    
    const serializedState = this.persistence.serialize(unitState)
    
    this.eventBus.emit('state_saved', {
      timestamp: serializedState.timestamp,
      equipmentCount: unitState.unallocatedEquipment.length + 
                     Array.from(unitState.allocatedEquipment.values()).reduce((sum, arr) => sum + arr.length, 0)
    }, 'UnitManager')
    
    return serializedState
  }

  /**
   * Load unit state
   */
  loadState(state: any): boolean {
    console.log('[UnitManager] Loading unit state')
    
    this.eventBus.startBatch()
    
    try {
      // Handle legacy configurations
      if (this.persistence.isLegacyConfigurationOnly(state)) {
        state = this.persistence.upgradeFromLegacy(state)
      }
      
      // Deserialize state
      const unitState = this.persistence.deserialize(state)
      
      // Clear current state
      this.orchestrator.clearAllEquipment()
      this.clearSystemReservations()
      
      // Update configuration
      this.configuration = unitState.configuration
      
      // Reinitialize system components
      this.initializeSystemComponents()
      
      // Restore equipment
      unitState.allocatedEquipment.forEach((equipment, location) => {
        equipment.forEach(allocation => {
          const section = this.orchestrator.getSection(location)
          if (section) {
            section.allocateEquipment(
              allocation.equipmentData,
              allocation.startSlotIndex,
              allocation.equipmentGroupId
            )
          }
        })
      })
      
      // Restore unallocated equipment
      this.orchestrator.addToUnallocatedPool(unitState.unallocatedEquipment)
      
      this.eventBus.emit('state_loaded', {
        configuration: this.configuration,
        equipmentCount: unitState.unallocatedEquipment.length + 
                       Array.from(unitState.allocatedEquipment.values()).reduce((sum, arr) => sum + arr.length, 0)
      }, 'UnitManager')
      
      console.log('[UnitManager] State loaded successfully')
      return true
      
    } catch (error) {
      console.error('[UnitManager] Failed to load state:', error)
      return false
    } finally {
      this.eventBus.endBatch()
    }
  }

  /**
   * Get comprehensive unit summary
   */
  getSummary(): UnitSummary {
    const weightValidation = this.calculator.validateWeight(this.configuration)
    const orchestratorSummary = this.orchestrator.getSummary()
    
    return {
      configuration: { ...this.configuration },
      weight: {
        used: this.calculator.getUsedTonnage(this.configuration),
        remaining: this.calculator.getRemainingTonnage(this.configuration),
        isOverweight: weightValidation.overweight > 0,
        validation: weightValidation
      },
      equipment: {
        allocated: orchestratorSummary.totalEquipment,
        unallocated: orchestratorSummary.unallocatedEquipment,
        total: orchestratorSummary.totalEquipment + orchestratorSummary.unallocatedEquipment
      },
      slots: {
        total: orchestratorSummary.totalSlots,
        occupied: orchestratorSummary.occupiedSlots,
        available: orchestratorSummary.availableSlots
      },
      heat: {
        generated: this.calculator.getHeatGeneration(this.configuration),
        dissipated: this.calculator.getHeatDissipation(this.configuration),
        efficiency: this.calculator.getHeatDissipation(this.configuration) / Math.max(1, this.calculator.getHeatGeneration(this.configuration))
      }
    }
  }

  /**
   * Get weight validation
   */
  getWeightValidation(): WeightValidationResult {
    return this.calculator.validateWeight(this.configuration)
  }

  /**
   * Check if equipment can be placed in location
   */
  canPlaceEquipment(equipment: EquipmentObject, location: string): boolean {
    return this.orchestrator.canPlaceEquipmentInLocation(equipment, location, this.configuration)
  }

  /**
   * Subscribe to events
   */
  subscribe(event: UnitEventType, callback: UnitEventCallback): () => void {
    return this.eventBus.subscribe(event, callback)
  }

  /**
   * Get calculator service
   */
  getCalculator(): IConstructionCalculator {
    return this.calculator
  }

  /**
   * Get factory service
   */
  getFactory(): IComponentFactory {
    return this.factory
  }

  /**
   * Get orchestrator service
   */
  getOrchestrator(): ISlotOrchestrator {
    return this.orchestrator
  }

  /**
   * Get event bus
   */
  getEventBus(): IUnitEventBus {
    return this.eventBus
  }

  /**
   * Initialize system components (engine/gyro)
   */
  private initializeSystemComponents(): void {
    console.log('[UnitManager] Initializing system components')
    
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      this.configuration.engineType,
      this.configuration.gyroType
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
    
    this.eventBus.emit('system_components_changed', {
      engineType: this.configuration.engineType,
      gyroType: this.configuration.gyroType
    }, 'UnitManager')
  }

  /**
   * Initialize special components (structure/armor/jump jets)
   */
  private initializeSpecialComponents(): void {
    console.log('[UnitManager] Initializing special components')
    
    const components = this.factory.createComponentsForConfiguration({
      structureType: this.configuration.structureType,
      armorType: this.configuration.armorType,
      jumpJetType: this.configuration.jumpJetType,
      jumpMP: this.configuration.jumpMP,
      tonnage: this.configuration.tonnage,
      techBase: this.configuration.techBase
    })
    
    // Add all components to unallocated pool
    const allComponents: EquipmentAllocation[] = []
    
    // Convert structure components
    components.structureComponents.forEach((component: SpecialEquipmentObject, index: number) => {
      allComponents.push({
        equipmentData: component,
        equipmentGroupId: `${component.id}_group_${Date.now()}_${index}`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      })
    })
    
    // Convert armor components
    components.armorComponents.forEach((component: SpecialEquipmentObject, index: number) => {
      allComponents.push({
        equipmentData: component,
        equipmentGroupId: `${component.id}_group_${Date.now()}_${index}`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      })
    })
    
    // Convert jump jet components
    components.jumpJetComponents.forEach((component: EquipmentObject, index: number) => {
      allComponents.push({
        equipmentData: component,
        equipmentGroupId: `${component.id}_group_${Date.now()}_${index}`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      })
    })
    
    this.orchestrator.addToUnallocatedPool(allComponents)
    
    this.eventBus.emit('special_components_updated', {
      structureComponents: components.structureComponents.length,
      armorComponents: components.armorComponents.length,
      jumpJetComponents: components.jumpJetComponents.length
    }, 'UnitManager')
  }

  /**
   * Handle system component changes
   */
  private handleSystemComponentChange(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): void {
    console.log('[UnitManager] Handling system component change')
    
    // Clear old system reservations
    this.clearSystemReservations()
    
    // Get displacement impact
    const displacementImpact = SystemComponentRules.getDisplacementImpact(
      oldConfig.engineType,
      oldConfig.gyroType,
      newConfig.engineType,
      newConfig.gyroType
    )
    
    // Displace conflicting equipment
    displacementImpact.affectedLocations.forEach(location => {
      const conflictSlots = displacementImpact.conflictSlots[location] || []
      const section = this.orchestrator.getSection(location)
      if (section) {
        const conflictingEquipment = section.findConflictingEquipment(conflictSlots)
        conflictingEquipment.forEach(equipment => {
          this.removeEquipment(equipment.equipmentGroupId)
        })
      }
    })
    
    // Allocate new system components
    this.initializeSystemComponents()
  }

  /**
   * Handle special component changes
   */
  private handleSpecialComponentChange(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): void {
    console.log('[UnitManager] Handling special component change')
    
    // Check if special components changed
    const structureChanged = oldConfig.structureType !== newConfig.structureType
    const armorChanged = oldConfig.armorType !== newConfig.armorType
    const jumpJetsChanged = oldConfig.jumpMP !== newConfig.jumpMP || oldConfig.jumpJetType !== newConfig.jumpJetType
    
    if (structureChanged || armorChanged || jumpJetsChanged) {
      // Remove old special components
      this.clearSpecialComponents()
      
      // Create new special components
      this.initializeSpecialComponents()
    }
  }

  /**
   * Clear all special components
   */
  private clearSpecialComponents(): void {
    const unallocated = this.orchestrator.getUnallocatedEquipment()
    const filtered = unallocated.filter(eq => !this.factory.isSpecialComponent(eq.equipmentData))
    
    // Clear unallocated special components
    this.orchestrator.clearUnallocatedPool()
    this.orchestrator.addToUnallocatedPool(filtered)
    
    // Remove allocated special components
    this.sections.forEach(section => {
      const allocated = section.getAllEquipment()
      const specialEquipment = allocated.filter(eq => this.factory.isSpecialComponent(eq.equipmentData))
      
      specialEquipment.forEach(eq => {
        section.removeEquipmentGroup(eq.equipmentGroupId)
      })
    })
  }

  /**
   * Clear system reservations
   */
  private clearSystemReservations(): void {
    this.sections.forEach(section => {
      section.clearSystemReservations('engine')
      section.clearSystemReservations('gyro')
    })
  }

  /**
   * Allocate engine slots
   */
  private allocateEngineSlots(engineAllocation: any): void {
    if (engineAllocation.centerTorso.length > 0) {
      const centerTorso = this.sections.get('Center Torso')
      if (centerTorso) {
        centerTorso.reserveSystemSlots('engine', engineAllocation.centerTorso)
      }
    }

    if (engineAllocation.leftTorso.length > 0) {
      const leftTorso = this.sections.get('Left Torso')
      if (leftTorso) {
        leftTorso.reserveSystemSlots('engine', engineAllocation.leftTorso)
      }
    }

    if (engineAllocation.rightTorso.length > 0) {
      const rightTorso = this.sections.get('Right Torso')
      if (rightTorso) {
        rightTorso.reserveSystemSlots('engine', engineAllocation.rightTorso)
      }
    }
  }

  /**
   * Allocate gyro slots
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
   * Find equipment in unallocated pool
   */
  private findEquipmentInUnallocated(groupId: string): EquipmentAllocation | null {
    return this.orchestrator.getUnallocatedEquipment().find(eq => eq.equipmentGroupId === groupId) || null
  }
}
