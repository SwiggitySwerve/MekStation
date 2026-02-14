/**
 * Special Weapon Mechanics Module (Facade)
 *
 * Implements BattleTech special weapon resolution:
 * - Ultra AC: 2 independent shots, jam on natural 2
 * - Rotary AC: 1-6 shots selected by pilot, jam on natural 2
 * - LB-X: slug (standard) vs cluster (cluster table, -1 to-hit) modes
 * - AMS: Reduce incoming missile cluster hits
 * - Artemis IV/V: +2 cluster table roll bonus
 * - Narc/iNarc: +2 cluster table roll bonus for missiles vs marked target
 * - TAG: Designate target for semi-guided LRM
 * - MRM: -1 cluster column modifier
 * - Streak SRM: All-or-nothing (verification)
 *
 * This module re-exports from focused subdirectory modules for better organization.
 *
 * @spec openspec/changes/full-combat-parity/specs/weapon-system/spec.md
 */

export { type DiceRoller } from './diceTypes';

export * from './specialWeaponMechanics/types';
export * from './specialWeaponMechanics/autocannonMechanics';
export * from './specialWeaponMechanics/missileMechanics';
export * from './specialWeaponMechanics/defensiveSystems';
