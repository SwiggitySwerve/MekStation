/**
 * Armor Management Manager
 * Handles armor-related calculations, validations, and management
 */

import { UnitConfiguration, ArmorAllocation } from './UnitCriticalManagerTypes'
import { ArmorType } from '../../types/systemComponents'
// Import armor calculations
const armorCalculations = require('../armorCalculations');
const { getArmorSpecification } = armorCalculations;
import { getInternalStructurePoints } from '../internalStructureTable';

export class ArmorManagementManager {
  private configuration: UnitConfiguration

  constructor(configuration: UnitConfiguration) {
    this.configuration = configuration
  }

  /**
   * Update the configuration
   */
  updateConfiguration(configuration: UnitConfiguration): void {
    this.configuration = configuration
  }

  /**
   * Get armor type as string
   */
  getArmorTypeString(): ArmorType {
    if (typeof this.configuration.armorType === 'string') {
      return this.configuration.armorType as ArmorType
    }
    return this.configuration.armorType.type as ArmorType
  }

  /**
   * Get critical slot requirements for armor type
   */
  getArmorCriticalSlots(armorType: ArmorType): number {
    const spec = getArmorSpecification(armorType)
    return spec.criticalSlots
  }

  /**
   * Get armor efficiency for current armor type
   */
  getArmorEfficiency(): number {
    // Fallback implementation if import fails
    if (typeof getArmorSpecification === 'function') {
      const spec = getArmorSpecification(this.getArmorTypeString())
      return spec.pointsPerTon
    }
    
    // Direct implementation using official BattleTech TechManual values
    const armorType = this.getArmorTypeString();
    switch (armorType) {
      case 'Standard':
        return 16;
      case 'Ferro-Fibrous':
        return 17.92; // Official TechManual value
      case 'Ferro-Fibrous (Clan)':
        return 17.92; // Official TechManual value (same as IS)
      case 'Light Ferro-Fibrous':
        return 16.8; // Official TechManual value
      case 'Heavy Ferro-Fibrous':
        return 19.2;
      case 'Stealth':
        return 16;
      case 'Reactive':
        return 14; // Official TechManual value
      case 'Reflective':
        return 16; // Official TechManual value (same as standard)
      case 'Hardened':
        return 8;
      default:
        return 16; // Default to standard
    }
  }

  /**
   * Get maximum armor points for a specific location
   */
  getMaxArmorPointsForLocation(location: string): number {
    const internalStructurePoints = this.getInternalStructurePointsForLocation(location)
    const loc = location.toUpperCase();
    if (loc === 'HD' || loc === 'HEAD') {
      return 9;
    }
    // For torso and limbs, return internal structure × 2 (sum cap)
    return internalStructurePoints * 2;
  }

  /**
   * Get internal structure points for a specific location
   */
  private getInternalStructurePointsForLocation(location: string): number {
    const allPoints = getInternalStructurePoints(this.configuration.tonnage)
    return allPoints[location as keyof typeof allPoints] || 0;
  }

  /**
   * Enforce armor allocation rules
   */
  enforceArmorRules(armorAllocation: ArmorAllocation): ArmorAllocation {
    const enforced = { ...armorAllocation }

    // Head: max 9 front, 0 rear
    enforced.HD = { front: Math.min(enforced.HD.front, 9), rear: 0 }

    // Torso locations: enforce sum cap only (front + rear ≤ max)
    const torsoLocations = ['CT', 'LT', 'RT']
    torsoLocations.forEach(location => {
      const maxArmor = this.getMaxArmorPointsForLocation(location)
      let { front, rear } = enforced[location as keyof ArmorAllocation]
      // If sum exceeds max, reduce rear first, then front
      if (front + rear > maxArmor) {
        const overflow = front + rear - maxArmor
        if (rear >= overflow) {
          rear -= overflow
        } else {
          front -= (overflow - rear)
          rear = 0
        }
      }
      // Do NOT cap front at max for torso locations; only the sum matters
      enforced[location as keyof ArmorAllocation] = { front, rear }
    })

    // Arms/Legs: front ≤ max, rear = 0
    const limbLocations = ['LA', 'RA', 'LL', 'RL']
    limbLocations.forEach(location => {
      const maxArmor = this.getMaxArmorPointsForLocation(location)
      let { front } = enforced[location as keyof ArmorAllocation]
      if (front > maxArmor) front = maxArmor
      enforced[location as keyof ArmorAllocation] = { front, rear: 0 }
    })

    return enforced
  }

  /**
   * Auto-allocate armor points based on available tonnage and standard distribution
   */
  autoAllocateArmor(): ArmorAllocation {
    // Use data model methods for all calculations
    const locations = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
    const newAllocation = { ...this.configuration.armorAllocation };
    const availablePoints = this.getAvailableArmorPoints();
    let remainingPoints = availablePoints;

    // Clear current allocation
    locations.forEach(loc => {
      (newAllocation as any)[loc] = { front: 0, rear: 0 };
    });

    // Step 1: Maximize head armor first using data model
    const headMaxArmor = this.getMaxArmorPointsForLocation('HD');
    const headArmor = Math.min(headMaxArmor, remainingPoints);
    (newAllocation as any)['HD'] = { front: headArmor, rear: 0 };
    remainingPoints -= headArmor;

    // Step 2: Get internal structure using data model
    const internalStructure = getInternalStructurePoints(this.configuration.tonnage);
    const remainingLocations = ['CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
    let totalRemainingIS = 0;

    remainingLocations.forEach(location => {
      totalRemainingIS += (internalStructure as any)[location] || 0;
    });

    // Step 3: Distribute remaining points by internal structure ratios
    let usedPoints = 0;

    remainingLocations.forEach(location => {
      if (totalRemainingIS === 0) return;

      const isRatio = ((internalStructure as any)[location] || 0) / totalRemainingIS;
      const targetArmor = Math.floor(remainingPoints * isRatio);
      const maxLocationArmor = this.getMaxArmorPointsForLocation(location);
      const actualArmor = Math.min(targetArmor, maxLocationArmor);

      usedPoints += actualArmor;

      // Apply 75% front / 25% rear split for torso locations
      if (['CT', 'LT', 'RT'].includes(location)) {
        const frontArmor = Math.ceil(actualArmor * 0.75);
        const rearArmor = actualArmor - frontArmor;

        // Ensure rear armor doesn't exceed location limits
        const maxRearArmor = Math.floor(maxLocationArmor * 0.5);
        const finalRearArmor = Math.min(rearArmor, maxRearArmor);
        const finalFrontArmor = actualArmor - finalRearArmor;

        (newAllocation as any)[location] = {
          front: finalFrontArmor,
          rear: finalRearArmor
        };
      } else {
        // Arms and legs get no rear armor
        (newAllocation as any)[location] = {
          front: actualArmor,
          rear: 0
        };
      }
    });

    // Step 4: Distribute remainder points using data model location caps
    const remainder = remainingPoints - usedPoints;

    if (remainder > 0) {
      // Get current armor for each location after ratio distribution
      const getCurrentArmor = (location: string) => {
        return (newAllocation as any)[location].front + (newAllocation as any)[location].rear;
      };

      // Check capacity using data model
      const getAvailableCapacity = (location: string) => {
        const maxArmor = this.getMaxArmorPointsForLocation(location);
        const currentArmor = getCurrentArmor(location);
        return maxArmor - currentArmor;
      };

      let remainderToDistribute = remainder;

      // Handle odd remainder: give 1 point to Center Torso first
      if (remainderToDistribute % 2 === 1) {
        const ctCapacity = getAvailableCapacity('CT');
        if (ctCapacity > 0) {
          (newAllocation as any)['CT'].front += 1;
          remainderToDistribute -= 1;
        }
      }

      // Define symmetric pairs in priority order
      const symmetricPairs = [
        ['LT', 'RT'], // Left/Right Torso (highest priority)
        ['LL', 'RL'], // Left/Right Leg (medium priority)  
        ['LA', 'RA']  // Left/Right Arm (lowest priority)
      ];

      // Distribute remaining even points to symmetric pairs
      for (const [leftLoc, rightLoc] of symmetricPairs) {
        if (remainderToDistribute <= 0) break;

        const leftCapacity = getAvailableCapacity(leftLoc);
        const rightCapacity = getAvailableCapacity(rightLoc);

        if (leftCapacity > 0 && rightCapacity > 0 && remainderToDistribute >= 2) {
          (newAllocation as any)[leftLoc].front += 1;
          (newAllocation as any)[rightLoc].front += 1;
          remainderToDistribute -= 2;
        }
      }

      // Distribute any final points individually by priority
      if (remainderToDistribute > 0) {
        const allLocations = ['CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
        const locationsByPriority = allLocations
          .map(location => ({
            location,
            capacity: getAvailableCapacity(location),
            priority: location === 'CT' ? 4 :
              ['LT', 'RT'].includes(location) ? 3 :
                ['LL', 'RL'].includes(location) ? 2 : 1
          }))
          .filter(item => item.capacity > 0)
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return b.capacity - a.capacity;
          });

        let priorityIndex = 0;
        while (remainderToDistribute > 0 && locationsByPriority.length > 0) {
          const target = locationsByPriority[priorityIndex];

          if (target.capacity > 0) {
            (newAllocation as any)[target.location].front += 1;
            target.capacity -= 1;
            remainderToDistribute -= 1;
          }

          if (target.capacity <= 0) {
            locationsByPriority.splice(priorityIndex, 1);
            if (priorityIndex >= locationsByPriority.length) {
              priorityIndex = 0;
            }
          } else {
            priorityIndex = (priorityIndex + 1) % locationsByPriority.length;
          }
        }
      }
    }

    return newAllocation;
  }

  /**
   * Get available armor points
   */
  getAvailableArmorPoints(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const allocatedPoints = this.getAllocatedArmorPoints()
    return maxArmorPoints - allocatedPoints
  }

  /**
   * Get allocated armor points
   */
  getAllocatedArmorPoints(): number {
    let total = 0
    Object.values(this.configuration.armorAllocation).forEach(allocation => {
      total += allocation.front + allocation.rear
    })
    return total
  }

  /**
   * Get unallocated armor points
   */
  getUnallocatedArmorPoints(): number {
    return this.getAvailableArmorPoints()
  }

  /**
   * Get remaining armor points
   */
  getRemainingArmorPoints(): number {
    return this.getAvailableArmorPoints()
  }

  /**
   * Get maximum armor points allowed for this unit
   */
  getMaxArmorPoints(): number {
    const allPoints = getInternalStructurePoints(this.configuration.tonnage)
    const totalInternalStructure = Object.values(allPoints).reduce((sum: number, points: unknown) => sum + (points as number), 0)
    const multiplier = this.getArmorEfficiency() / 16
    return Math.floor(totalInternalStructure * multiplier)
  }

  /**
   * Get armor waste analysis
   */
  getArmorWasteAnalysis(): any {
    const maxArmorPoints = this.getMaxArmorPoints()
    const allocatedPoints = this.getAllocatedArmorPoints()
    const wastedPoints = maxArmorPoints - allocatedPoints
    const wastedTonnage = wastedPoints / this.getArmorEfficiency()

    return {
      maxArmorPoints,
      allocatedPoints,
      wastedPoints,
      wastedTonnage,
      hasWaste: wastedPoints > 0,
      efficiency: allocatedPoints / maxArmorPoints
    }
  }

  /**
   * Check if there is armor waste
   */
  hasArmorWaste(): boolean {
    return this.getArmorWasteAnalysis().hasWaste
  }

  /**
   * Get wasted armor points
   */
  getWastedArmorPoints(): number {
    return this.getArmorWasteAnalysis().wastedPoints
  }

  /**
   * Get remaining tonnage for armor
   */
  getRemainingTonnageForArmor(): number {
    const usedWithoutArmor = this.getUsedTonnageWithoutArmor()
    return this.configuration.tonnage - usedWithoutArmor
  }

  /**
   * Get used tonnage without armor
   */
  private getUsedTonnageWithoutArmor(): number {
    const config = this.configuration
    
    // Engine weight
    const engineWeight = this.getEngineWeight()
    
    // Gyro weight
    const gyroWeight = this.getGyroWeight()
    
    // Structure weight (assume 1 ton per 10 tons of mech)
    const structureWeight = Math.ceil(config.tonnage / 10)
    
    // Heat sink weight
    const heatSinkWeight = config.externalHeatSinks * this.getHeatSinkTonnage()
    
    // Jump jet weight
    const jumpJetWeight = this.getJumpJetWeight()
    
    // Equipment weight (estimate)
    const equipmentWeight = 0 // This would need to be calculated from actual equipment
    
    return engineWeight + gyroWeight + structureWeight + heatSinkWeight + jumpJetWeight + equipmentWeight
  }

  /**
   * Get engine weight
   */
  private getEngineWeight(): number {
    return this.configuration.engineRating / 75
  }

  /**
   * Get gyro weight
   */
  private getGyroWeight(): number {
    const engineRating = this.configuration.engineRating
    return Math.ceil(engineRating / 100)
  }

  /**
   * Get heat sink tonnage
   */
  private getHeatSinkTonnage(): number {
    const heatSinkType = this.getHeatSinkTypeString()
    return heatSinkType === 'Double' ? 1.0 : 0.5
  }

  /**
   * Get jump jet weight
   */
  private getJumpJetWeight(): number {
    const jumpJetType = this.getJumpJetTypeString()
    const jumpMP = this.configuration.jumpMP
    
    if (jumpMP === 0) return 0
    
    const baseWeight = jumpJetType === 'Improved Jump Jet' ? 0.5 : 0.5
    return jumpMP * baseWeight
  }

  /**
   * Get heat sink type as string
   */
  private getHeatSinkTypeString(): string {
    if (typeof this.configuration.heatSinkType === 'string') {
      return this.configuration.heatSinkType
    }
    return this.configuration.heatSinkType.type
  }

  /**
   * Get jump jet type as string
   */
  private getJumpJetTypeString(): string {
    if (typeof this.configuration.jumpJetType === 'string') {
      return this.configuration.jumpJetType
    }
    return this.configuration.jumpJetType.type
  }
}
