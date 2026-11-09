import { getEquipmentCalculatorService } from '@/services/equipment/EquipmentCalculatorService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import {
  createMountedEquipment,
  IMountedEquipmentInstance,
} from '@/types/equipment/MountedEquipment';
import {
  getEquipmentCritEntries,
  isSuperHeavy,
} from '@/utils/construction/constructionRules/tonnage';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { isLegacyEquipmentId } from '@/utils/construction/equipmentBVCatalogData';
import {
  isSplittable,
  splitPartners,
} from '@/utils/construction/slotOperations/splitAllocation';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';
import { createHeatSinkEquipmentList } from '@/utils/equipment/heatSinkEquipmentUtils';
import {
  BIPED_LOCATIONS,
  QUAD_LOCATIONS,
} from '@/utils/mech/mechLocationRegistry';
import { generateUnitId } from '@/utils/uuid';

import { mapMechLocation } from './componentMappers';
import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from './equipmentResolution';
import { mountedDefinitionFields } from './mountedDefinitionFields';
import {
  canRecoverSourcePhysicalWeapon,
  groupSourcePhysicalMounts,
  sourceWeaponIdentity as criticalEquipmentId,
  takeSourceWeaponSlots as takeMatchingSlots,
} from './sourceWeaponMounts';

export type UnitCriticalSlots = Readonly<
  Record<string, ReadonlyArray<string | null>>
>;

export interface ISerializedEquipmentPlacement {
  readonly id: string;
  readonly slots?: readonly number[];
  readonly isRearMounted?: boolean;
  readonly isRemovable?: boolean;
}

interface IResolvedCriticalSlot {
  readonly index: number;
  readonly equipmentDef?: IEquipmentItem;
  readonly equipmentId?: string;
  readonly heatSinkType?: HeatSinkType;
  readonly isRearMounted: boolean;
}

const HEAT_SINK_TYPE_BY_ID: Readonly<Partial<Record<string, HeatSinkType>>> = {
  'single-heat-sink': HeatSinkType.SINGLE,
  'double-heat-sink': HeatSinkType.DOUBLE_IS,
  'clan-double-heat-sink': HeatSinkType.DOUBLE_CLAN,
  'compact-heat-sink': HeatSinkType.COMPACT,
  'laser-heat-sink': HeatSinkType.LASER,
};

function resolveRegistryEquipmentId(token: string): string | undefined {
  const separatorVariant = token.replaceAll('-', ' ');
  for (const candidate of [token, separatorVariant]) {
    const match = getEquipmentRegistry().lookup(candidate);
    if (
      match.found &&
      match.equipment &&
      (candidate === token || isLegacyEquipmentId(match.equipment.id))
    )
      return match.equipment.id;
  }
  return undefined;
}

function resolveSlotIdentity(
  token: string,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  entries: ReadonlyArray<string | null>,
): Pick<IResolvedCriticalSlot, 'equipmentDef' | 'equipmentId'> {
  // A crit token names its own mount (MtfFile.java:1052, 48fcb2f6), so its own
  // Clan/IS marker comes before a neighbour's: ISERMediumLaser beside
  // CLERMediumLaser stays IS. Unmarked tokens still read the location.
  const resolved = resolveEquipmentId(token, unitTechBase, unitTechBaseMode, [
    token,
    ...entries,
  ]);
  const registryId = resolveRegistryEquipmentId(token);
  const equipmentDef =
    resolved.equipmentDef ??
    (registryId
      ? getEquipmentLookupService().getMountedById(
          registryId,
          isAmmunitionEquipmentId(token),
        )
      : undefined);
  return { equipmentDef, equipmentId: equipmentDef?.id ?? registryId };
}

export function getCriticalSlotsForLocation(
  criticalSlots: UnitCriticalSlots | undefined,
  location: MechLocation | undefined,
): ReadonlyArray<string | null> | undefined {
  if (!criticalSlots || !location) return undefined;
  return Object.entries(criticalSlots).find(
    ([locationKey]) => mapMechLocation(locationKey) === location,
  )?.[1];
}

function resolveCriticalSlots(
  criticalSlots: UnitCriticalSlots | undefined,
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
): ReadonlyMap<MechLocation, readonly IResolvedCriticalSlot[]> {
  const result = new Map<MechLocation, readonly IResolvedCriticalSlot[]>();
  if (!criticalSlots) return result;

  for (const [locationKey, entries] of Object.entries(criticalSlots)) {
    const location = mapMechLocation(locationKey);
    if (!location || result.has(location)) continue;

    result.set(
      location,
      entries.map((entry, index) => {
        if (typeof entry !== 'string') return { index, isRearMounted: false };

        const { lookupToken, isRearMounted } = parseCriticalSlotToken(entry);
        const original = resolveSlotIdentity(
          entry,
          unitTechBase,
          unitTechBaseMode,
          entries,
        );
        // Preserve established decorated identities, including specialized ammo.
        const { equipmentDef, equipmentId } =
          original.equipmentId || lookupToken === entry
            ? original
            : resolveSlotIdentity(
                lookupToken,
                unitTechBase,
                unitTechBaseMode,
                entries,
              );
        const heatSinkType =
          equipmentId && HEAT_SINK_EQUIPMENT_IDS.includes(equipmentId)
            ? HEAT_SINK_TYPE_BY_ID[equipmentId]
            : undefined;

        return {
          index,
          equipmentDef,
          equipmentId,
          heatSinkType,
          isRearMounted,
        };
      }),
    );
  }
  return result;
}

function claimedSlotsFor(
  claimed: Map<MechLocation, Set<number>>,
  location: MechLocation,
): Set<number> {
  const existing = claimed.get(location);
  if (existing) return existing;
  const created = new Set<number>();
  claimed.set(location, created);
  return created;
}

function claim(
  claimed: Set<number>,
  slots: readonly IResolvedCriticalSlot[],
): void {
  slots.forEach((slot) => claimed.add(slot.index));
}

/**
 * A mixed-tech list entry whose own id has no free crit slot takes the free
 * slots of its other-tech twin (er-medium-laser / clan-er-medium-laser) and
 * that slot's identity: MegaMek builds the mount from the crit token.
 */
function takeTechTwinSlots(
  slots: readonly IResolvedCriticalSlot[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  entries: (count: number) => number,
): readonly IResolvedCriticalSlot[] {
  const twinId = equipmentId.startsWith('clan-')
    ? equipmentId.slice(5)
    : `clan-${equipmentId}`;
  const twinDef = slots.find(
    (slot) => slot.equipmentId === twinId,
  )?.equipmentDef;
  if (!twinDef) return [];
  const count = entries(twinDef.criticalSlots);
  const twin = takeMatchingSlots(slots, claimed, twinId, count);
  return twin.length === count ? twin : [];
}

function restoreSerializedHeatSink(
  source: ISerializedEquipmentPlacement,
  item: IMountedEquipmentInstance,
): IMountedEquipmentInstance {
  const equipmentId = resolveRegistryEquipmentId(source.id) ?? item.equipmentId;
  const heatSinkType = HEAT_SINK_TYPE_BY_ID[equipmentId];
  if (!heatSinkType) return item;

  const heatSink = createHeatSinkEquipmentList(heatSinkType, 1)[0];
  return heatSink
    ? {
        ...heatSink,
        location: item.location,
        slots: item.slots,
        isRearMounted: item.isRearMounted,
        linkedAmmoId: item.linkedAmmoId,
        isRemovable: source.isRemovable ?? heatSink.isRemovable,
        isOmniPodMounted: item.isOmniPodMounted,
      }
    : item;
}

function isOmniPodSlot(
  criticalSlots: UnitCriticalSlots | undefined,
  location: MechLocation,
  index: number,
): boolean {
  const token =
    getCriticalSlotsForLocation(criticalSlots, location)?.[index] ?? '';
  return /\(OMNIPOD\)(?:\s*\(ARMORED\))?\s*$/i.test(token);
}

export function restoreCriticalSlotEquipment(
  serialized: readonly ISerializedEquipmentPlacement[],
  mapped: readonly IMountedEquipmentInstance[],
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  criticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
  physicalOnly = false,
): IMountedEquipmentInstance[] {
  // Mek.java:3484-3492: a superheavy entry holds two ordinary criticals.
  const superheavy = tonnage !== undefined && isSuperHeavy(tonnage);
  const entries = (count: number): number =>
    getEquipmentCritEntries(count, superheavy);
  const normalizedMapped = mapped.map((item, index) => {
    const restored = restoreSerializedHeatSink(serialized[index], item);
    const sizing =
      criticalEquipmentId(restored.equipmentId) === 'claw' &&
      tonnage !== undefined
        ? getEquipmentCalculatorService().calculateProperties(
            restored.equipmentId,
            {
              tonnage,
            },
          )
        : undefined;
    return {
      ...restored,
      ...(sizing ? { weight: sizing.weight } : {}),
      criticalSlots: entries(sizing?.criticalSlots ?? restored.criticalSlots),
    };
  });
  if (!criticalSlots) return normalizedMapped;

  const resolvedByLocation = resolveCriticalSlots(
    criticalSlots,
    unitTechBase,
    unitTechBaseMode,
  );
  const claimed = new Map<MechLocation, Set<number>>();

  serialized.forEach((source, index) => {
    const location = normalizedMapped[index]?.location;
    if (location && source.slots !== undefined) {
      source.slots.forEach((slot) =>
        claimedSlotsFor(claimed, location).add(slot),
      );
    }
  });

  const placed = normalizedMapped.map((item, index) => {
    const source = serialized[index];
    if (
      source.slots !== undefined ||
      !item.location ||
      item.criticalSlots <= 0
    ) {
      return item;
    }

    const claimedAtLocation = claimedSlotsFor(claimed, item.location);
    const matching = takeMatchingSlots(
      resolvedByLocation.get(item.location) ?? [],
      claimedAtLocation,
      item.equipmentId,
      item.criticalSlots,
      item.category === EquipmentCategory.AMMUNITION,
    );
    if (matching.length > 0 && matching.length < item.criticalSlots) {
      if (!isSplittable(item)) return item;
      for (const partner of splitPartners(item.location)) {
        const claimedAtPartner = claimedSlotsFor(claimed, partner);
        const rest = takeMatchingSlots(
          resolvedByLocation.get(partner) ?? [],
          claimedAtPartner,
          item.equipmentId,
          item.criticalSlots - matching.length,
          item.category === EquipmentCategory.AMMUNITION,
        );
        if (matching.length + rest.length !== item.criticalSlots) continue;
        claim(claimedAtLocation, matching);
        claim(claimedAtPartner, rest);
        return {
          ...item,
          slots: matching.map((slot) => slot.index),
          splitSlots: {
            location: partner,
            slots: rest.map((slot) => slot.index),
          },
          isRearMounted:
            source.isRearMounted ??
            [...matching, ...rest].some((slot) => slot.isRearMounted),
        };
      }
      return item;
    }
    const twin =
      matching.length === 0 && unitTechBaseMode === TechBaseMode.MIXED
        ? takeTechTwinSlots(
            resolvedByLocation.get(item.location) ?? [],
            claimedAtLocation,
            item.equipmentId,
            entries,
          )
        : [];
    const twinDef = twin[0]?.equipmentDef;
    if (twinDef) {
      claim(claimedAtLocation, twin);
      return {
        ...item,
        ...mountedDefinitionFields(twinDef),
        criticalSlots: twin.length,
        slots: twin.map((slot) => slot.index),
        isRearMounted:
          source.isRearMounted ?? twin.some((slot) => slot.isRearMounted),
      };
    }
    if (matching.length !== item.criticalSlots) return item;

    claim(claimedAtLocation, matching);
    return {
      ...item,
      slots: matching.map((slot) => slot.index),
      isRearMounted:
        source.isRearMounted ?? matching.some((slot) => slot.isRearMounted),
    };
  });

  const recovered: IMountedEquipmentInstance[] = [];
  for (const [location, slots] of Array.from(resolvedByLocation)) {
    const claimedAtLocation = claimedSlotsFor(claimed, location);
    const handledPhysical = new Set<string>();
    for (const slot of slots) {
      if (claimedAtLocation.has(slot.index) || !slot.equipmentId) continue;
      const physicalId = criticalEquipmentId(slot.equipmentId);

      // FU-101: only audited sizing classes; other prerequisites
      // remain with CAT-Q2. MtfFile.java:1133-1175 groups a physical mount.
      if (
        tonnage !== undefined &&
        slot.equipmentDef?.category === EquipmentCategory.PHYSICAL_WEAPON &&
        canRecoverSourcePhysicalWeapon(physicalId)
      ) {
        if (handledPhysical.has(physicalId)) continue;
        handledPhysical.add(physicalId);
        const properties = getEquipmentCalculatorService().calculateProperties(
          slot.equipmentId,
          { tonnage },
        );
        const count = entries(properties.criticalSlots);
        if (count <= 0) continue;
        const existing = placed.filter(
          (item) =>
            criticalEquipmentId(item.equipmentId) === physicalId &&
            (item.location === location ||
              item.splitSlots?.location === location),
        );
        const groups = groupSourcePhysicalMounts(
          slots,
          claimedAtLocation,
          slot.equipmentId,
          count,
          existing.length,
        );
        claim(claimedAtLocation, groups.claimed);
        for (const matching of groups.mounts) {
          recovered.push({
            ...createMountedEquipment(
              { ...slot.equipmentDef, ...properties, criticalSlots: count },
              generateUnitId(),
              true,
              isOmniPodSlot(criticalSlots, location, matching[0].index),
            ),
            location,
            slots: matching.map((s) => s.index),
            isRearMounted: matching[0].isRearMounted,
          });
        }
        continue;
      }

      // A unit whose own summary is empty historically skipped ammo/heat-sink
      // restoration (mapEquipment's early return). mapEquipment passes
      // physicalOnly to keep that contract; direct callers keep full restoration.
      if (physicalOnly) continue;

      if (
        slot.equipmentDef &&
        (slot.equipmentDef.category === EquipmentCategory.AMMUNITION ||
          // MiscType.java:12413-12420: each native LAM Bomb Bay is a 1t mount.
          slot.equipmentId === 'bomb-bay') &&
        slot.equipmentDef.criticalSlots > 0
      ) {
        const count = entries(slot.equipmentDef.criticalSlots);
        const matching = takeMatchingSlots(
          slots,
          claimedAtLocation,
          slot.equipmentId,
          count,
          // Bomb bays are miscellaneous, not ammunition: match each slot by its
          // own category so the ammo/launcher join (#2837) cannot drop them.
          slot.equipmentDef.category === EquipmentCategory.AMMUNITION,
        );
        if (matching.length !== count) continue;
        claim(claimedAtLocation, matching);
        recovered.push({
          ...createMountedEquipment(
            { ...slot.equipmentDef, criticalSlots: count },
            generateUnitId(),
          ),
          location,
          slots: matching.map((match) => match.index),
          isRearMounted: matching.some((match) => match.isRearMounted),
        });
        continue;
      }

      if (slot.heatSinkType) {
        const baseHeatSink = createHeatSinkEquipmentList(
          slot.heatSinkType,
          1,
        )[0];
        if (!baseHeatSink) continue;
        const heatSink = {
          ...baseHeatSink,
          criticalSlots: entries(baseHeatSink.criticalSlots),
        };
        const matching = takeMatchingSlots(
          slots,
          claimedAtLocation,
          slot.equipmentId,
          heatSink.criticalSlots,
        );
        if (matching.length !== heatSink.criticalSlots) continue;
        claim(claimedAtLocation, matching);
        recovered.push({
          ...heatSink,
          location,
          slots: matching.map((match) => match.index),
        });
      }
    }
  }

  // MtfFile.java:1053-1068 shares one Talons mount across all native leg cells.
  const talonParts = Array.from(resolvedByLocation).flatMap(
    ([location, slots]) => {
      const matching = slots.filter((slot) => slot.equipmentId === 'talons');
      return matching.length
        ? [
            {
              location,
              slots: matching.map((slot) => slot.index),
              definition: matching[0].equipmentDef,
            },
          ]
        : [];
    },
  );
  const first = talonParts[0];
  if (tonnage !== undefined && first?.definition) {
    const isQuad = talonParts.some(
      (part) =>
        QUAD_LOCATIONS.includes(part.location) &&
        !BIPED_LOCATIONS.includes(part.location),
    );
    const properties = getEquipmentCalculatorService().calculateProperties(
      'talons',
      { tonnage, isQuad },
    );
    if (
      talonParts.reduce((sum, part) => sum + part.slots.length, 0) ===
      properties.criticalSlots
    ) {
      const index = placed.findIndex((item) => item.equipmentId === 'talons');
      const mount = {
        ...(placed[index] ??
          createMountedEquipment(
            first.definition,
            generateUnitId(),
            true,
            isOmniPodSlot(criticalSlots, first.location, first.slots[0]),
          )),
        weight: properties.weight,
        criticalSlots: properties.criticalSlots,
        location: first.location,
        slots: first.slots,
        splitSlots: undefined,
        spreadSlots: talonParts
          .slice(1)
          .map(({ location, slots }) => ({ location, slots })),
      };
      if (index < 0) recovered.push(mount);
      else placed[index] = mount;
    }
  }

  return [...placed, ...recovered];
}
