import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GyroType, getGyroDefinition } from '@/types/construction/GyroType';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type {
  CombatLocation,
  CriticalSlotManifest,
  ICriticalSlotEntry,
} from './types';

/** Legacy fallback for engine-less fixtures: its side torsos are XL-shaped. */
export function buildDefaultCriticalSlotManifest(): CriticalSlotManifest {
  return {
    head: [
      {
        slotIndex: 0,
        componentType: 'life_support',
        componentName: 'Life Support',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'sensor',
        componentName: 'Sensors',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'cockpit',
        componentName: 'Cockpit',
        destroyed: false,
      },
      {
        slotIndex: 3,
        componentType: 'sensor',
        componentName: 'Sensors',
        destroyed: false,
      },
      {
        slotIndex: 4,
        componentType: 'life_support',
        componentName: 'Life Support',
        destroyed: false,
      },
    ],
    center_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 3,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 4,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 5,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
      {
        slotIndex: 6,
        componentType: 'gyro',
        componentName: 'Gyro',
        destroyed: false,
      },
    ],
    left_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
    ],
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
      {
        slotIndex: 2,
        componentType: 'engine',
        componentName: 'Engine',
        destroyed: false,
      },
    ],
    left_arm: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.SHOULDER,
        destroyed: false,
        actuatorType: ActuatorType.SHOULDER,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_ARM,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_ARM,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.HAND,
        destroyed: false,
        actuatorType: ActuatorType.HAND,
      },
    ],
    right_arm: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.SHOULDER,
        destroyed: false,
        actuatorType: ActuatorType.SHOULDER,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_ARM,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_ARM,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_ARM,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.HAND,
        destroyed: false,
        actuatorType: ActuatorType.HAND,
      },
    ],
    left_leg: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.HIP,
        destroyed: false,
        actuatorType: ActuatorType.HIP,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_LEG,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_LEG,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.FOOT,
        destroyed: false,
        actuatorType: ActuatorType.FOOT,
      },
    ],
    right_leg: [
      {
        slotIndex: 0,
        componentType: 'actuator',
        componentName: ActuatorType.HIP,
        destroyed: false,
        actuatorType: ActuatorType.HIP,
      },
      {
        slotIndex: 1,
        componentType: 'actuator',
        componentName: ActuatorType.UPPER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.UPPER_LEG,
      },
      {
        slotIndex: 2,
        componentType: 'actuator',
        componentName: ActuatorType.LOWER_LEG,
        destroyed: false,
        actuatorType: ActuatorType.LOWER_LEG,
      },
      {
        slotIndex: 3,
        componentType: 'actuator',
        componentName: ActuatorType.FOOT,
        destroyed: false,
        actuatorType: ActuatorType.FOOT,
      },
    ],
  };
}

const fixedSlots = (
  start: number,
  count: number,
  componentType: 'engine' | 'gyro',
): ICriticalSlotEntry[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => ({
    slotIndex: start + i,
    componentType,
    componentName: componentType === 'engine' ? 'Engine' : 'Gyro',
    destroyed: false,
  }));

export interface IStructuralCriticalSlotOptions {
  readonly engineType: EngineType;
  readonly gyroType?: GyroType;
}

/**
 * Engine-aware fixed slots (L0-06): engine fills CT 0-2, the gyro follows,
 * remaining CT engine slots follow the gyro; only XL/Light/XXL engines occupy
 * side-torso slots. Head and limb actuators match the legacy default.
 *
 * @spec openspec/specs/engine-system/spec.md (Engine Type Classification)
 * @spec openspec/specs/critical-slot-allocation/spec.md (Fixed Component Placement; Side Torso Engine Slots)
 */
export function buildStructuralCriticalSlotManifest(
  options: IStructuralCriticalSlotOptions,
): CriticalSlotManifest {
  const engine = getEngineDefinition(options.engineType);
  const ctEngineSlots = engine?.ctSlots ?? 6;
  const sideTorsoSlots = engine?.sideTorsoSlots ?? 0;
  const gyroSlots =
    getGyroDefinition(options.gyroType ?? GyroType.STANDARD)?.criticalSlots ??
    4;
  const lead = Math.min(3, ctEngineSlots);
  return {
    ...buildDefaultCriticalSlotManifest(),
    center_torso: [
      ...fixedSlots(0, lead, 'engine'),
      ...fixedSlots(lead, gyroSlots, 'gyro'),
      ...fixedSlots(lead + gyroSlots, ctEngineSlots - lead, 'engine'),
    ],
    left_torso: fixedSlots(0, sideTorsoSlots, 'engine'),
    right_torso: fixedSlots(0, sideTorsoSlots, 'engine'),
  };
}

export function buildCriticalSlotManifest(
  customSlots?: Partial<Record<string, readonly ICriticalSlotEntry[]>>,
  baseManifest?: CriticalSlotManifest,
): CriticalSlotManifest {
  const base = baseManifest ?? buildDefaultCriticalSlotManifest();
  if (!customSlots) return base;

  const result: Record<string, readonly ICriticalSlotEntry[]> = { ...base };
  for (const [location, slots] of Object.entries(customSlots)) {
    if (slots) {
      result[location] = slots;
    }
  }

  return result;
}

export function normalizeLocation(location: CombatLocation): string {
  switch (location) {
    case 'center_torso_rear':
      return 'center_torso';
    case 'left_torso_rear':
      return 'left_torso';
    case 'right_torso_rear':
      return 'right_torso';
    default:
      return location;
  }
}
