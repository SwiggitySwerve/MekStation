/**
 * Server-side custom combat construction reader.
 *
 * Identity authority is the SQLite unit row. Embedded payload ids are replaced
 * with `record.id` before parsing so a forged inner id cannot select another
 * design. Chassis and variant are likewise taken from the row.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import type { CustomCombatSnapshot } from '@/types/contracts/CustomCombatSnapshot';

import { customCombatSnapshotFamily } from '@/types/contracts/CustomCombatSnapshot';
import {
  formatUnitReference,
  parseUnitReference,
} from '@/types/unit/UnitIndex';

import {
  parseCustomCombatDefinition,
  isCustomCombatReference as isCustomCombatId,
} from './customCombatDefinition';
import { getUnitRepository } from './UnitRepository';

export function readServerCustomCombatDefinition(
  id: string,
): CustomCombatSnapshot | null {
  if (!isCustomCombatId(id)) return null;
  const record = getUnitRepository().getById(parseUnitReference(id).id);
  if (
    !record ||
    record.id !== parseUnitReference(id).id ||
    !isCustomCombatId(record.id)
  ) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(record.data);
    if (!isRecord(data)) return null;
    return parseCustomCombatDefinition(
      {
        ...data,
        id: record.id,
        chassis: record.chassis,
        variant: record.variant,
      },
      id,
    );
  } catch {
    return null;
  }
}

export function listServerCustomCombatRefs(): string[] {
  return getUnitRepository()
    .list()
    .flatMap((row) => {
      const snapshot = readServerCustomCombatDefinition(row.id);
      return snapshot
        ? [formatUnitReference(row.id, customCombatSnapshotFamily(snapshot))]
        : [];
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
