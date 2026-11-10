/**
 * Contract JSON -> BV dispatcher input (vehicles and aerospace): the mapper between
 * converter output (`id`/`location` rows, `armor.byLocation` / `armor.byArc`) and the
 * domain shape `calculateBattleValueForUnit` reads. It decides no BV rule.
 *
 * Tank mount flags and primary turret presence use the vehicle construction owner.
 * A sponson mount does not install a primary turret. A VTOL gets a chin turret
 * and nothing is rear-mounted; a Support Vehicle has no turret. Unknown spellings throw instead of
 * defaulting (the handlers default to BODY / Tracked, hiding a converter fault).
 */
import { mapHeatSinkType } from '@/services/conversion/ValueMappings';
import { resolveVehicleContractLocation } from '@/services/conversion/vehicleContractLocations';
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
import { parseVehicleEditor } from '@/types/unit/VehicleSerialization';
import {
  getPrimaryVehicleTurretType,
  getVehicleMountFlags,
} from '@/utils/construction/vehicle/equipmentMounts';
import { hasVehicleStealth } from '@/utils/construction/vehicle/vehicleBVMovement';

import type { ICapitalShipBVUnit } from './aerospace/capitalShipBV';
import type { IDropShipBVUnit } from './aerospace/dropShipBV';

import { isCapitalShipBVType } from './aerospace/aerospaceBVTypes';
import { calculateHeatDissipation } from './heatSinkCalculations';

/** The subset of a converter / `UnitContract` unit this adapter reads. */
export interface IContractBVSource {
  readonly id: string;
  readonly unitType: string;
  readonly subType?: string;
  readonly techBase?: string;
  readonly sourceTechType?: string;
  readonly year?: number;
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
  readonly heatSinks?: { readonly type: string; readonly count: number };
  readonly cockpit?: string;
  readonly internalType?: number;
  readonly armor: {
    readonly type: string;
    readonly byLocation?: Readonly<Record<string, number>>;
    readonly byArc?: Readonly<Record<string, number>>;
    readonly barRating?: number;
    readonly typeByArc?: Readonly<Record<string, number>>;
    readonly typeByLocation?: Readonly<Record<string, number>>;
    readonly barRatingByLocation?: Readonly<Record<string, number>>;
  };
  readonly equipment?: readonly { id: string; location: string }[];
  readonly vehicleEditor?: unknown;
}

/** Domain-shaped vehicle value accepted by `calculateBattleValueForUnit`. */
export interface IContractBVVehicle {
  readonly year?: number;
  readonly structureLocations: readonly string[];
  readonly internalStructureType: number;
  readonly hasStealth: boolean;
  readonly unitType:
    | UnitType.VEHICLE
    | UnitType.VTOL
    | UnitType.SUPPORT_VEHICLE;
  readonly tonnage: number;
  readonly motionType: GroundMotionType;
  readonly movement: IGroundMovement;
  readonly totalArmorPoints: number;
  readonly armorByLocation: Readonly<Record<string, number>>;
  readonly armorType: string;
  readonly armorTypeByLocation: Readonly<Record<string, number>>;
  readonly barRatingByLocation: Readonly<Record<string, number>>;
  readonly equipment: readonly IVehicleMountedEquipment[];
  readonly turret?: { readonly type: TurretType };
  readonly chinTurret?: { readonly type: TurretType };
  /** Present only when the source carries a BAR rating (Support Vehicles). */
  readonly barRating?: number;
}

/** Domain-shaped aerospace value accepted by `calculateBattleValueForUnit`. */
export interface IContractBVAerospace {
  readonly armorByArc?: Readonly<Record<string, number>>;
  readonly armorTypeByArc?: Readonly<Record<string, number>>;
  readonly cockpit?: string;
  readonly barRating?: number;
  readonly heatCapacity?: number;
  readonly isSupportVehicle: boolean;
  readonly techBase?: string;
  readonly sourceTechType?: string;
  readonly year?: number;
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

/** Converter arc tags (`AERO_LOCATION_MAP` / `SC_LOCATION_MAP`) -> calculator arc strings. */
const AEROSPACE_ARCS: Readonly<Record<string, string>> = {
  NOSE: 'Nose',
  LEFT_WING: 'Left Wing',
  RIGHT_WING: 'Right Wing',
  LEFT_SIDE: 'Left Side',
  RIGHT_SIDE: 'Right Side',
  AFT: 'Aft',
  FUSELAGE: 'Fuselage',
  HULL: 'Fuselage',
  WINGS: 'Wings',
};

/** Shared contract arc projection for BV and combat adapters. */
export function resolveAerospaceContractArc(location: string): string {
  const key = location.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  return lookup(AEROSPACE_ARCS, key, 'aerospace arc');
}

function requireFact<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing required BV fact: ${name}`);
  return value;
}

function sumValues(values: Readonly<Record<string, number>>) {
  return Object.values(values).reduce((a, b) => a + b, 0);
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

export function contractVehicleToBVUnit(
  unit: IContractBVSource,
): IContractBVVehicle {
  const unitType = unit.unitType as IContractBVVehicle['unitType'];
  const motionType = Object.values(GroundMotionType).find(
    (m) => m === unit.motionType,
  );
  if (!motionType) throw new Error(`Unknown motionType: ${unit.motionType}`);

  const editor = parseVehicleEditor(
    unit.vehicleEditor,
    unit.equipment?.length ?? 0,
  );
  const isTank = unitType === UnitType.VEHICLE;
  const equipment = (unit.equipment ?? []).map((item, index) => {
    const location = resolveVehicleContractLocation(item.location);
    const flags = getVehicleMountFlags(
      item.location === 'SPONSON' ? 'Sponson Turret' : location,
    );
    const savedMount = editor?.mounts[index];
    return {
      id: `mount-${index}`,
      equipmentId: item.id,
      ...(savedMount?.sourceIdentity
        ? { sourceIdentity: savedMount.sourceIdentity }
        : {}),
      ...(savedMount?.isAmmo === undefined
        ? {}
        : { isAmmo: savedMount.isAmmo }),
      name: item.id,
      location,
      isRearMounted: isTank && flags.isRearMounted,
      isTurretMounted: flags.isTurretMounted,
      isSponsonMounted: isTank && flags.isSponsonMounted,
    };
  });

  const hasTurretEquipment = equipment.some((e) => e.isTurretMounted);
  const sourceArmor = requireFact(unit.armor.byLocation, 'armor.byLocation');
  // Armor-entry presence, including 0, installs the turrets as in the handler
  // (BLKTankFile.java:180-192).
  const primaryTurretType = vehicleContractTurretType(unit);
  const armorTypeByLocation: Record<string, number> = {};
  const barRatingByLocation: Record<string, number> = {};
  const armorByLocation = Object.fromEntries(
    Object.entries(sourceArmor).map(([tag, points]) => {
      const location = resolveVehicleContractLocation(tag, 'armor location');
      if (unit.armor.typeByLocation?.[tag] !== undefined)
        armorTypeByLocation[location] = unit.armor.typeByLocation[tag];
      if (unit.armor.barRatingByLocation?.[tag] !== undefined)
        barRatingByLocation[location] = unit.armor.barRatingByLocation[tag];
      return [location, points];
    }),
  );

  return {
    unitType,
    year: unit.year,
    structureLocations: Object.keys(armorByLocation),
    internalStructureType: unit.internalType ?? 0,
    hasStealth: hasVehicleStealth(unit.armor.type),
    tonnage: unit.tonnage,
    motionType,
    movement: {
      cruiseMP: requireFact(unit.movement.cruiseMP, 'movement.cruiseMP'),
      flankMP: requireFact(unit.movement.flankMP, 'movement.flankMP'),
      jumpMP: unit.movement.jumpMP ?? 0,
    },
    totalArmorPoints: sumValues(sourceArmor),
    armorByLocation,
    armorType: unit.armor.type,
    armorTypeByLocation,
    barRatingByLocation,
    equipment,
    ...(isTank && primaryTurretType !== undefined
      ? { turret: { type: primaryTurretType } }
      : {}),
    ...(unitType === UnitType.VTOL && hasTurretEquipment
      ? { chinTurret: { type: TurretType.CHIN } }
      : {}),
    ...(unit.armor.barRating !== undefined
      ? { barRating: unit.armor.barRating }
      : {}),
  };
}

/** Installed turret identity, shared by BV transport and combat adaptation. */
export function vehicleContractTurretType(
  unit: IContractBVSource,
): TurretType | undefined {
  return getPrimaryVehicleTurretType(
    (unit.equipment ?? []).map((item) =>
      resolveVehicleContractLocation(item.location),
    ),
    undefined,
    {
      hasTurret: unit.armor.byLocation?.TURRET !== undefined,
      hasSecondTurret: unit.armor.byLocation?.TURRET_2 !== undefined,
    },
  );
}

/** One armor-fact projection for contract and live editor aerospace inputs. */
export function projectAerospaceBVArmor(
  armor: Pick<IContractBVSource['armor'], 'type' | 'byArc' | 'typeByArc'>,
): Pick<
  IContractBVAerospace,
  'armorType' | 'totalArmorPoints' | 'armorByArc' | 'armorTypeByArc'
> {
  return {
    armorType: armor.type.toLowerCase().replace(/_/g, '-'),
    totalArmorPoints: sumValues(requireFact(armor.byArc, 'armor.byArc')),
    armorByArc: armor.byArc,
    armorTypeByArc: armor.typeByArc,
  };
}

function contractAerospaceArmorFacts(unit: IContractBVSource) {
  const { armorType, totalArmorPoints } = projectAerospaceBVArmor(unit.armor);
  return { armorType, totalArmorPoints };
}

function contractAerospaceToBVUnit(
  unit: IContractBVSource,
): IContractBVAerospace {
  if (unit.structuralIntegrity === undefined) {
    throw new Error('Aerospace unit has no structuralIntegrity');
  }
  const fixedWingSupport = unit.subType === 'FixedWingSupport';
  return {
    unitType: unit.unitType as IContractBVAerospace['unitType'],
    heatCapacity: unit.heatSinks
      ? calculateHeatDissipation(
          mapHeatSinkType(unit.heatSinks.type),
          unit.heatSinks.count,
        )
      : undefined,
    isSupportVehicle: fixedWingSupport,
    ...(unit.cockpit === undefined ? {} : { cockpit: unit.cockpit }),
    ...(fixedWingSupport && unit.armor.barRating !== undefined
      ? { barRating: unit.armor.barRating }
      : {}),
    techBase: unit.techBase,
    sourceTechType: unit.sourceTechType,
    year: unit.year,
    tonnage: unit.tonnage,
    structuralIntegrity: unit.structuralIntegrity,
    movement: {
      safeThrust: requireFact(unit.movement.safeThrust, 'movement.safeThrust'),
      maxThrust: requireFact(unit.movement.maxThrust, 'movement.maxThrust'),
    },
    ...projectAerospaceBVArmor(unit.armor),
    equipment: (unit.equipment ?? []).map((item) => ({
      equipmentId: item.id,
      location: resolveAerospaceContractArc(item.location),
    })),
  };
}

function contractLargeAerospaceStageFacts(
  unit: IContractBVSource,
): Pick<IDropShipBVUnit, 'maxThrust' | 'heatSinks' | 'cockpit' | 'year'> {
  return {
    year: unit.year,
    ...(unit.movement.maxThrust === undefined
      ? {}
      : { maxThrust: unit.movement.maxThrust }),
    ...(unit.heatSinks
      ? {
          heatSinks: {
            type: mapHeatSinkType(unit.heatSinks.type),
            count: unit.heatSinks.count,
          },
        }
      : {}),
    ...(unit.cockpit === undefined ? {} : { cockpit: unit.cockpit }),
  };
}

/** Route a contract unit to its adapter; throws for any other unitType. */
export function contractUnitToBVUnit(
  unit: IContractBVSource,
):
  | IContractBVVehicle
  | IContractBVAerospace
  | IDropShipBVUnit
  | ICapitalShipBVUnit {
  if (isCapitalShipBVType(unit.unitType)) {
    return {
      unitType: unit.unitType,
      structuralIntegrity: requireFact(
        unit.structuralIntegrity,
        'structuralIntegrity',
      ),
      ...contractAerospaceArmorFacts(unit),
      ...contractLargeAerospaceStageFacts(unit),
      equipment: (unit.equipment ?? []).map((item) => ({
        equipmentId: item.id,
        location: item.location,
      })),
    };
  }
  if (unit.unitType === UnitType.DROPSHIP) {
    return {
      unitType: UnitType.DROPSHIP,
      structuralIntegrity: requireFact(
        unit.structuralIntegrity,
        'structuralIntegrity',
      ),
      ...contractAerospaceArmorFacts(unit),
      ...contractLargeAerospaceStageFacts(unit),
      equipment: (unit.equipment ?? []).map((item) => ({
        equipmentId: item.id,
        location: item.location,
      })),
    };
  }
  if (VEHICLE_UNIT_TYPES.has(unit.unitType))
    return contractVehicleToBVUnit(unit);
  if (AEROSPACE_UNIT_TYPES.has(unit.unitType))
    return contractAerospaceToBVUnit(unit);
  throw new Error(`Unsupported unitType: ${unit.unitType}`);
}
