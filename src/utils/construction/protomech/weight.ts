/** ProtoMech construction mass, owned here and composed through public rules. */
import type { IProtoMech } from '@/types/unit/PersonnelInterfaces';

import { readBlkProtoEquipmentEntry } from '@/services/conversion/BlkProtoEquipmentEntry';
import { EngineType } from '@/types/construction/EngineType';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { isFireWeaponCategory } from '@/utils/equipment/ammunitionCompatibility';

import type { IHeatLoadMount } from '../vehicle/vehicleHeatLoad';

import { getNativeAmmoBVGroup } from '../battleValueAmmo';
import { getEquipmentEntry } from '../equipmentBVResolver';
import { getCatalogHeatNeutralWeaponHeat } from '../vehicle/supportPayload';
import {
  isInsulatorLinkableLaser,
  sumVehicleHeatLoad,
} from '../vehicle/vehicleHeatLoad';
import { getProtoArmorDefinition, isProtoEDPArmorMount } from './armorType';
import { computeProtoEngineWeight } from './movementCaps';
import { isProtoExtendedJumpJet, isProtoUmu } from './movementRules';
import { getProtoAmmo } from './protoMechAmmo';
import { PROTO_MAX_STANDARD_TONNAGE } from './weightClass';

export type ProtoMinimumWeightInput = Pick<
  IProtoMech,
  | 'weightPerUnit'
  | 'engineRating'
  | 'armorType'
  | 'hasMainGun'
  | 'armorByLocation'
> &
  Partial<Pick<IProtoMech, 'metadata'>> & {
    equipment: readonly Pick<
      IProtoMech['equipment'][number],
      'equipmentId' | 'location'
    >[];
  };

export interface ProtoWeightBreakdown {
  core: {
    engine: number | null;
    structure: number;
    controls: number;
    armor: number | null;
  };
  mounts: { equipmentId: string; weight: number | null }[];
  heatSinks: number | null;
  minimum: number | undefined;
  total: number | null;
  missingEquipment: string[];
}

/** Pinned SRMWeapon:70-75, StreakSRMWeapon:67-72, LRMWeapon:77-82,
 * StreakLRMWeapon:83-88 (48fcb2f64). Native family/rack identity is shared.
 */
const LAUNCHER_TONS_PER_TUBE: Readonly<Record<string, number>> = {
  SRM: 0.25,
  SRM_STREAK: 0.5,
  LRM: 0.2,
  LRM_STREAK: 0.4,
};

const roundKg = (tons: number): number => Math.round(tons * 1000) / 1000;

/** A context-free catalog mass cannot certify a variable-weight zero. */
export function getProtoMountWeight(equipmentId: string): number | undefined {
  const entry = getEquipmentEntry(equipmentId);
  if (
    !entry ||
    entry.weight === undefined ||
    !Number.isFinite(entry.weight) ||
    entry.weight < 0 ||
    entry.special?.some(
      (value) =>
        value === 'Variable weight' ||
        value.startsWith('Java variable weight:'),
    )
  )
    return undefined;
  return entry.weight;
}

/** MiscType.java:496-497,867-882: UMUs use the standard JJ mass tiers. */
function propulsionMass(tonnage: number, improved: boolean): number {
  const standard = tonnage < 6 ? 0.05 : tonnage < 10 ? 0.1 : 0.15;
  return standard * (improved ? 2 : 1);
}

function resolveProtoMountWeight(
  equipmentId: string,
  tonnage: number,
): number | undefined {
  const syntax = readBlkProtoEquipmentEntry(equipmentId);
  if (!syntax.lookupName || syntax.errors.length) return undefined;
  const ammo = getProtoAmmo(syntax.lookupName);
  if (ammo)
    return syntax.shots === undefined
      ? undefined
      : Math.ceil(ammo.kgPerShot * syntax.shots) / 1000;
  // A shot declaration belongs to ammunition, never a whole launcher/bin.
  if (syntax.shots !== undefined) return undefined;
  const entry = getEquipmentEntry(syntax.lookupName);
  const id = (entry?.id ?? syntax.lookupName)
    .replace(/-registry$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (isProtoEDPArmorMount(syntax.lookupName) || id === 'eiinterface') return 0;
  if (id === 'protoquadmeleesystem' || id === 'protomechquadmeleesystem')
    return 1;
  if (id === 'clmyomerbooster' || id === 'protomekmyomerbooster')
    return roundKg(tonnage * 0.025);
  if (id === 'protomechjumpjet' || isProtoUmu(id))
    return propulsionMass(tonnage, false);
  if (isProtoExtendedJumpJet(id)) return propulsionMass(tonnage, true);
  // These are distinct ProtoMech rules, not the BattleMech wing/clamp formulas.
  if (id === 'protomagneticclamp')
    return tonnage < 6 ? 0.25 : tonnage < 10 ? 0.5 : 1;
  if (id === 'protomechpartialwing') return roundKg(tonnage / 5);
  const group = entry ? getNativeAmmoBVGroup(syntax.lookupName) : undefined;
  if (group) {
    const [family, rack] = group.split(':');
    const multiplier = LAUNCHER_TONS_PER_TUBE[family];
    if (multiplier !== undefined) return Number(rack) * multiplier;
  }
  return getProtoMountWeight(syntax.lookupName);
}

/** TestProtoMek.java:176-177: allocated armor stays unrounded. */
export function computeProtoArmorWeight(
  points: number,
  armorType: number | undefined,
): number | null {
  const armor = getProtoArmorDefinition(armorType);
  if (!armor || !Number.isSafeInteger(points) || points < 0) return null;
  return points * armor.weightPerPoint;
}

/** TestProtoMek.java:135-177 and TestEntity.java:1011-1032 (48fcb2f64).
 * Known terms form a lower bound; unavailable mass/heat prevents a complete total.
 * Motive extras, power amps and carrying space are zero for these ProtoMechs.
 */
export function computeProtoWeightBreakdown(
  unit: ProtoMinimumWeightInput,
): ProtoWeightBreakdown {
  const core = {
    engine: computeProtoEngineWeight(unit.engineRating),
    structure: roundKg(unit.weightPerUnit * 0.1),
    controls: unit.weightPerUnit > PROTO_MAX_STANDARD_TONNAGE ? 0.75 : 0.5,
    armor: computeProtoArmorWeight(
      Object.values(unit.armorByLocation).reduce(
        (sum, points) => sum + points,
        0,
      ),
      unit.armorType,
    ),
  };
  if (core.engine === null || core.armor === null)
    return {
      core,
      mounts: [],
      heatSinks: null,
      minimum: undefined,
      total: null,
      missingEquipment: ['Unsupported armor or engine mass'],
    };
  let exact = core.engine + core.structure + core.controls + core.armor;
  const mounts: ProtoWeightBreakdown['mounts'] = [];
  const heatLoad: IHeatLoadMount<ProtoMechLocation>[] = [];
  const missingEquipment: string[] = [];
  unit.equipment.forEach((mount, order) => {
    if (mount.location === ProtoMechLocation.MAIN_GUN && !unit.hasMainGun)
      return;
    const syntax = readBlkProtoEquipmentEntry(mount.equipmentId);
    const lookupName = syntax.lookupName ?? mount.equipmentId;
    const entry =
      syntax.errors.length || !syntax.lookupName
        ? undefined
        : getEquipmentEntry(lookupName);
    const ammo = getProtoAmmo(lookupName);
    const weapon =
      !ammo && entry !== undefined && isFireWeaponCategory(entry.category);
    const weight = resolveProtoMountWeight(
      mount.equipmentId,
      unit.weightPerUnit,
    );
    mounts.push({ equipmentId: mount.equipmentId, weight: weight ?? null });
    if (weight === undefined) missingEquipment.push(mount.equipmentId);
    else exact += weight;
    heatLoad.push({
      id: entry?.id ?? lookupName,
      location: mount.location,
      order,
      laser: isInsulatorLinkableLaser(entry),
      linked: false,
      insulated: false,
      capacitor: false,
      heat:
        weapon && entry
          ? getCatalogHeatNeutralWeaponHeat(entry)
          : weight === undefined
            ? null
            : 0,
      miscHeatExcluded: !!ammo || weapon || weight === undefined,
    });
  });
  // Share the native heat predicate, links and miscellaneous heat owner.
  const heat = sumVehicleHeatLoad(heatLoad, {
    engineType: EngineType.STANDARD,
    year: unit.metadata?.year,
  });
  const heatSinks = heat === null ? null : heat * 0.25;
  if (heatSinks === null) {
    if (!missingEquipment.length)
      missingEquipment.push('Unsupported heat requirement');
  } else exact += heatSinks;
  const minimum = roundKg(exact);
  return {
    core,
    mounts,
    heatSinks,
    minimum,
    total: missingEquipment.length ? null : minimum,
    missingEquipment,
  };
}

export function getProtoMinimumWeight(
  unit: ProtoMinimumWeightInput,
): number | undefined {
  return computeProtoWeightBreakdown(unit).minimum;
}

export function computeProtoWeight(unit: ProtoMinimumWeightInput): {
  total: number | null;
  missingEquipment: string[];
} {
  const { total, missingEquipment } = computeProtoWeightBreakdown(unit);
  return { total, missingEquipment };
}
