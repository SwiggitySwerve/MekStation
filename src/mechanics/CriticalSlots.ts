/**
 * CriticalSlots.ts
 * Manages critical slot allocation and availability.
 * Ports logic from legacy EquipmentAllocationService.ts.
 */

import {
  EngineType,
  GyroType,
  CockpitType,
} from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';
import { getWeaponById } from '../data/weapons';
import { IInstalledEquipmentState, IMechLabState } from '../features/mech-lab/store/MechLabState';

export const LOCATIONS = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'] as const;
export type Location = typeof LOCATIONS[number];

export enum MechLocation {
  HEAD = 'HD',
  CENTER_TORSO = 'CT',
  LEFT_TORSO = 'LT',
  RIGHT_TORSO = 'RT',
  LEFT_ARM = 'LA',
  RIGHT_ARM = 'RA',
  LEFT_LEG = 'LL',
  RIGHT_LEG = 'RL',
}

export interface ICriticalSlot {
  index: number;
  content: string | null;
  isSystem: boolean;
  isAllocated: boolean;
  equipmentInstanceId?: string;
  placeholder?: boolean;
}

export interface ILocationSlots {
  location: MechLocation;
  slots: ICriticalSlot[];
  systemSlots: number;
}

export type CriticalSlotLayout = Record<MechLocation, ILocationSlots>;

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

const ORDERED_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_LEG,
  MechLocation.LEFT_LEG,
];

const createEmptySlots = (location: MechLocation): ICriticalSlot[] =>
  Array.from({ length: STANDARD_SLOTS[location] }, (_, index) => ({
    index: index + 1,
    content: null,
    isSystem: false,
    isAllocated: false,
  }));

const markSystemSlots = (
  slots: ICriticalSlot[],
  count: number,
  label: string
): void => {
  for (let i = 0; i < count && i < slots.length; i += 1) {
    slots[i] = {
      ...slots[i],
      content: label,
      isSystem: true,
      isAllocated: true,
    };
  }
};

const normalizeLocation = (location: string): MechLocation | null => {
  if (!location) {
    return null;
  }
  const normalized = location.toUpperCase();
  switch (normalized) {
    case 'HD':
    case 'HEAD':
      return MechLocation.HEAD;
    case 'CT':
    case 'CENTER_TORSO':
      return MechLocation.CENTER_TORSO;
    case 'LT':
    case 'LEFT_TORSO':
      return MechLocation.LEFT_TORSO;
    case 'RT':
    case 'RIGHT_TORSO':
      return MechLocation.RIGHT_TORSO;
    case 'LA':
    case 'LEFT_ARM':
      return MechLocation.LEFT_ARM;
    case 'RA':
    case 'RIGHT_ARM':
      return MechLocation.RIGHT_ARM;
    case 'LL':
    case 'LEFT_LEG':
      return MechLocation.LEFT_LEG;
    case 'RL':
    case 'RIGHT_LEG':
      return MechLocation.RIGHT_LEG;
    default:
      return null;
  }
};

export const CriticalSlots = {
  getTotalSlots(location: Location): number {
    return STANDARD_SLOTS[location];
  },

  getDynamicComponentSlots(
    location: Location,
    engineType: EngineType,
    gyroType: GyroType,
    cockpitType: CockpitType,
    techBase: TechBase
  ): number {
    let used = 0;

    if (location === 'HD') {
      if (cockpitType === CockpitType.STANDARD) used += 5;
      if (cockpitType === CockpitType.SMALL) used += 4;
    }

    if (location === 'CT') {
      used += 6;

      if (gyroType === GyroType.STANDARD) used += 4;
      if (gyroType === GyroType.XL) used += 6;
      if (gyroType === GyroType.COMPACT) used += 2;
      if (gyroType === GyroType.HEAVY_DUTY) used += 4;
    }

    if (location === 'LT' || location === 'RT') {
      if (engineType === EngineType.XL) {
        used += techBase === TechBase.CLAN ? 2 : 3;
      }
      if (engineType === EngineType.LIGHT) {
        used += 2;
      }
      if (engineType === EngineType.XXL) {
        used += techBase === TechBase.CLAN ? 4 : 6;
      }
    }

    return used;
  },

  canFit(
    location: Location,
    size: number,
    currentAllocated: number,
    dynamicUsed: number
  ): boolean {
    const total = this.getTotalSlots(location);
    const available = total - currentAllocated - dynamicUsed;
    return available >= size;
  },
};

const applyEquipmentToLayout = (
  layout: CriticalSlotLayout,
  equipment: IInstalledEquipmentState[]
): void => {
  equipment.forEach(item => {
    if (item.location === 'unallocated') {
      return;
    }
    const location = normalizeLocation(item.location);
    if (!location) {
      return;
    }
    const weapon = getWeaponById(item.equipmentId);
    const slotsNeeded = weapon?.criticalSlots ?? Math.max(1, item.slotsAllocated || 1);
    const startIndex = item.slotIndex > 0 ? item.slotIndex : 1;
    const locationSlots = layout[location]?.slots;
    if (!locationSlots) {
      return;
    }
    for (let offset = 0; offset < slotsNeeded; offset += 1) {
      const slot = locationSlots[startIndex - 1 + offset];
      if (!slot) {
        break;
      }
      locationSlots[startIndex - 1 + offset] = {
        ...slot,
        content: weapon?.name ?? 'Equipment',
        isAllocated: true,
        equipmentInstanceId: item.id,
      };
    }
  });
};

const getSlotsNeeded = (equipmentId: string): number => {
  const def = getWeaponById(equipmentId);
  if (!def) {
    return 1;
  }
  return Math.max(1, def.criticalSlots);
};

export const CriticalSlotMechanics = {
  generateBaseLayout(
    techBase: TechBase,
    engineType: EngineType,
    gyroType: GyroType,
    cockpitType: CockpitType,
    equipment: IInstalledEquipmentState[] = []
  ): CriticalSlotLayout {
    const layout = ORDERED_LOCATIONS.reduce<Record<MechLocation, ILocationSlots>>((acc, location) => {
      acc[location] = {
        location,
        slots: createEmptySlots(location),
        systemSlots: 0,
      };
      return acc;
    }, {} as CriticalSlotLayout);

    ORDERED_LOCATIONS.forEach(location => {
      const systemSlots = CriticalSlots.getDynamicComponentSlots(
        location,
        engineType,
        gyroType,
        cockpitType,
        techBase
      );
      layout[location].systemSlots = systemSlots;
      if (systemSlots > 0) {
        const label =
          location === MechLocation.CENTER_TORSO ? 'Engine/Gyro' :
          location === MechLocation.HEAD ? 'Cockpit' :
          'Engine';
        markSystemSlots(layout[location].slots, systemSlots, label);
      }
    });

    applyEquipmentToLayout(layout, equipment);

    return layout;
  },

  canPlaceEquipment(
    layout: CriticalSlotLayout,
    location: MechLocation,
    slotIndex: number,
    equipmentId: string
  ): boolean {
    const loc = layout[location];
    if (!loc) {
      return false;
    }
    const needed = getSlotsNeeded(equipmentId);
    const endIndex = slotIndex + needed - 1;
    if (endIndex > loc.slots.length) {
      return false;
    }

    for (let i = 0; i < needed; i += 1) {
      const slot = loc.slots[slotIndex - 1 + i];
      if (!slot || slot.isSystem || slot.isAllocated) {
        return false;
      }
    }

    return true;
  },

  getSlotUsage(state: IMechLabState): { total: number; used: number; remaining: number } {
    const layout = this.generateBaseLayout(
      state.techBase,
      state.engineType,
      state.gyroType,
      state.cockpitType,
      state.equipment
    );

    const total = ORDERED_LOCATIONS.reduce((sum, location) => sum + layout[location].slots.length, 0);
    const used = ORDERED_LOCATIONS.reduce((sum, location) => {
      return sum + layout[location].slots.filter(slot => slot.isAllocated).length;
    }, 0);

    return {
      total,
      used,
      remaining: Math.max(total - used, 0),
    };
  },
};
