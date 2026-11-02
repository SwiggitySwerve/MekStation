import { calculateUnitBV } from '@/utils/construction/bvAdapter';

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
    .getIndexSync()
    .find((unit) => unit.id === unitId);

  if (!entry) {
    return null;
  }

  const unit = getNodeCanonicalUnitService().getByIdSync(unitId);
  if (!unit) throw new Error(`Cannot load canonical unit for BV: ${unitId}`);

  return {
    // The canonical loader validates the bundled JSON at its I/O boundary.
    bv: calculateUnitBV(unit),
    tonnage: entry.tonnage,
  };
};

export function installNodeCanonicalUnitStatsResolver(): void {
  assertServerRuntime();
  setForceRepositoryCanonicalStatsResolver(resolveNodeCanonicalUnitStats);
}
