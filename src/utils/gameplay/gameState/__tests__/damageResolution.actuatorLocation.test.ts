/**
 * applyCriticalHitResolved — per-location actuator replay tests
 *
 * Restored per audit `docs/audits/2026-06-09-full-codebase-review.md`
 * finding A-6: the event-sourced replay path must mirror
 * `applyActuatorHit`'s per-location actuator bookkeeping so store-fed
 * readers see `componentDamage.actuatorsByLocation` in live and replay
 * flows. Consumers: hull-down entry/exit pricing
 * (`movement/hullDownExit.ts`, MegaMek `HullDownStep.java:61-82` — 1 MP
 * plus non-hip leg actuator crits, one more for hip crits), QuadVee
 * conversion gates (`runtimeConversionRules.ts`), and AirMek landing
 * control (`runtimeAirMekLandingControl.ts`).
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  type ICriticalHitResolvedPayload,
  type IGameState,
  type IGameUnit,
} from '@/types/gameplay';

import { applyCriticalHitResolved } from '../damageResolution';
import { createInitialUnitState } from '../initialization';

// =============================================================================
// Fixtures
// =============================================================================

/** Builds a minimal BattleMech-style game unit (no vehicle envelope). */
function makeMechUnit(): IGameUnit {
  return {
    id: 'mech-1',
    name: 'Test Mech',
    side: GameSide.Player,
    unitRef: 'test-mech',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
  };
}

/** Wraps the seeded mech unit in a minimal replayable game state. */
function makeGameState(): IGameState {
  const unit = makeMechUnit();
  const unitState = createInitialUnitState(unit, { q: 0, r: 0 }, Facing.North);
  return {
    gameId: 'game-1',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: { [unit.id]: unitState },
    turnEvents: [],
  };
}

/** Builds an actuator CriticalHitResolved payload at the given location. */
function makeActuatorPayload(
  location: string,
  actuator: ActuatorType,
): ICriticalHitResolvedPayload {
  return {
    unitId: 'mech-1',
    location,
    slotIndex: 0,
    componentType: 'actuator',
    componentName: actuator,
    effect: `Actuator destroyed: ${actuator}`,
    destroyed: true,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('applyCriticalHitResolved — per-location actuator replay', () => {
  it('mirrors an actuator critical into actuators and actuatorsByLocation', () => {
    const state = makeGameState();

    const next = applyCriticalHitResolved(
      state,
      makeActuatorPayload('left_leg', ActuatorType.UPPER_LEG),
    );

    const damage = next.units['mech-1']?.componentDamage;
    expect(damage?.actuators[ActuatorType.UPPER_LEG]).toBe(true);
    expect(
      damage?.actuatorsByLocation?.left_leg?.[ActuatorType.UPPER_LEG],
    ).toBe(true);
  });

  it('accumulates per-location actuator damage across locations and hits', () => {
    const state = makeGameState();

    const afterHip = applyCriticalHitResolved(
      state,
      makeActuatorPayload('left_leg', ActuatorType.HIP),
    );
    const afterBoth = applyCriticalHitResolved(
      afterHip,
      makeActuatorPayload('right_leg', ActuatorType.FOOT),
    );

    const damage = afterBoth.units['mech-1']?.componentDamage;
    expect(damage?.actuatorsByLocation?.left_leg?.[ActuatorType.HIP]).toBe(
      true,
    );
    expect(damage?.actuatorsByLocation?.right_leg?.[ActuatorType.FOOT]).toBe(
      true,
    );
    expect(damage?.actuators[ActuatorType.HIP]).toBe(true);
    expect(damage?.actuators[ActuatorType.FOOT]).toBe(true);
  });

  it('keeps non-mech location strings out of actuatorsByLocation', () => {
    const state = makeGameState();

    const next = applyCriticalHitResolved(
      state,
      makeActuatorPayload('front', ActuatorType.UPPER_LEG),
    );

    const damage = next.units['mech-1']?.componentDamage;
    // The global actuator map still records the hit; the per-location map
    // only accepts canonical CombatLocation keys (asCombatLocation guard).
    expect(damage?.actuators[ActuatorType.UPPER_LEG]).toBe(true);
    expect(damage?.actuatorsByLocation).toBeUndefined();
  });
});
