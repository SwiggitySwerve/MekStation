import { decodeBlkVehicleEngine } from '@/services/conversion/blkEngineIdentity';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  ISupportVehicle,
  IVehicleMountedEquipment,
} from '@/types/unit/VehicleInterfaces';
import {
  ceilToHalfTon,
  roundWeightToGrams,
} from '@/utils/physical/weightUtils';

import { getSupportVehicleBarArmorWeight } from './armor';
import {
  computeSupportVehicleEngineWeight,
  getSupportVehicleSizeIndex,
} from './engine';

// MegaMek 48fcb2f6 TestSupportVehicle.java:102-121 (SVType chassis values).
const NAVAL_BASE = [0.12, 0.15, 0.17];
const RAIL_BASE = [0.15, 0.2, 0.3];
const BASE: Record<GroundMotionType, readonly number[]> = {
  Tracked: [0.13, 0.15, 0.25],
  Wheeled: [0.12, 0.15, 0.18],
  Hover: [0.2, 0.25, 0.3],
  VTOL: [0.2, 0.25, 0.3],
  Naval: NAVAL_BASE,
  Hydrofoil: NAVAL_BASE,
  Submarine: NAVAL_BASE,
  WiGE: [0.12, 0.15, 0.17],
  Rail: RAIL_BASE,
  Maglev: RAIL_BASE,
};
// TestSupportVehicle.java:539-545; A through F.
const TECH = [1.6, 1.3, 1.15, 1, 0.85, 0.66];
// TestSupportVehicle.java:258-294; aliases: MiscType.java:10297-10790.
const MODS: Readonly<Record<string, number>> = {
  amphibious: 1.75,
  armored: 1.5,
  bicycle: 0.75,
  convertible: 1.1,
  dunebuggy: 1.5,
  environmentalsealing: 2,
  externalpowerpickup: 1.1,
  hydrofoil: 1.7,
  monocycle: 0.5,
  offroad: 1.5,
  omni: 1,
  prop: 1.2,
  propellerdriven: 1.2,
  snowmobile: 1.75,
  stol: 1.5,
  submersible: 1.8,
  tractor: 1.2,
  trailer: 0.8,
  ultralight: 0.5,
  vstol: 2,
};
function chassisMultiplier(name: string): number {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(clan|is|cl)/, '')
    .replace(/^svchassismod/, '')
    .replace(/^sv/, '')
    .replace(/(chassismod|chassis)$/, '');
  return MODS[key] ?? 1;
}

/** TestSupportVehicle.java:754-764: only small support rounds away gram noise. */
export function ceilSupportWeight(weight: number, tonnage: number): number {
  return tonnage < 5
    ? Math.ceil(roundWeightToGrams(weight) / 1000) / 1000
    : ceilToHalfTon(weight);
}
export interface SupportStructureContext {
  tonnage: number;
  motionType: GroundMotionType;
  structuralTechRating?: number;
  equipment: readonly Pick<IVehicleMountedEquipment, 'equipmentId'>[];
}
/** TestSupportVehicle.java:778-797: multiply every installed mod, then ceil. */
export function computeSupportStructureWeight(
  state: SupportStructureContext,
): number {
  let weight =
    state.tonnage *
    BASE[state.motionType][
      getSupportVehicleSizeIndex(state.tonnage, state.motionType)
    ];
  weight *= TECH[state.structuralTechRating ?? 3] ?? 1;
  for (const mount of state.equipment)
    weight *= chassisMultiplier(mount.equipmentId);
  return ceilSupportWeight(weight, state.tonnage);
}

/** Represented subtotal only: crew, bays, weapons, ammo and misc are pending.
 * TestEntity.java:1011-1033 + TestSupportVehicle.java:768-775 order the sum;
 * BLKSupportTankFile.java:96-97 loads fuel directly in tons (not fuel points).
 */
export function computeSupportVehicleWeight(unit: ISupportVehicle): {
  structure: number;
  engine: number;
  armor: number;
  fuel: number;
  total: number;
} {
  const structure = computeSupportStructureWeight(unit);
  const engine = computeSupportVehicleEngineWeight(
    unit.engineRating,
    decodeBlkVehicleEngine(unit.engineType, false),
    { ...unit, cruiseMP: unit.movement.cruiseMP },
  );
  const standard = getArmorDefinition(ArmorTypeEnum.STANDARD);
  if (!standard) throw new Error('Missing standard armor definition');
  const armor =
    unit.armorType >= 43 && unit.armorType <= 51
      ? getSupportVehicleBarArmorWeight(
          unit.totalArmorPoints,
          unit.barRating,
          unit.armorTechRating,
          unit.tonnage < 5,
        )
      : ceilSupportWeight(
          unit.totalArmorPoints / standard.pointsPerTon,
          unit.tonnage,
        );
  const fuel = unit.fuelTonnage ?? 0;
  return {
    structure,
    engine,
    armor,
    fuel,
    total: ceilSupportWeight(engine + structure + armor + fuel, unit.tonnage),
  };
}
