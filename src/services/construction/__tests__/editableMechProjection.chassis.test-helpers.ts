import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';

export function chassisDesign(
  chassis?: 'CLAN' | 'INNER_SPHERE',
  id = 'unlisted-chassis-transport',
): IRawSerializedUnit {
  return {
    id,
    chassis: 'Synthetic',
    model: 'Chassis transport',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'MIXED',
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [],
    criticalSlots: { LEFT_TORSO: ['IS AC/5 Ammo'] },
    ...(chassis === undefined ? {} : { componentTechBases: { chassis } }),
  };
}
