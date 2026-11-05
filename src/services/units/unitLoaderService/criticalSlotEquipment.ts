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
import { isLegacyEquipmentId } from '@/utils/construction/equipmentBVCatalogData';
import { isWeaponCategory } from '@/utils/equipment/ammunitionCompatibility';
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';
import { createHeatSinkEquipmentList } from '@/utils/equipment/heatSinkEquipmentUtils';
import { generateUnitId } from '@/utils/uuid';

import { mapMechLocation } from './componentMappers';
import {
  parseCriticalSlotToken,
  resolveEquipmentId,
} from './equipmentResolution';

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
  const resolved = resolveEquipmentId(
    token,
    unitTechBase,
    unitTechBaseMode,
    entries,
  );
  const registryId = resolveRegistryEquipmentId(token);
  const equipmentDef =
    resolved.equipmentDef ??
    (registryId ? getEquipmentLookupService().getById(registryId) : undefined);
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

function takeMatchingSlots(
  slots: readonly IResolvedCriticalSlot[],
  claimed: ReadonlySet<number>,
  equipmentId: string,
  count: number,
): readonly IResolvedCriticalSlot[] {
  return slots
    .filter(
      (slot) => !claimed.has(slot.index) && slot.equipmentId === equipmentId,
    )
    .slice(0, count);
}

function claim(
  claimed: Set<number>,
  slots: readonly IResolvedCriticalSlot[],
): void {
  slots.forEach((slot) => claimed.add(slot.index));
}

/** Mek.getInnerLocation (Mek.java:489-496); quad legs map like arms. */
const INNER_LOCATION: Partial<Record<MechLocation, MechLocation>> = {
  [MechLocation.LEFT_TORSO]: MechLocation.CENTER_TORSO,
  [MechLocation.RIGHT_TORSO]: MechLocation.CENTER_TORSO,
  [MechLocation.CENTER_LEG]: MechLocation.CENTER_TORSO,
  [MechLocation.LEFT_ARM]: MechLocation.LEFT_TORSO,
  [MechLocation.LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.FRONT_LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.REAR_LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.RIGHT_ARM]: MechLocation.RIGHT_TORSO,
  [MechLocation.RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.FRONT_RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.REAR_RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.HEAD]: MechLocation.CENTER_TORSO,
};

/** Locations a split weapon may continue into (MtfFile.java:1093-1095). */
function splitPartners(location: MechLocation): MechLocation[] {
  const inner = INNER_LOCATION[location];
  const outer = (Object.keys(INNER_LOCATION) as MechLocation[]).filter(
    (candidate) => INNER_LOCATION[candidate] === location,
  );
  return inner ? [inner, ...outer] : outer;
}

/** WeaponType.isSplittableOverCriticalSlots (WeaponType.java:2619-2621). */
function isSplittable(item: IMountedEquipmentInstance): boolean {
  return (
    item.criticalSlots >= 8 &&
    item.category !== EquipmentCategory.PHYSICAL_WEAPON &&
    isWeaponCategory(item.category)
  );
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

export function restoreCriticalSlotEquipment(
  serialized: readonly ISerializedEquipmentPlacement[],
  mapped: readonly IMountedEquipmentInstance[],
  unitTechBase: TechBase,
  unitTechBaseMode: TechBaseMode,
  criticalSlots: UnitCriticalSlots | undefined,
  tonnage?: number,
): IMountedEquipmentInstance[] {
  const normalizedMapped = mapped.map((item, index) =>
    restoreSerializedHeatSink(serialized[index], item),
  );
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

      // FU-101: only the three audited sizing classes; other prerequisites
      // remain with CAT-Q2. MtfFile.java:1133-1175 groups a physical mount.
      if (
        tonnage !== undefined &&
        slot.equipmentDef?.category === EquipmentCategory.PHYSICAL_WEAPON &&
        ['mace', 'hatchet', 'lance'].includes(slot.equipmentId)
      ) {
        if (handledPhysical.has(slot.equipmentId)) continue;
        handledPhysical.add(slot.equipmentId);
        const properties = getEquipmentCalculatorService().calculateProperties(
          slot.equipmentId,
          { tonnage },
        );
        const count = properties.criticalSlots;
        if (count <= 0) continue;
        const group = slots.filter((s) => s.equipmentId === slot.equipmentId);
        const existing = placed.filter(
          (item) =>
            item.equipmentId === slot.equipmentId &&
            (item.location === location ||
              item.splitSlots?.location === location),
        );
        // Listed variable mounts may have no explicit slot assignment. Reserve
        // their native groups without changing their established projections.
        const reserved = group.filter((s) =>
          claimedAtLocation.has(s.index),
        ).length;
        claim(
          claimedAtLocation,
          takeMatchingSlots(
            slots,
            claimedAtLocation,
            slot.equipmentId,
            Math.max(0, existing.length * count - reserved),
          ),
        );
        const missing = Math.max(
          0,
          Math.floor(group.length / count) - existing.length,
        );
        for (let n = 0; n < missing; n++) {
          const matching = takeMatchingSlots(
            slots,
            claimedAtLocation,
            slot.equipmentId,
            count,
          );
          if (matching.length !== count) break;
          claim(claimedAtLocation, matching);
          const token =
            getCriticalSlotsForLocation(criticalSlots, location)?.[
              matching[0].index
            ] ?? '';
          recovered.push({
            ...createMountedEquipment(
              { ...slot.equipmentDef, ...properties },
              generateUnitId(),
              true,
              /\(OMNIPOD\)(?:\s*\(ARMORED\))?\s*$/i.test(token),
            ),
            location,
            slots: matching.map((s) => s.index),
            isRearMounted: matching[0].isRearMounted,
          });
        }
        continue;
      }

      // Empty summaries historically skip ammo/heat-sink restoration. Preserve
      // that contract while admitting the scoped crit-only physical mounts.
      if (serialized.length === 0) continue;

      if (
        slot.equipmentDef?.category === EquipmentCategory.AMMUNITION &&
        slot.equipmentDef.criticalSlots > 0
      ) {
        const matching = takeMatchingSlots(
          slots,
          claimedAtLocation,
          slot.equipmentId,
          slot.equipmentDef.criticalSlots,
        );
        if (matching.length !== slot.equipmentDef.criticalSlots) continue;
        claim(claimedAtLocation, matching);
        recovered.push({
          ...createMountedEquipment(slot.equipmentDef, generateUnitId()),
          location,
          slots: matching.map((match) => match.index),
          isRearMounted: matching.some((match) => match.isRearMounted),
        });
        continue;
      }

      if (slot.heatSinkType) {
        const heatSink = createHeatSinkEquipmentList(slot.heatSinkType, 1)[0];
        if (!heatSink) continue;
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

  return [...placed, ...recovered];
}
