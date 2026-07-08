import {
  IForce,
  IAssignment,
  IForceStats,
  ForceType,
  ForceStatus,
  ForcePosition,
} from '@/types/force';
import {
  calculateUnitBV as calculateBV,
  type UnitData,
} from '@/utils/construction/bvAdapter';

import { getSQLiteService } from '../persistence/SQLiteService';

export interface ForceRow {
  id: string;
  name: string;
  force_type: string;
  status: string;
  affiliation: string | null;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRow {
  id: string;
  force_id: string;
  pilot_id: string | null;
  unit_id: string | null;
  position: string;
  slot: number;
  notes: string | null;
}

export function rowToAssignment(row: AssignmentRow): IAssignment {
  return {
    id: row.id,
    pilotId: row.pilot_id,
    unitId: row.unit_id,
    position: row.position as ForcePosition,
    slot: row.slot,
    notes: row.notes ?? undefined,
  };
}

export interface CalculatedUnitStats {
  readonly bv: number;
  readonly tonnage: number;
}

export type CanonicalUnitStatsResolver = (
  unitId: string,
) => CalculatedUnitStats | null | undefined;

export interface ForceStatsResolutionOptions {
  readonly canonicalUnitStatsResolver?: CanonicalUnitStatsResolver;
}

export function calculateStats(
  assignments: IAssignment[],
  options: ForceStatsResolutionOptions = {},
): IForceStats {
  const assignedPilots = assignments.filter((a) => a.pilotId !== null).length;
  const assignedUnits = assignments.filter((a) => a.unitId !== null).length;
  const emptySlots = assignments.filter(
    (a) => a.pilotId === null && a.unitId === null,
  ).length;

  let totalBV = 0;
  let totalTonnage = 0;
  for (const assignment of assignments) {
    if (assignment.unitId) {
      const unitStats = calculateUnitStats(assignment.unitId, options);
      totalBV += unitStats.bv;
      totalTonnage += unitStats.tonnage;
    }
  }

  return {
    totalBV,
    totalTonnage,
    assignedPilots,
    assignedUnits,
    emptySlots,
    averageSkill: null,
  };
}

export function calculateUnitBV(
  unitId: string,
  options: ForceStatsResolutionOptions = {},
): number {
  return calculateUnitStats(unitId, options).bv;
}

export function calculateUnitStats(
  unitId: string,
  options: ForceStatsResolutionOptions = {},
): CalculatedUnitStats {
  return (
    calculateCustomUnitStats(unitId) ??
    calculateCanonicalUnitStats(unitId, options.canonicalUnitStatsResolver) ?? {
      bv: 0,
      tonnage: 0,
    }
  );
}

function calculateCustomUnitStats(unitId: string): CalculatedUnitStats | null {
  try {
    const db = getSQLiteService().getDatabase();

    const customUnit = db
      .prepare('SELECT data, tonnage FROM custom_units WHERE id = ?')
      .get(unitId) as { data: string; tonnage: number } | undefined;

    if (customUnit) {
      try {
        const unitData = JSON.parse(customUnit.data) as UnitData;
        return {
          bv: calculateBV(unitData),
          tonnage: customUnit.tonnage,
        };
      } catch {
        return { bv: 0, tonnage: customUnit.tonnage };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function calculateCanonicalUnitStats(
  unitId: string,
  resolver: CanonicalUnitStatsResolver | undefined,
): CalculatedUnitStats | null {
  if (!resolver) {
    return null;
  }
  try {
    return resolver(unitId) ?? null;
  } catch {
    return null;
  }
}

export function hydrateForce(
  row: ForceRow,
  options: ForceStatsResolutionOptions = {},
): IForce {
  const db = getSQLiteService().getDatabase();

  const assignments = getAssignments(row.id);
  const childRows = db
    .prepare('SELECT id FROM forces WHERE parent_id = ?')
    .all(row.id) as Array<{ id: string }>;
  const childIds = childRows.map((r) => r.id);
  const stats = calculateStats(assignments, options);

  return {
    id: row.id,
    name: row.name,
    forceType: row.force_type as ForceType,
    status: row.status as ForceStatus,
    affiliation: row.affiliation ?? undefined,
    parentId: row.parent_id ?? undefined,
    childIds,
    assignments,
    stats,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAssignments(forceId: string): IAssignment[] {
  const db = getSQLiteService().getDatabase();
  const rows = db
    .prepare('SELECT * FROM force_assignments WHERE force_id = ? ORDER BY slot')
    .all(forceId) as AssignmentRow[];

  return rows.map(rowToAssignment);
}

export function wouldCreateCycle(
  forceId: string,
  newParentId: string,
): boolean {
  const db = getSQLiteService().getDatabase();
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === forceId) {
      return true;
    }
    const parent = db
      .prepare('SELECT parent_id FROM forces WHERE id = ?')
      .get(currentId) as { parent_id: string | null } | undefined;
    currentId = parent?.parent_id ?? null;
  }

  return false;
}
