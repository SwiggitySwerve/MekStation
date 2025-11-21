/**
 * Common Equipment Interfaces
 * Unified interfaces for all equipment types with weight and slot accounting
 */

import { RangeValidatable } from '../utils/weaponRangeValidation';

// Base interface for any equipment that takes up weight and/or slots
export interface IEquipmentItem {
  name: string;
  weight: number;
  slots: number;
  location?: string;
  type: EquipmentCategory;
}

// Extended interface for weapon equipment that requires range validation
export interface IWeaponEquipment extends IEquipmentItem, RangeValidatable {
  damage?: number | string;
  heat?: number;
  minRange?: number;
  range?: string;
  ammunition?: boolean;
}

export enum EquipmentCategory {
  // System Components
  ENGINE = 'engine',
  GYRO = 'gyro',
  COCKPIT = 'cockpit',
  ACTUATOR = 'actuator',
  LIFE_SUPPORT = 'life_support',
  SENSORS = 'sensors',
  
  // Structure & Armor
  STRUCTURE = 'structure',
  ARMOR = 'armor',
  
  // Heat Management
  HEAT_SINK = 'heat_sink',
  
  // Weapons & Equipment
  WEAPON = 'weapon',
  AMMO = 'ammo',
  EQUIPMENT = 'equipment',
  
  // Special
  SPECIAL_COMPONENT = 'special_component'
}

// Extended interface for components that may have variable slots based on type
export interface IVariableSlotEquipment extends IEquipmentItem {
  slotDistribution?: Record<string, number>; // e.g., { 'Center Torso': 6, 'Left Torso': 3, 'Right Torso': 3 }
}

// Interface for equipment in the equipment list
export interface IEquipmentEntry {
  item_name: string;
  item_type: string;
  tons?: number | string;
  crits?: number | string;
  location?: string;
  tech_base?: string;
}

// Utility functions for equipment calculations
export class EquipmentCalculator {
  /**
   * Calculate total weight from a list of equipment items
   */
  static calculateTotalWeight(items: IEquipmentItem[]): number {
    return items.reduce((total, item) => total + item.weight, 0);
  }
  
  /**
   * Calculate total slots from a list of equipment items
   */
  static calculateTotalSlots(items: IEquipmentItem[]): number {
    return items.reduce((total, item) => total + item.slots, 0);
  }
  
  /**
   * Convert equipment entry to standard equipment item
   */
  static convertToEquipmentItem(
    entry: IEquipmentEntry, 
    category: EquipmentCategory = EquipmentCategory.EQUIPMENT
  ): IEquipmentItem {
    let weight = 0;
    if (entry.tons !== undefined) {
      weight = typeof entry.tons === 'string' ? parseFloat(entry.tons) || 0 : entry.tons;
    }
    
    let slots = 0;
    if (entry.crits !== undefined) {
      slots = typeof entry.crits === 'string' ? parseInt(entry.crits) || 0 : entry.crits;
    }
    
    return {
      name: entry.item_name,
      weight,
      slots,
      location: entry.location,
      type: category
    };
  }
  
  /**
   * Get ONLY regular equipment items (weapons, ammo, misc equipment)
   * Excludes all system components to prevent double counting
   */
  static getRegularEquipmentItems(equipment: IEquipmentEntry[]): IEquipmentItem[] {
    const items: IEquipmentItem[] = [];
    
    // Only process regular equipment, excluding structure and armor components
    equipment.forEach(eq => {
      // Skip structure and armor components - they're handled separately
      if (eq.item_name.includes('Endo Steel') || 
          eq.item_name.includes('Ferro-Fibrous') ||
          eq.item_name.includes('Stealth') ||
          eq.item_name.includes('Reactive') ||
          eq.item_name.includes('Reflective') ||
          eq.item_name.includes('Hardened') ||
          eq.item_name.includes('Light Ferro-Fibrous') ||
          eq.item_name.includes('Heavy Ferro-Fibrous')) {
        return;
      }
      
      const category = eq.item_type === 'weapon' ? EquipmentCategory.WEAPON :
                      eq.item_type === 'ammo' ? EquipmentCategory.AMMO :
                      EquipmentCategory.EQUIPMENT;
      items.push(EquipmentCalculator.convertToEquipmentItem(eq, category));
    });
    
    return items;
  }
  
  /**
   * Get ONLY fixed system components (engine, gyro, actuators, cockpit systems)
   * These are always present and have fixed slots
   */
  static getFixedSystemComponents(systemComponents: any): IEquipmentItem[] {
    const items: IEquipmentItem[] = [];
    
    // Add engine
    if (systemComponents?.engine) {
      const engineSlots = EquipmentCalculator.getEngineSlots(systemComponents.engine.type);
      items.push({
        name: `${systemComponents.engine.type} Engine ${systemComponents.engine.rating}`,
        weight: 0, // Engine weight calculated separately
        slots: engineSlots,
        type: EquipmentCategory.ENGINE
      });
    }
    
    // Add gyro
    if (systemComponents?.gyro) {
      const gyroSlots = EquipmentCalculator.getGyroSlots(systemComponents.gyro.type);
      items.push({
        name: `${systemComponents.gyro.type} Gyro`,
        weight: 0, // Gyro weight calculated separately
        slots: gyroSlots,
        type: EquipmentCategory.GYRO
      });
    }
    
    // Add fixed actuators and systems
    items.push(
      { name: 'Life Support', weight: 0, slots: 2, type: EquipmentCategory.LIFE_SUPPORT },
      { name: 'Sensors', weight: 0, slots: 3, type: EquipmentCategory.SENSORS },
      { name: 'Cockpit', weight: 0, slots: 1, type: EquipmentCategory.COCKPIT },
      { name: 'Shoulder (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Upper Arm (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Shoulder (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Upper Arm (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Hip (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Upper Leg (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Lower Leg (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Foot (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Hip (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Upper Leg (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Lower Leg (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR },
      { name: 'Foot (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR }
    );
    
    // Add optional actuators
    if (systemComponents?.leftArmActuators?.hasLowerArm) {
      items.push({ name: 'Lower Arm (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR });
    }
    if (systemComponents?.leftArmActuators?.hasHand) {
      items.push({ name: 'Hand (Left)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR });
    }
    if (systemComponents?.rightArmActuators?.hasLowerArm) {
      items.push({ name: 'Lower Arm (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR });
    }
    if (systemComponents?.rightArmActuators?.hasHand) {
      items.push({ name: 'Hand (Right)', weight: 0, slots: 1, type: EquipmentCategory.ACTUATOR });
    }
    
    // Add heat sinks
    if (systemComponents?.heatSinks?.externalRequired > 0) {
      const slotsPerHS = EquipmentCalculator.getHeatSinkSlots(
        systemComponents.heatSinks.type,
        'Inner Sphere' // Default, should be passed properly
      );
      items.push({
        name: `${systemComponents.heatSinks.type} Heat Sinks (${systemComponents.heatSinks.externalRequired})`,
        weight: systemComponents.heatSinks.externalRequired * (slotsPerHS === 3 ? 1 : 0.5),
        slots: systemComponents.heatSinks.externalRequired * slotsPerHS,
        type: EquipmentCategory.HEAT_SINK
      });
    }
    
    return items;
  }
  
  /**
   * Get structure and armor components from weapons_and_equipment
   * These are handled specially through componentSync
   */
  static getStructureAndArmorItems(equipment: IEquipmentEntry[]): IEquipmentItem[] {
    const items: IEquipmentItem[] = [];
    
    equipment.forEach(eq => {
      // Only process structure and armor components
      if (eq.item_name.includes('Endo Steel') || 
          eq.item_name.includes('Ferro-Fibrous') ||
          eq.item_name.includes('Stealth') ||
          eq.item_name.includes('Reactive') ||
          eq.item_name.includes('Reflective') ||
          eq.item_name.includes('Hardened') ||
          eq.item_name.includes('Light Ferro-Fibrous') ||
          eq.item_name.includes('Heavy Ferro-Fibrous') ||
          eq.item_name.includes('Composite') ||
          eq.item_name.includes('Reinforced')) {
        items.push(EquipmentCalculator.convertToEquipmentItem(eq, EquipmentCategory.SPECIAL_COMPONENT));
      }
    });
    
    return items;
  }
  
  /**
   * Get all equipment items from various sources
   * This is the main method that combines all categories
   */
  static getAllEquipmentItems(
    equipment: IEquipmentEntry[],
    systemComponents: any,
    unitData: any
  ): IEquipmentItem[] {
    const regularEquipment = EquipmentCalculator.getRegularEquipmentItems(equipment);
    const fixedComponents = EquipmentCalculator.getFixedSystemComponents(systemComponents);
    const structureAndArmor = EquipmentCalculator.getStructureAndArmorItems(equipment);
    
    return [...regularEquipment, ...fixedComponents, ...structureAndArmor];
  }
  
  // Helper methods for slot calculations
  static getEngineSlots(engineType: string): number {
    switch (engineType) {
      case 'XL':
      case 'XXL':
        return 12;
      case 'Light':
        return 10;
      case 'Compact':
        return 3;
      default:
        return 6;
    }
  }
  
  static getGyroSlots(gyroType: string): number {
    switch (gyroType) {
      case 'XL':
        return 6;
      case 'Compact':
        return 2;
      default:
        return 4;
    }
  }
  
  static getStructureSlots(structureType: string, techBase: string): number {
    switch (structureType) {
      case 'Endo Steel':
        return 14;
      case 'Endo Steel (Clan)':
        return 7;
      default:
        return 0;
    }
  }
  
  static getArmorSlots(armorType: string, techBase: string): number {
    switch (armorType) {
      case 'Ferro-Fibrous':
        return techBase === 'Clan' ? 7 : 14;
      case 'Ferro-Fibrous (Clan)':
        return 7;
      case 'Light Ferro-Fibrous':
        return 7;
      case 'Heavy Ferro-Fibrous':
        return 21;
      case 'Stealth':
        return 12;
      case 'Reactive':
        return 14;
      case 'Reflective':
        return 10;
      default:
        return 0;
    }
  }
  
  static getHeatSinkSlots(heatSinkType: string, techBase: string): number {
    if (heatSinkType === 'Double' || heatSinkType === 'Double (Clan)') {
      return (heatSinkType === 'Double (Clan)' || techBase === 'Clan') ? 2 : 3;
    }
    return 1; // Single and Compact heat sinks
  }
}
