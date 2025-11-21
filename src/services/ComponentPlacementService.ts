/**
 * Component Placement Service Implementation
 * Handles validation and placement logic for static, dynamic, and restricted components
 */

import {
  ComponentPlacement,
  PlacementConfiguration,
  PlacementValidationContext,
  PlacementValidationResult,
  MechLocation,
  ComponentPlacementService as IComponentPlacementService,
  COMPONENT_PLACEMENTS
} from '../types/core/ComponentPlacement'

export class ComponentPlacementService implements IComponentPlacementService {
  private static instance: ComponentPlacementService

  private constructor() {}

  static getInstance(): ComponentPlacementService {
    if (!ComponentPlacementService.instance) {
      ComponentPlacementService.instance = new ComponentPlacementService()
    }
    return ComponentPlacementService.instance
  }

  /**
   * Validate if a component can be placed according to its placement rules
   */
  validatePlacement(
    component: ComponentPlacement,
    context: PlacementValidationContext
  ): PlacementValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if total slots are available
    const totalAvailableSlots = Object.values(context.availableSlots).reduce((sum, slots) => sum + slots, 0)
    if (totalAvailableSlots < component.totalSlots) {
      errors.push(`Insufficient slots: ${component.totalSlots} required, ${totalAvailableSlots} available`)
    }

    // Validate based on placement type
    switch (component.placementType) {
      case 'static':
        return this.validateStaticPlacement(component as ComponentPlacement & { placementType: 'static'; fixedSlots: any }, context)
      
      case 'dynamic':
        return this.validateDynamicPlacement(component as ComponentPlacement & { placementType: 'dynamic' }, context)
      
      case 'restricted':
        return this.validateRestrictedPlacement(component as ComponentPlacement & { placementType: 'restricted'; allowedLocations: MechLocation[]; validationRules?: any }, context)
      
      default:
        errors.push(`Unknown placement type: ${(component as any).placementType}`)
        return { valid: false, errors, warnings }
    }
  }

  /**
   * Validate static placement (fixed slots)
   */
  private validateStaticPlacement(
    component: ComponentPlacement & { placementType: 'static'; fixedSlots: any },
    context: PlacementValidationContext
  ): PlacementValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if all required fixed slots are available
    for (const [location, slots] of Object.entries(component.fixedSlots)) {
      const availableSlots = context.availableSlots[location as MechLocation] || 0
      const requiredSlots = (slots as number[]).length
      
      if (availableSlots < requiredSlots) {
        errors.push(`Insufficient slots in ${location}: ${requiredSlots} required, ${availableSlots} available`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate dynamic placement (anywhere)
   */
  private validateDynamicPlacement(
    component: ComponentPlacement & { placementType: 'dynamic' },
    context: PlacementValidationContext
  ): PlacementValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // For dynamic placement, we just need enough total slots
    const totalAvailableSlots = Object.values(context.availableSlots).reduce((sum, slots) => sum + slots, 0)
    
    if (totalAvailableSlots < component.totalSlots) {
      errors.push(`Insufficient slots for dynamic placement: ${component.totalSlots} required, ${totalAvailableSlots} available`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate restricted placement (specific locations)
   */
  private validateRestrictedPlacement(
    component: ComponentPlacement & { 
      placementType: 'restricted'; 
      allowedLocations: MechLocation[];
      validationRules?: any;
    },
    context: PlacementValidationContext
  ): PlacementValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if any allowed locations have sufficient slots
    const validLocations = this.getValidPlacements(component, context)
    
    if (validLocations.length === 0) {
      errors.push(`No valid locations available for restricted component`)
      return { valid: false, errors, warnings }
    }

    // Check special validation rules
    if (component.validationRules?.requiresEngineSlots) {
      const hasEngineSlots = this.checkEngineSlotRequirement(component, context)
      if (!hasEngineSlots) {
        errors.push(`Component requires engine slots in placement location`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get valid placement options for a component
   */
  getValidPlacements(
    component: ComponentPlacement,
    context: PlacementValidationContext
  ): MechLocation[] {
    switch (component.placementType) {
      case 'static':
        return this.getStaticValidPlacements(component as ComponentPlacement & { placementType: 'static'; fixedSlots: any }, context)
      
      case 'dynamic':
        return this.getDynamicValidPlacements(component as ComponentPlacement & { placementType: 'dynamic' }, context)
      
      case 'restricted':
        return this.getRestrictedValidPlacements(component as ComponentPlacement & { placementType: 'restricted'; allowedLocations: MechLocation[]; validationRules?: any }, context)
      
      default:
        return []
    }
  }

  /**
   * Get valid placements for static components
   */
  private getStaticValidPlacements(
    component: ComponentPlacement & { placementType: 'static'; fixedSlots: any },
    context: PlacementValidationContext
  ): MechLocation[] {
    const validLocations: MechLocation[] = []
    
    for (const [location, slots] of Object.entries(component.fixedSlots)) {
      const availableSlots = context.availableSlots[location as MechLocation] || 0
      const requiredSlots = (slots as number[]).length
      
      if (availableSlots >= requiredSlots) {
        validLocations.push(location as MechLocation)
      }
    }
    
    return validLocations
  }

  /**
   * Get valid placements for dynamic components
   */
  private getDynamicValidPlacements(
    component: ComponentPlacement & { placementType: 'dynamic' },
    context: PlacementValidationContext
  ): MechLocation[] {
    // For dynamic components, all locations with available slots are valid
    return Object.entries(context.availableSlots)
      .filter(([_, slots]) => slots > 0)
      .map(([location, _]) => location as MechLocation)
  }

  /**
   * Get valid placements for restricted components
   */
  private getRestrictedValidPlacements(
    component: ComponentPlacement & { 
      placementType: 'restricted'; 
      allowedLocations: MechLocation[];
      validationRules?: any;
    },
    context: PlacementValidationContext
  ): MechLocation[] {
    return component.allowedLocations.filter(location => {
      const availableSlots = context.availableSlots[location] || 0
      
      // Check if location has available slots
      if (availableSlots === 0) return false
      
      // Check special validation rules
      if (component.validationRules?.requiresEngineSlots) {
        return this.hasEngineSlots(location, context)
      }
      
      return true
    })
  }

  /**
   * Calculate total slots required by a component
   */
  getTotalSlots(component: ComponentPlacement): number {
    return component.totalSlots
  }

  /**
   * Check if a specific placement is valid
   */
  isValidPlacement(
    component: ComponentPlacement,
    location: MechLocation,
    context: PlacementValidationContext
  ): boolean {
    const validLocations = this.getValidPlacements(component, context)
    return validLocations.includes(location)
  }

  /**
   * Check if a location has engine slots (for supercharger validation)
   */
  private hasEngineSlots(location: MechLocation, context: PlacementValidationContext): boolean {
    if (!context.engineSlots) return false
    
    switch (location) {
      case 'Center Torso':
        return context.engineSlots.centerTorso.length > 0
      case 'Left Torso':
        return context.engineSlots.leftTorso.length > 0
      case 'Right Torso':
        return context.engineSlots.rightTorso.length > 0
      default:
        return false
    }
  }

  /**
   * Check engine slot requirement for superchargers
   */
  private checkEngineSlotRequirement(
    component: ComponentPlacement & { 
      placementType: 'restricted'; 
      allowedLocations: MechLocation[];
      validationRules?: any;
    },
    context: PlacementValidationContext
  ): boolean {
    if (!component.validationRules?.requiresEngineSlots) return true
    
    return component.allowedLocations.some(location => 
      this.hasEngineSlots(location, context)
    )
  }

  /**
   * Get predefined placement configuration for a component
   */
  getPlacementConfig(componentId: string): ComponentPlacement | null {
    // This would be expanded to include all component types
    const configMap: Record<string, ComponentPlacement> = {
      'standard_fusion_engine': COMPONENT_PLACEMENTS.ENGINE.standard,
      'xl_fusion_engine': COMPONENT_PLACEMENTS.ENGINE.xl,
      'standard_gyro': COMPONENT_PLACEMENTS.GYRO.standard,
      'endo_steel_structure': COMPONENT_PLACEMENTS.ENDO_STEEL.innerSphere,
      'endo_steel_clan_structure': COMPONENT_PLACEMENTS.ENDO_STEEL.clan,
      'ferro_fibrous_armor': COMPONENT_PLACEMENTS.FERRO_FIBROUS.innerSphere,
      'ferro_fibrous_clan_armor': COMPONENT_PLACEMENTS.FERRO_FIBROUS.clan,
      'standard_jump_jet': COMPONENT_PLACEMENTS.JUMP_JETS,
      'case': COMPONENT_PLACEMENTS.CASE,
      'case_ii': COMPONENT_PLACEMENTS.CASE_II,
      'supercharger': COMPONENT_PLACEMENTS.SUPERCHARGER,
      'partial_wing': COMPONENT_PLACEMENTS.PARTIAL_WING,
      // Torso electronics
      'guardian_ecm': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'angel_ecm': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_ecm': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'beagle_active_probe': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_active_probe': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'bloodhound_active_probe': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'tag': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'light_tag': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'c3_master': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'c3_slave': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      // Targeting computers (IS/Clan tonnage variants)
      'is_targeting_computer_1': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'is_targeting_computer_2': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'is_targeting_computer_3': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'is_targeting_computer_4': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'is_targeting_computer_5': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'is_targeting_computer_6': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_1': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_2': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_3': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_4': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_5': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS,
      'clan_targeting_computer_6': COMPONENT_PLACEMENTS.TORSO_ELECTRONICS
    }
    
    return configMap[componentId] || null
  }
} 




