/**
 * Unit tests for the life-support 2-hit destruction threshold added by
 * `integrate-damage-pipeline` task 10.5 (dovetailing with
 * `fix-combat-rule-accuracy`).
 *
 * Spec: Total Warfare p. 43 — two life-support hits disable the
 * subsystem. The effect must flag `lifeSupportDisabled = true` at the
 * second hit and onward. `applyLifeSupportHit` tracks the hit counter
 * via `IComponentDamageState.lifeSupport` and emits
 * `CriticalEffectType.LifeSupportHit`.
 */

import { CriticalEffectType } from '@/types/gameplay';

import type { IComponentDamageState } from '../types';

import { LIFE_SUPPORT_DESTRUCTION_THRESHOLD } from '../constants';
import { applyLifeSupportHit } from '../sensorEffects';

function emptyDamage(): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };
}

describe('applyLifeSupportHit — 2-hit destruction (task 10.5)', () => {
  it('exports destruction threshold = 2', () => {
    expect(LIFE_SUPPORT_DESTRUCTION_THRESHOLD).toBe(2);
  });

  it('first hit increments counter but does NOT flag disabled', () => {
    const damage = emptyDamage();
    const { effect, updatedDamage } = applyLifeSupportHit(
      'u1',
      'head',
      damage,
      [],
    );

    expect(effect.type).toBe(CriticalEffectType.LifeSupportHit);
    expect(effect.lifeSupportDisabled).toBeUndefined();
    expect(updatedDamage.lifeSupport).toBe(1);
  });

  it('second hit flags lifeSupportDisabled = true', () => {
    const damage: IComponentDamageState = { ...emptyDamage(), lifeSupport: 1 };
    const { effect, updatedDamage } = applyLifeSupportHit(
      'u1',
      'head',
      damage,
      [],
    );

    expect(effect.type).toBe(CriticalEffectType.LifeSupportHit);
    expect(effect.lifeSupportDisabled).toBe(true);
    expect(updatedDamage.lifeSupport).toBe(2);
  });

  it('subsequent hits past threshold remain flagged disabled', () => {
    const damage: IComponentDamageState = { ...emptyDamage(), lifeSupport: 5 };
    const { effect, updatedDamage } = applyLifeSupportHit(
      'u1',
      'head',
      damage,
      [],
    );

    expect(effect.lifeSupportDisabled).toBe(true);
    expect(updatedDamage.lifeSupport).toBe(6);
  });

  it('does NOT push any events — event emission handled by dispatcher', () => {
    const damage = emptyDamage();
    const events: unknown[] = [];
    applyLifeSupportHit(
      'u1',
      'head',
      damage,
      events as Parameters<typeof applyLifeSupportHit>[3],
    );
    // `applyLifeSupportHit` itself stays silent; `applyCriticalHitEffect`
    // in `effects.ts` unshifts the `critical_hit_resolved` event.
    expect(events).toHaveLength(0);
  });
});
