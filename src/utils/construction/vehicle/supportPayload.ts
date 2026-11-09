import { decodeBlkVehicleEngine } from '@/services/conversion/blkEngineIdentity';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { ISupportVehicle } from '@/types/unit/VehicleInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import {
  getEquipmentEntry,
  type EquipmentCatalogEntry,
} from '@/utils/construction/equipmentBV';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { getAmmunitionWeightEntry } from '@/utils/construction/equipmentBV/resolution';
import { isFireWeaponCategory } from '@/utils/equipment/ammunitionCompatibility';

import { getVehicleHeatNeutralWeaponHeat } from './mountedWeight';
import {
  computePowerAmplifierWeight,
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from './powerAmplifier';
import {
  applyVehicleMountMechanismWeights,
  computeTurretWeight,
  isSponsonMechanismPayload,
  isVehicleMechanismMountId,
} from './turret';
import {
  getMountSourceSize,
  resolveVehicleVariableMass,
} from './variableEquipmentMass';
import {
  isInsulatorLinkableLaser,
  sumVehicleHeatLoad,
} from './vehicleHeatLoad';

/**
 * Pinned mass for a raw BLK mount token that a service-layer owner can identify
 * as a Java-derived registry entry, or undefined. Injected so this rule stays
 * pure: the BV catalog matches some raw tokens by name to legacy stubs whose
 * mass is not pinned (`LRT 10` -> `lrtorpedo10`, 2.5 t against Java 5 t).
 */
export type SupportRegistryMass = (
  equipmentId: string,
  name?: string,
) => number | undefined;

/** Adapt the BV catalog category to the shared heat-neutral weapon contract. */
export function getCatalogHeatNeutralWeaponHeat(
  item: EquipmentCatalogEntry,
): number | null {
  return getVehicleHeatNeutralWeaponHeat({
    ...item,
    category:
      item.category === 'Energy'
        ? EquipmentCategory.ENERGY_WEAPON
        : EquipmentCategory.BALLISTIC_WEAPON,
  });
}

/** TestEntity.java:631-667,716-769: sum catalog mount weights by kind.
 * A non-ammunition mount uses the injected registry mass when it has one,
 * otherwise its BV catalog entry's.
 */
export function computeSupportPayloadWeights(
  unit: ISupportVehicle,
  engineWeight: number,
  registryMassOf?: SupportRegistryMass,
): {
  weapons: number;
  ammo: number;
  miscEquipment: number;
  heatSinks: number;
  powerAmplifiers: number;
  misc: number;
  unresolved: string[];
} {
  const unresolved: string[] = [];
  const mounts = unit.equipment.map((mount) => {
    const ammo = isAmmunitionEquipmentId(mount.equipmentId);
    const catalogItem = ammo
      ? getAmmunitionWeightEntry(mount.equipmentId)
      : (getEquipmentEntry(mount.equipmentId) ??
        getEquipmentEntry(mount.equipmentId.replace(/[ /]+/g, '-')));
    // Ammunition keeps its own path; only a launcher can be a name stub.
    const registryMass =
      ammo || !catalogItem
        ? undefined
        : registryMassOf?.(mount.equipmentId, mount.name);
    const item =
      catalogItem && registryMass !== undefined
        ? { ...catalogItem, weight: registryMass }
        : catalogItem;
    // A weapon the pinned registry allows neither on a support vehicle nor as an
    // infantry weapon (for example a battle-armor gun reached by a shared native
    // name) is a misidentified mount, not a mass: report it, never charge it.
    const misidentified =
      item !== undefined &&
      !ammo &&
      isFireWeaponCategory(item.category) &&
      item.allowedUnitTypes !== undefined &&
      !item.allowedUnitTypes.includes('Support Vehicle') &&
      !item.allowedUnitTypes.includes('Infantry');
    if (!item || item.weight === undefined || misidentified) {
      unresolved.push(
        misidentified
          ? `${mount.equipmentId} (not a support-vehicle weapon)`
          : mount.equipmentId,
      );
      return {
        ...mount,
        ammo,
        weapon: false,
        weight: 0,
        heat: 0,
        energy: false,
        laser: false,
        miscHeatExcluded: true,
        known: false,
      };
    }
    // TestEntity.java:716-724,753-769: an artillery ammo category is not a weapon.
    const weapon = !ammo && isFireWeaponCategory(item.category);
    // TestSupportVehicle.java:980-988: a small vehicle's weapon beyond its first
    // clip adds (size - 1) x the infantry weapon's ammunition weight, a Java
    // constant the catalog does not carry. Report it, never guess it.
    if (unit.tonnage < 5 && weapon && getMountSourceSize(mount.equipmentId) > 1)
      unresolved.push(`${mount.equipmentId} (clip ammunition mass)`);
    const energy =
      weapon &&
      isPowerAmplifierEnergyWeapon({
        id: item.id,
        name: item.name,
        category:
          item.category === 'Energy'
            ? EquipmentCategory.ENERGY_WEAPON
            : EquipmentCategory.MISC_EQUIPMENT,
        special: item.special,
      });
    // The sponson and pintle mechanisms are weighed from their neighbours after
    // every mount is known (see the pass below), not from a catalog value.
    const mechanism = isVehicleMechanismMountId(item.id);
    const resolvedWeight = mechanism
      ? 0
      : resolveVehicleVariableMass(item, mount.equipmentId, {
          tonnage: unit.tonnage,
          engineWeight,
          isSupportVehicle: true,
        });
    if (resolvedWeight === undefined) unresolved.push(mount.equipmentId);
    const weight = resolvedWeight ?? item.weight;
    // TestEntity.java:938-982: heat-neutral weapon load; small SVs need no sinks.
    const heat = weapon ? (getCatalogHeatNeutralWeaponHeat(item) ?? 0) : 0;
    return {
      ...mount,
      ammo,
      weapon,
      weight,
      heat,
      energy,
      id: item.id,
      laser: isInsulatorLinkableLaser(item),
      miscHeatExcluded: ammo || weapon,
      known: resolvedWeight !== undefined,
    };
  });
  // MiscType.java:563-603: the sponson and pintle mechanisms, one owner shared
  // with the editor. A mechanism whose weapons or payload have an unresolved
  // mass is itself unresolved, never charged as if that mass were zero.
  const mechanisms = mounts.map((m) => ({
    id: m.id,
    location: m.location,
    weight: m.known ? m.weight : null,
    // An unidentified non-ammunition mount may be the very weapon the pintle
    // carries, so it must make the pintle unresolved, not weightless.
    weapon: m.weapon || (!m.known && !m.ammo),
    pintleMounted: m.isPintleTurretMounted === true,
    sponsonPayload: isSponsonMechanismPayload({
      isSponsonMounted: m.isSponsonMounted,
      isAmmunition: m.ammo,
      id: m.id,
    }),
  }));
  applyVehicleMountMechanismWeights(mechanisms, {
    baseChassisWeight: unit.baseChassisSponsonPintleWeight,
    kilograms: unit.tonnage < 5,
  });
  mounts.forEach((mount, index) => {
    if (!isVehicleMechanismMountId(mount.id)) return;
    const weight = mechanisms[index].weight;
    if (weight === null) unresolved.push(mount.equipmentId);
    else mount.weight = weight;
  });
  const sum = (predicate: (mount: (typeof mounts)[number]) => boolean) =>
    mounts.filter(predicate).reduce((n, m) => n + m.weight, 0);
  const weapons = sum((m) => m.weapon),
    ammo = unit.tonnage < 5 ? 0 : sum((m) => m.ammo);
  // At this pin hasFlag(EXCLUDE) requires ALL flags (EquipmentBitSet.java:81-91),
  // so individual fire controls remain in misc, despite the stale exclusion comment.
  for (const mount of mounts)
    if (
      mount.id === 'basic-fire-control' ||
      mount.id === 'advanced-fire-control'
    )
      mount.weight =
        resolveVehicleVariableMass(
          { id: mount.id, weight: mount.weight },
          mount.equipmentId,
          {
            tonnage: unit.tonnage,
            engineWeight,
            weaponWeight: weapons,
            baseChassisFireConWeight: unit.baseChassisFireConWeight,
            isSupportVehicle: true,
          },
        ) ?? mount.weight;
  const miscEquipment = sum((m) => !m.ammo && !m.weapon);
  // TestSupportVehicle.java:917-931: no free sinks, none for a small vehicle.
  // The load is the one shared with the combat/editor path (insulators,
  // capacitors and miscellaneous heat included).
  const heatLoad =
    unit.tonnage < 5
      ? 0
      : sumVehicleHeatLoad(
          mounts.map((m, order) => ({
            id: 'id' in m ? (m.id ?? '') : '',
            location: m.location,
            order,
            laser: m.laser,
            linked: false,
            insulated: false,
            capacitor: false,
            heat: m.heat,
            miscHeatExcluded: m.miscHeatExcluded,
          })),
          {
            year: unit.metadata.year,
            engineType: decodeBlkVehicleEngine(unit.engineType, false),
          },
        );
  if (heatLoad === null) unresolved.push('heat sink load');
  const heatSinks = heatLoad ?? 0;
  const powerAmplifiers =
    unit.tonnage < 5 ||
    !requiresPowerAmplifiers(decodeBlkVehicleEngine(unit.engineType, false))
      ? 0
      : computePowerAmplifierWeight(sum((m) => m.energy)); // TestSupportVehicle.java:871-901
  const turret = (location: string) => {
    const weight = sum((m) => !m.ammo && m.location === location);
    return unit.tonnage < 5
      ? Math.ceil((weight / 10) * 1000) / 1000
      : computeTurretWeight(TurretType.SINGLE, weight);
  };
  const misc = turret('Turret') + turret('Turret 2'); // TestTank.java:178-235; SV :837-854
  return {
    weapons,
    ammo,
    miscEquipment,
    heatSinks,
    powerAmplifiers,
    misc,
    unresolved,
  };
}
