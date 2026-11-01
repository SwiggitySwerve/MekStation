/**
 * Aerospace definition to editor state.
 *
 * Maps a validated aerospace definition, from
 * loadUnitDefinition('aerospace', id), to the existing AerospaceState for
 * aerospace fighters, conventional fighters and FixedWingSupport. Small
 * craft need their own state and are rejected here.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */

import { aerospaceStructuralIntegrity } from '@/services/conversion/BlkParserService.helpers';
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

const FIGHTER_SUBTYPES = new Set([
  'AerospaceFighter',
  'ConventionalFighter',
  'FixedWingSupport',
]);

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
function mapArc(key: string): AerospaceLocation {
  const location = AerospaceLocation[key as keyof typeof AerospaceLocation];
  if (!location) {
    throw new UnsupportedUnitConfigurationError(
      `Unknown aerospace location "${key}"`,
    );
  }
  return location;
}

function mapArmorAllocation(
  byArc: Readonly<Record<string, number>> = {},
): IAerospaceArmorAllocation {
  const allocation = createEmptyAerospaceArmorAllocation();
  for (const [arc, points] of Object.entries(byArc)) {
    allocation[mapArc(arc)] = points;
  }
  return allocation;
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
  if (!FIGHTER_SUBTYPES.has(subType)) {
    throw new UnsupportedUnitConfigurationError(
      `The aerospace editor cannot load ${subType} definitions`,
    );
  }
  const isConventional = subType !== 'AerospaceFighter';
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
  });

  const engineTypeName = definition.engine?.type ?? 'FUSION';
  const aerospaceEngineType =
    AEROSPACE_ENGINE_BY_CONTRACT[engineTypeName] ?? AerospaceEngineType.FUSION;
  const safeThrust = Number(definition.movement?.safeThrust ?? 0);
  const fuelPoints = definition.fuel ?? 0;
  const heatSinks = definition.heatSinks?.count ?? 0;
  const doubleHeatSinks = definition.heatSinks?.type.startsWith('DOUBLE');
  const armorType = mapArmorType(
    definition.armor?.type ?? 'STANDARD',
    techBase,
  );
  const armorAllocation = mapArmorAllocation(definition.armor?.byArc);
  const armorPoints = Object.values(armorAllocation).reduce((a, b) => a + b, 0);
  const pointsPerTon = getArmorDefinition(armorType)?.pointsPerTon ?? 16;
  const equipment = (definition.equipment ?? []).map(
    (item, index): IAerospaceMountedEquipment => ({
      id: `mount-${index}`,
      equipmentId: item.id,
      name: item.name ?? item.id,
      location: mapArc(item.location),
    }),
  );
  const createdAt = session.createdAt ?? base.createdAt;

  return {
    ...base,
    chassis,
    model,
    mulId: String(definition.mulId ?? -1),
    year: definition.year ?? base.year,
    rulesLevel: mapRulesLevel(definition.rulesLevel ?? 'STANDARD'),
    isFixedWingSupport,
    isOmni: definition.isOmni ?? false,
    engineType: mapEngineType(engineTypeName, techBase),
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
    equipment,
    isModified: false,
    createdAt,
    lastModifiedAt: createdAt,
  };
}
