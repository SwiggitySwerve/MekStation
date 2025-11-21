/**
 * Equipment Query Manager
 * Handles equipment queries, retrieval, and analysis across the unit
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { CriticalSection } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { UnitConfiguration } from './UnitCriticalManagerTypes'

export interface EquipmentQueryResult {
  totalEquipment: number
  allocatedEquipment: number
  unallocatedEquipment: number
  byLocation: Map<string, EquipmentAllocation[]>
  byType: Map<string, EquipmentAllocation[]>
  systemComponents: EquipmentAllocation[]
  specialComponents: EquipmentAllocation[]
  regularEquipment: EquipmentAllocation[]
}

export interface EquipmentGroupInfo {
  groupId: string
  equipmentReference: EquipmentAllocation
  location: string | null
  isAllocated: boolean
  isSystemComponent: boolean
  isSpecialComponent: boolean
}

export class EquipmentQueryManager {
  private sections: Map<string, CriticalSection>
  private unallocatedEquipment: EquipmentAllocation[]
  private configuration: UnitConfiguration

  constructor(
    sections: Map<string, CriticalSection>,
    unallocatedEquipment: EquipmentAllocation[],
    configuration: UnitConfiguration
  ) {
    this.sections = sections
    this.unallocatedEquipment = unallocatedEquipment
    this.configuration = configuration
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
    return EquipmentQueryManager.hasComponentType(equipment) ? equipment.componentType : undefined
  }

  /**
   * Get all equipment across entire unit, organized by equipment ID
   */
  getAllEquipment(): Map<string, EquipmentAllocation[]> {
    const allEquipment = new Map<string, EquipmentAllocation[]>()
    
    // Collect from all sections
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        const equipmentId = allocation.equipmentData.id
        if (!allEquipment.has(equipmentId)) {
          allEquipment.set(equipmentId, [])
        }
        allEquipment.get(equipmentId)!.push(allocation)
      })
    })
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipmentId = allocation.equipmentData.id
      if (!allEquipment.has(equipmentId)) {
        allEquipment.set(equipmentId, [])
      }
      allEquipment.get(equipmentId)!.push(allocation)
    })
    
    return allEquipment
  }

  /**
   * Get all equipment groups (each allocated instance)
   */
  getAllEquipmentGroups(): EquipmentGroupInfo[] {
    const groups: EquipmentGroupInfo[] = []
    
    // Collect from all sections
    this.sections.forEach((section, location) => {
      section.getAllEquipment().forEach(allocation => {
        groups.push({
          groupId: allocation.equipmentGroupId,
          equipmentReference: allocation,
          location,
          isAllocated: true,
          isSystemComponent: this.isSystemComponent(allocation.equipmentData),
          isSpecialComponent: this.isSpecialComponent(allocation.equipmentData)
        })
      })
    })
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      groups.push({
        groupId: allocation.equipmentGroupId,
        equipmentReference: allocation,
        location: null,
        isAllocated: false,
        isSystemComponent: this.isSystemComponent(allocation.equipmentData),
        isSpecialComponent: this.isSpecialComponent(allocation.equipmentData)
      })
    })
    
    return groups
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
    const unallocated = this.unallocatedEquipment.find((eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId)
    if (unallocated) {
      return { section: null, allocation: unallocated }
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
   * Get equipment by type
   */
  getEquipmentByType(): Map<string, EquipmentAllocation[]> {
    const equipmentByType = new Map<string, EquipmentAllocation[]>()
    
    // Collect from all sections
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        const equipmentType = allocation.equipmentData.type || 'Unknown'
        if (!equipmentByType.has(equipmentType)) {
          equipmentByType.set(equipmentType, [])
        }
        equipmentByType.get(equipmentType)!.push(allocation)
      })
    })
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipmentType = allocation.equipmentData.type || 'Unknown'
      if (!equipmentByType.has(equipmentType)) {
        equipmentByType.set(equipmentType, [])
      }
      equipmentByType.get(equipmentType)!.push(allocation)
    })
    
    return equipmentByType
  }

  /**
   * Get unallocated equipment
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return [...this.unallocatedEquipment]
  }

  /**
   * Get comprehensive equipment query result
   */
  getEquipmentQueryResult(): EquipmentQueryResult {
    const byLocation = this.getEquipmentByLocation()
    const byType = this.getEquipmentByType()
    
    const allEquipment = this.getAllEquipmentGroups()
    const systemComponents = allEquipment.filter(group => group.isSystemComponent).map(group => group.equipmentReference)
    const specialComponents = allEquipment.filter(group => group.isSpecialComponent).map(group => group.equipmentReference)
    const regularEquipment = allEquipment.filter(group => !group.isSystemComponent && !group.isSpecialComponent).map(group => group.equipmentReference)
    
    return {
      totalEquipment: allEquipment.length,
      allocatedEquipment: allEquipment.filter(group => group.isAllocated).length,
      unallocatedEquipment: allEquipment.filter(group => !group.isAllocated).length,
      byLocation,
      byType,
      systemComponents,
      specialComponents,
      regularEquipment
    }
  }

  /**
   * Get allocated equipment count
   */
  getAllocatedEquipmentCount(): number {
    let count = 0
    this.sections.forEach(section => {
      count += section.getAllEquipment().length
    })
    return count
  }

  /**
   * Get unallocated equipment count
   */
  getUnallocatedEquipmentCount(): number {
    return this.unallocatedEquipment.length
  }

  /**
   * Get total equipment count
   */
  getTotalEquipmentCount(): number {
    return this.getAllocatedEquipmentCount() + this.getUnallocatedEquipmentCount()
  }

  /**
   * Check if equipment is a system component
   */
  private isSystemComponent(equipment: EquipmentObject): boolean {
    const systemComponentTypes = [
      'engine', 'gyro', 'cockpit', 'life_support', 'sensors', 'actuator'
    ]
    
    const componentType = EquipmentQueryManager.getComponentType(equipment)
    return systemComponentTypes.some(type => 
      componentType === type || 
      equipment.name.toLowerCase().includes(type)
    )
  }

  /**
   * Check if equipment is a special component
   */
  private isSpecialComponent(equipment: EquipmentObject): boolean {
    const specialComponentTypes = ['structure', 'armor']
    
    const componentType = EquipmentQueryManager.getComponentType(equipment)
    return specialComponentTypes.some(type => 
      componentType === type
    )
  }

  /**
   * Get equipment statistics
   */
  getEquipmentStatistics(): {
    total: number
    allocated: number
    unallocated: number
    systemComponents: number
    specialComponents: number
    regularEquipment: number
    byLocation: Record<string, number>
  } {
    const queryResult = this.getEquipmentQueryResult()
    const byLocation: Record<string, number> = {}
    
    queryResult.byLocation.forEach((equipment, location) => {
      byLocation[location] = equipment.length
    })
    
    return {
      total: queryResult.totalEquipment,
      allocated: queryResult.allocatedEquipment,
      unallocated: queryResult.unallocatedEquipment,
      systemComponents: queryResult.systemComponents.length,
      specialComponents: queryResult.specialComponents.length,
      regularEquipment: queryResult.regularEquipment.length,
      byLocation
    }
  }

  /**
   * Find equipment by name
   */
  findEquipmentByName(name: string): EquipmentAllocation[] {
    const results: EquipmentAllocation[] = []
    
    // Search allocated equipment
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        if (allocation.equipmentData.name.toLowerCase().includes(name.toLowerCase())) {
          results.push(allocation)
        }
      })
    })
    
    // Search unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      if (allocation.equipmentData.name.toLowerCase().includes(name.toLowerCase())) {
        results.push(allocation)
      }
    })
    
    return results
  }

  /**
   * Get equipment by component type
   */
  getEquipmentByComponentType(componentType: string): EquipmentAllocation[] {
    const results: EquipmentAllocation[] = []
    
    // Search allocated equipment
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        const equipmentComponentType = EquipmentQueryManager.getComponentType(allocation.equipmentData)
        if (equipmentComponentType === componentType) {
          results.push(allocation)
        }
      })
    })
    
    // Search unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipmentComponentType = EquipmentQueryManager.getComponentType(allocation.equipmentData)
      if (equipmentComponentType === componentType) {
        results.push(allocation)
      }
    })
    
    return results
  }
} 