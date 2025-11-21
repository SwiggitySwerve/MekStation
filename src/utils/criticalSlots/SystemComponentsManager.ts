/**
 * System Components Manager
 * Handles engine, gyro, heat sink, and jump jet allocation and management
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { CriticalSection } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { UnitConfiguration, HeatSinkType as ConfigHeatSinkType } from './UnitCriticalManagerTypes'
import { EngineType, GyroType } from './SystemComponentRules'
import { JumpJetType, calculateJumpJetWeight, calculateJumpJetCriticalSlots, JUMP_JET_VARIANTS } from '../jumpJetCalculations'
import { TechBase, ComponentConfiguration } from '../../types/componentConfiguration'
import { HeatSinkType } from '../../types/systemComponents'
import { SystemComponentRules } from './SystemComponentRules'
import { UnitCriticalManager } from './UnitCriticalManager'
import { getHeatSinkSpecification } from '../heatSinkCalculations';

export class SystemComponentsManager {
  private sections: Map<string, CriticalSection>
  private unitManager: UnitCriticalManager
  private static globalComponentCounter: number = 0

  constructor(
    unitManager: UnitCriticalManager,
    sections: Map<string, CriticalSection>
  ) {
    this.unitManager = unitManager
    this.sections = sections
  }

  /**
   * Allocate system components (engine and gyro) based on configuration
   */
  allocateSystemComponents(): void {
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      this.unitManager.configuration.engineType,
      this.getGyroTypeString()
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
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
   * Handle system component changes with proper equipment displacement
   */
  handleSystemComponentChange(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): EquipmentAllocation[] {
    const allDisplacedEquipment: EquipmentAllocation[] = []
    
    // Clear old system reservations and collect displaced equipment
    this.sections.forEach(section => {
      const engineDisplaced = section.clearSystemReservations('engine')
      const gyroDisplaced = section.clearSystemReservations('gyro')
      allDisplacedEquipment.push(...engineDisplaced, ...gyroDisplaced)
    })
    
    // Get displacement impact to identify conflicting equipment
    const displacementImpact = SystemComponentRules.getDisplacementImpact(
      oldConfig.engineType,
      oldConfig.gyroType,
      newConfig.engineType,
      newConfig.gyroType
    )
    
    // Find equipment that conflicts with new system slots
    displacementImpact.affectedLocations.forEach((location: string) => {
      const section = this.sections.get(location)
      if (section) {
        const conflictSlots = displacementImpact.conflictSlots[location] || []
        const conflictingEquipment = section.findConflictingEquipment(conflictSlots)
        
        conflictingEquipment.forEach(equipment => {
          const removed = section.removeEquipmentGroup(equipment.equipmentGroupId)
          if (removed) {
            allDisplacedEquipment.push(removed)
          }
        })
      }
    })
    
    // Allocate new system components
    this.allocateSystemComponentsOnly(newConfig)
    
    return allDisplacedEquipment
  }

  /**
   * Allocate system components only (engine/gyro) without special components
   */
  private allocateSystemComponentsOnly(config: UnitConfiguration): void {
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      config.engineType,
      this.getGyroTypeString()
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
  }

  /**
   * Allocate system components with specific configuration
   */
  allocateSystemComponentsWithConfig(config: UnitConfiguration): void {
    const systemAllocation = SystemComponentRules.getCompleteSystemAllocation(
      config.engineType,
      this.getGyroTypeString()
    )

    // Allocate engine slots
    this.allocateEngineSlots(systemAllocation.engine)
    
    // Allocate gyro slots
    this.allocateGyroSlots(systemAllocation.gyro)
  }

  /**
   * Initialize heat sink and jump jet equipment
   */
  initializeEquipmentComponents(): void {
    // Remove all old heat sinks before adding new ones
    this.removeHeatSinkEquipment()
    // Create jump jet components if needed
    if (this.unitManager.configuration.jumpMP > 0) {
      this.addJumpJetEquipment(
        this.unitManager.configuration.jumpJetType, 
        this.unitManager.configuration.jumpMP, 
        this.unitManager.configuration.tonnage, 
        this.unitManager.configuration.techBase
      )
    }
    // Create external heat sink components if needed
    if (this.unitManager.configuration.externalHeatSinks > 0) {
      this.addHeatSinkEquipment(
        this.unitManager.configuration.heatSinkType,
        this.unitManager.configuration.externalHeatSinks,
        this.unitManager.configuration.techBase
      )
    }
  }

  /**
   * Update jump jet equipment based on configuration changes
   */
  updateJumpJetEquipment(oldConfig: UnitConfiguration, newConfig: UnitConfiguration): void {
    // Remove existing jump jets
    this.removeJumpJetEquipment()
    
    // Add new jump jets if needed
    if (newConfig.jumpMP > 0) {
      this.addJumpJetEquipment(newConfig.jumpJetType, newConfig.jumpMP, newConfig.tonnage, newConfig.techBase)
    }
  }

  /**
   * Remove all jump jet equipment from unallocated and allocated slots
   */
  removeJumpJetEquipment(): void {
    // Remove from unallocated equipment
    this.unitManager.unallocatedEquipment = this.unitManager.unallocatedEquipment.filter(eq => 
      !eq.equipmentData.name.includes('Jump') && 
      !eq.equipmentData.name.includes('UMU') &&
      !eq.equipmentData.name.includes('Booster') &&
      !eq.equipmentData.name.includes('Wing')
    )
    
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
  private addJumpJetEquipment(jumpJetType: ComponentConfiguration, jumpMP: number, tonnage: number, techBase: string): void {
    console.log(`[SystemComponentsManager] Adding jump jet equipment: ${jumpJetType} - ${jumpMP} jump MP`)
    
    // Extract the actual jump jet type from ComponentConfiguration
    const actualJumpJetType = typeof jumpJetType === 'string' ? jumpJetType : jumpJetType.type
    console.log(`[SystemComponentsManager] Actual jump jet type: ${actualJumpJetType}`)
    
    const variant = JUMP_JET_VARIANTS[actualJumpJetType as JumpJetType]
    if (!variant) {
      console.error(`[SystemComponentsManager] No variant found for jump jet type: ${actualJumpJetType}`)
      return
    }
    
    console.log(`[SystemComponentsManager] Using jump jet variant:`, variant)
    
    const jumpJets: EquipmentObject[] = []
    
    // Define location restrictions for jump jets
    const jumpJetLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
    
    for (let i = 0; i < jumpMP; i++) {
      jumpJets.push({
        id: `${actualJumpJetType.toLowerCase().replace(/\s+/g, '_')}_${i + 1}`,
        name: variant.name,
        type: 'equipment' as const,
        requiredSlots: calculateJumpJetCriticalSlots(actualJumpJetType as JumpJetType, tonnage),
        weight: calculateJumpJetWeight(actualJumpJetType as JumpJetType, tonnage),
        techBase: variant.techBase === 'Both' ? techBase : variant.techBase,
        heat: variant.heatGeneration,
        allowedLocations: jumpJetLocations
      })
    }
    
    console.log(`[SystemComponentsManager] Created ${jumpJets.length} jump jets`)
    
    jumpJets.forEach((jumpJet, index) => {
      const allocation: EquipmentAllocation = {
        equipmentData: jumpJet,
        equipmentGroupId: `${jumpJet.id}_group`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      }
      this.unitManager.unallocatedEquipment.push(allocation)
      
      console.log(`[SystemComponentsManager] Added jump jet to unallocated:`, {
        name: jumpJet.name,
        groupId: allocation.equipmentGroupId,
        slots: jumpJet.requiredSlots,
        weight: jumpJet.weight
      })
    })
    
    console.log(`[SystemComponentsManager] Total jump jets added: ${jumpJets.length}`)
  }

  /**
   * Remove all heat sink equipment from unallocated and allocated slots
   */
  removeHeatSinkEquipment(): void {
    console.log('[SystemComponentsManager] Removing ALL heat sink equipment')
    const beforeUnallocated = this.unitManager.unallocatedEquipment.length
    // Remove from unallocated equipment (mutate in place)
    for (let i = this.unitManager.unallocatedEquipment.length - 1; i >= 0; i--) {
      const eq = this.unitManager.unallocatedEquipment[i]
      if (eq.equipmentData.name.includes('Heat Sink') || eq.equipmentData.type === 'heat_sink') {
        this.unitManager.unallocatedEquipment.splice(i, 1)
      }
    }
    const afterUnallocated = this.unitManager.unallocatedEquipment.length
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
    console.log(`[SystemComponentsManager] Removed heat sink equipment:`)
    console.log(`  - From unallocated: ${beforeUnallocated - afterUnallocated}`)
    console.log(`  - From allocated slots: ${removedFromSlots}`)
    console.log(`  - Total removed: ${(beforeUnallocated - afterUnallocated) + removedFromSlots}`)
  }

  /**
   * Add heat sink equipment to unallocated pool
   */
  private addHeatSinkEquipment(heatSinkType: ComponentConfiguration, externalHeatSinks: number, techBase: string): void {
    // Extract the actual heat sink type from ComponentConfiguration
    const actualHeatSinkType = typeof heatSinkType === 'string' ? heatSinkType : heatSinkType.type
    console.log(`[SystemComponentsManager] Adding heat sink equipment: ${actualHeatSinkType} - ${externalHeatSinks} external heat sinks`)
    
    // CRITICAL FIX: Don't generate any heat sinks if externalHeatSinks is 0
    if (externalHeatSinks <= 0) {
      console.log(`[SystemComponentsManager] No external heat sinks needed (${externalHeatSinks}), skipping generation`)
      return
    }
    
    // Import heat sink calculations
    // const { getHeatSinkSpecification } = require('../heatSinkCalculations') // This line is removed
    
    // CRITICAL FIX: Map configuration heat sink types to calculation types
    let calculationHeatSinkType: string = actualHeatSinkType
    if (actualHeatSinkType === 'Double') {
      calculationHeatSinkType = techBase === 'Clan' ? 'Double (Clan)' : 'Double (IS)'
    }
    
    const heatSinkSpec = getHeatSinkSpecification(calculationHeatSinkType as HeatSinkType)
    if (!heatSinkSpec) {
      console.error(`[SystemComponentsManager] No specification found for heat sink type: ${calculationHeatSinkType} (original: ${heatSinkType})`)
      return
    }
    
    console.log(`[SystemComponentsManager] Using heat sink spec:`, {
      type: calculationHeatSinkType,
      slots: heatSinkSpec.criticalSlotsPerSink,
      weight: heatSinkSpec.weightPerSink,
      dissipation: heatSinkSpec.pointsPerSink
    })
    
    const heatSinks: EquipmentObject[] = []
    
    // Define location restrictions for heat sinks (can be placed anywhere except head)
    const heatSinkLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
    
    for (let i = 0; i < externalHeatSinks; i++) {
      heatSinks.push({
        id: `${actualHeatSinkType.toLowerCase().replace(/\s+/g, '_')}_external_${i + 1}`,
        name: `${calculationHeatSinkType} Heat Sink`,
        type: 'heat_sink' as const,
        requiredSlots: heatSinkSpec.criticalSlotsPerSink,
        weight: heatSinkSpec.weightPerSink,
        techBase: heatSinkSpec.techBase === 'Both' ? techBase : heatSinkSpec.techBase,
        heat: -heatSinkSpec.pointsPerSink, // Negative because they dissipate heat
        allowedLocations: heatSinkLocations
      })
    }
    
    heatSinks.forEach((heatSink, index) => {
      // Generate unique group IDs for heat sinks
      SystemComponentsManager.globalComponentCounter++
      const uniqueGroupId = `${heatSink.id}_group_${SystemComponentsManager.globalComponentCounter}_${Date.now()}_${index}`
      
      const allocation: EquipmentAllocation = {
        equipmentData: heatSink,
        equipmentGroupId: uniqueGroupId,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      }
      
      this.unitManager.unallocatedEquipment.push(allocation)
      
      console.log(`[SystemComponentsManager] Added heat sink to unallocated:`, {
        name: heatSink.name,
        groupId: uniqueGroupId,
        slots: heatSink.requiredSlots,
        weight: heatSink.weight
      })
    })
    
    console.log(`[SystemComponentsManager] Total heat sinks added: ${heatSinks.length}`)
  }

  /**
   * Check if equipment is a system component
   */
  isSystemComponent(equipment: EquipmentObject): boolean {
    return equipment.name.includes('Engine') || 
           equipment.name.includes('Gyro') ||
           equipment.name.includes('Heat Sink') ||
           equipment.name.includes('Jump') ||
           equipment.name.includes('UMU') ||
           equipment.name.includes('Booster') ||
           equipment.name.includes('Wing') ||
           equipment.type === 'heat_sink'
  }

  /**
   * Rebuild system components (engine/gyro only)
   */
  rebuildSystemComponents(): void {
    // Clear all system reservations
    this.sections.forEach(section => {
      section.clearSystemReservations('engine')
      section.clearSystemReservations('gyro')
    })
    
    // Reallocate system components
    this.allocateSystemComponents()
  }

  // Helper methods for getting component type strings
  private getGyroTypeString(): GyroType {
    const gyroType = this.unitManager.configuration.gyroType
    return typeof gyroType === 'string' ? gyroType : gyroType.type as GyroType
  }

  private getJumpJetTypeString(): JumpJetType {
    const jumpJetType = this.unitManager.configuration.jumpJetType
    return typeof jumpJetType === 'string' ? jumpJetType : jumpJetType.type as JumpJetType
  }

  private getHeatSinkTypeString(): ConfigHeatSinkType {
    const heatSinkType = this.unitManager.configuration.heatSinkType
    return typeof heatSinkType === 'string' ? heatSinkType : heatSinkType.type as ConfigHeatSinkType
  }
} 