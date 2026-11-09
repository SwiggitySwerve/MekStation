import type { ICriticalSlotPart } from '@/types/equipment/MountedEquipment';

import {
  mapArmorType,
  mapStructureType,
} from '@/services/conversion/ValueMappings';
import { mapMechLocation } from '@/services/units/unitLoaderService/componentMappers';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import {
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import {
  getLocationsForConfig,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { classifyEquipmentByName } from '@/utils/colors/equipmentColors.classification';
import { classifySystemComponent } from '@/utils/colors/slotColors';
import {
  ARMOR_SLOTS_EQUIPMENT_ID,
  INTERNAL_STRUCTURE_EQUIPMENT_ID,
} from '@/utils/equipment/equipmentConstants';

import { getSlotParts } from './parts';
import { getFixedSlotNames, type ArmActuatorConfig } from './topology';

/** Source/current facts used by the critical-grid owner, independent of UUIDs. */
export interface ISourceGridMount {
  readonly instanceId?: string;
  readonly equipmentId: string;
  readonly name?: string;
  readonly category?: EquipmentCategory;
  readonly location?: string;
  readonly slots?: readonly number[];
  readonly splitSlots?: ICriticalSlotPart;
  readonly spreadSlots?: readonly ICriticalSlotPart[];
  readonly criticalSlots?: number;
  readonly isRearMounted?: boolean;
}

interface ISourceGrid {
  readonly engine?: { readonly rating: number };
  readonly heatSinks?: { readonly count: number };
  readonly criticalSlots?: Readonly<Record<string, readonly (string | null)[]>>;
  readonly equipment?: readonly {
    readonly id: string;
    readonly location: string;
  }[];
}

export interface ISourceGridLayout {
  readonly configuration: MechConfiguration;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly cockpitType: string;
  readonly armActuators?: ArmActuatorConfig;
  readonly structureType: string;
  readonly armorType: string;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly engineRating: number;
  readonly baseline: {
    readonly engineType: string;
    readonly gyroType: string;
    readonly cockpitType: string;
    readonly internalStructureType: string;
    readonly armorType: string;
    readonly heatSinkType: string;
  };
}

const locationIdentity = (location: string) =>
  mapMechLocation(location) ?? location;
const partsIdentity = (mount: ISourceGridMount) =>
  JSON.stringify(
    getSlotParts(mount).map(({ location, slots }) => [
      locationIdentity(location),
      slots,
    ]),
  );
function sameMount(a: ISourceGridMount, b: ISourceGridMount): boolean {
  return (
    a.equipmentId === b.equipmentId &&
    a.isRearMounted === b.isRearMounted &&
    partsIdentity(a) === partsIdentity(b)
  );
}
function componentGroup(
  token: string,
): 'structure' | 'armor' | 'sink' | undefined {
  if (
    (getInternalStructureDefinition(mapStructureType(token))?.criticalSlots ??
      0) > 0
  )
    return 'structure';
  if ((getArmorDefinition(mapArmorType(token))?.criticalSlots ?? 0) > 0)
    return 'armor';
  if (classifyEquipmentByName(token) === 'heatsink') return 'sink';
  return undefined;
}
function mountGroup(mount: ISourceGridMount) {
  if (mount.equipmentId.startsWith(INTERNAL_STRUCTURE_EQUIPMENT_ID))
    return 'structure';
  if (mount.equipmentId.startsWith(ARMOR_SLOTS_EQUIPMENT_ID)) return 'armor';
  return componentGroup(mount.name ?? mount.equipmentId);
}

function writeSlot(
  slots: (string | null)[],
  index: number,
  token: string | null,
) {
  while (slots.length < index) slots.push(null);
  slots[index] = token;
}

/** Native cells survive unchanged mounts; edits replace all portions atomically. */
export function projectSourceGrid(
  source: ISourceGrid | undefined,
  originals: readonly ISourceGridMount[] | undefined,
  mounts: readonly ISourceGridMount[],
  layout?: ISourceGridLayout,
) {
  const criticalSlots = Object.fromEntries(
    Object.entries(source?.criticalSlots ?? {}).map(([loc, slots]) => [
      loc,
      [...slots],
    ]),
  );
  const critLocation = (location: string) =>
    Object.keys(criticalSlots).find(
      (key) => locationIdentity(key) === locationIdentity(location),
    ) ?? location.toUpperCase().replace(/ /g, '_');
  const equipment: { id: string; location: string }[] = [];
  const current = new Set(mounts);
  const retained: ISourceGridMount[] = [];
  // Match design and allocation, never temporary UUIDs. Consume duplicates once.
  originals?.forEach((original, index) => {
    const live = [...current].find((item) => sameMount(item, original));
    if (live) {
      const raw = source?.equipment?.[index];
      // Recovered ammo/sinks already exist in the grid; inventing a summary
      // entry for them can turn an ammo ID into an additional weapon.
      if (raw) equipment.push({ id: raw.id, location: raw.location });
      current.delete(live);
      retained.push(original);
    } else {
      for (const { location, slots } of getSlotParts(original)) {
        const entries = criticalSlots[critLocation(location)];
        for (const slot of slots) if (entries) entries[slot] = null;
      }
    }
  });

  if (layout) {
    const changed = new Set<string>();
    if (layout.structureType !== layout.baseline.internalStructureType)
      changed.add('structure');
    if (layout.armorType !== layout.baseline.armorType) changed.add('armor');
    if (
      layout.heatSinkType !== layout.baseline.heatSinkType ||
      (source?.heatSinks && layout.heatSinkCount !== source.heatSinks.count) ||
      (source?.engine && layout.engineRating !== source.engine.rating) ||
      layout.engineType !== layout.baseline.engineType
    )
      changed.add('sink');
    for (const mount of current) {
      const group = mountGroup(mount);
      if (group && getSlotParts(mount).some((part) => part.slots.length))
        changed.add(group);
    }
    for (const slots of Object.values(criticalSlots))
      slots.forEach((token, index) => {
        if (token && changed.has(componentGroup(token) ?? ''))
          slots[index] = null;
      });
    // A moved component may share a group with an unchanged native mount.
    // Restore only that mount's own evidence after clearing source-only cells.
    for (const mount of retained)
      for (const { location, slots } of getSlotParts(mount)) {
        const key = critLocation(location);
        const entries = (criticalSlots[key] ??= []);
        const native = source?.criticalSlots?.[key];
        for (const slot of slots)
          writeSlot(
            entries,
            slot,
            native
              ? (native[slot] ?? null)
              : (mount.name ?? mount.equipmentId) +
                  (mount.isRearMounted ? ' (R)' : ''),
          );
      }
  }

  // Clear every old mount first, then insert every new part. Swaps cannot erase
  // a mount inserted earlier in the same projection.
  for (const item of current) {
    const loc = critLocation(item.location ?? '');
    if (item.category !== EquipmentCategory.AMMUNITION)
      equipment.push({
        id: item.equipmentId,
        location: loc + (item.isRearMounted ? ' (R)' : ''),
      });
    const name =
      (item.name ?? item.equipmentId) + (item.isRearMounted ? ' (R)' : '');
    for (const part of getSlotParts(item)) {
      const slots = (criticalSlots[critLocation(part.location)] ??= []);
      if (source && !part.slots.length) continue;
      for (
        let i = 0;
        i <
        (part.slots.length ||
          Math.max(1, item.slots?.length ?? item.criticalSlots ?? 1));
        i++
      ) {
        const slot = part.slots[i];
        if (slot === undefined) slots.push(name);
        else writeSlot(slots, slot, name);
      }
    }
  }

  if (layout) {
    const active = getLocationsForConfig(layout.configuration);
    for (const key of Object.keys(criticalSlots))
      if (!active.some((loc) => locationIdentity(key) === loc))
        delete criticalSlots[key];
    const fixedChanged =
      layout.engineType !== layout.baseline.engineType ||
      layout.gyroType !== layout.baseline.gyroType ||
      layout.cockpitType !== layout.baseline.cockpitType;
    for (const location of active) {
      const occupied = new Set(
        mounts.flatMap((mount) =>
          getSlotParts(mount)
            .filter((part) => locationIdentity(part.location) === location)
            .flatMap((part) => [...part.slots]),
        ),
      );
      const key = critLocation(location);
      const missing = !source?.criticalSlots?.[key];
      const slots = (criticalSlots[key] ??= Array<string | null>(
        LOCATION_SLOT_COUNTS[location],
      ).fill(null));
      if (missing)
        while (slots.length < LOCATION_SLOT_COUNTS[location]) slots.push(null);
      const fixed = getFixedSlotNames(
        location,
        layout.engineType,
        layout.gyroType,
        layout.armActuators,
        layout.cockpitType,
      );
      if (fixedChanged)
        slots.forEach((token, index) => {
          if (occupied.has(index)) return;
          const kind = classifySystemComponent(token ?? '');
          if (
            kind !== 'empty' &&
            kind !== 'structure' &&
            kind !== 'armor' &&
            kind !== 'actuator'
          )
            slots[index] = null;
        });
      fixed.forEach((name, index) => {
        // Retain an invalid live allocation for validation rather than losing
        // one portion of a mount when a new component claims the same cell.
        if (occupied.has(index)) return;
        if (
          missing ||
          (fixedChanged && classifySystemComponent(name) !== 'actuator')
        )
          writeSlot(slots, index, name);
      });
      if (
        !missing &&
        (location === MechLocation.LEFT_ARM ||
          location === MechLocation.RIGHT_ARM)
      ) {
        for (const index of [2, 3]) {
          if (occupied.has(index)) continue;
          const name = fixed.get(index);
          const actuator =
            classifySystemComponent(slots[index] ?? '') === 'actuator';
          if (name && !actuator) writeSlot(slots, index, name);
          else if (!name && actuator) slots[index] = null;
        }
      }
    }
  }
  return { criticalSlots, equipment };
}
