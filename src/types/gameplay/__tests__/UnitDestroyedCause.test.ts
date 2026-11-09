import type { IApplyCritAmmoExplosionsResult } from '@/simulation/runner/phases/weaponAttackAmmoExplosions';
import type { IEmitCritEventsResult } from '@/simulation/runner/phases/weaponAttackCriticalEvents';
import type { emitUnitDestroyedEvent } from '@/simulation/runner/phases/weaponAttackHitResolution.helpers';
import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';
import type {
  IDestructionCheckResult,
  IUnitDamageState,
} from '@/utils/gameplay/damage/types';

import type { IDamageResult } from '../CombatDamageTypes';
import type { IUnitDestroyedPayload } from '../GameSessionAttackEvents';

import {
  UNIT_DESTROYED_CAUSES,
  type UnitDestroyedCause,
} from '../UnitDestroyedCause';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

// Checked by both TypeScript configs: widening or narrowing a contract breaks parity.
const contractParity: [
  Equal<IUnitDestroyedPayload['cause'], UnitDestroyedCause>,
  Equal<NonNullable<IDamageResult['destructionCause']>, UnitDestroyedCause>,
  Equal<NonNullable<IUnitDamageState['destructionCause']>, UnitDestroyedCause>,
  Equal<NonNullable<IDestructionCheckResult['cause']>, UnitDestroyedCause>,
  Equal<
    NonNullable<IApplyCritAmmoExplosionsResult['critDestructionCause']>,
    UnitDestroyedCause
  >,
  Equal<
    NonNullable<IEmitCritEventsResult['destructionCause']>,
    UnitDestroyedCause
  >,
  Equal<
    NonNullable<
      Parameters<typeof emitUnitDestroyedEvent>[0]['critDestructionCause']
    >,
    UnitDestroyedCause
  >,
  Equal<
    Extract<CriticalHitEvent, { type: 'unit_destroyed' }>['payload']['cause'],
    UnitDestroyedCause
  >,
] = [true, true, true, true, true, true, true, true];

describe('UnitDestroyed cause contract', () => {
  it('preserves exactly the seven serialized causes', () => {
    expect(UNIT_DESTROYED_CAUSES).toEqual([
      'damage',
      'ammo_explosion',
      'pilot_death',
      'engine_destroyed',
      'impossible_displacement',
      'ct_destroyed',
      'head_destroyed',
    ]);
    expect(contractParity.every(Boolean)).toBe(true);
  });
});
