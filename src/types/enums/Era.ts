/**
 * Era - Historical era enumeration
 *
 * This file re-exports from the canonical source: types/temporal/Era.ts
 *
 * @spec core-enumerations/spec.md
 * @see types/temporal/Era.ts for full era definitions and utilities
 */

// Re-export everything from the canonical source
export {
  Era,
  type EraDefinition,
  type EraRange,
  ERA_DEFINITIONS,
  ERA_RANGES,
  ALL_ERAS,
  ERA_MAP,
  getEraDefinition,
  getAllEraDefinitions,
  getEraForYear,
  getEraRange,
  isYearInEra,
} from '../temporal/Era';
