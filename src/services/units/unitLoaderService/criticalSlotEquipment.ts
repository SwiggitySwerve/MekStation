import type { ISerializedEquipmentInput } from '@/types/unit/UnitSerialization';

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
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import {
  isSplittable,
  splitPartners,
} from '@/utils/construction/slotOperations/splitAllocation';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';
import { createHeatSinkEquipmentList } from '@/utils/equipment/heatSinkEquipmentUtils';
import { generateUnitId } from '@/utils/uuid';

import { mapMechLocation } from './componentMappers';
import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from './equipmentResolution';
import { mountedDefinitionFields } from './mountedDefinitionFields';
import {
  compareSourceCriticalLocations,
  isSourcePhysicalWeapon,
  sourceCriticalWeapons,
  sourceWeaponSummaryMatches,
  sourceWeaponIdentity as criticalEquipmentId,
  takeSourceWeaponSlots as takeMatchingSlots,
} from './sourceWeaponMounts';

export type UnitCriticalSlots = Readonly<
  Record<string, ReadonlyArray<string | null>>
>;

export type ISerializedEquipmentPlacement = Pick<
  ISerializedEquipmentInput,
  | 'id'
  | 'isAmmo'
  | 'slots'
  | 'isRearMounted'
  | 'isRemovable'
  | 'isOmniPodMounted'
>;

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

function restoreSerializedCategory(
  source: ISerializedEquipmentPlacement,
  item: IMountedEquipmentInstance,
  resolvedByLocation: ReadonlyMap<
    MechLocation,
    readonly IResolvedCriticalSlot[]
  >,
  entries: (count: number) => number,
): IMountedEquipmentInstance {
  let isAmmo = source.isAmmo;
  const explicit = isAmmo !== undefined;
  if (isAmmo === undefined) {
    if (
      !item.location ||
      !source.slots?.length ||
      new Set(source.slots).size !== source.slots.length
    )
      return item;
    const locationSlots = resolvedByLocation.get(item.location);
    const ownSlots = source.slots.map((index) =>
      Number.isInteger(index) && index >= 0
        ? locationSlots?.[index]
        : undefined,
    );
    const first = ownSlots[0]?.equipmentDef;
    if (
      !first ||
      !ownSlots.every(
        (slot) =>
          slot?.equipmentDef &&
          criticalEquipmentId(slot.equipmentId ?? '') ===
            criticalEquipmentId(source.id) &&
          (slot.equipmentDef.category === EquipmentCategory.AMMUNITION) ===
            (first.category === EquipmentCategory.AMMUNITION),
      )
    )
      return item;
    isAmmo = first.category === EquipmentCategory.AMMUNITION;
  }
  const lookup = getEquipmentLookupService();
  // Saved IDs can carry opposite-tech ammo even on a pure-tech definition.
  // Only unresolved source aliases use the already resolved ID as a fallback.
  const identity = lookup.getById(source.id) ? source.id : item.equipmentId;
  const definition = lookup.getMountedById(identity, isAmmo);
  if (
    !definition ||
    (definition.category === EquipmentCategory.AMMUNITION) !== isAmmo
  ) {
    if (explicit)
      throw new Error(
        `Equipment ${source.id} has no ${isAmmo ? 'ammunition' : 'non-ammunition'} definition`,
      );
    return item;
  }
  if (!explicit && entries(definition.criticalSlots) !== source.slots?.length)
    return item;
  return { ...item, ...mountedDefinitionFields(definition) };
}

export function restoreCriticalSlotEquipment(
  serialized: readonly ISerializedEquipmentPlacement[],
  mapped: readonly IMountedEquipmentInstance[],
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  criticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
  physicalOnly = false,
  isOmni = false,
): IMountedEquipmentInstance[] {
  // Mek.java:3484-3492: a superheavy entry holds two ordinary criticals.
  const superheavy = tonnage !== undefined && isSuperHeavy(tonnage);
  const entries = (count: number): number =>
    getEquipmentCritEntries(count, superheavy);
  const resolvedByLocation = resolveCriticalSlots(
    criticalSlots,
    unitTechBase,
    unitTechBaseMode,
  );
  const normalizedMapped = mapped.map((item, index) => {
    const categorized = restoreSerializedCategory(
      serialized[index],
      item,
      resolvedByLocation,
      entries,
    );
    const restored = restoreSerializedHeatSink(serialized[index], categorized);
    const sizing =
      isSourcePhysicalWeapon(restored.equipmentId) &&
      getEquipmentCalculatorService().isVariable(
        criticalEquipmentId(restored.equipmentId),
      ) &&
      tonnage !== undefined
        ? getEquipmentCalculatorService().calculateProperties(
            criticalEquipmentId(restored.equipmentId),
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
    for (const slot of slots) {
      if (claimedAtLocation.has(slot.index) || !slot.equipmentId) continue;
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

  if (tonnage !== undefined) {
    const consumed = new Set<number>();
    for (const mount of sourceCriticalWeapons(
      criticalSlots,
      tonnage,
      unitTechBase === TechBase.CLAN,
    )) {
      const { summaryIds: _summaryIds, ...placement } = mount;
      const index = placed.findIndex(
        (item, i) =>
          !consumed.has(i) &&
          (sourceWeaponSummaryMatches(
            mount,
            item.equipmentId,
            item.location ?? '',
            serialized[i].slots,
          ) ||
            sourceWeaponSummaryMatches(
              mount,
              serialized[i].id,
              item.location ?? '',
              serialized[i].slots,
            )),
      );
      if (index >= 0) {
        consumed.add(index);
        if (
          isSourcePhysicalWeapon(mount.equipmentId) ||
          (serialized[index].slots !== undefined && mount.splitSlots)
        ) {
          placed[index] = {
            ...placed[index],
            ...placement,
            equipmentId: placed[index].equipmentId,
            isRearMounted:
              serialized[index].isRearMounted ?? mount.isRearMounted,
            isOmniPodMounted:
              serialized[index].isOmniPodMounted ?? mount.isOmniPodMounted,
          };
        }
        continue;
      }
      // Legacy saves may reserve more cells than the current entry demand.
      // Keep that allocation for validation instead of inventing extra mounts.
      if (
        getSlotParts(mount).some((part) =>
          part.slots.some(
            (index) => claimed.get(part.location)?.has(index) === true,
          ),
        )
      )
        continue;
      const definition = resolvedByLocation
        .get(mount.location)
        ?.find(
          (slot) =>
            criticalEquipmentId(slot.equipmentId ?? '') === mount.equipmentId,
        )?.equipmentDef;
      if (!definition) continue;
      recovered.push({
        ...createMountedEquipment(definition, generateUnitId()),
        ...placement,
      });
    }
  }

  const equipment = [...placed, ...recovered];
  if (!isOmni) return equipment;
  return equipment.map((item, index) => {
    const tokens = [...getSlotParts(item)]
      .sort((a, b) => compareSourceCriticalLocations(a.location, b.location))
      .flatMap((part) =>
        [...part.slots]
          .sort((a, b) => a - b)
          .map(
            (slot) =>
              getCriticalSlotsForLocation(criticalSlots, part.location)?.[slot],
          ),
      )
      .filter((token): token is string => typeof token === 'string');
    // Ordinary/spreadable mounts keep their creation token. Java's split
    // branch updates the flag on every visited crit (MtfFile.java:1127).
    const definition = getEquipmentLookupService().getMountedById(
      item.equipmentId,
      item.category === EquipmentCategory.AMMUNITION,
    );
    const split =
      item.splitSlots !== undefined ||
      isSplittable(
        definition
          ? { ...item, criticalSlots: definition.criticalSlots }
          : item,
      );
    return {
      ...item,
      isOmniPodMounted:
        serialized[index]?.isOmniPodMounted ??
        parseCriticalSlotToken((split ? tokens.at(-1) : tokens[0]) ?? '')
          .isOmniPodMounted,
    };
  });
}
