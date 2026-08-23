import type { IInstanceProvenance } from '@/kernel';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import {
  CANONICAL_LIBRARY_SOURCE_VERSION,
  MEKSTATION_GAME_PLUGIN,
} from './mekstationGamePlugin';

export function isLibraryBackedEnrollment(unit: {
  readonly unitRef?: string;
}): boolean {
  return typeof unit.unitRef === 'string' && unit.unitRef.trim().length > 0;
}

export function pinSourceVersion(version: number | undefined): number {
  if (version !== undefined && Number.isInteger(version) && version > 0) {
    return version;
  }
  return CANONICAL_LIBRARY_SOURCE_VERSION;
}

export function mapRosterInstanceProvenance(
  unit: IRosterUnitProjection,
): IInstanceProvenance | null {
  const libraryItemId = unit.unitRef?.trim();
  if (!libraryItemId) return null;
  const parsed = parseRosterUnitSource(unit.unitSource);
  if (parsed.kind === 'invalid') return null;
  return {
    instanceId: unit.unitId,
    libraryItemId,
    sourceVersion: pinSourceVersion(unit.sourceVersion),
    kind: MEKSTATION_GAME_PLUGIN.instanceKind,
  };
}
