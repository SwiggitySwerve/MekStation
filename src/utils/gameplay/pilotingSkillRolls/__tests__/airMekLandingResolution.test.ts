import type { IComponentDamageState } from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import { createAirMekLandingPSR, resolvePSR } from '../index';

function damagedLandingState(): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 1,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {
      [ActuatorType.FOOT]: true,
    },
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };
}

describe('AirMek landing PSR resolution', () => {
  it('uses the landing-specific modifier instead of generic gyro and actuator modifiers', () => {
    const rolls = [3, 3];
    const result = resolvePSR(
      5,
      createAirMekLandingPSR('lam-1', 1),
      damagedLandingState(),
      0,
      () => rolls.shift() ?? 1,
    );

    expect(result.targetNumber).toBe(6);
    expect(result.roll).toBe(6);
    expect(result.passed).toBe(true);
    expect(result.modifiers).toEqual([
      {
        name: 'landing with gyro or leg damage modifier',
        value: 1,
        source: 'airmek_landing',
      },
    ]);
  });
});
