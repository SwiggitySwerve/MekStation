/**
 * Aerospace definition to editor state.
 *
 * Maps a validated aerospace definition, from
 * loadUnitDefinition('aerospace', id), to the existing AerospaceState for
 * aerospace fighters, conventional fighters, FixedWingSupport and small craft.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */

import { aerospaceStructuralIntegrity } from '@/services/conversion/BlkParserService.helpers';
import {
  DEFAULT_CAPITAL_TRANSPORT_BAY_RULES,
  parseCapitalTransporterString,
  type ITransportBayTypeRule,
} from '@/services/units/handlers/transportBayParsing';
import {
  AerospaceState,
  IAerospaceArmorAllocation,
  createDefaultAerospaceState,
  createEmptyAerospaceArmorAllocation,
} from '@/stores/aerospaceState';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
  IAerospaceMountedEquipment,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { BayType, ITransportBay } from '@/types/unit/CapitalShipInterfaces';
import { makeSmallCraftCrew } from '@/utils/construction/aerospace/crewCalculations';
import { FUEL_POINTS_PER_TON } from '@/utils/construction/aerospace/fuelCalculations';
import { calculateMaxThrust } from '@/utils/construction/aerospace/thrustCalculations';

import type { UnitDefinitionForFamily } from './definitionTypes';

import {
  mapArmorType,
  mapEngineType,
  mapRulesLevel,
  mapTechBase,
} from './componentMappers';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';

export type AerospaceDefinition = UnitDefinitionForFamily<'aerospace'>;

const SUPPORTED_SUBTYPES = new Set([
  'AerospaceFighter',
  'ConventionalFighter',
  'FixedWingSupport',
  'SmallCraft',
]);

/**
 * Small craft sides are Aero's wing locations under another name
 * (SmallCraft.java:77-78: "Left Side", "Right Side").
 */
const SMALL_CRAFT_SIDES: Readonly<Record<string, AerospaceLocation>> = {
  LEFT_SIDE: AerospaceLocation.LEFT_WING,
  RIGHT_SIDE: AerospaceLocation.RIGHT_WING,
};

/** The converter keeps BLK's "(R) " rear-mount prefix in name and id. */
const REAR_PREFIX = '(R) ';

/** Small craft carry infantry and battle armor bays the capital rules miss. */
const SMALL_CRAFT_BAY_RULES: readonly ITransportBayTypeRule[] = [
  { tokens: ['battlearmor'], type: BayType.BATTLE_ARMOR },
  { tokens: ['infantry', 'troopspace'], type: BayType.INFANTRY },
  ...DEFAULT_CAPITAL_TRANSPORT_BAY_RULES,
];

/**
 * Contract engine type to the construction engine type. LIGHT, XXL and
 * FISSION have no construction equivalent; they use the fusion fuel rate,
 * and engineType keeps the exact type.
 */
const AEROSPACE_ENGINE_BY_CONTRACT: Readonly<
  Record<string, AerospaceEngineType>
> = {
  FUSION: AerospaceEngineType.FUSION,
  XL: AerospaceEngineType.XL,
  CLAN_XL: AerospaceEngineType.XL,
  COMPACT: AerospaceEngineType.COMPACT_FUSION,
  ICE: AerospaceEngineType.ICE,
  FUEL_CELL: AerospaceEngineType.FUEL_CELL,
};

const COCKPIT_BY_CONTRACT: Readonly<Record<string, AerospaceCockpitType>> = {
  STANDARD: AerospaceCockpitType.STANDARD,
  SMALL: AerospaceCockpitType.SMALL,
  PRIMITIVE: AerospaceCockpitType.PRIMITIVE,
  COMMAND_CONSOLE: AerospaceCockpitType.COMMAND_CONSOLE,
};

/** Converter arc keys are the AerospaceLocation member names. */
function mapArc(key: string, isSmallCraft: boolean): AerospaceLocation {
  const location =
    (isSmallCraft ? SMALL_CRAFT_SIDES[key] : undefined) ??
    AerospaceLocation[key as keyof typeof AerospaceLocation];
  if (!location) {
    throw new UnsupportedUnitConfigurationError(
      `Unknown aerospace location "${key}"`,
    );
  }
  return location;
}

function mapArmorAllocation(
  byArc: Readonly<Record<string, number>> = {},
  isSmallCraft: boolean,
): IAerospaceArmorAllocation {
  const allocation = createEmptyAerospaceArmorAllocation();
  for (const [arc, points] of Object.entries(byArc)) {
    allocation[mapArc(arc, isSmallCraft)] = points;
  }
  return allocation;
}

function mapEquipment(
  definition: AerospaceDefinition,
  isSmallCraft: boolean,
): IAerospaceMountedEquipment[] {
  return (definition.equipment ?? []).map((item, index) => {
    const sourceName = item.name ?? item.id;
    const prefixed = sourceName.startsWith(REAR_PREFIX);
    return {
      id: `mount-${index}`,
      equipmentId: prefixed ? item.id.replace(/^r-/, '') : item.id,
      name: prefixed ? sourceName.slice(REAR_PREFIX.length) : sourceName,
      location: mapArc(item.location, isSmallCraft),
      ...(item.isRearMounted || prefixed ? { isRearMounted: true } : {}),
    };
  });
}

/** Transport bays; quarters lines are crew and passengers, not bays. */
function mapBays(transporters: readonly string[] = []): ITransportBay[] {
  return transporters
    .filter((line) => !line.split(':')[0].toLowerCase().includes('quarters'))
    .flatMap(
      (line, index) =>
        parseCapitalTransporterString(line, index + 1, SMALL_CRAFT_BAY_RULES) ??
        [],
    );
}

/** Definition subtype; older definitions only carry the unit type. */
function definitionSubType(definition: AerospaceDefinition): string {
  if (typeof definition.subType === 'string') return definition.subType;
  return definition.unitType === 'Aerospace'
    ? 'AerospaceFighter'
    : definition.unitType.replace(/\s/g, '');
}

export function mapAerospaceDefinitionToState(
  definition: AerospaceDefinition,
  session: { readonly id?: string; readonly createdAt?: number } = {},
): AerospaceState {
  const subType = definitionSubType(definition);
  if (!SUPPORTED_SUBTYPES.has(subType)) {
    throw new UnsupportedUnitConfigurationError(
      `The aerospace editor cannot load ${subType} definitions`,
    );
  }
  const isSmallCraft = subType === 'SmallCraft';
  const isConventional = subType !== 'AerospaceFighter' && !isSmallCraft;
  const isFixedWingSupport = subType === 'FixedWingSupport';
  const chassis = definition.chassis ?? '';
  const model = definition.model ?? '';
  const tonnage = definition.tonnage ?? 0;
  const techBase = mapTechBase(definition.techBase ?? 'INNER_SPHERE');
  const base = createDefaultAerospaceState({
    id: session.id,
    name: `${chassis} ${model}`.trim(),
    tonnage,
    techBase,
    isConventional,
    isSmallCraft,
  });

  // Small craft ICE is a runtime placeholder (SmallCraft.java:128-130), not a
  // construction engine, so they keep the default engine.
  const engineTypeName = isSmallCraft
    ? undefined
    : (definition.engine?.type ?? 'FUSION');
  const aerospaceEngineType = engineTypeName
    ? (AEROSPACE_ENGINE_BY_CONTRACT[engineTypeName] ??
      AerospaceEngineType.FUSION)
    : base.aerospaceEngineType;
  const safeThrust = Number(definition.movement?.safeThrust ?? 0);
  const fuelPoints = definition.fuel ?? 0;
  const heatSinks = definition.heatSinks?.count ?? 0;
  const doubleHeatSinks = definition.heatSinks?.type.startsWith('DOUBLE');
  const armorType = mapArmorType(
    definition.armor?.type ?? 'STANDARD',
    techBase,
  );
  const armorAllocation = mapArmorAllocation(
    definition.armor?.byArc,
    isSmallCraft,
  );
  const armorPoints = Object.values(armorAllocation).reduce((a, b) => a + b, 0);
  const pointsPerTon = getArmorDefinition(armorType)?.pointsPerTon ?? 16;
  const createdAt = session.createdAt ?? base.createdAt;

  return {
    ...base,
    chassis,
    model,
    mulId: String(definition.mulId ?? -1),
    year: definition.year ?? base.year,
    rulesLevel: mapRulesLevel(definition.rulesLevel ?? 'STANDARD'),
    isFixedWingSupport,
    motionType:
      definition.motionType === 'SPHEROID'
        ? AerospaceMotionType.SPHEROID
        : AerospaceMotionType.AERODYNE,
    isOmni: definition.isOmni ?? false,
    engineType: engineTypeName
      ? mapEngineType(engineTypeName, techBase)
      : base.engineType,
    aerospaceEngineType,
    engineRating: definition.engine?.rating ?? tonnage * safeThrust,
    safeThrust,
    maxThrust: Number(
      definition.movement?.maxThrust ?? calculateMaxThrust(safeThrust),
    ),
    fuelTons: fuelPoints / FUEL_POINTS_PER_TON[aerospaceEngineType],
    fuelPoints,
    structuralIntegrity: aerospaceStructuralIntegrity({
      aerospaceSubType: base.aerospaceSubType,
      isFixedWingSupport,
      tonnage,
      safeThrust,
      structuralIntegrity: Number(definition.structuralIntegrity ?? 0),
    }),
    cockpitType:
      COCKPIT_BY_CONTRACT[definition.cockpit ?? 'STANDARD'] ??
      AerospaceCockpitType.STANDARD,
    heatSinks,
    heatSinkPool: heatSinks * (doubleHeatSinks ? 2 : 1),
    doubleHeatSinks: doubleHeatSinks ?? false,
    armorType,
    armorTonnage: Math.ceil((armorPoints / pointsPerTon) * 2) / 2,
    armorAllocation,
    hasBombBay: definition.hasBombBay === true,
    bombCapacity: Number(definition.bombCapacity ?? 0),
    crew: isSmallCraft
      ? makeSmallCraftCrew(
          Number(definition.crew ?? 0),
          Number(definition.passengers ?? 0),
          Number(definition.marines ?? 0),
        )
      : null,
    bays: mapBays(definition.transporters),
    equipment: mapEquipment(definition, isSmallCraft),
    isModified: false,
    createdAt,
    lastModifiedAt: createdAt,
  };
}
