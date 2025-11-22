/**
 * CriticalSlots.ts
 * Mechanics for Critical Slot management (The Paper Doll Logic).
 */

import { TechBase } from '../types/TechBase';
import { EngineType, GyroType, CockpitType } from '../types/SystemComponents';
import { EngineMechanics } from './Engine';
import { GyroMechanics } from './Gyro';
import { IInstalledEquipmentState } from '../features/mech-lab/store/MechLabState';
import { getWeaponById } from '../data/weapons';

export enum MechLocation {
  HEAD = 'Head',
  CENTER_TORSO = 'Center Torso',
  LEFT_TORSO = 'Left Torso',
  RIGHT_TORSO = 'Right Torso',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  LEFT_LEG = 'Left Leg',
  RIGHT_LEG = 'Right Leg',
}

export interface ICriticalSlot {
  index: number; // 1-12 (or 1-6 for Head/Legs)
  content: string | null; // Equipment ID or System Name (e.g., "Engine", "Gyro")
  isAllocated: boolean;
  isSystem: boolean; // True if Engine, Gyro, etc.
  size: number; // If equipment spans multiple slots, this is total size.
  placeholder?: boolean; // If this slot is part of a larger item but not the start
  equipmentInstanceId?: string; // ID of the specific equipment instance if allocated
}

export interface ILocationSlots {
  location: MechLocation;
  slots: ICriticalSlot[];
  maxSlots: number;
}

export class CriticalSlotMechanics {
  
  /**
   * Generate the base Critical Slot layout for a Mech.
   * Includes standard systems (Life Support, Sensors, Engine, Gyro, Cockpit).
   */
  public static generateBaseLayout(
    techBase: TechBase,
    engineType: EngineType,
    gyroType: GyroType,
    cockpitType: CockpitType,
    equipment: IInstalledEquipmentState[] = []
  ): Record<MechLocation, ILocationSlots> {
    
    // Initialize empty layout
    const layout: Record<MechLocation, ILocationSlots> = {
      [MechLocation.HEAD]: this.createLocation(MechLocation.HEAD, 6),
      [MechLocation.CENTER_TORSO]: this.createLocation(MechLocation.CENTER_TORSO, 12),
      [MechLocation.LEFT_TORSO]: this.createLocation(MechLocation.LEFT_TORSO, 12),
      [MechLocation.RIGHT_TORSO]: this.createLocation(MechLocation.RIGHT_TORSO, 12),
      [MechLocation.LEFT_ARM]: this.createLocation(MechLocation.LEFT_ARM, 12),
      [MechLocation.RIGHT_ARM]: this.createLocation(MechLocation.RIGHT_ARM, 12),
      [MechLocation.LEFT_LEG]: this.createLocation(MechLocation.LEFT_LEG, 6),
      [MechLocation.RIGHT_LEG]: this.createLocation(MechLocation.RIGHT_LEG, 6),
    };

    // 1. Assign Fixed Systems
    this.assignFixedSystems(layout, techBase, engineType, gyroType, cockpitType);

    // 2. Assign Equipment
    this.assignEquipment(layout, equipment);

    return layout;
  }

  private static assignFixedSystems(
    layout: Record<MechLocation, ILocationSlots>,
    techBase: TechBase,
    engineType: EngineType,
    gyroType: GyroType,
    cockpitType: CockpitType
  ) {
    // --- HEAD ---
    this.assignSystem(layout[MechLocation.HEAD], 1, 'Life Support');
    this.assignSystem(layout[MechLocation.HEAD], 2, 'Sensors');
    this.assignSystem(layout[MechLocation.HEAD], 3, 'Cockpit');
    this.assignSystem(layout[MechLocation.HEAD], 4, 'Sensors');
    this.assignSystem(layout[MechLocation.HEAD], 5, 'Life Support');

    // --- CENTER TORSO ---
    // Engine (First 3)
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 1, 'Engine');
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 2, 'Engine');
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 3, 'Engine');

    // Gyro
    const gyroSlots = GyroMechanics.getRequiredSlots(gyroType);
    for (let i = 0; i < gyroSlots; i++) {
      this.assignSystem(layout[MechLocation.CENTER_TORSO], 4 + i, 'Gyro');
    }

    // Engine (Last 3)
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 8, 'Engine');
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 9, 'Engine');
    this.assignSystem(layout[MechLocation.CENTER_TORSO], 10, 'Engine');

    // --- LEGS ---
    for (const leg of [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG]) {
      this.assignSystem(layout[leg], 1, 'Hip');
      this.assignSystem(layout[leg], 2, 'Upper Leg Actuator');
      this.assignSystem(layout[leg], 3, 'Lower Leg Actuator');
      this.assignSystem(layout[leg], 4, 'Foot Actuator');
    }

    // --- ARMS ---
    for (const arm of [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM]) {
      this.assignSystem(layout[arm], 1, 'Shoulder');
      this.assignSystem(layout[arm], 2, 'Upper Arm Actuator');
      this.assignSystem(layout[arm], 3, 'Lower Arm Actuator');
      this.assignSystem(layout[arm], 4, 'Hand Actuator');
    }

    // --- SIDE TORSOS (XL Engines) ---
    const engineSlots = EngineMechanics.getRequiredSlots(engineType, techBase);
    if (engineSlots.sideTorso > 0) {
      for (const torso of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO]) {
        for (let i = 0; i < engineSlots.sideTorso; i++) {
          this.assignSystem(layout[torso], 1 + i, 'Engine');
        }
      }
    }
  }

  private static assignEquipment(
    layout: Record<MechLocation, ILocationSlots>,
    equipment: IInstalledEquipmentState[]
  ) {
    equipment.forEach(item => {
      // Skip unallocated
      if (item.location === 'unallocated' || item.slotIndex < 0) return;

      const locationKey = item.location as MechLocation;
      if (!layout[locationKey]) return; // Invalid location

      const def = getWeaponById(item.equipmentId);
      if (!def) return;

      const slotsNeeded = def.criticalSlots;
      const startSlot = item.slotIndex; // 1-based index

      // Place item
      for (let i = 0; i < slotsNeeded; i++) {
        const slotIdx = startSlot + i;
        const slot = layout[locationKey].slots[slotIdx - 1];
        
        if (slot) {
          slot.content = def.name;
          slot.isAllocated = true;
          slot.isSystem = false;
          slot.size = slotsNeeded;
          slot.equipmentInstanceId = item.id;
          
          if (i > 0) {
            slot.placeholder = true;
            slot.content = `${def.name} (cont)`;
          }
        }
      }
    });
  }

  /**
   * Check if an equipment can be placed at a specific location and slot.
   */
  public static canPlaceEquipment(
    layout: Record<MechLocation, ILocationSlots>,
    location: MechLocation,
    slotIndex: number,
    equipmentId: string
  ): boolean {
    const def = getWeaponById(equipmentId);
    if (!def) return false;

    const slotsNeeded = def.criticalSlots;
    const locData = layout[location];

    // Bounds check
    if (slotIndex < 1 || slotIndex + slotsNeeded - 1 > locData.maxSlots) {
      return false;
    }

    // Collision check
    for (let i = 0; i < slotsNeeded; i++) {
      const slot = locData.slots[slotIndex - 1 + i];
      if (slot.isAllocated) {
        return false; // Slot occupied
      }
    }

    return true;
  }

  private static createLocation(location: MechLocation, maxSlots: number): ILocationSlots {
    return {
      location,
      maxSlots,
      slots: Array(maxSlots).fill(null).map((_, i) => ({
        index: i + 1,
        content: null,
        isAllocated: false,
        isSystem: false,
        size: 1,
      })),
    };
  }

  private static assignSystem(location: ILocationSlots, slotIndex: number, name: string) {
    const slot = location.slots[slotIndex - 1];
    if (slot) {
      slot.content = name;
      slot.isAllocated = true;
      slot.isSystem = true;
    }
  }
}
