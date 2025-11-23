/**
 * CriticalSlots.ts
 * Manages critical slot allocation and availability.
 * Ports logic from legacy EquipmentAllocationService.ts.
 */

import { EngineType, GyroType, StructureType, ArmorType, CockpitType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';

export const LOCATIONS = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'] as const;
export type Location = typeof LOCATIONS[number];

export const STANDARD_SLOTS: Record<Location, number> = {
  HD: 6,
  CT: 12,
  LT: 12,
  RT: 12,
  LA: 12,
  RA: 12,
  LL: 6,
  RL: 6,
};

export const CriticalSlots = {
  /**
   * Returns the total number of slots in a location.
   * Usually constant, but might change with some rules (e.g. quad mechs legs?).
   */
  getTotalSlots(location: Location): number {
    return STANDARD_SLOTS[location];
  },

  /**
   * Calculates the number of slots occupied by dynamic components (Engine, Gyro, etc.)
   * in a specific location.
   */
  getDynamicComponentSlots(
    location: Location,
    engineType: EngineType,
    gyroType: GyroType,
    cockpitType: CockpitType,
    techBase: TechBase
  ): number {
    let used = 0;

    // 1. Cockpit (Head)
    if (location === 'HD') {
      // Standard Cockpit: 1 Life Support + 2 Sensors + 1 Cockpit + 1 Life Support = 5?
      // Actually usually mapped as:
      // 1: Life Support
      // 2: Sensors
      // 3: Cockpit
      // 4: Sensors
      // 5: Life Support
      // 6: Free (or other)
      // Small Cockpit: 4 slots used?
      // Torso-Mounted: 0 in Head?
      // For now, let's assume Standard Cockpit takes 5 fixed slots.
      if (cockpitType === CockpitType.STANDARD) used += 5;
      if (cockpitType === CockpitType.SMALL) used += 4; // ?
    }

    // 2. Engine (CT and Side Torsos)
    if (location === 'CT') {
      // Standard/XL/Light/Compact all take 6 slots in CT (3 engine + 3 gyro usually, but engine itself is 6?)
      // Actually Engine is 6 slots in CT.
      // Gyro is 4 slots in CT (Standard).
      // Total 10 slots used in CT for standard setup.
      used += 6; // Engine

      // Gyro
      if (gyroType === GyroType.STANDARD) used += 4;
      if (gyroType === GyroType.XL) used += 6; // Takes 6 slots!
      if (gyroType === GyroType.COMPACT) used += 2;
      if (gyroType === GyroType.HEAVY_DUTY) used += 4;
    }

    // Side Torsos (XL/Light Engines)
    if (location === 'LT' || location === 'RT') {
      if (engineType === EngineType.XL) {
        // Inner Sphere XL: 3 slots
        // Clan XL: 2 slots
        used += (techBase === TechBase.CLAN) ? 2 : 3;
      }
      if (engineType === EngineType.LIGHT) {
        used += 2;
      }
      if (engineType === EngineType.XXL) {
        // IS XXL: 6 slots?
        // Clan XXL: 4 slots?
        used += (techBase === TechBase.CLAN) ? 4 : 6;
      }
    }

    return used;
  },

  /**
   * Checks if an item of a given size fits in the location.
   */
  canFit(
    location: Location,
    size: number,
    currentAllocated: number,
    dynamicUsed: number
  ): boolean {
    const total = this.getTotalSlots(location);
    const available = total - currentAllocated - dynamicUsed;
    return available >= size;
  }
};
