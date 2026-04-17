/**
 * Tests for the canonicalization bridge between pilot ability ids and
 * the unified SPA catalog. Confirms that each combat modifier fires
 * regardless of whether the pilot record uses legacy System B ids
 * (kebab-case) or the canonical snake_case ids introduced in the
 * unified catalog.
 */

import { MovementType, RangeBracket } from '@/types/gameplay';

import {
  calculateBloodStalkerModifier,
  calculateDodgeManeuverModifier,
  calculateJumpingJackModifier,
  calculateMeleeSpecialistModifier,
  calculateMultiTaskerModifier,
  getClusterHitterBonus,
  getHotDogShutdownThresholdBonus,
  getIronManModifier,
  getMeleeMasterDamageBonus,
  getTacticalGeniusBonus,
} from '../abilityModifiers';
import { hasSPA } from '../canonicalize';
import {
  getConsciousnessCheckModifier,
  getObliqueAttackerBonus,
  hasSPA as catalogHasSPA,
} from '../catalog';
import {
  calculateGunnerySpecialistModifier,
  calculateRangeMasterModifier,
  calculateSniperModifier,
  calculateWeaponSpecialistModifier,
} from '../weaponSpecialists';

describe('hasSPA bridge', () => {
  it('matches the canonical snake_case id directly', () => {
    expect(hasSPA(['weapon_specialist'], 'weapon_specialist')).toBe(true);
  });

  it('resolves the legacy kebab-case id', () => {
    expect(hasSPA(['weapon-specialist'], 'weapon_specialist')).toBe(true);
  });

  it('returns false for unrelated ids', () => {
    expect(hasSPA(['sniper'], 'weapon_specialist')).toBe(false);
  });

  it('returns false for empty arrays', () => {
    expect(hasSPA([], 'weapon_specialist')).toBe(false);
  });
});

describe('combat modifiers accept canonical ids', () => {
  it('Weapon Specialist fires on canonical id', () => {
    const mod = calculateWeaponSpecialistModifier(
      ['weapon_specialist'],
      'large_laser',
      'large_laser',
    );
    expect(mod?.value).toBe(-2);
  });

  it('Gunnery Specialist fires on canonical id', () => {
    const mod = calculateGunnerySpecialistModifier(
      ['specialist'],
      'energy',
      'energy',
    );
    expect(mod?.value).toBe(-1);
  });

  it('Blood Stalker fires on canonical id', () => {
    const mod = calculateBloodStalkerModifier(
      ['blood_stalker'],
      'tgt-1',
      'tgt-1',
    );
    expect(mod?.value).toBe(-1);
  });

  it('Range Master fires on canonical id', () => {
    const mod = calculateRangeMasterModifier(
      ['range_master'],
      RangeBracket.Short,
      RangeBracket.Short,
      2,
    );
    expect(mod?.value).toBe(-2);
  });

  it('Sniper fires on canonical id', () => {
    const mod = calculateSniperModifier(['sniper'], 4);
    expect(mod?.value).toBe(-2);
  });

  it('Multi-Tasker fires on canonical id', () => {
    const mod = calculateMultiTaskerModifier(['multi_tasker'], true);
    expect(mod?.value).toBe(-1);
  });

  it('Jumping Jack fires on canonical id', () => {
    const mod = calculateJumpingJackModifier(
      ['jumping_jack'],
      MovementType.Jump,
    );
    expect(mod?.value).toBe(-2);
  });

  it('Dodge Maneuver fires on canonical id', () => {
    const mod = calculateDodgeManeuverModifier(['dodge_maneuver'], true);
    expect(mod?.value).toBe(2);
  });

  it('Melee Specialist fires on canonical id', () => {
    const mod = calculateMeleeSpecialistModifier(['melee_specialist']);
    expect(mod?.value).toBe(-1);
  });

  it('getMeleeMasterDamageBonus fires on canonical id', () => {
    expect(getMeleeMasterDamageBonus(['melee_master'])).toBe(1);
  });

  it('getTacticalGeniusBonus fires on canonical id', () => {
    expect(getTacticalGeniusBonus(['tactical_genius'])).toBe(1);
  });

  it('getIronManModifier fires on canonical id', () => {
    expect(getIronManModifier(['iron_man'])).toBe(-2);
  });

  it('getClusterHitterBonus fires on canonical id', () => {
    expect(getClusterHitterBonus(['cluster_hitter'])).toBe(1);
  });

  it('getHotDogShutdownThresholdBonus fires on canonical id', () => {
    expect(getHotDogShutdownThresholdBonus(['hot_dog'])).toBe(3);
  });

  it('getObliqueAttackerBonus fires on canonical id', () => {
    expect(getObliqueAttackerBonus(['oblique_attacker'])).toBe(-1);
  });

  it('getConsciousnessCheckModifier combines canonical ids', () => {
    expect(getConsciousnessCheckModifier(['iron_man', 'pain_resistance'])).toBe(
      -3,
    );
  });

  it('catalog.hasSPA resolves via canonical bridge', () => {
    expect(catalogHasSPA(['iron-man'], 'iron_man')).toBe(true);
    expect(catalogHasSPA(['iron_man'], 'iron_man')).toBe(true);
  });
});
