/**
 * Construction Rules Engine
 * Core validation and rules enforcement for enhanced system components
 */

import { 
  EnhancedSystemComponents,
  ConstructionContext,
  ConstructionValidationResult,
  TechBaseViolation,
  SlotViolation,
  WeightViolation,
  ComponentOption,
  ComponentType,
  TechBase
} from '../../types/enhancedSystemComponents';

import { EngineType, HeatSinkType } from '../../types/systemComponents';

import { ENGINE_SLOT_REQUIREMENTS } from '../../types/systemComponents';
import { HEAT_SINK_SPECIFICATIONS } from '../heatSinkCalculations';

export class ConstructionRulesEngine {
  
  /**
   * Validate complete system component configuration
   */
  validateConfiguration(
    components: EnhancedSystemComponents,
    context: ConstructionContext
  ): ConstructionValidationResult {
    const result: ConstructionValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      techBaseViolations: [],
      slotViolations: [],
      weightViolations: [],
      costCalculation: null
    };

    // Validate tech base compatibility
    this.validateTechBaseCompatibility(components, context, result);
    
    // Validate engine configuration
    this.validateEngineConfiguration(components.engine, context, result);
    
    // Validate heat sink configuration
    this.validateHeatSinkConfiguration(components.heatSinks, context, result);
    
    // Validate slot allocation
    this.validateSlotAllocation(components, context, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Get available engine types for given tech base
   */
  getAvailableEngineTypes(techBase: TechBase): ComponentOption[] {
    const options: ComponentOption[] = [];
    
    Object.entries(ENGINE_SLOT_REQUIREMENTS).forEach(([engineType, slotReq]) => {
      const isCompatible = this.isEngineTypeCompatible(engineType as EngineType, techBase);
      const totalSlots = slotReq.centerTorso + slotReq.leftTorso + slotReq.rightTorso;
      
      options.push({
        id: engineType,
        name: this.formatEngineTypeName(engineType as EngineType),
        techBase: this.getEngineTypeTechBase(engineType as EngineType),
        available: isCompatible,
        reason: isCompatible ? undefined : `Incompatible with ${techBase}`,
        details: {
          weight: 0, // Calculated based on rating
          criticalSlots: totalSlots,
          cost: 0, // Calculated based on rating
          techLevel: 'Standard',
          introductionYear: this.getEngineIntroductionYear(engineType as EngineType)
        }
      });
    });

    return options;
  }

  /**
   * Get available heat sink types for given tech base
   */
  getAvailableHeatSinkTypes(techBase: TechBase): ComponentOption[] {
    const options: ComponentOption[] = [];
    
    Object.entries(HEAT_SINK_SPECIFICATIONS).forEach(([heatSinkType, spec]) => {
      const isCompatible = this.isHeatSinkTypeCompatible(heatSinkType as HeatSinkType, techBase);
      
      options.push({
        id: heatSinkType,
        name: this.formatHeatSinkTypeName(heatSinkType as HeatSinkType),
        techBase: spec.techBase,
        available: isCompatible,
        reason: isCompatible ? undefined : `Incompatible with ${techBase}`,
        details: {
          weight: spec.weightPerSink,
          criticalSlots: spec.criticalSlotsPerSink,
          cost: 2000 * spec.costMultiplier, // Base heat sink cost
          techLevel: 'Standard',
          introductionYear: 2470 // Default introduction year
        }
      });
    });

    return options;
  }

  /**
   * Calculate slot requirements for system components
   */
  calculateSystemSlotRequirements(components: EnhancedSystemComponents): { [location: string]: number } {
    const requirements: { [location: string]: number } = {
      'Head': 0,
      'Center Torso': 0,
      'Left Torso': 0,
      'Right Torso': 0,
      'Left Arm': 0,
      'Right Arm': 0,
      'Left Leg': 0,
      'Right Leg': 0
    };

    // Engine slots
    if (components.engine && components.engine.type) {
      const engineSlots = ENGINE_SLOT_REQUIREMENTS[components.engine.type];
      if (engineSlots) {
        requirements['Center Torso'] += engineSlots.centerTorso;
        requirements['Left Torso'] += engineSlots.leftTorso;
        requirements['Right Torso'] += engineSlots.rightTorso;
      }
    }

    // Gyro slots (typically 4 in center torso)
    requirements['Center Torso'] += 4;

    // Cockpit slots (typically 1 in head)
    requirements['Head'] += 1;

    // External heat sink slots
    if (components.heatSinks && components.heatSinks.type && components.heatSinks.total) {
      const externalHeatSinks = Math.max(0, components.heatSinks.total - (components.heatSinks.engineIntegrated || 0));
      const heatSinkSpec = HEAT_SINK_SPECIFICATIONS[components.heatSinks.type];
      if (heatSinkSpec) {
        const totalHeatSinkSlots = externalHeatSinks * heatSinkSpec.criticalSlotsPerSink;
        
        // Heat sinks can be placed in various locations - for now, assume distributed
        const slotsPerLocation = Math.ceil(totalHeatSinkSlots / 8); // Distribute across 8 locations
        Object.keys(requirements).forEach(location => {
          requirements[location] += Math.min(slotsPerLocation, totalHeatSinkSlots / 8);
        });
      }
    }

    return requirements;
  }

  private validateTechBaseCompatibility(
    components: EnhancedSystemComponents,
    context: ConstructionContext,
    result: ConstructionValidationResult
  ): void {
    // Validate engine tech base
    if (!this.isEngineTypeCompatible(components.engine.type, context.techBase)) {
      const violation: TechBaseViolation = {
        component: 'engine',
        violation: 'tech_base_mismatch',
        details: `${components.engine.type} engine incompatible with ${context.techBase} chassis`
      };
      result.techBaseViolations.push(violation);
      result.errors.push(violation.details);
    }

    // Validate heat sink tech base
    if (!this.isHeatSinkTypeCompatible(components.heatSinks.type, context.techBase)) {
      const violation: TechBaseViolation = {
        component: 'heatSinks',
        violation: 'tech_base_mismatch',
        details: `${components.heatSinks.type} heat sinks incompatible with ${context.techBase} chassis`
      };
      result.techBaseViolations.push(violation);
      result.errors.push(violation.details);
    }
  }

  private validateEngineConfiguration(
    engine: any,
    context: ConstructionContext,
    result: ConstructionValidationResult
  ): void {
    // Add engine-specific validation
    if (engine.type === 'XL (IS)') {
      result.warnings.push('IS XL engines are destroyed if either side torso is lost');
    } else if (engine.type === 'XL (Clan)') {
      result.warnings.push('Clan XL engines continue with -2 penalty if one side torso is lost');
    }

    // Validate engine rating
    if (engine.rating < 10 || engine.rating > 500) {
      result.errors.push(`Engine rating ${engine.rating} is outside valid range (10-500)`);
    }
  }

  private validateHeatSinkConfiguration(
    heatSinks: any,
    context: ConstructionContext,
    result: ConstructionValidationResult
  ): void {
    // Validate heat sink count
    if (heatSinks.total < 10) {
      result.errors.push('Mechs must have at least 10 heat sinks');
    }

    if (heatSinks.externalRequired < 0) {
      result.errors.push('External heat sink count cannot be negative');
    }

    // Validate tech base specific rules
    if (heatSinks.type === 'Double (IS)' && context.techBase.includes('Clan')) {
      result.warnings.push('Using IS Double Heat Sinks on Clan chassis may incur mixed tech penalties');
    } else if (heatSinks.type === 'Double (Clan)' && context.techBase.includes('Inner Sphere')) {
      result.warnings.push('Using Clan Double Heat Sinks on IS chassis may incur mixed tech penalties');
    }
  }

  private validateSlotAllocation(
    components: EnhancedSystemComponents,
    context: ConstructionContext,
    result: ConstructionValidationResult
  ): void {
    const maxSlots: { [location: string]: number } = {
      'Head': 6,
      'Center Torso': 12,
      'Left Torso': 12,
      'Right Torso': 12,
      'Left Arm': 12,
      'Right Arm': 12,
      'Left Leg': 6,
      'Right Leg': 6
    };

    const requirements = this.calculateSystemSlotRequirements(components);

    Object.entries(requirements).forEach(([location, required]) => {
      const available = maxSlots[location];
      if (required > available) {
        const violation: SlotViolation = {
          location,
          required,
          available,
          component: 'system_components'
        };
        result.slotViolations.push(violation);
        result.errors.push(`${location} requires ${required} slots but only ${available} available`);
      }
    });
  }

  private isEngineTypeCompatible(engineType: EngineType, techBase: TechBase): boolean {
    const engineTechBase = this.getEngineTypeTechBase(engineType);
    
    if (engineTechBase === 'Both') return true;
    
    if (techBase === 'Inner Sphere' && engineTechBase === 'Inner Sphere') return true;
    if (techBase === 'Clan' && engineTechBase === 'Clan') return true;
    if (techBase === 'Mixed (IS Chassis)' && engineTechBase === 'Inner Sphere') return true;
    if (techBase === 'Mixed (Clan Chassis)' && engineTechBase === 'Clan') return true;
    
    // Mixed tech allows some cross-compatibility with penalties
    if (techBase.startsWith('Mixed')) return true;
    
    return false;
  }

  private isHeatSinkTypeCompatible(heatSinkType: HeatSinkType, techBase: TechBase): boolean {
    const heatSinkSpec = HEAT_SINK_SPECIFICATIONS[heatSinkType];
    
    if (heatSinkSpec.techBase === 'Both') return true;
    
    if (techBase === 'Inner Sphere' && heatSinkSpec.techBase === 'Inner Sphere') return true;
    if (techBase === 'Clan' && heatSinkSpec.techBase === 'Clan') return true;
    if (techBase === 'Mixed (IS Chassis)' && heatSinkSpec.techBase === 'Inner Sphere') return true;
    if (techBase === 'Mixed (Clan Chassis)' && heatSinkSpec.techBase === 'Clan') return true;
    
    // Mixed tech allows some cross-compatibility with penalties
    if (techBase.startsWith('Mixed')) return true;
    
    return false;
  }

  private getEngineTypeTechBase(engineType: EngineType): 'Inner Sphere' | 'Clan' | 'Both' {
    if (engineType === 'XL (IS)' || engineType === 'Light') {
      return 'Inner Sphere';
    } else if (engineType === 'XL (Clan)') {
      return 'Clan';
    }
    return 'Both';
  }

  private formatEngineTypeName(engineType: EngineType): string {
    const nameMap: { [key in EngineType]: string } = {
      'Standard': 'Fusion Engine',
      'XL (IS)': 'XL Engine (IS)',
      'XL (Clan)': 'XL Engine (Clan)',
      'Light': 'Light Engine',
      'XXL': 'XXL Engine',
      'Compact': 'Compact Engine',
      'ICE': 'I.C.E. Engine',
      'Fuel Cell': 'Fuel Cell Engine'
    };
    return nameMap[engineType] || engineType;
  }

  private formatHeatSinkTypeName(heatSinkType: HeatSinkType): string {
    const nameMap: { [key in HeatSinkType]: string } = {
      'Single': 'Single Heat Sink',
      'Double (IS)': 'Double Heat Sink (IS)',
      'Double (Clan)': 'Double Heat Sink (Clan)',
      'Compact': 'Compact Heat Sink',
      'Laser': 'Laser Heat Sink'
    };
    return nameMap[heatSinkType] || heatSinkType;
  }

  private getEngineIntroductionYear(engineType: EngineType): number {
    const introYears: { [key in EngineType]: number } = {
      'Standard': 2470,
      'XL (IS)': 2579,
      'XL (Clan)': 2824,
      'Light': 3055,
      'XXL': 3109,
      'Compact': 2460,
      'ICE': 1950,
      'Fuel Cell': 3045
    };
    return introYears[engineType] || 2470;
  }
}
