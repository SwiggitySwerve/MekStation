import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
/**
 * Unit tests for the shared weapon-attack to-hit state builders.
 *
 * Audit 2026-06-09 finding B-1 (W1.1): these builders are the single source
 * of truth for attacker/target to-hit state. Both the engine commit path
 * (declareAttack / the simulation runner) and the tactical-map projection
 * (deriveToHitProjection) hydrate through them, so the fields they populate
 * ARE the projection/engine agreement contract.
 */
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { GameSide } from '@/types/gameplay';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';

import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from '../stateHydration';

// Builds a baseline unit state at the origin; tests override the fields under
// scrutiny so each assertion names exactly the state it depends on.
function makeUnit(overrides: Record<string, unknown> = {}) {
  return {
    ...createMinimalUnitState('u1', GameSide.Player, { q: 0, r: 0 }),
    ...overrides,
  };
}

describe('buildWeaponAttackAttackerToHitState', () => {
  it('hydrates pilot wounds, sensor hits, actuator damage, abilities, and quirks', () => {
    const unit = makeUnit({
      pilotWounds: 2,
      componentDamage: {
        ...buildDefaultComponentDamageState(),
        sensorHits: 1,
        actuators: {
          [ActuatorType.SHOULDER]: true,
          [ActuatorType.LOWER_ARM]: true,
        },
      },
      abilities: ['sniper'],
      unitQuirks: ['improved_targeting_medium'],
      weaponQuirks: { 'medium-laser': ['accurate'] },
    });

    const state = buildWeaponAttackAttackerToHitState(
      unit,
      4,
      { id: 'medium-laser', name: 'Medium Laser' },
      't1',
    );

    expect(state.gunnery).toBe(4);
    expect(state.pilotWounds).toBe(2);
    expect(state.sensorHits).toBe(1);
    expect(state.actuatorDamage).toEqual({
      shoulderDestroyed: true,
      upperArmDestroyed: false,
      lowerArmDestroyed: true,
    });
    expect(state.abilities).toEqual(['sniper']);
    expect(state.unitQuirks).toEqual(['improved_targeting_medium']);
    expect(state.weaponQuirks).toEqual({ 'medium-laser': ['accurate'] });
    expect(state.weaponType).toBe('Medium Laser');
    expect(state.targetId).toBe('t1');
  });
});

describe('buildWeaponAttackTargetToHitState', () => {
  it('hydrates evasion, sprint, and dodge state', () => {
    const unit = makeUnit({
      isEvading: true,
      evasionBonus: 2,
      sprintedThisTurn: true,
      isDodging: true,
    });

    const state = buildWeaponAttackTargetToHitState(unit, false);

    expect(state.isEvading).toBe(true);
    expect(state.evasionBonus).toBe(2);
    expect(state.sprintedThisTurn).toBe(true);
    expect(state.isDodging).toBe(true);
  });

  it('marks shutdown targets immobile', () => {
    const state = buildWeaponAttackTargetToHitState(
      makeUnit({ shutdown: true }),
      false,
    );

    expect(state.immobile).toBe(true);
  });

  it('marks unconscious-pilot targets immobile per the MegaMek Targetable contract', () => {
    // MegaMek's Targetable immobile contract (Entity#isImmobile) covers
    // shutdown units AND unconscious crews; isRepresentedTargetImmobile is the
    // centralized MekStation subset. The shared builder must use it so the
    // engine commit path and the combat projection agree (audit B-1).
    const state = buildWeaponAttackTargetToHitState(
      makeUnit({ pilotConscious: false }),
      false,
    );

    expect(state.immobile).toBe(true);
  });

  it('leaves operational targets mobile', () => {
    const state = buildWeaponAttackTargetToHitState(makeUnit(), false);

    expect(state.immobile).toBe(false);
  });
});
