import { z } from 'zod';

import {
  blkEngineCode,
  decodeBlkVehicleEngine,
} from '@/services/conversion/blkEngineIdentity';
import { isSuperHeavyTank } from '@/services/conversion/blkVehicleArmorLayout';
import { resolveVehicleContractLocation } from '@/services/conversion/vehicleContractLocations';
import { mapVehicleTurretContext } from '@/services/conversion/vehicleTurretContext';
import { getUnitIndexWeightClass } from '@/services/units/unitWeightClass';
import { setTurretTypeLogic } from '@/stores/useVehicleStore.actions';
import {
  createDefaultVehicleState,
  createVehicleMountedEquipment,
  type VehicleState,
} from '@/stores/vehicleState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TurretType,
  IVehicleMountedEquipment,
} from '@/types/unit/VehicleInterfaces';
import { parseVehicleEditor } from '@/types/unit/VehicleSerialization';
import {
  computeVehicleArmorWeight,
  getSupportVehicleBarArmorWeight,
  resolveSupportVehicleArmorTechRating,
} from '@/utils/construction/vehicle/armor';
import {
  computeFlankMP,
  computeStoredVehicleEngineRating,
  isLargeSupportVehicle,
} from '@/utils/construction/vehicle/engine';
import {
  getPrimaryVehicleTurretType,
  getVehicleMountFlags,
} from '@/utils/construction/vehicle/equipmentMounts';
import { generateUnitId } from '@/utils/uuid';

import {
  mapArmorType,
  mapRulesLevel,
  mapTechBase,
  mapTechBaseMode,
  mapUnitTechBaseIdentity,
} from './componentMappers';
import { createVehicleSession } from './createVehicleSession';
import { isDefinitionForFamily } from './definitionTypes';
import { resolveEquipmentId } from './equipmentResolution';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';

export { vehicleEditorSchema } from '@/types/unit/VehicleSerialization';

type UnsupportedVehicleField =
  | 'unitType'
  | 'motionType'
  | 'engine.type'
  | 'armor.type';

/** Contract value in plain words: "FERRO_LAMELLOR" becomes "ferro lamellor". */
const plain = (value: string) => value.toLowerCase().replace(/_/g, ' ');

const UNSUPPORTED_VEHICLE_COPY: Readonly<
  Record<UnsupportedVehicleField, (value: string) => string>
> = {
  unitType: (value) => `The vehicle editor cannot open ${value} units.`,
  motionType: (value) =>
    `The vehicle editor cannot open vehicles with ${plain(value)} motion yet.`,
  'engine.type': (value) =>
    `The vehicle editor cannot open vehicles with ${plain(value)} engines yet.`,
  'armor.type': (value) =>
    `The vehicle editor cannot open vehicles with ${plain(value)} armor yet.`,
};

export class UnsupportedVehicleConfigurationError extends UnsupportedUnitConfigurationError {
  readonly code = 'unsupported-configuration';

  constructor(
    readonly field: UnsupportedVehicleField,
    readonly value: string,
  ) {
    super(UNSUPPORTED_VEHICLE_COPY[field](value));
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
    engineType = decodeBlkVehicleEngine(
      blkEngineCode(engine.type === 'CLAN_XL' ? 'XL' : engine.type),
      engine.type === 'CLAN_XL' ||
        (definition.clanEngine ?? definition.techBase === 'CLAN'),
    );
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
  const armorTechRating = resolveSupportVehicleArmorTechRating(
    definition.armorTechRating,
    definition.structuralTechRating,
  );
  const barRating =
    unitType === UnitType.SUPPORT_VEHICLE ? (armor.barRating ?? null) : null;
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
  // the source arc (there is no turret capacity cap, owner ruling 5).
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
    // Entity.getEngineTechRating falls back to structure (Entity.java:17870-17875).
    engineTechRating:
      unitType === UnitType.SUPPORT_VEHICLE
        ? (definition.engineTechRating ?? definition.structuralTechRating)
        : undefined,
    structuralTechRating:
      unitType === UnitType.SUPPORT_VEHICLE
        ? definition.structuralTechRating
        : undefined,
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
            armorTechRating,
            tonnage < 5, // RoundWeight.usesKilogramStandard: small support
          )
        : computeVehicleArmorWeight(totalArmor, armorType),
    barRating,
    usesBarArmor:
      unitType === UnitType.SUPPORT_VEHICLE ? armor.type === 'BAR' : undefined,
    armorTechRating:
      unitType === UnitType.SUPPORT_VEHICLE ? armorTechRating : undefined,
    turret: configuredTurret,
    secondaryTurret,
    isSuperheavy:
      unitType === UnitType.SUPPORT_VEHICLE
        ? isLargeSupportVehicle(tonnage, motionType)
        : unitType === UnitType.VEHICLE &&
          isSuperHeavyTank(motionType, tonnage),
    isTrailer: definition.isTrailer ?? false,
    transporters: definition.transporters,
    ...mapVehicleTurretContext(
      definition.isOmni,
      unitType === UnitType.VTOL,
      (tag) => definition[tag],
    ),
    equipment: mapVehicleEquipment(
      definition.equipment,
      techBase,
      mapTechBaseMode(definition.techBase ?? 'INNER_SPHERE'),
      motionType === GroundMotionType.VTOL,
    ),
    ...mapUnitTechBaseIdentity('vehicles', definition),
  };
}

/** Contract JSON or a definition returned by loadUnitDefinition('vehicles', id). */
export function mapToVehicleState(input: unknown): VehicleState {
  const definition = UnitContract.parse(input);
  const configuration = normalizeVehicleConfiguration(definition);
  const savedEditor = parseVehicleEditor(
    definition.vehicleEditor,
    configuration.equipment.length,
  );
  if (savedEditor) {
    const { mounts, ...editor } = savedEditor;
    Object.assign(configuration, editor);
    configuration.equipment = configuration.equipment.map((item, index) => ({
      ...item,
      // Saved canonical identities are already resolved; resolving them again
      // can change technology or ammunition identity in mixed-tech designs.
      equipmentId: definition.equipment?.[index].id ?? item.equipmentId,
      isRearMounted: definition.equipment?.[index].isRearMounted ?? false,
      isOmniPodMounted: definition.equipment?.[index].isOmniPodMounted,
      resolutionWarning: undefined,
      ...mounts[index],
    }));
  }
  const state = createVehicleSession(configuration, {
    id: generateUnitId(),
    createdAt: Date.now(),
  });
  return {
    ...state,
    ...mapUnitTechBaseIdentity('vehicles', definition),
    equipment: state.equipment.map((item) => ({
      ...item,
      linkedAmmoId: configuration.equipment.some(
        (mount) => mount.id === item.linkedAmmoId,
      )
        ? `${state.id}-${item.linkedAmmoId}`
        : item.linkedAmmoId,
    })),
  };
}

type VehicleEquipmentSource = NonNullable<
  z.input<typeof UnitContract>['equipment']
>[number];

/** Definition equipment to deterministic mounts; session creation assigns IDs. */
export function mapVehicleEquipment(
  equipment: readonly VehicleEquipmentSource[] | undefined,
  techBase: TechBase,
  techBaseMode: TechBaseMode,
  chinTurret: boolean,
): IVehicleMountedEquipment[] {
  return (equipment ?? []).map((item, index) => {
    const location = resolveVehicleContractLocation(item.location);
    const flags = getVehicleMountFlags(
      item.location === 'SPONSON' ? 'Sponson Turret' : item.location,
      item.name ?? item.id,
      chinTurret,
    );
    const { equipmentDef, resolvedId } = resolveEquipmentId(
      item.id,
      techBase,
      techBaseMode,
      undefined,
      item.name,
    );
    const identity = equipmentDef
      ? createVehicleMountedEquipment(equipmentDef, `mount-${index}`)
      : {
          id: `mount-${index}`,
          equipmentId: item.id,
          name: item.name ?? item.id,
        };
    return {
      ...identity,
      ...(identity.equipmentId === item.id
        ? {}
        : {
            sourceIdentity: {
              sourceId: item.id,
              resolvedId: identity.equipmentId,
            },
          }),
      location,
      ...flags,
      isRearMounted: item.isRearMounted || flags.isRearMounted,
      isOmniPodMounted: item.isOmniPodMounted ?? flags.isOmniPodMounted,
      linkedAmmoId: item.linkedAmmo,
      ...(equipmentDef
        ? {}
        : {
            resolutionWarning: {
              code: 'unresolved-equipment' as const,
              sourceId: item.id,
              attemptedId: resolvedId,
            },
          }),
    };
  });
}
