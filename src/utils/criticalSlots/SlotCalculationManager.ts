/**
 * SlotCalculationManager
 * Handles core slot calculation logic including requirements, availability, and utilization.
 * Extracted from CriticalSlotCalculator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from './UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

export interface SlotRequirements {
  total: number;
  byLocation: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  byComponent: {
    systemComponents: number;
    specialComponents: number;
    equipment: number;
    ammunition: number;
  };
  critical: boolean; // True if requirements exceed capacity
}

export interface AvailableSlots {
  total: number;
  byLocation: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  reserved: {
    systemComponents: number;
    specialComponents: number;
  };
  usable: number; // Total minus reserved
}

export interface SlotUtilization {
  percentageUsed: number;
  totalUsed: number;
  totalAvailable: number;
  byLocation: {
    [location: string]: {
      used: number;
      available: number;
      percentage: number;
      efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    };
  };
  bottlenecks: string[]; // Locations with >90% utilization
  recommendations: string[];
}

export class SlotCalculationManager {
  private readonly STANDARD_SLOT_COUNTS = {
    head: 6,
    centerTorso: 12,
    leftTorso: 12,
    rightTorso: 12,
    leftArm: 8,
    rightArm: 8,
    leftLeg: 6,
    rightLeg: 6
  };

  /**
   * Extract type string from ComponentConfiguration or return string as-is
   */
  public extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component;
    }
    return component.type;
  }

  /**
   * Calculate required slots for equipment and configuration
   */
  calculateRequiredSlots(config: UnitConfiguration, equipment: any[]): SlotRequirements {
    const systemSlots = this.calculateSystemComponentSlots(config);
    const specialSlots = this.calculateSpecialComponentSlots(config);
    const equipmentSlots = this.calculateEquipmentSlots(equipment);
    const ammoSlots = this.getAmmoSlots(equipment);

    const total = systemSlots + specialSlots + equipmentSlots + ammoSlots;

    const byLocation = this.distributeSlotsByLocation(config, equipment);

    return {
      total,
      byLocation,
      byComponent: {
        systemComponents: systemSlots,
        specialComponents: specialSlots,
        equipment: equipmentSlots,
        ammunition: ammoSlots
      },
      critical: total > this.getTotalAvailableSlots(config)
    };
  }

  /**
   * Calculate available slots for configuration
   */
  calculateAvailableSlots(config: UnitConfiguration): AvailableSlots {
    const total = this.getTotalAvailableSlots(config);
    const systemReserved = this.calculateSystemComponentSlots(config);
    const specialReserved = this.calculateSpecialComponentSlots(config);

    const byLocation = {
      head: this.STANDARD_SLOT_COUNTS.head,
      centerTorso: this.STANDARD_SLOT_COUNTS.centerTorso,
      leftTorso: this.STANDARD_SLOT_COUNTS.leftTorso,
      rightTorso: this.STANDARD_SLOT_COUNTS.rightTorso,
      leftArm: this.STANDARD_SLOT_COUNTS.leftArm,
      rightArm: this.STANDARD_SLOT_COUNTS.rightArm,
      leftLeg: this.STANDARD_SLOT_COUNTS.leftLeg,
      rightLeg: this.STANDARD_SLOT_COUNTS.rightLeg
    };

    return {
      total,
      byLocation,
      reserved: {
        systemComponents: systemReserved,
        specialComponents: specialReserved
      },
      usable: total - systemReserved - specialReserved
    };
  }

  /**
   * Calculate slot utilization for configuration and equipment
   */
  calculateSlotUtilization(config: UnitConfiguration, equipment: any[]): SlotUtilization {
    const requirements = this.calculateRequiredSlots(config, equipment);
    const available = this.calculateAvailableSlots(config);

    const totalUsed = requirements.total;
    const totalAvailable = available.total;
    const percentageUsed = totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;

    const byLocation: { [location: string]: any } = {};
    const bottlenecks: string[] = [];

    Object.entries(requirements.byLocation).forEach(([location, used]) => {
      const availableInLocation = available.byLocation[location as keyof typeof available.byLocation];
      const percentage = availableInLocation > 0 ? (used / availableInLocation) * 100 : 0;
      
      let efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      if (percentage <= 70) efficiency = 'excellent';
      else if (percentage <= 85) efficiency = 'good';
      else if (percentage <= 95) efficiency = 'fair';
      else if (percentage <= 100) efficiency = 'poor';
      else efficiency = 'critical';

      byLocation[location] = {
        used,
        available: availableInLocation,
        percentage,
        efficiency
      };

      if (percentage > 90) {
        bottlenecks.push(location);
      }
    });

    const recommendations = this.generateUtilizationRecommendations(byLocation, bottlenecks);

    return {
      percentageUsed,
      totalUsed,
      totalAvailable,
      byLocation,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Calculate system component slots
   */
  public calculateSystemComponentSlots(config: UnitConfiguration): number {
    const engineSlots = this.getEngineSlots(this.extractComponentType(config.engineType));
    const gyroSlots = this.getGyroSlots(this.extractComponentType(config.gyroType));
    const cockpitSlots = 1; // Standard cockpit
    const actuatorSlots = 16; // 4 per arm/leg
    
    return engineSlots + gyroSlots + cockpitSlots + actuatorSlots;
  }

  /**
   * Calculate special component slots
   */
  public calculateSpecialComponentSlots(config: UnitConfiguration): number {
    let slots = 0;

    // Endo Steel slots
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      slots += this.getEndoSteelRequirement(config);
    }

    // Ferro Fibrous slots
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Ferro-Fibrous' || armorType === 'Ferro-Fibrous (Clan)' || 
        armorType === 'Light Ferro-Fibrous' || armorType === 'Heavy Ferro-Fibrous') {
      slots += this.getFerroFibrousRequirement(config);
    }

    return slots;
  }

  /**
   * Calculate equipment slots
   */
  private calculateEquipmentSlots(equipment: any[]): number {
    return equipment.reduce((total, item) => {
      return total + (item.requiredSlots || 1);
    }, 0);
  }

  /**
   * Get ammo slots
   */
  private getAmmoSlots(equipment: any[]): number {
    const ammoItems = equipment.filter(item => item.type === 'ammunition');
    return ammoItems.reduce((total, ammo) => {
      return total + (ammo.requiredSlots || 1);
    }, 0);
  }

  /**
   * Distribute slots by location
   */
  private distributeSlotsByLocation(config: UnitConfiguration, equipment: any[]) {
    // Simplified distribution - in practice this would be more complex
    return {
      head: 1, // Cockpit
      centerTorso: 4, // Engine, gyro
      leftTorso: 2,
      rightTorso: 2,
      leftArm: 4, // Actuators
      rightArm: 4, // Actuators
      leftLeg: 4, // Actuators
      rightLeg: 4  // Actuators
    };
  }

  /**
   * Get total available slots
   */
  private getTotalAvailableSlots(config: UnitConfiguration): number {
    return Object.values(this.STANDARD_SLOT_COUNTS).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get engine slots based on type
   */
  public getEngineSlots(engineType: string): number {
    switch (engineType) {
      case 'XL':
      case 'XL (IS)':
      case 'XL (Clan)':
        return 6; // 2 per torso
      case 'Light':
        return 4; // 2 per torso
      case 'XXL':
        return 8; // 3 per torso + 2 in center
      case 'Compact':
        return 2; // Only in center torso
      case 'ICE':
      case 'Fuel Cell':
        return 4; // 2 per torso
      default: // Standard
        return 3; // 1 per torso
    }
  }

  /**
   * Get gyro slots based on type
   */
  public getGyroSlots(gyroType: string): number {
    switch (gyroType) {
      case 'XL':
        return 1;
      case 'Compact':
        return 2;
      case 'Heavy-Duty':
        return 3;
      default: // Standard
        return 1;
    }
  }

  /**
   * Generate utilization recommendations
   */
  private generateUtilizationRecommendations(byLocation: any, bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.length > 0) {
      recommendations.push(`Critical slot utilization in: ${bottlenecks.join(', ')}`);
      recommendations.push('Consider redistributing equipment to less crowded locations');
    }

    Object.entries(byLocation).forEach(([location, data]: [string, any]) => {
      if (data.percentage > 85) {
        recommendations.push(`High utilization in ${location}: ${data.percentage.toFixed(1)}%`);
      }
    });

    return recommendations;
  }

  /**
   * Get Endo Steel requirement
   */
  public getEndoSteelRequirement(config: UnitConfiguration): number {
    const tonnage = config.tonnage;
    return Math.ceil(tonnage / 5); // 1 slot per 5 tons
  }

  /**
   * Get Ferro Fibrous requirement
   */
  public getFerroFibrousRequirement(config: UnitConfiguration): number {
    const tonnage = config.tonnage;
    return Math.ceil(tonnage / 5); // 1 slot per 5 tons
  }
} 