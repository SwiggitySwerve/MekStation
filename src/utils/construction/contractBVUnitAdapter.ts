/**
 * Contract JSON -> BV dispatcher input (vehicles and aerospace): the mapper between
 * converter output (`id`/`location` rows, `armor.byLocation` / `armor.byArc`) and the
 * domain shape `calculateBattleValueForUnit` reads. It decides no BV rule.
 *
 * Mount flags and turret presence copy the BLK handlers (`VehicleUnitHandler`,
 * `VTOLUnitHandler`, `SupportVehicleUnitHandler`): a Tank rear-mounts REAR items and gets
 * a single turret from turret equipment; a VTOL gets a chin turret and nothing is
 * rear-mounted; a Support Vehicle has no turret. Unknown spellings throw instead of
 * defaulting (the handlers default to BODY / Tracked, hiding a converter fault).
 */
import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  GroundMotionType,
  type IAerospaceMovement,
  type IGroundMovement,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TurretType,
  type IVehicleMountedEquipment,
} from '@/types/unit/VehicleInterfaces';

/** The subset of a converter / `UnitContract` unit this adapter reads. */
export interface IContractBVSource {
  readonly id: string;
  readonly unitType: string;
  readonly tonnage: number;
  readonly motionType?: string;
  readonly movement: Readonly<
    Partial<
      Record<
        'cruiseMP' | 'flankMP' | 'jumpMP' | 'safeThrust' | 'maxThrust',
        number
      >
    >
  >;
  readonly structuralIntegrity?: number;
  readonly armor: {
    readonly type: string;
    readonly byLocation?: Readonly<Record<string, number>>;
    readonly byArc?: Readonly<Record<string, number>>;
    readonly barRating?: number;
  };
  readonly equipment?: readonly { id: string; location: string }[];
}

/** Domain-shaped vehicle value accepted by `calculateBattleValueForUnit`. */
export interface IContractBVVehicle {
  readonly unitType:
    | UnitType.VEHICLE
    | UnitType.VTOL
    | UnitType.SUPPORT_VEHICLE;
  readonly tonnage: number;
  readonly motionType: GroundMotionType;
  readonly movement: IGroundMovement;
  readonly totalArmorPoints: number;
  readonly armorByLocation: Readonly<Record<string, number>>;
  readonly equipment: readonly IVehicleMountedEquipment[];
  readonly turret?: { readonly type: TurretType };
  readonly chinTurret?: { readonly type: TurretType };
  /** Present only when the source carries a BAR rating (Support Vehicles). */
  readonly barRating?: number;
}

/** Domain-shaped aerospace value accepted by `calculateBattleValueForUnit`. */
export interface IContractBVAerospace {
  readonly unitType:
    | UnitType.AEROSPACE
    | UnitType.CONVENTIONAL_FIGHTER
    | UnitType.SMALL_CRAFT;
  readonly tonnage: number;
  readonly structuralIntegrity: number;
  readonly movement: IAerospaceMovement;
  /** Calculator lookup key: lower-case, hyphenated (`FERRO_FIBROUS` -> `ferro-fibrous`). */
  readonly armorType: string;
  readonly totalArmorPoints: number;
  readonly equipment: readonly { equipmentId: string; location: string }[];
}

const VEHICLE_UNIT_TYPES: ReadonlySet<string> = new Set([
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.SUPPORT_VEHICLE,
]);
const AEROSPACE_UNIT_TYPES: ReadonlySet<string> = new Set([
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
]);

/** Converter location tags (`VEHICLE_LOCATION_MAP`, `blk_vehicle_tables.py`). */
const VEHICLE_LOCATIONS: Readonly<Record<string, VehicleLocation>> = {
  ...VehicleLocation, // FRONT, LEFT, RIGHT, REAR, TURRET, TURRET_2, BODY
  SPONSON: VehicleLocation.BODY,
};

/** Converter arc tags (`AERO_LOCATION_MAP` / `SC_LOCATION_MAP`) -> calculator arc strings. */
const AEROSPACE_ARCS: Readonly<Record<string, string>> = {
  NOSE: 'Nose',
  LEFT_WING: 'Left Wing',
  RIGHT_WING: 'Right Wing',
  LEFT_SIDE: 'Left Side',
  RIGHT_SIDE: 'Right Side',
  AFT: 'Aft',
  FUSELAGE: 'Fuselage',
  WINGS: 'Wings',
};

function sumValues(values: Readonly<Record<string, number>> | undefined) {
  return Object.values(values ?? {}).reduce((a, b) => a + b, 0);
}

function lookup<T>(
  table: Readonly<Record<string, T>>,
  key: string,
  what: string,
) {
  const value = table[key];
  if (value === undefined) throw new Error(`Unknown ${what}: ${key}`);
  return value;
}

function contractVehicleToBVUnit(unit: IContractBVSource): IContractBVVehicle {
  const unitType = unit.unitType as IContractBVVehicle['unitType'];
  const motionType = Object.values(GroundMotionType).find(
    (m) => m === unit.motionType,
  );
  if (!motionType) throw new Error(`Unknown motionType: ${unit.motionType}`);

  const isTank = unitType === UnitType.VEHICLE;
  const equipment = (unit.equipment ?? []).map((item, index) => ({
    id: `mount-${index}`,
    equipmentId: item.id,
    name: item.id,
    location: lookup(VEHICLE_LOCATIONS, item.location, 'vehicle location'),
    isRearMounted: isTank && item.location === 'REAR',
    isTurretMounted:
      item.location.startsWith('TURRET') || item.location === 'SPONSON',
    isSponsonMounted: isTank && item.location === 'SPONSON',
  }));

  const hasTurretEquipment = equipment.some((e) => e.isTurretMounted);
  const armorByLocation = Object.fromEntries(
    Object.entries(unit.armor.byLocation ?? {}).map(([tag, points]) => [
      lookup(VEHICLE_LOCATIONS, tag, 'armor location'),
      points,
    ]),
  );

  return {
    unitType,
    tonnage: unit.tonnage,
    motionType,
    movement: {
      cruiseMP: unit.movement.cruiseMP ?? 0,
      flankMP: unit.movement.flankMP ?? 0,
      jumpMP: unit.movement.jumpMP ?? 0,
    },
    totalArmorPoints: sumValues(unit.armor.byLocation),
    armorByLocation,
    equipment,
    ...(isTank && hasTurretEquipment
      ? { turret: { type: TurretType.SINGLE } }
      : {}),
    ...(unitType === UnitType.VTOL && hasTurretEquipment
      ? { chinTurret: { type: TurretType.CHIN } }
      : {}),
    ...(unit.armor.barRating !== undefined
      ? { barRating: unit.armor.barRating }
      : {}),
  };
}

function contractAerospaceToBVUnit(
  unit: IContractBVSource,
): IContractBVAerospace {
  if (unit.structuralIntegrity === undefined) {
    throw new Error('Aerospace unit has no structuralIntegrity');
  }
  return {
    unitType: unit.unitType as IContractBVAerospace['unitType'],
    tonnage: unit.tonnage,
    structuralIntegrity: unit.structuralIntegrity,
    movement: {
      safeThrust: unit.movement.safeThrust ?? 0,
      maxThrust: unit.movement.maxThrust ?? 0,
    },
    armorType: unit.armor.type.toLowerCase().replace(/_/g, '-'),
    totalArmorPoints: sumValues(unit.armor.byArc),
    equipment: (unit.equipment ?? []).map((item) => ({
      equipmentId: item.id,
      location: lookup(AEROSPACE_ARCS, item.location, 'aerospace arc'),
    })),
  };
}

/** Route a contract unit to its adapter; throws for any other unitType. */
export function contractUnitToBVUnit(
  unit: IContractBVSource,
): IContractBVVehicle | IContractBVAerospace {
  if (VEHICLE_UNIT_TYPES.has(unit.unitType))
    return contractVehicleToBVUnit(unit);
  if (AEROSPACE_UNIT_TYPES.has(unit.unitType))
    return contractAerospaceToBVUnit(unit);
  throw new Error(`Unsupported unitType: ${unit.unitType}`);
}
