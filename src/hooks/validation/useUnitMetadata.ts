/**
 * Unit Metadata Hook
 *
 * Focused hook for unit metadata required for validation.
 * Provides basic unit identification and configuration data.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import type { UnitMetadata } from '@/utils/validation/mechValidationProjection.types';

import { useUnitStore } from '@/stores/useUnitStore';
import { projectMechMetadata } from '@/utils/validation/mechValidationProjection';

export type { UnitMetadata } from '@/utils/validation/mechValidationProjection.types';

/**
 * Hook for unit metadata
 *
 * Dependencies: id, name, unitType, techBase, rulesLevel, year, extinctionYear,
 * cost, battleValue (9 total)
 */
export function useUnitMetadata(): UnitMetadata {
  const state = useUnitStore((s) => s);
  return useMemo(() => projectMechMetadata(state), [state]);
}
