/**
 * Era Management Module
 * 
 * Handles era validation, timeline management, and technology introduction tracking.
 * Extracted from TechLevelRulesValidator.ts for better modularity and testability.
 */

import { 
  EraValidation, 
  EraViolation, 
  EraProgression, 
  EraTimelineEntry, 
  TechIntroduction,
  ComponentInfo,
  TechLevelValidationContext
} from '../types/TechLevelTypes';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export class EraManager {
  // Era definitions and timeline
  private static readonly ERA_TIMELINE: EraTimelineEntry[] = [
    {
      era: 'Age of War',
      startYear: 2005,
      endYear: 2570,
      description: 'Pre-Star League era of constant warfare',
      majorEvents: ['Formation of major houses', 'Technological advancement']
    },
    {
      era: 'Star League',
      startYear: 2571,
      endYear: 2780,
      description: 'Golden age of technology and peace',
      majorEvents: ['Star League formation', 'Height of technology', 'Exodus of Kerensky']
    },
    {
      era: 'Succession Wars',
      startYear: 2781,
      endYear: 3049,
      description: 'Dark age of warfare and technological regression',
      majorEvents: ['First Succession War', 'Technology loss', 'House wars']
    },
    {
      era: 'Clan Invasion',
      startYear: 3050,
      endYear: 3067,
      description: 'Return of the Clans with superior technology',
      majorEvents: ['Clan arrival', 'Battle of Tukayyid', 'Tech renaissance']
    },
    {
      era: 'FedCom Civil War',
      startYear: 3057,
      endYear: 3067,
      description: 'Internal strife and technological recovery',
      majorEvents: ['Civil war', 'Industrial rebuilding', 'Tech spread']
    },
    {
      era: 'Jihad',
      startYear: 3067,
      endYear: 3080,
      description: 'Word of Blake Jihad and destruction',
      majorEvents: ['WoB uprising', 'HPG network destruction', 'Devastation']
    },
    {
      era: 'Dark Age',
      startYear: 3081,
      endYear: 3135,
      description: 'Recovery and technological rediscovery',
      majorEvents: ['Republic formation', 'Tech recovery', 'New innovations']
    },
    {
      era: 'ilClan Era',
      startYear: 3136,
      endYear: 3200,
      description: 'Clan Jade Falcon and Clan Wolf dominance',
      majorEvents: ['ilClan formation', 'Terra conquest', 'New order']
    }
  ];

  /**
   * Validate era restrictions for all components
   */
  static validateEraRestrictions(
    config: UnitConfiguration, 
    components: ComponentInfo[], 
    era: string,
    context: TechLevelValidationContext
  ): EraValidation {
    const invalidComponents: EraViolation[] = [];
    const recommendations: string[] = [];
    
    const eraProgression: EraProgression = {
      currentEra: era,
      availableEras: this.ERA_TIMELINE.map(e => e.era),
      eraTimeline: this.ERA_TIMELINE,
      technologyIntroductions: this.getTechnologyIntroductions(era)
    };
    
    if (context.strictEraCompliance) {
      for (const component of components) {
        const availability = this.getComponentEraAvailability(component.name, component.techBase);
        
        if (availability && !this.isAvailableInEra(availability.era, era)) {
          invalidComponents.push({
            component: component.name,
            availableEra: availability.era,
            currentEra: era,
            earliestAvailability: availability.era,
            message: `${component.name} not available in ${era} (available from ${availability.era})`,
            severity: this.getEraViolationSeverity(availability.era, era)
          });
        }
      }
    }
    
    if (invalidComponents.length > 0) {
      recommendations.push(`Consider updating era to ${this.getRecommendedEra(invalidComponents)} to accommodate all components`);
      recommendations.push('Replace era-inappropriate components with period-appropriate alternatives');
    }
    
    return {
      isValid: invalidComponents.length === 0,
      era,
      targetEra: era,
      invalidComponents,
      eraProgression,
      recommendations
    };
  }

  /**
   * Get the era timeline
   */
  static getEraTimeline(): EraTimelineEntry[] {
    return [...this.ERA_TIMELINE];
  }

  /**
   * Get era by name
   */
  static getEra(eraName: string): EraTimelineEntry | null {
    return this.ERA_TIMELINE.find(era => era.era === eraName) || null;
  }

  /**
   * Determine the default era for a configuration
   */
  static determineEra(config: UnitConfiguration): string {
    // In a real implementation, this would be configurable or derived from the unit
    // For now, use default era
    return 'Succession Wars';
  }

  /**
   * Check if a component is available in a specific era
   */
  static isAvailableInEra(componentEra: string, targetEra: string): boolean {
    const eraOrder = this.ERA_TIMELINE.map(e => e.era);
    const componentIndex = eraOrder.indexOf(componentEra);
    const targetIndex = eraOrder.indexOf(targetEra);
    
    if (componentIndex === -1 || targetIndex === -1) return true; // Unknown eras default to available
    
    // Handle lost technology: Star League tech is NOT available in Succession Wars
    if (componentEra === 'Star League' && targetEra === 'Succession Wars') {
      return false;
    }
    
    // Clan technology is only available from Clan Invasion era onward
    if (componentEra === 'Clan Invasion' && targetIndex < eraOrder.indexOf('Clan Invasion')) {
      return false;
    }
    
    // Generally, technology is available from its introduction era onward
    // BUT Star League tech is lost during Succession Wars and regained later
    if (componentEra === 'Star League') {
      // Star League tech is available in Star League era and later eras (except Succession Wars)
      return targetEra === 'Star League' || targetIndex >= eraOrder.indexOf('Clan Invasion');
    }
    
    // Standard availability: component is available from its era onward
    return componentIndex <= targetIndex;
  }

  /**
   * Get technology introductions for an era
   */
  private static getTechnologyIntroductions(era: string): TechIntroduction[] {
    // Simplified tech introduction data
    return [
      {
        technology: 'Double Heat Sinks',
        era: 'Star League',
        year: 2571,
        techBase: 'Star League',
        description: 'Advanced heat dissipation technology'
      },
      {
        technology: 'Endo Steel',
        era: 'Star League',
        year: 2571,
        techBase: 'Star League',
        description: 'Lightweight internal structure'
      },
      {
        technology: 'Ferro-Fibrous Armor',
        era: 'Star League',
        year: 2571,
        techBase: 'Star League',
        description: 'Lightweight armor technology'
      }
    ];
  }

  /**
   * Get component era availability
   */
  private static getComponentEraAvailability(componentName: string, techBase: string): { era: string } | null {
    // Normalized component name for better matching
    const lowerName = componentName.toLowerCase();
    
    // Star League era components (lost technology)
    const starLeagueComponents = [
      'double heat sink',
      'endo steel',
      'ferro-fibrous',
      'xl engine',
      'light engine',
      'pulse laser',
      'er laser',
      'ultra ac',
      'lb-x ac',
      'streak srm',
      'artemis'
    ];
    
    // Check for Star League technology first
    if (starLeagueComponents.some(comp => lowerName.includes(comp))) {
      return { era: 'Star League' };
    }
    
    // Clan technology is available from Clan Invasion era
    if (techBase === 'Clan') {
      return { era: 'Clan Invasion' };
    }
    
    // Standard Inner Sphere technology available from Succession Wars
    return { era: 'Succession Wars' }; // Default era
  }

  /**
   * Get era violation severity
   */
  private static getEraViolationSeverity(componentEra: string, currentEra: string): 'critical' | 'major' | 'minor' {
    const eraOrder = this.ERA_TIMELINE.map(e => e.era);
    const componentIndex = eraOrder.indexOf(componentEra);
    const currentIndex = eraOrder.indexOf(currentEra);
    
    const eraDifference = componentIndex - currentIndex;
    
    if (eraDifference > 2) return 'critical';
    if (eraDifference > 1) return 'major';
    return 'minor';
  }

  /**
   * Get recommended era to accommodate invalid components
   */
  private static getRecommendedEra(invalidComponents: EraViolation[]): string {
    // Find the latest era required by any component
    const requiredEras = invalidComponents.map(c => c.availableEra);
    const eraOrder = this.ERA_TIMELINE.map(e => e.era);
    
    let latestEraIndex = -1;
    for (const era of requiredEras) {
      const index = eraOrder.indexOf(era);
      if (index > latestEraIndex) {
        latestEraIndex = index;
      }
    }
    
    return latestEraIndex >= 0 ? eraOrder[latestEraIndex] : 'Succession Wars';
  }
}




