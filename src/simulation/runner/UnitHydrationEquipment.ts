import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import type {
  CriticalSlotMap,
  IHydratableEquipmentSignal,
  IUnitEquipmentEntry,
} from './UnitHydrationTypes';

import { normalizeEquipmentLocation } from './UnitHydrationText';

export function criticalSlotsFromFullUnit(
  fullUnit: IFullUnit,
): CriticalSlotMap {
  const raw = (fullUnit as { criticalSlots?: unknown }).criticalSlots;
  if (!raw || typeof raw !== 'object') return {};

  const out: Record<string, readonly (string | null)[]> = {};
  for (const [location, slots] of Object.entries(raw)) {
    if (!Array.isArray(slots)) continue;
    out[location] = slots.map((slot) =>
      typeof slot === 'string' || slot === null ? slot : null,
    );
  }
  return out;
}

export function locationSlotTexts(
  criticalSlots: CriticalSlotMap,
  location: string,
): readonly string[] {
  return (criticalSlots[location] ?? []).filter(
    (slot): slot is string => typeof slot === 'string',
  );
}

export function equipmentSignalsFromFullUnit(
  fullUnit: IFullUnit,
): readonly IHydratableEquipmentSignal[] {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
  const signals: IHydratableEquipmentSignal[] = [];

  for (const raw of equipment) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<IUnitEquipmentEntry>;
    if (typeof entry.id !== 'string') continue;

    const sourceLocation =
      typeof entry.location === 'string'
        ? normalizeEquipmentLocation(entry.location)
        : undefined;
    const currentMode = equipmentModeFromRawEntry(raw);
    signals.push({
      id: entry.id,
      ...(sourceLocation ? { sourceLocation } : {}),
      ...(currentMode !== undefined ? { currentMode } : {}),
    });
  }

  const criticalSlots = criticalSlotsFromFullUnit(fullUnit);
  for (const [location, slots] of Object.entries(criticalSlots)) {
    const sourceLocation = normalizeEquipmentLocation(location);
    for (const slot of slots) {
      if (typeof slot !== 'string') continue;
      signals.push({
        id: slot,
        ...(sourceLocation ? { sourceLocation } : {}),
      });
    }
  }

  return signals;
}

export function equipmentEntriesFromFullUnit(
  fullUnit: IFullUnit,
): readonly IUnitEquipmentEntry[] {
  const equipment =
    (fullUnit.equipment as readonly unknown[] | undefined) ?? [];

  return equipment.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const entry = raw as Partial<IUnitEquipmentEntry>;
    if (typeof entry.id !== 'string' || typeof entry.location !== 'string') {
      return [];
    }
    const mode = equipmentModeFromRawEntry(raw);
    const explosionDamage = equipmentExplosionDamageFromRawEntry(raw);
    return [
      {
        id: entry.id,
        location: entry.location,
        ...(entry.isRearMounted !== undefined
          ? { isRearMounted: entry.isRearMounted }
          : {}),
        ...(Array.isArray(entry.linkedEquipment)
          ? { linkedEquipment: entry.linkedEquipment }
          : {}),
        ...(mode !== undefined ? { currentMode: mode } : {}),
        ...(explosionDamage !== undefined ? { explosionDamage } : {}),
      },
    ];
  });
}

function equipmentExplosionDamageFromRawEntry(raw: object): number | undefined {
  const value = (raw as Record<string, unknown>).explosionDamage;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function equipmentModeFromRawEntry(raw: object): string | undefined {
  const fields = raw as Record<string, unknown>;
  for (const key of ['currentMode', 'mode', 'activeMode', 'modeName']) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}
