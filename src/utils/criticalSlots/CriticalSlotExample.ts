/**
 * Critical Slot Example - Demonstrates Concrete Type System
 * 
 * Shows how the new comprehensive type system works with real data
 * and proper BattleTech rules implementation.
 */

import { CompleteCriticalSlotBreakdown, SimplifiedCriticalSlotBreakdown } from './CriticalSlotTypes';
import { UnitConfiguration } from './UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

/**
 * Example: 75-ton BattleMech with XL Engine, Standard Gyro, AC/10, and Heat Sinks
 */
export function createExampleCriticalSlotBreakdown(): CompleteCriticalSlotBreakdown {
  // Example unit configuration
  const exampleConfig: UnitConfiguration = {
    engineType: 'XL',
    gyroType: 'Standard',
    structureType: { type: 'Standard', techBase: 'Inner Sphere' },
    armorType: { type: 'Standard', techBase: 'Inner Sphere' },
    tonnage: 75,
    jumpMP: 0,
    // ... other required properties would be filled in
  } as UnitConfiguration;

  // Example equipment
  const exampleEquipment = [
    {
      equipmentData: {
        name: 'AC/10',
        criticals: 7,
        type: 'weapon',
        weight: 12,
        techBase: 'Inner Sphere'
      },
      quantity: 1,
      location: 'rightTorso'
    },
    {
      equipmentData: {
        name: 'AC/10 Ammo',
        criticals: 1,
        type: 'ammunition',
        weight: 1,
        explosive: true,
        techBase: 'Inner Sphere'
      },
      quantity: 1,
      location: 'rightTorso'
    },
    {
      equipmentData: {
        name: 'Single Heat Sink',
        criticals: 1,
        type: 'heat_sink',
        weight: 1,
        techBase: 'Inner Sphere'
      },
      quantity: 2,
      location: 'leftLeg'
    }
  ];

  return {
    locations: {
      head: {
        location: 'head',
        totalSlots: 6,
        fixedComponents: {
          lifeSupport: [
            {
              type: 'life_support',
              slots: 2,
              location: 'head',
              weight: 0.5
            }
          ],
          sensors: [
            {
              type: 'sensors',
              slots: 2,
              location: 'head',
              weight: 0.5
            }
          ],
          cockpit: {
            type: 'cockpit',
            cockpitType: 'Standard',
            slots: 1,
            location: 'head',
            weight: 3,
            techBase: 'Inner Sphere'
          }
        },
        equipment: [],
        availableSlots: 1,
        utilization: {
          used: 5,
          percentage: 83.3,
          efficiency: 'good'
        }
      },
      centerTorso: {
        location: 'centerTorso',
        totalSlots: 12,
        systemComponents: {
          engine: {
            type: 'engine',
            engineType: 'XL',
            totalSlots: 12,
            locationAllocation: {
              centerTorso: 6,
              leftTorso: 3,
              rightTorso: 3
            },
            weight: 2.5,
            rating: 300,
            techBase: 'Inner Sphere'
          },
          gyro: {
            type: 'gyro',
            gyroType: 'Standard',
            slots: 4,
            location: 'centerTorso',
            weight: 4,
            techBase: 'Inner Sphere'
          }
        },
        equipment: [],
        availableSlots: 2, // 12 - 6 (engine) - 4 (gyro) = 2
        utilization: {
          used: 10,
          percentage: 83.3,
          efficiency: 'good'
        }
      },
      leftTorso: {
        location: 'leftTorso',
        totalSlots: 12,
        systemComponents: {
          engine: {
            type: 'engine',
            engineType: 'XL',
            totalSlots: 12,
            locationAllocation: {
              centerTorso: 6,
              leftTorso: 3,
              rightTorso: 3
            },
            weight: 2.5,
            rating: 300,
            techBase: 'Inner Sphere'
          }
        },
        equipment: [],
        availableSlots: 9, // 12 - 3 (engine) = 9
        utilization: {
          used: 3,
          percentage: 25.0,
          efficiency: 'excellent'
        }
      },
      rightTorso: {
        location: 'rightTorso',
        totalSlots: 12,
        systemComponents: {
          engine: {
            type: 'engine',
            engineType: 'XL',
            totalSlots: 12,
            locationAllocation: {
              centerTorso: 6,
              leftTorso: 3,
              rightTorso: 3
            },
            weight: 2.5,
            rating: 300,
            techBase: 'Inner Sphere'
          }
        },
        equipment: [
          {
            type: 'equipment',
            equipmentType: 'weapon',
            name: 'AC/10',
            slots: 7,
            location: 'rightTorso',
            weight: 12,
            quantity: 1,
            techBase: 'Inner Sphere'
          },
          {
            type: 'equipment',
            equipmentType: 'ammunition',
            name: 'AC/10 Ammo',
            slots: 1,
            location: 'rightTorso',
            weight: 1,
            quantity: 1,
            explosive: true,
            techBase: 'Inner Sphere'
          }
        ],
        availableSlots: 1, // 12 - 3 (engine) - 7 (AC/10) - 1 (ammo) = 1
        utilization: {
          used: 11,
          percentage: 91.7,
          efficiency: 'fair'
        }
      },
      leftArm: {
        location: 'leftArm',
        totalSlots: 12,
        systemComponents: {
          actuators: [
            {
              type: 'actuator',
              actuatorType: 'shoulder',
              slots: 1,
              location: 'leftArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'upperArm',
              slots: 1,
              location: 'leftArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'lowerArm',
              slots: 1,
              location: 'leftArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'hand',
              slots: 1,
              location: 'leftArm',
              weight: 0,
              removable: true
            }
          ]
        },
        equipment: [],
        availableSlots: 8, // 12 - 4 (actuators) = 8
        utilization: {
          used: 4,
          percentage: 33.3,
          efficiency: 'excellent'
        }
      },
      rightArm: {
        location: 'rightArm',
        totalSlots: 12,
        systemComponents: {
          actuators: [
            {
              type: 'actuator',
              actuatorType: 'shoulder',
              slots: 1,
              location: 'rightArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'upperArm',
              slots: 1,
              location: 'rightArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'lowerArm',
              slots: 1,
              location: 'rightArm',
              weight: 0,
              removable: true
            },
            {
              type: 'actuator',
              actuatorType: 'hand',
              slots: 1,
              location: 'rightArm',
              weight: 0,
              removable: true
            }
          ]
        },
        equipment: [],
        availableSlots: 8, // 12 - 4 (actuators) = 8
        utilization: {
          used: 4,
          percentage: 33.3,
          efficiency: 'excellent'
        }
      },
      leftLeg: {
        location: 'leftLeg',
        totalSlots: 6,
        systemComponents: {
          actuators: [
            {
              type: 'actuator',
              actuatorType: 'hip',
              slots: 1,
              location: 'leftLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'upperLeg',
              slots: 1,
              location: 'leftLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'lowerLeg',
              slots: 1,
              location: 'leftLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'foot',
              slots: 1,
              location: 'leftLeg',
              weight: 0,
              removable: false
            }
          ]
        },
        equipment: [
          {
            type: 'equipment',
            equipmentType: 'heat_sink',
            name: 'Single Heat Sink',
            slots: 2,
            location: 'leftLeg',
            weight: 2,
            quantity: 2,
            techBase: 'Inner Sphere'
          }
        ],
        availableSlots: 0, // 6 - 4 (actuators) - 2 (heat sinks) = 0
        utilization: {
          used: 6,
          percentage: 100.0,
          efficiency: 'critical'
        }
      },
      rightLeg: {
        location: 'rightLeg',
        totalSlots: 6,
        systemComponents: {
          actuators: [
            {
              type: 'actuator',
              actuatorType: 'hip',
              slots: 1,
              location: 'rightLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'upperLeg',
              slots: 1,
              location: 'rightLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'lowerLeg',
              slots: 1,
              location: 'rightLeg',
              weight: 0,
              removable: false
            },
            {
              type: 'actuator',
              actuatorType: 'foot',
              slots: 1,
              location: 'rightLeg',
              weight: 0,
              removable: false
            }
          ]
        },
        equipment: [],
        availableSlots: 2, // 6 - 4 (actuators) = 2
        utilization: {
          used: 4,
          percentage: 66.7,
          efficiency: 'good'
        }
      }
    },
    components: {
      system: {
        engine: {
          type: 'engine',
          engineType: 'XL',
          totalSlots: 12,
          locationAllocation: {
            centerTorso: 6,
            leftTorso: 3,
            rightTorso: 3
          },
          weight: 2.5,
          rating: 300,
          techBase: 'Inner Sphere'
        },
        gyro: {
          type: 'gyro',
          gyroType: 'Standard',
          slots: 4,
          location: 'centerTorso',
          weight: 4,
          techBase: 'Inner Sphere'
        },
        cockpit: {
          type: 'cockpit',
          cockpitType: 'Standard',
          slots: 1,
          location: 'head',
          weight: 3,
          techBase: 'Inner Sphere'
        },
        lifeSupport: [
          {
            type: 'life_support',
            slots: 2,
            location: 'head',
            weight: 0.5
          }
        ],
        sensors: [
          {
            type: 'sensors',
            slots: 2,
            location: 'head',
            weight: 0.5
          }
        ],
        actuators: [
          // All 16 actuators (4 per limb)
          ...Array.from({ length: 16 }, (_, i) => ({
            type: 'actuator' as const,
            actuatorType: ['shoulder', 'upperArm', 'lowerArm', 'hand', 'hip', 'upperLeg', 'lowerLeg', 'foot'][i % 8] as any,
            slots: 1,
            location: ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'][Math.floor(i / 4)] as any,
            weight: 0,
            removable: i < 8 // Arms are removable, legs are not
          }))
        ]
      },
      equipment: [
        {
          type: 'equipment',
          equipmentType: 'weapon',
          name: 'AC/10',
          slots: 7,
          location: 'rightTorso',
          weight: 12,
          quantity: 1,
          techBase: 'Inner Sphere'
        },
        {
          type: 'equipment',
          equipmentType: 'ammunition',
          name: 'AC/10 Ammo',
          slots: 1,
          location: 'rightTorso',
          weight: 1,
          quantity: 1,
          explosive: true,
          techBase: 'Inner Sphere'
        },
        {
          type: 'equipment',
          equipmentType: 'heat_sink',
          name: 'Single Heat Sink',
          slots: 2,
          location: 'leftLeg',
          weight: 2,
          quantity: 2,
          techBase: 'Inner Sphere'
        }
      ]
    },
    summary: {
      totalSlots: 78,
      usedSlots: 58, // Calculated from all components
      availableSlots: 20,
      utilizationPercentage: 74.4,
      efficiency: 'good'
    },
    analysis: {
      bottlenecks: ['leftLeg'], // 100% utilization
      optimizationPotential: 15.6, // 100 - 74.4
      recommendations: [
        'Left leg is at 100% capacity - consider moving heat sinks to other locations',
        'Right torso is at 91.7% capacity - monitor for potential overflow',
        'Consider Endo Steel structure to free up 14 critical slots'
      ],
      violations: [] // No rule violations in this example
    }
  };
}

/**
 * Convert complete breakdown to simplified version for UI display
 */
export function createSimplifiedBreakdown(complete: CompleteCriticalSlotBreakdown): SimplifiedCriticalSlotBreakdown {
  const locations: { [location: string]: any } = {};
  
  Object.entries(complete.locations).forEach(([locationKey, location]) => {
    const systemSlots = location.systemComponents ? 
      Object.values(location.systemComponents).reduce((total: number, component: any) => {
        if (Array.isArray(component)) {
          return total + component.reduce((sum: number, item: any) => sum + item.slots, 0);
        } else if (component && typeof component.slots === 'number') {
          return total + component.slots;
        } else if (component && typeof component.totalSlots === 'number') {
          return total + component.totalSlots;
        }
        return total;
      }, 0) : 0;
    
    const equipmentSlots = location.equipment.reduce((total: number, item: any) => total + item.slots, 0);
    
    locations[locationKey] = {
      total: location.totalSlots,
      used: location.totalSlots - location.availableSlots,
      available: location.availableSlots,
      percentage: location.utilization.percentage,
      components: {
        system: systemSlots,
        equipment: equipmentSlots
      }
    };
  });
  
  return {
    summary: {
      totalSlots: complete.summary.totalSlots,
      usedSlots: complete.summary.usedSlots,
      availableSlots: complete.summary.availableSlots,
      utilizationPercentage: complete.summary.utilizationPercentage
    },
    locations
  };
}

/**
 * Example usage and demonstration
 */
export function demonstrateCriticalSlotTypes() {
  console.log('=== Critical Slot Type System Demonstration ===');
  
  // Create complete breakdown
  const completeBreakdown = createExampleCriticalSlotBreakdown();
  
  console.log('Complete Breakdown Summary:');
  console.log(`Total Slots: ${completeBreakdown.summary.totalSlots}`);
  console.log(`Used Slots: ${completeBreakdown.summary.usedSlots}`);
  console.log(`Available Slots: ${completeBreakdown.summary.availableSlots}`);
  console.log(`Utilization: ${completeBreakdown.summary.utilizationPercentage.toFixed(1)}%`);
  console.log(`Efficiency: ${completeBreakdown.summary.efficiency}`);
  
  console.log('\nLocation Breakdown:');
  Object.entries(completeBreakdown.locations).forEach(([location, data]) => {
    console.log(`${location}: ${data.utilization.used}/${data.totalSlots} slots (${data.utilization.percentage.toFixed(1)}%) - ${data.utilization.efficiency}`);
  });
  
  console.log('\nAnalysis:');
  console.log(`Bottlenecks: ${completeBreakdown.analysis.bottlenecks.join(', ')}`);
  console.log(`Optimization Potential: ${completeBreakdown.analysis.optimizationPotential.toFixed(1)}%`);
  console.log('Recommendations:');
  completeBreakdown.analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
  
  // Convert to simplified version
  const simplified = createSimplifiedBreakdown(completeBreakdown);
  
  console.log('\nSimplified Breakdown:');
  console.log(`Total: ${simplified.summary.totalSlots}, Used: ${simplified.summary.usedSlots}, Available: ${simplified.summary.availableSlots}`);
  
  return {
    complete: completeBreakdown,
    simplified
  };
} 