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
import { RulesLevel, Era, getEraForYear } from '@/types/enums';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

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
  const id = useUnitStore((s) => s.id);
  const name = useUnitStore((s) => s.name);
  const unitType = useUnitStore((s) => s.unitType);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const extinctionYear = useUnitStore(
    (s) => (s as { extinctionYear?: number }).extinctionYear,
  );
  const cost = useUnitStore((s) => (s as { cost?: number }).cost) ?? 0;
  const battleValue =
    useUnitStore((s) => (s as { battleValue?: number }).battleValue) ?? 0;

  return useMemo(() => {
    // Derive era from year
    const derivedEra = year ? getEraForYear(year) : Era.DARK_AGE;

    return {
      id: id || 'new-unit',
      name: name || 'Unnamed',
      unitType: (unitType as UnitType) || UnitType.BATTLEMECH,
      techBase: (techBase as TechBase) || TechBase.INNER_SPHERE,
      rulesLevel: (rulesLevel as RulesLevel) || RulesLevel.STANDARD,
      year: year || 3025,
      era: derivedEra,
      extinctionYear,
      cost,
      battleValue,
    };
  }, [
    id,
    name,
    unitType,
    techBase,
    rulesLevel,
    year,
    extinctionYear,
    cost,
    battleValue,
  ]);
}
