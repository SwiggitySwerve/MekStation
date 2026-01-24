/**
 * Game Resolution Services
 * Shared logic for game outcomes, XP calculation, and damage assessment.
 * Used by both quick games and campaign games.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

// Game Outcome Calculator
export {
  calculateGameOutcome,
  calculateOutcomeFromEvents,
  calculateCombatStats,
  isGameEnded,
  determineWinner,
  type VictoryReason,
  type IGameOutcome,
  type ICombatStats,
  type IOutcomeCalculationInput,
} from './GameOutcomeCalculator';

// XP Calculator
export {
  calculateMissionXP,
  calculateXPBreakdown,
  xpRequiredForLevel,
  canImproveSkill,
  calculateTeamXP,
  XP_VALUES,
  type IXPCalculationInput,
  type IXPBreakdown,
} from './XPCalculator';

// Damage Calculator
export {
  calculateDamagePercent,
  assessUnitDamage,
  getLocationDamage,
  estimateRepairCost,
  needsCriticalRepair,
  estimateRepairTime,
  isSalvageable,
  DAMAGE_THRESHOLDS,
  MECH_LOCATIONS,
  type UnitCombatStatus,
  type IDamageAssessment,
  type ILocationDamage,
} from './DamageCalculator';
