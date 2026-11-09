import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import { toMechLoc } from '../../../../scripts/validate-bv-normalizers';

/** Source/current facts used by the critical-grid owner, independent of UUIDs. */
export interface ISourceGridMount {
  readonly instanceId?: string;
  readonly equipmentId: string;
  readonly name?: string;
  readonly category?: EquipmentCategory;
  readonly location: string;
  readonly slots?: readonly number[];
  readonly criticalSlots?: number;
  readonly isRearMounted?: boolean;
}

interface ISourceGrid {
  readonly criticalSlots?: Readonly<Record<string, readonly (string | null)[]>>;
  readonly equipment?: readonly {
    readonly id: string;
    readonly location: string;
  }[];
}

/** Project native evidence and current allocations without changing BV rules. */
export function projectSourceGrid(
  source: ISourceGrid | undefined,
  originals:
    | readonly (Omit<ISourceGridMount, 'location'> & {
        readonly instanceId: string;
        readonly location?: string;
      })[]
    | undefined,
  mounts: readonly ISourceGridMount[],
) {
  const criticalSlots = Object.fromEntries(
    Object.entries(source?.criticalSlots ?? {}).map(([loc, slots]) => [
      loc,
      [...slots],
    ]),
  );
  const critLocation = (location: string) => {
    const short = toMechLoc(location);
    return (
      (short &&
        Object.keys(criticalSlots).find((key) => toMechLoc(key) === short)) ||
      location.toUpperCase().replace(/ /g, '_')
    );
  };
  const equipment: { id: string; location: string }[] = [];
  const current = new Map(
    mounts.map((item, index) => [item.instanceId ?? String(index), item]),
  );
  originals?.forEach((original, index) => {
    const live = current.get(original.instanceId);
    const unchanged =
      live &&
      live.equipmentId === original.equipmentId &&
      live.location === (original.location ?? '') &&
      live.isRearMounted === original.isRearMounted &&
      JSON.stringify(live.slots) === JSON.stringify(original.slots);
    if (unchanged) {
      const raw = source?.equipment?.[index];
      // Recovered ammo/sinks already exist in the critical grid. Some ammo IDs
      // are also weapon IDs, so adding them here would invent extra weapons.
      if (raw) equipment.push({ id: raw.id, location: raw.location });
      current.delete(original.instanceId);
    } else if (original.location) {
      const loc = critLocation(original.location);
      for (const slot of original.slots ?? []) {
        if (criticalSlots[loc]) criticalSlots[loc][slot] = null;
      }
    }
  });
  for (const item of current.values()) {
    const loc = critLocation(item.location);
    if (item.category !== EquipmentCategory.AMMUNITION)
      equipment.push({
        id: item.equipmentId,
        location: loc + (item.isRearMounted ? ' (R)' : ''),
      });
    if (!loc) continue;
    const slots = (criticalSlots[loc] ??= []);
    const name =
      (item.name ?? item.equipmentId) + (item.isRearMounted ? ' (R)' : '');
    for (
      let i = 0;
      i < Math.max(1, item.slots?.length ?? item.criticalSlots ?? 1);
      i++
    ) {
      const slot = item.slots?.[i];
      if (slot === undefined) slots.push(name);
      else slots[slot] = name;
    }
  }
  return { criticalSlots, equipment };
}
