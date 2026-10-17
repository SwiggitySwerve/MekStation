/**
 * Custom unit detail - saved-shape mapping.
 *
 * Maps the persisted custom unit payload (`ISerializedUnit`, as returned in
 * `parsedData` by GET /api/units/custom/:id) onto the fields the detail page
 * renders. Legacy/alternate field names are still honored so older saved units
 * keep rendering.
 *
 * Browser-safe: no SQLite / server imports.
 */

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getWeightClass, type WeightClass } from '@/types/enums/WeightClass';
import { getEquipmentById } from '@/utils/equipment/equipmentAggregation';

import type { UnitData } from './detail.types';

export interface IDetailEquipmentRow {
  readonly name: string;
  readonly location: string;
}

export interface IParsedUnitFields {
  readonly engine?: { type?: string; rating?: number };
  readonly movement?: { walkMP?: number; runMP?: number; jumpMP?: number };
  readonly armor?: Record<string, number>;
  readonly totalArmor?: number;
  readonly equipment?: IDetailEquipmentRow[];
  readonly heatSinks?: { type?: string; total?: number };
  readonly structure?: { type?: string };
  readonly quirks?: string[];
  readonly role?: string;
}

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Dict)
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/** `'medium-laser'` -> `'Medium Laser'` readable fallback for unknown ids. */
export function humanizeEquipmentId(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolveEquipmentName(id: string): string {
  return (
    getEquipmentLookupService().getById(id)?.name ??
    getEquipmentById(id)?.name ??
    humanizeEquipmentId(id)
  );
}

function parseMovement(raw: unknown): IParsedUnitFields['movement'] {
  const movement = asDict(raw);
  if (!movement) return undefined;
  const walkMP = asNumber(movement.walk) ?? asNumber(movement.walkMP);
  const jumpMP = asNumber(movement.jump) ?? asNumber(movement.jumpMP);
  const runMP =
    asNumber(movement.runMP) ??
    (walkMP !== undefined ? Math.ceil(walkMP * 1.5) : undefined);
  return { walkMP, runMP, jumpMP };
}

function armorPoints(value: unknown): number {
  const numeric = asNumber(value);
  if (numeric !== undefined) return numeric;
  const sides = asDict(value);
  return (asNumber(sides?.front) ?? 0) + (asNumber(sides?.rear) ?? 0);
}

function parseArmor(
  parsed: Dict,
): Pick<IParsedUnitFields, 'armor' | 'totalArmor'> {
  const allocation =
    asDict(asDict(parsed.armor)?.allocation) ?? asDict(parsed.armorAllocation);
  if (!allocation) {
    return { totalArmor: asNumber(parsed.totalArmorPoints) };
  }
  const armor: Record<string, number> = {};
  let total = 0;
  for (const [location, value] of Object.entries(allocation)) {
    const points = armorPoints(value);
    armor[location] = points;
    total += points;
  }
  return { armor, totalArmor: asNumber(parsed.totalArmorPoints) ?? total };
}

function parseEquipment(raw: unknown): IDetailEquipmentRow[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((entry) => {
    const item = asDict(entry) ?? {};
    const id =
      typeof item.id === 'string'
        ? item.id
        : typeof item.equipmentId === 'string'
          ? item.equipmentId
          : '';
    const name =
      typeof item.name === 'string' && item.name
        ? item.name
        : id
          ? resolveEquipmentName(id)
          : 'Unknown equipment';
    return {
      name,
      location: typeof item.location === 'string' ? item.location : '',
    };
  });
}

function parseHeatSinks(raw: unknown): IParsedUnitFields['heatSinks'] {
  const heatSinks = asDict(raw);
  if (!heatSinks) return undefined;
  return {
    type: typeof heatSinks.type === 'string' ? heatSinks.type : undefined,
    total: asNumber(heatSinks.count) ?? asNumber(heatSinks.total),
  };
}

export function parseUnitFields(unit: UnitData): IParsedUnitFields {
  const parsed = unit.parsedData ?? {};
  return {
    engine: asDict(parsed.engine) as IParsedUnitFields['engine'],
    structure: asDict(parsed.structure) as IParsedUnitFields['structure'],
    movement: parseMovement(parsed.movement),
    ...parseArmor(parsed),
    equipment: parseEquipment(parsed.equipment),
    heatSinks: parseHeatSinks(parsed.heatSinks),
    quirks: Array.isArray(parsed.quirks)
      ? (parsed.quirks as string[])
      : undefined,
    role:
      typeof parsed.role === 'string'
        ? parsed.role
        : (asDict(parsed.metadata)?.role as string | undefined),
  };
}

/**
 * The API record has no weight class column (despite the UnitData type), so
 * derive it from tonnage when it is missing.
 */
export function resolveWeightClass(unit: UnitData): WeightClass {
  const stored = unit.weightClass as WeightClass | undefined;
  return stored ?? getWeightClass(unit.tonnage);
}
