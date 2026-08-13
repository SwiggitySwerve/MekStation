import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface SavedDesignOption {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
}

export interface SavedDesignRejection {
  readonly reason: 'empty-id' | 'non-battlemech' | 'empty-name' | 'invalid-tonnage';
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function mapRow(
  row: Record<string, unknown>,
): SavedDesignOption | SavedDesignRejection {
  if (!nonEmpty(row.id)) return { reason: 'empty-id' };
  if ((row.unitType ?? row.entityType) !== UnitType.BATTLEMECH) {
    return { reason: 'non-battlemech' };
  }
  if (!nonEmpty(row.name)) return { reason: 'empty-name' };
  if (typeof row.tonnage !== 'number' || !Number.isFinite(row.tonnage) || row.tonnage <= 0) {
    return { reason: 'invalid-tonnage' };
  }
  return { id: row.id, name: row.name, tonnage: row.tonnage };
}

export function validateSavedBattleMechIndex(rows: unknown): {
  readonly options: readonly SavedDesignOption[];
  readonly rejected: readonly SavedDesignRejection[];
} {
  const options: SavedDesignOption[] = [];
  const rejected: SavedDesignRejection[] = [];
  if (!Array.isArray(rows)) return { options, rejected: [{ reason: 'empty-id' }] };
  for (const entry of rows) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      rejected.push({ reason: 'empty-id' });
      continue;
    }
    const mapped = mapRow(entry as Record<string, unknown>);
    if ('reason' in mapped) rejected.push(mapped);
    else options.push(mapped);
  }
  return { options, rejected };
}
