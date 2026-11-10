/**
 * Unit Metadata Hook
 *
 * Focused hook for unit metadata required for validation.
 * Provides basic unit identification and configuration data.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { useUnitStore } from '@/stores/useUnitStore';
import { RulesLevel, Era } from '@/types/enums';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { projectMechMetadata } from '@/utils/validation/mechValidationProjection';

/**
 * Unit metadata for validation
 */
export interface UnitMetadata {
  /** Unit ID */
  id: string;
  /** Unit name */
  name: string;
  /** Unit type */
  unitType: UnitType;
  /** Tech base */
  techBase: TechBase;
  /** Rules level */
  rulesLevel: RulesLevel;
  /** Introduction year */
  year: number;
  /** Era (derived from year) */
  era: Era;
  /** Extinction year (optional) */
  extinctionYear?: number;
  /** Cost in C-Bills */
  cost: number;
  /** Battle value */
  battleValue: number;
}

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
