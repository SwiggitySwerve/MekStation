import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { parseUnitReference } from '@/types/unit/UnitIndex';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';

import { getNodeCanonicalUnitService } from '../units/NodeCanonicalUnitService';
import { setForceRepositoryCanonicalStatsResolver } from './ForceRepository';
import {
  type CanonicalUnitStatsResolver,
  missingUnitStats,
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
) => {
  assertServerRuntime();
  const reference = parseUnitReference(unitId);
  const catalog = getNodeCanonicalUnitService();
  const index = reference.family
    ? catalog.getIndexSync({ family: reference.family })
    : catalog.getIndexSync();
  const entry = index.find((unit) => unit.id === reference.id);

  if (!entry) {
    return missingUnitStats(unitId);
  }

  const unit = getNodeCanonicalUnitService().getByIdSync(unitId);
  if (!unit) return missingUnitStats(unitId);

  // Non-mech contracts need the same construction projection as combat.
  const bv =
    reference.family && reference.family !== 'battlemechs'
      ? adaptUnitFromData(unit, { family: reference.family }).bv
      : calculateUnitBV(unit);
  if (bv === undefined)
    throw new Error(`Force BV is unavailable for ${unitId}`);
  return {
    bv,
    tonnage: entry.tonnage,
  };
};

export function installNodeCanonicalUnitStatsResolver(): void {
  assertServerRuntime();
  setForceRepositoryCanonicalStatsResolver(resolveNodeCanonicalUnitStats);
}
