/**
 * Piloting Skill Rolls (PSR) - Facade
 * Re-exports all PSR functionality from the pilotingSkillRolls subdirectory.
 *
 * @spec openspec/changes/full-combat-parity/specs/piloting-skill-rolls/spec.md
 */

// Re-export everything from the subdirectory
export * from './pilotingSkillRolls';

// Re-export hitLocation utilities
export { isLegLocation } from './hitLocation';
