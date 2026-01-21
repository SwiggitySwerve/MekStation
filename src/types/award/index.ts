/**
 * Award System Types
 *
 * Export barrel for award-related type definitions and utilities.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

// Core interfaces and enums
export {
  // Enums
  AwardRarity,
  AwardCategory,
  CriteriaType,
  // Criteria interfaces
  type IAwardCriteria,
  type IAwardProgress,
  // Award interfaces
  type IAward,
  type IPilotAward,
  type IAwardContext,
  // Statistics interfaces
  type IPilotCombatStats,
  type IPilotCareerStats,
  type IPilotStats,
  // Store interfaces
  type IAwardNotification,
  type IGrantAwardInput,
  type IAwardCheckResult,
  // Type guards
  isAward,
  isPilotAward,
  isPilotStats,
  // Utility functions
  createEmptyCombatStats,
  createEmptyCareerStats,
  createEmptyPilotStats,
  calculateProgress,
  getRarityColor,
  getRarityBackground,
} from './AwardInterfaces';

// Award catalog and definitions
export { AWARD_CATALOG, getAwardById, getAwardsByCategory, getAwardsByRarity } from './AwardCatalog';

// Icon components and utilities - re-exported from awardIcons.tsx
// Note: Components are directly importable from '@/types/award/awardIcons'
