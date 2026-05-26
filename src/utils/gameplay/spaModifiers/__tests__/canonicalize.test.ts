/**
 * Tests for the canonicalization bridge between pilot ability ids and
 * the unified SPA catalog. Confirms that each combat modifier fires
 * regardless of whether the pilot record uses legacy System B ids
 * (kebab-case) or the canonical snake_case ids introduced in the
 * unified catalog.
 */

import { MovementType, RangeBracket } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  calculateBloodStalkerModifier,
  calculateDodgeManeuverModifier,
  calculateFrogmanPhysicalToHitModifier,
  calculateJumpingJackModifier,
  calculateMeleeSpecialistModifier,
  calculateMultiTaskerModifier,
  calculateTerrainMasterDefensiveToHitModifier,
  getClusterHitterBonus,
  getCoolUnderFireHeatReduction,
  getHotDogHeatTargetNumberModifier,
  getIronManModifier,
  getMeleeMasterDamageBonus,
  getMeleeSpecialistDamageBonus,
  getMountaineerRubblePSRModifier,
  getSomeLikeItHotHeatPenaltyReduction,
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

  it('Hopping Jack fires on canonical id', () => {
    const mod = calculateJumpingJackModifier(
      ['hopping_jack'],
      MovementType.Jump,
    );
    expect(mod?.value).toBe(-1);
  });

  it('Dodge Maneuver fires on canonical id', () => {
    const mod = calculateDodgeManeuverModifier(['dodge_maneuver'], true);
    expect(mod?.value).toBe(2);
  });

  it('Melee Specialist fires on canonical id', () => {
    const mod = calculateMeleeSpecialistModifier(['melee_specialist']);
    expect(mod?.value).toBe(-1);
  });

  it('Terrain Master: Frogman fires on canonical id', () => {
    const mod = calculateFrogmanPhysicalToHitModifier(
      ['tm_frogman'],
      2,
      'BattleMech',
    );
    expect(mod?.value).toBe(-1);
  });

  it('Terrain Master: Frogman fires on legacy id', () => {
    const mod = calculateFrogmanPhysicalToHitModifier(
      ['terrain-master-frogman'],
      2,
      'ProtoMech',
    );
    expect(mod?.value).toBe(-1);
  });

  it('Terrain Master: Forest Ranger fires on canonical and legacy ids', () => {
    expect(
      calculateTerrainMasterDefensiveToHitModifier(
        ['tm_forest_ranger'],
        MovementType.Walk,
        [{ type: TerrainType.HeavyWoods, level: 1 }],
      )?.value,
    ).toBe(1);
    expect(
      calculateTerrainMasterDefensiveToHitModifier(
        ['terrain-master-forest-ranger'],
        MovementType.Walk,
        [{ type: TerrainType.LightWoods, level: 1 }],
      )?.value,
    ).toBe(1);
  });

  it('Terrain Master: Swamp Beast fires on canonical and legacy ids', () => {
    expect(
      calculateTerrainMasterDefensiveToHitModifier(
        ['tm_swamp_beast'],
        MovementType.Run,
        [{ type: TerrainType.Mud, level: 1 }],
      )?.value,
    ).toBe(1);
    expect(
      calculateTerrainMasterDefensiveToHitModifier(
        ['terrain-master-swamp-beast'],
        MovementType.Run,
        [{ type: TerrainType.Swamp, level: 1 }],
      )?.value,
    ).toBe(1);
  });

  it('Terrain Master: Mountaineer fires on canonical and legacy ids', () => {
    expect(getMountaineerRubblePSRModifier(['tm_mountaineer'])).toBe(-1);
    expect(
      getMountaineerRubblePSRModifier(['terrain-master-mountaineer']),
    ).toBe(-1);
  });

  it('getMeleeSpecialistDamageBonus fires on canonical id', () => {
    expect(getMeleeSpecialistDamageBonus(['melee_specialist'])).toBe(1);
  });

  it('getMeleeMasterDamageBonus does not expose a canonical flat damage bonus', () => {
    expect(getMeleeMasterDamageBonus(['melee_master'])).toBe(0);
  });

  it('getTacticalGeniusBonus does not expose a flat canonical bonus', () => {
    expect(getTacticalGeniusBonus(['tactical_genius'])).toBe(0);
  });

  it('getIronManModifier does not expose consciousness relief on canonical id', () => {
    expect(getIronManModifier(['iron_man'])).toBe(0);
  });

  it('getClusterHitterBonus fires on canonical id', () => {
    expect(getClusterHitterBonus(['cluster_hitter'])).toBe(1);
  });

  it('getHotDogHeatTargetNumberModifier fires on canonical id', () => {
    expect(getHotDogHeatTargetNumberModifier(['hot_dog'])).toBe(-1);
  });

  it('heat SPA helpers fire on canonical ids', () => {
    expect(getCoolUnderFireHeatReduction(['cool_under_fire'])).toBe(1);
    expect(getSomeLikeItHotHeatPenaltyReduction(['some_like_it_hot'])).toBe(1);
  });

  it('getObliqueAttackerBonus fires on canonical id', () => {
    expect(getObliqueAttackerBonus(['oblique_attacker'])).toBe(-1);
  });

  it('getConsciousnessCheckModifier applies only source-backed Pain Resistance consciousness relief', () => {
    expect(getConsciousnessCheckModifier(['pain_resistance'])).toBe(-1);
    expect(getConsciousnessCheckModifier(['iron_man'])).toBe(0);
  });

  it('catalog.hasSPA resolves via canonical bridge', () => {
    expect(catalogHasSPA(['iron-man'], 'iron_man')).toBe(true);
    expect(catalogHasSPA(['iron_man'], 'iron_man')).toBe(true);
  });
});
