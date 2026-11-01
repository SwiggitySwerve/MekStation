import { z } from 'zod';

import {
  blkEngineCode,
  decodeBlkConstructionEngine,
} from '@/services/conversion/blkEngineIdentity';
import { isSuperHeavyTank } from '@/services/conversion/blkVehicleArmorLayout';
import { resolveVehicleContractLocation } from '@/services/conversion/vehicleContractLocations';
import { getUnitIndexWeightClass } from '@/services/units/unitWeightClass';
import { setTurretTypeLogic } from '@/stores/useVehicleStore.actions';
import {
  createDefaultVehicleState,
  type VehicleState,
} from '@/stores/vehicleState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { UnitContract } from '@/types/contracts';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import {
  computeVehicleArmorWeight,
  getSupportVehicleBarArmorWeight,
} from '@/utils/construction/vehicle/armor';
import {
  computeFlankMP,
  computeStoredVehicleEngineRating,
} from '@/utils/construction/vehicle/engine';
import {
  getPrimaryVehicleTurretType,
  getVehicleMountFlags,
} from '@/utils/construction/vehicle/equipmentMounts';
import { generateUnitId } from '@/utils/uuid';

import { mapArmorType, mapRulesLevel, mapTechBase } from './componentMappers';
import { createVehicleSession } from './createVehicleSession';
import { isDefinitionForFamily } from './definitionTypes';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';

export class UnsupportedVehicleConfigurationError extends UnsupportedUnitConfigurationError {
  readonly code = 'unsupported-configuration';

  constructor(
    readonly field: string,
    readonly value: string,
  ) {
    super(`Vehicle ${field} "${value}" is not supported by this editor.`);
  }
}

export type NormalizedVehicleConfiguration = Omit<
  VehicleState,
  'id' | 'createdAt' | 'lastModifiedAt' | 'isModified'
>;

// The generic contract permits absent family-specific facts and untyped movement
// extensions. Require and validate the facts this mapper consumes at this edge.
const requiredFields = z.object({
  chassis: z.string().min(1),
  tonnage: z.number().positive(),
  motionType: z.string(),
  movement: z.object({ cruiseMP: z.number().int().nonnegative() }),
});

export function normalizeVehicleConfiguration(
  input: unknown,
): NormalizedVehicleConfiguration {
  const definition = UnitContract.parse(input);
  if (!isDefinitionForFamily('vehicles', definition)) {
    throw new UnsupportedVehicleConfigurationError(
      'unitType',
      definition.unitType,
    );
  }
  const {
    chassis,
    tonnage,
    motionType: requestedMotion,
    movement,
  } = requiredFields.parse(definition);
  const motionType = Object.values(GroundMotionType).find(
    (type) => type === requestedMotion,
  );
  if (!motionType)
    throw new UnsupportedVehicleConfigurationError(
      'motionType',
      requestedMotion,
    );
  const unitType =
    definition.unitType === 'SupportVehicle'
      ? UnitType.SUPPORT_VEHICLE
      : definition.unitType === 'Support Vehicle'
        ? UnitType.SUPPORT_VEHICLE
        : definition.unitType === 'VTOL'
          ? UnitType.VTOL
          : UnitType.VEHICLE;
  const engine = definition.engine;
  const armor = definition.armor;
  if (!engine || !armor?.byLocation)
    throw new TypeError('Vehicle requires engine and armor.byLocation');
  const techBase = mapTechBase(definition.techBase ?? 'INNER_SPHERE');
  let engineType: VehicleState['engineType'];
  try {
    const decoded = decodeBlkConstructionEngine(
      blkEngineCode(engine.type === 'CLAN_XL' ? 'XL' : engine.type),
      engine.type === 'CLAN_XL' ||
        (definition.clanEngine ?? definition.techBase === 'CLAN'),
    );
    if (decoded === null) throw new Error('Absent engine');
    engineType = decoded;
  } catch {
    throw new UnsupportedVehicleConfigurationError('engine.type', engine.type);
  }
  const model = definition.model ?? definition.variant ?? '';
  const defaults = createDefaultVehicleState({
    id: 'definition',
    name: `${chassis} ${model}`.trim(),
    tonnage,
    techBase,
    motionType,
    unitType,
  });
  const armorAllocation = { ...defaults.armorAllocation };
  for (const [tag, points] of Object.entries(armor.byLocation)) {
    armorAllocation[resolveVehicleContractLocation(tag, 'armor location')] =
      points;
  }
  const armorType = mapArmorType(armor.type, techBase);
  if (
    armorType === ArmorTypeEnum.STANDARD &&
    !['STANDARD', 'BAR'].includes(armor.type)
  ) {
    throw new UnsupportedVehicleConfigurationError('armor.type', armor.type);
  }
  const totalArmor = Object.values(armor.byLocation).reduce(
    (sum, points) => sum + points,
    0,
  );
  const barRating =
    unitType === UnitType.SUPPORT_VEHICLE
      ? (armor.barRating ?? defaults.barRating)
      : null;
  const occupiedTurrets = (definition.equipment ?? [])
    .filter((item) => getVehicleMountFlags(item.location).isTurretMounted)
    .map((item) => resolveVehicleContractLocation(item.location));
  const hasTurret = armor.byLocation.TURRET !== undefined;
  const type = getPrimaryVehicleTurretType(
    occupiedTurrets,
    motionType === GroundMotionType.VTOL &&
      (hasTurret || occupiedTurrets.length > 0)
      ? 'chin'
      : undefined,
    { hasTurret, hasSecondTurret: armor.byLocation.TURRET_2 !== undefined },
  );
  const turret =
    type === undefined
      ? null
      : (setTurretTypeLogic(defaults, type).turret ?? null);
  const secondaryTurret =
    type === TurretType.DUAL
      ? (setTurretTypeLogic(defaults, TurretType.SINGLE).turret ?? null)
      : null;
  // The store's legacy action uses 360 degrees even for chin turrets; preserve
  // the source arc while leaving its existing capacity derivation untouched.
  const configuredTurret =
    turret && type === TurretType.CHIN
      ? { ...turret, rotationArc: 180 }
      : turret;
  const {
    id: _id,
    createdAt: _created,
    lastModifiedAt: _modified,
    isModified: _dirty,
    ...configuration
  } = defaults;
  return {
    ...configuration,
    chassis,
    model,
    weightClass: getUnitIndexWeightClass(tonnage),
    mulId: String(definition.mulId ?? -1),
    year: definition.year ?? defaults.year,
    rulesLevel: mapRulesLevel(definition.rulesLevel ?? 'STANDARD'),
    engineType,
    engineRating:
      engine.rating ??
      computeStoredVehicleEngineRating(
        tonnage,
        movement.cruiseMP,
        motionType,
        unitType === UnitType.SUPPORT_VEHICLE,
      ),
    cruiseMP: movement.cruiseMP,
    flankMP: computeFlankMP(movement.cruiseMP),
    armorAllocation,
    armorType,
    armorTonnage:
      armor.type === 'BAR' && barRating !== null
        ? getSupportVehicleBarArmorWeight(
            totalArmor,
            barRating,
            // Same fallback as SupportVehicleUnitHandler: armor, then
            // structural tech rating, then F (index 5).
            definition.armorTechRating ?? definition.structuralTechRating ?? 5,
            tonnage < 5, // RoundWeight.usesKilogramStandard: small support
          )
        : computeVehicleArmorWeight(totalArmor, armorType),
    barRating,
    turret: configuredTurret,
    secondaryTurret,
    isSuperheavy:
      unitType === UnitType.VEHICLE && isSuperHeavyTank(motionType, tonnage),
    isTrailer: definition.isTrailer ?? false,
    isOmni: definition.isOmni ?? false,
  };
}

/** Contract JSON or a definition returned by loadUnitDefinition('vehicles', id). */
export function mapToVehicleState(input: unknown): VehicleState {
  return createVehicleSession(normalizeVehicleConfiguration(input), {
    id: generateUnitId(),
    createdAt: Date.now(),
  });
}
