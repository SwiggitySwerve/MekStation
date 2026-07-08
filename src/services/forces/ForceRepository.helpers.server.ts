import { getNodeCanonicalUnitService } from '../units/NodeCanonicalUnitService';
import { setForceRepositoryCanonicalStatsResolver } from './ForceRepository';
import {
  type CalculatedUnitStats,
  type CanonicalUnitStatsResolver,
} from './ForceRepository.helpers';

function assertServerRuntime(): void {
  const isJestRuntime =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined);

  if (typeof window !== 'undefined' && !isJestRuntime) {
    throw new Error(
      'ForceRepository.helpers.server is server-only and cannot be imported into a browser bundle.',
    );
  }
}

export const resolveNodeCanonicalUnitStats: CanonicalUnitStatsResolver = (
  unitId: string,
): CalculatedUnitStats | null => {
  assertServerRuntime();
  const entry = getNodeCanonicalUnitService()
    .getIndexSyncWithBV()
    .find((unit) => unit.id === unitId);

  if (!entry) {
    return null;
  }

  return {
    bv: entry.bv ?? 0,
    tonnage: entry.tonnage,
  };
};

export function installNodeCanonicalUnitStatsResolver(): void {
  assertServerRuntime();
  setForceRepositoryCanonicalStatsResolver(resolveNodeCanonicalUnitStats);
}
