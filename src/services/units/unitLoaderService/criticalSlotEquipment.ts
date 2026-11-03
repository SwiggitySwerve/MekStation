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
    if (match.found && match.equipment) return match.equipment.id;
  }
  return undefined;
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
        const resolved = resolveEquipmentId(
          lookupToken,
          unitTechBase,
          unitTechBaseMode,
          entries,
        );
        const registryId = resolveRegistryEquipmentId(lookupToken);
        const equipmentDef =
          resolved.equipmentDef ??
          (registryId
            ? getEquipmentLookupService().getById(registryId)
            : undefined);
        const equipmentId = equipmentDef?.id ?? registryId;
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
