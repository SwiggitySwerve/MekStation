/**
 * Rich Component Database - Single Source of Truth for all BattleTech components
 * Contains complete metadata for all component types across Inner Sphere and Clan tech bases
 */

import { 
  ComponentDatabase, 
  ComponentSpec, 
  TechLevel, 
  TechBase,
  ComponentCategory
} from '../types/componentDatabase';

// ===== RICH COMPONENT DATABASE =====

export const COMPONENT_DATABASE: ComponentDatabase = {
  // ===== CHASSIS (INTERNAL STRUCTURE) =====
  chassis: {
    "Inner Sphere": [
      {
        name: "Standard",
        id: "standard",
        weightMultiplier: 0.1,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard internal structure provides baseline protection with 10% of unit tonnage"
      },
      {
        name: "Endo Steel",
        id: "endo_steel",
        weightMultiplier: 0.05,
        criticalSlots: 14,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3035,
        description: "Lightweight structure saves 50% weight but requires 14 critical slots",
        gameEffect: "Halves internal structure weight, requires critical slot allocation"
      },
      {
        name: "Composite",
        id: "composite",
        weightMultiplier: 0.05,
        criticalSlots: 0,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3080,
        description: "Advanced lightweight structure with no critical slot requirement",
        specialRules: ["Reduces armor efficiency by 50%"]
      },
      {
        name: "Reinforced",
        id: "reinforced",
        weightMultiplier: 0.2,
        criticalSlots: 0,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3057,
        description: "Heavy-duty structure doubles internal structure points",
        gameEffect: "Doubles internal structure hit points, doubles weight"
      },
      {
        name: "Industrial",
        id: "industrial",
        weightMultiplier: 0.15,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2350,
        description: "Industrial-grade structure for non-combat applications"
      }
    ],
    "Clan": [
      {
        name: "Standard",
        id: "standard",
        weightMultiplier: 0.1,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard internal structure provides baseline protection"
      },
      {
        name: "Endo Steel (Clan)",
        id: "endo_steel_clan",
        weightMultiplier: 0.05,
        criticalSlots: 7,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2945,
        description: "Clan Endo Steel uses advanced manufacturing for fewer critical slots",
        gameEffect: "Halves internal structure weight, requires only 7 critical slots"
      }
    ]
  },

  // ===== ENGINES =====
  engine: {
    "Inner Sphere": [
      {
        name: "Standard",
        id: "standard",
        weightMod: 1.0,
        criticalSlots: 6,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard fusion engine with 3 slots per side torso",
        gameEffect: "Baseline engine weight and critical slots"
      },
      {
        name: "XL",
        id: "xl",
        weightMod: 0.5,
        criticalSlots: 12,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3035,
        description: "Extra-Light engine halves weight but doubles critical slots",
        gameEffect: "50% weight reduction, 6 slots per side torso, engine destruction on side torso loss",
        specialRules: ["Engine destroyed if either side torso is destroyed"]
      },
      {
        name: "Light",
        id: "light",
        weightMod: 0.75,
        criticalSlots: 10,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3062,
        description: "Light engine provides weight savings with moderate critical slot increase",
        gameEffect: "25% weight reduction, 5 slots per side torso"
      },
      {
        name: "Compact",
        id: "compact",
        weightMod: 1.5,
        criticalSlots: 3,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3068,
        description: "Compact engine trades weight for reduced critical slots",
        gameEffect: "50% weight increase, only 3 total critical slots"
      },
      {
        name: "ICE",
        id: "ice",
        weightMod: 2.0,
        criticalSlots: 6,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 1950,
        description: "Internal Combustion Engine for primitive and industrial units",
        gameEffect: "No free heat sinks, requires fuel, produces no heat"
      },
      {
        name: "Fuel Cell",
        id: "fuel_cell",
        weightMod: 1.2,
        criticalSlots: 6,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3068,
        description: "Fuel cell engine provides clean power with no heat generation",
        gameEffect: "No free heat sinks, requires fuel, produces no heat"
      }
    ],
    "Clan": [
      {
        name: "Standard",
        id: "standard",
        weightMod: 1.0,
        criticalSlots: 6,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard fusion engine"
      },
      {
        name: "XL (Clan)",
        id: "xl_clan",
        weightMod: 0.5,
        criticalSlots: 10,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        description: "Clan Extra-Light engine with superior critical slot efficiency",
        gameEffect: "50% weight reduction, 5 slots per side torso, engine destruction on side torso loss",
        specialRules: ["Engine destroyed if either side torso is destroyed"]
      },
      {
        name: "Light (Clan)",
        id: "light_clan",
        weightMod: 0.75,
        criticalSlots: 8,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3100,
        description: "Clan Light engine with improved critical slot efficiency"
      }
    ]
  },

  // ===== GYROSCOPES =====
  gyro: {
    "Inner Sphere": [
      {
        name: "Standard",
        id: "standard",
        weightMod: 1.0,
        criticalSlots: 4,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard gyroscope provides baseline stability",
        gameEffect: "4 critical slots in center torso"
      },
      {
        name: "XL",
        id: "xl",
        weightMod: 0.5,
        criticalSlots: 6,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3067,
        description: "Extra-Light gyroscope halves weight but requires more critical slots",
        gameEffect: "50% weight reduction, 6 critical slots in center torso"
      },
      {
        name: "Compact",
        id: "compact",
        weightMod: 1.5,
        criticalSlots: 2,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3068,
        description: "Compact gyroscope trades weight for reduced critical slots",
        gameEffect: "50% weight increase, only 2 critical slots"
      },
      {
        name: "Heavy-Duty",
        id: "heavy_duty",
        weightMod: 2.0,
        criticalSlots: 4,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3067,
        description: "Heavy-duty gyroscope provides enhanced damage resistance",
        gameEffect: "Double weight, enhanced critical hit resistance"
      }
    ],
    "Clan": [
      {
        name: "Standard",
        id: "standard",
        weightMod: 1.0,
        criticalSlots: 4,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard gyroscope"
      },
      {
        name: "XL (Clan)",
        id: "xl_clan",
        weightMod: 0.5,
        criticalSlots: 4,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 2824,
        description: "Clan Extra-Light gyroscope with superior efficiency",
        gameEffect: "50% weight reduction, 4 critical slots in center torso"
      },
      {
        name: "Compact (Clan)",
        id: "compact_clan",
        weightMod: 1.5,
        criticalSlots: 1,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 2824,
        description: "Clan Compact gyroscope with improved efficiency",
        gameEffect: "50% weight increase, only 1 critical slot"
      }
    ]
  },

  // ===== HEAT SINKS =====
  heatsink: {
    "Inner Sphere": [
      {
        name: "Single",
        id: "single",
        weight: 1.0,
        criticalSlots: 1,
        dissipation: 1,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Basic heat sink dissipates 1 point of heat per turn",
        gameEffect: "1 heat dissipation, 1 critical slot, 1 ton"
      },
      {
        name: "Double",
        id: "double",
        weight: 1.0,
        criticalSlots: 3,
        dissipation: 2,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3035,
        description: "Double heat sink dissipates twice as much heat as single heat sinks",
        gameEffect: "2 heat dissipation, 3 critical slots, 1 ton"
      },
      {
        name: "Compact",
        id: "compact",
        weight: 0.5,
        criticalSlots: 1,
        dissipation: 1,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3068,
        description: "Compact heat sink saves weight but provides single heat sink performance",
        gameEffect: "1 heat dissipation, 1 critical slot, 0.5 tons"
      },
      {
        name: "Laser",
        id: "laser",
        weight: 1.5,
        criticalSlots: 1,
        dissipation: 1,
        techLevel: "Experimental",
        rulesLevel: "Experimental",
        introductionYear: 3059,
        description: "Laser heat sink immune to critical hits but heavier",
        gameEffect: "1 heat dissipation, immune to critical hits, 1.5 tons",
        specialRules: ["Immune to critical hits"]
      }
    ],
    "Clan": [
      {
        name: "Single (Clan)",
        id: "single_clan",
        weight: 1.0,
        criticalSlots: 1,
        dissipation: 1,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        description: "Clan single heat sink with improved efficiency",
        gameEffect: "1 heat dissipation, 1 critical slot, 1 ton"
      },
      {
        name: "Double (Clan)",
        id: "double_clan",
        weight: 1.0,
        criticalSlots: 2,
        dissipation: 2,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        isDefault: true,
        description: "Clan double heat sink with superior critical slot efficiency",
        gameEffect: "2 heat dissipation, 2 critical slots, 1 ton"
      },
      {
        name: "Compact (Clan)",
        id: "compact_clan",
        weight: 0.5,
        criticalSlots: 1,
        dissipation: 1,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 2824,
        description: "Clan compact heat sink with improved efficiency",
        gameEffect: "1 heat dissipation, 1 critical slot, 0.5 tons"
      }
    ]
  },

  // ===== ARMOR =====
  armor: {
    "Inner Sphere": [
      {
        name: "Standard",
        id: "standard",
        weight: 16, // points per ton
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard armor provides 16 points per ton with no critical slots",
        gameEffect: "16 armor points per ton, no critical slots required"
      },
      {
        name: "Ferro-Fibrous",
        id: "ferro_fibrous",
        weight: 17.6, // 10% more armor points
        criticalSlots: 14,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3040,
        description: "Advanced armor provides 10% more protection but requires critical slots",
        gameEffect: "17.6 armor points per ton, 14 critical slots required"
      },
      {
        name: "Light Ferro-Fibrous",
        id: "light_ferro_fibrous",
        weight: 16.8, // 5% more armor points
        criticalSlots: 7,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3067,
        description: "Lightweight ferro-fibrous armor with reduced critical slot requirement",
        gameEffect: "16.8 armor points per ton, 7 critical slots required"
      },
      {
        name: "Heavy Ferro-Fibrous",
        id: "heavy_ferro_fibrous",
        weight: 19.2, // 20% more armor points
        criticalSlots: 21,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3069,
        description: "Heavy ferro-fibrous armor provides maximum protection",
        gameEffect: "19.2 armor points per ton, 21 critical slots required"
      },
      {
        name: "Stealth",
        id: "stealth",
        weight: 16,
        criticalSlots: 12,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3063,
        heatGeneration: 10,
        description: "Stealth armor provides ECM protection but generates heat",
        gameEffect: "16 armor points per ton, ECM protection, 10 heat per turn",
        specialRules: ["Provides ECM protection", "Generates 10 heat per turn when active"]
      },
      {
        name: "Reactive",
        id: "reactive",
        weight: 16,
        criticalSlots: 14,
        techLevel: "Experimental",
        rulesLevel: "Experimental",
        introductionYear: 3065,
        description: "Reactive armor provides enhanced protection against certain weapons",
        specialRules: ["Enhanced protection against missile and ballistic weapons"]
      },
      {
        name: "Reflective",
        id: "reflective",
        weight: 16,
        criticalSlots: 10,
        techLevel: "Experimental",
        rulesLevel: "Experimental",
        introductionYear: 3067,
        description: "Reflective armor provides enhanced protection against energy weapons",
        specialRules: ["Enhanced protection against energy weapons"]
      },
      {
        name: "Hardened",
        id: "hardened",
        weight: 8, // Half the armor points per ton
        criticalSlots: 0,
        techLevel: "Experimental",
        rulesLevel: "Experimental",
        introductionYear: 3047,
        description: "Hardened armor provides superior protection but at much higher weight",
        gameEffect: "8 armor points per ton, enhanced damage resistance",
        specialRules: ["Halves damage from all weapons", "Double weight per armor point"]
      }
    ],
    "Clan": [
      {
        name: "Standard",
        id: "standard",
        weight: 16,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "Standard armor"
      },
      {
        name: "Ferro-Fibrous (Clan)",
        id: "ferro_fibrous_clan",
        weight: 17.6,
        criticalSlots: 7,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        description: "Clan ferro-fibrous armor with superior critical slot efficiency",
        gameEffect: "17.6 armor points per ton, 7 critical slots required"
      },
      {
        name: "Stealth (Clan)",
        id: "stealth_clan",
        weight: 16,
        criticalSlots: 6,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3100,
        heatGeneration: 10,
        description: "Clan stealth armor with improved critical slot efficiency",
        specialRules: ["Provides ECM protection", "Generates 10 heat per turn when active"]
      }
    ]
  },

  // ===== MYOMER (ENHANCEMENT SYSTEMS) =====
  myomer: {
    "Inner Sphere": [
      {
        name: "None",
        id: "none",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "No enhancement systems installed"
      },
      {
        name: "Triple Strength Myomer",
        id: "tsm",
        weight: 0, // Uses existing myomer weight
        criticalSlots: 0,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3050,
        description: "TSM increases speed and melee damage when heat builds up",
        gameEffect: "Enhanced speed and melee damage at high heat levels",
        specialRules: ["Activates at 9+ heat", "Increases walk/run MP by 1", "Doubles melee damage"]
      },
      {
        name: "MASC",
        id: "masc",
        weightMod: 0.05, // 5% of engine weight
        criticalSlots: 0, // Variable based on tonnage
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3035,
        heatGeneration: 1,
        description: "Myomer Accelerator Signal Circuitry provides temporary speed boost",
        gameEffect: "Temporary speed increase, risk of system failure",
        specialRules: ["Doubles run MP", "Risk of leg actuator damage", "Limited uses per scenario"]
      },
      {
        name: "Industrial TSM",
        id: "industrial_tsm",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3055,
        description: "Industrial-grade TSM for non-combat applications",
        gameEffect: "Reduced effectiveness compared to military TSM"
      }
    ],
    "Clan": [
      {
        name: "None",
        id: "none",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "No enhancement systems installed"
      },
      {
        name: "MASC",
        id: "masc",
        weightMod: 0.05,
        criticalSlots: 0,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        heatGeneration: 1,
        description: "Clan MASC with improved reliability",
        gameEffect: "Temporary speed increase with enhanced reliability",
        specialRules: ["Doubles run MP", "Reduced failure rate", "Limited uses per scenario"]
      }
    ]
  },

  // ===== TARGETING SYSTEMS =====
  targeting: {
    "Inner Sphere": [
      {
        name: "None",
        id: "none",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "No advanced targeting systems"
      },
      {
        name: "Artemis IV",
        id: "artemis_iv",
        weight: 1, // Per launcher
        criticalSlots: 1, // Per launcher
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3049,
        description: "Fire control system for missile weapons",
        gameEffect: "Improves missile weapon accuracy and reduces spread",
        specialRules: ["Only works with compatible missile weapons", "Requires line of sight"]
      },
      {
        name: "Targeting Computer",
        id: "targeting_computer",
        weight: 0, // Variable based on weapons
        criticalSlots: 0, // Variable based on weapons
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 3062,
        description: "Advanced computer system for direct-fire weapons",
        gameEffect: "Improves accuracy of direct-fire weapons",
        specialRules: ["Only affects direct-fire weapons", "Weight based on total weapon tonnage"]
      }
    ],
    "Clan": [
      {
        name: "None",
        id: "none",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        description: "No advanced targeting systems"
      },
      {
        name: "Artemis IV (Clan)",
        id: "artemis_iv_clan",
        weight: 1,
        criticalSlots: 1,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        description: "Clan fire control system with enhanced performance",
        gameEffect: "Superior missile accuracy and tighter groupings"
      },
      {
        name: "Targeting Computer (Clan)",
        id: "targeting_computer_clan",
        weight: 0,
        criticalSlots: 0,
        techLevel: "Standard",
        rulesLevel: "Standard",
        introductionYear: 2824,
        description: "Clan targeting computer with superior performance",
        gameEffect: "Enhanced accuracy bonus for direct-fire weapons"
      }
    ]
  },

  // ===== MOVEMENT SYSTEMS =====
  movement: {
    "Inner Sphere": [
      {
        name: "Standard Jump Jets",
        id: "standard_jump_jets",
        weight: 0, // Variable by tonnage class
        criticalSlots: 1, // Per jump jet
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        heatGeneration: 1, // Per jump jet when jumping
        description: "Standard jump jets provide battlefield mobility",
        gameEffect: "Allows jumping over obstacles, generates heat when used"
      },
      {
        name: "Improved Jump Jets",
        id: "improved_jump_jets",
        weight: 0, // Variable by tonnage class
        criticalSlots: 2, // Per jump jet
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3064,
        heatGeneration: 0, // No heat generation
        description: "Advanced jump jets with no heat generation",
        gameEffect: "Jumping movement with no heat penalty",
        specialRules: ["No heat generation when jumping"]
      }
    ],
    "Clan": [
      {
        name: "Jump Jets (Clan)",
        id: "jump_jets_clan",
        weight: 0, // Variable by tonnage class
        criticalSlots: 1,
        techLevel: "Introductory",
        rulesLevel: "Introductory",
        introductionYear: 2439,
        isDefault: true,
        heatGeneration: 1,
        description: "Clan jump jets with standard performance"
      },
      {
        name: "Improved Jump Jets (Clan)",
        id: "improved_jump_jets_clan",
        weight: 0,
        criticalSlots: 2,
        techLevel: "Advanced",
        rulesLevel: "Advanced",
        introductionYear: 3100,
        heatGeneration: 0,
        description: "Clan improved jump jets with enhanced efficiency",
        specialRules: ["No heat generation when jumping"]
      }
    ]
  }
};

// ===== DATABASE VALIDATION =====

/**
 * Validate the database structure for completeness and consistency
 */
export function validateComponentDatabase(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: any;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalComponents = 0;
  
  // Required categories
  const requiredCategories: ComponentCategory[] = [
    'chassis', 'engine', 'gyro', 'heatsink', 
    'armor', 'myomer', 'targeting', 'movement'
  ];
  
  // Required tech bases
  const requiredTechBases: TechBase[] = ['Inner Sphere', 'Clan'];
  
  // Validate structure
  for (const category of requiredCategories) {
    if (!COMPONENT_DATABASE[category]) {
      errors.push(`Missing category: ${category}`);
      continue;
    }
    
    for (const techBase of requiredTechBases) {
      if (!COMPONENT_DATABASE[category][techBase]) {
        errors.push(`Missing tech base ${techBase} in category ${category}`);
        continue;
      }
      
      const components = COMPONENT_DATABASE[category][techBase];
      if (!Array.isArray(components) || components.length === 0) {
        errors.push(`No components found for ${techBase} ${category}`);
        continue;
      }
      
      // Check for default component
      const hasDefault = components.some(comp => comp.isDefault);
      if (!hasDefault) {
        warnings.push(`No default component specified for ${techBase} ${category}`);
      }
      
      // Validate each component
      components.forEach((component, index) => {
        if (!component.name || !component.id) {
          errors.push(`Component ${index} in ${techBase} ${category} missing name or id`);
        }
        
        if (typeof component.criticalSlots !== 'number') {
          errors.push(`Component ${component.name} missing criticalSlots`);
        }
        
        if (!component.techLevel || !component.rulesLevel) {
          errors.push(`Component ${component.name} missing tech/rules level`);
        }
        
        if (!component.introductionYear) {
          errors.push(`Component ${component.name} missing introduction year`);
        }
      });
      
      totalComponents += components.length;
    }
  }
  
  const stats = {
    totalComponents,
    categoriesCount: requiredCategories.length,
    techBasesCount: requiredTechBases.length,
    averageComponentsPerCategory: Math.round(totalComponents / requiredCategories.length)
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

// ===== EXPORT DATABASE STATS =====

export const DATABASE_INFO = {
  version: '1.0.0',
  lastUpdated: '2025-06-30',
  totalCategories: Object.keys(COMPONENT_DATABASE).length,
  techBases: ['Inner Sphere', 'Clan'],
  description: 'Complete BattleTech component database with rich metadata'
};

// Run validation on module load (development mode)
if (process.env.NODE_ENV === 'development') {
  const validation = validateComponentDatabase();
  if (!validation.isValid) {
    console.error('Component Database Validation Failed:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('Component Database Warnings:', validation.warnings);
  }
  console.log('Component Database Stats:', validation.stats);
}
