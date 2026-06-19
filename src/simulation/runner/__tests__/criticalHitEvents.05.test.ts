/**
 * Phase 3 of `add-combat-fidelity-suite` — per-event-type unit tests
 * for `runAttackPhase`'s critical-hit event chain plus direct
 * `resolveDamage` dispatch tests.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Critical Hit Trigger Return Value Captured"
 *       (Scenarios: roll 8 → 1 crit, roll 7 → 0 crits, roll 12 → 3 crits)
 *     - "Critical Hit Events Emitted by Runner"
 *       (Scenarios: gyro destruction event chain, engine-3-hit
 *       triggers UnitDestroyed)
 *
 * Determinism strategy:
 *   - Layer 1 (resolveDamage): a custom `D6Roller` closure returns a
 *     scripted sequence so the 2d6 trigger + slot-selection roll are
 *     fully predictable.
 *   - Layer 2 (runAttackPhase): a fixed `SeededRandom` seed picks the
 *     to-hit + hit-location rolls; the test asserts on the structural
 *     event chain (causal ordering, count parity) rather than which
 *     specific slot is destroyed.
 */

import type { ICriticalHitPayload } from '@/types/gameplay/GameSessionInterfaces';
import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution/types';
import type {
  IResolveDamageResult,
  IUnitDamageState,
} from '@/utils/gameplay/damage';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoExplosionPayload,
  IAmmoSlotState,
  IComponentDestroyedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IGameState,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { applyEvent } from '@/utils/gameplay/gameState/gameStateReducer';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { runAttackPhase } from '../phases/weaponAttack';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import { emitCritEvents } from '../phases/weaponAttackHelpers';
import { resolveWeaponHit } from '../phases/weaponAttackHitResolution';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { buildDamageState } from '../SimulationRunnerState';
// =============================================================================
// Scripted-roller helpers
// =============================================================================
/**
 * Build a `D6Roller` that returns a scripted sequence of d6 values.
 * After the scripted values are exhausted, the roller falls back to
 * the supplied `tail` value (default: 1) so cluster cascades that
 * out-roll the script don't crash.
 *
 * Example: `scriptedRoller([4, 4, 1])` returns 4, 4, 1, 1, 1, ...
 *   - first two calls: roll1=4, roll2=4 → 2d6 sum = 8 (crit triggers)
 *   - third call: slot-selection d6 = 1 → idx (1-1) % 7 = 0 (engine slot)
 */
import {
  buildPrimedRunnerScenario,
  createCritProbeWeapon,
  scriptedRoller,
} from './criticalHitEvents.test-helpers';

it('cascades represented hot-loaded weapon critical explosions through runner damage events', () => {
  const scenario = buildPrimedRunnerScenario();
  const manifest = buildCriticalSlotManifest({
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'weapon',
        componentName: 'LRM 20',
        weaponId: 'hot-loaded-lrm-20',
        destroyed: false,
        hotLoaded: true,
        explosionDamage: 12,
      },
    ],
  });
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    ['opponent-1', manifest],
  ]);
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'hot-loaded-crit-probe',
    weapon: createCritProbeWeapon('hot-loaded-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // Hit location 3+3 = right_torso, crit trigger 4+4 = one crit.
    d6Roller: scriptedRoller([3, 3, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
    manifestsByUnit,
    weaponsByUnit: new Map<string, readonly IWeapon[]>([
      ['player-1', [createCritProbeWeapon('hot-loaded-crit-probe')]],
      ['opponent-1', []],
    ]),
  });

  const resolved = events.find(
    (event) => event.type === GameEventType.CriticalHitResolved,
  ) as IGameEvent & { payload: ICriticalHitResolvedPayload };
  const explosionIndex = events.findIndex(
    (event) => event.type === GameEventType.AmmoExplosion,
  );
  const explosion = events[explosionIndex] as IGameEvent & {
    payload: IAmmoExplosionPayload;
  };
  const postExplosionDamage = events
    .slice(explosionIndex + 1)
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(resolved.payload).toMatchObject({
    componentType: 'weapon',
    componentName: 'LRM 20',
    weaponId: 'hot-loaded-lrm-20',
    effect: 'Equipment explosion: LRM 20 (12 damage)',
    destroyed: true,
    hotLoaded: true,
    explosionDamage: 12,
  });
  expect(explosion.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_torso',
    equipmentName: 'LRM 20',
    damage: 12,
    source: 'CritInduced',
  });
  expect(explosion.payload).not.toHaveProperty('binId');
  expect(postExplosionDamage).toEqual([
    expect.objectContaining({
      location: 'right_torso',
      damage: 12,
      structureRemaining: 4,
      locationDestroyed: false,
    }),
  ]);
  expect(next.units['opponent-1'].structure.right_torso).toBe(4);
});

it('does not replay generic weapon explosionDamage without hotLoaded state', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];
  const target = scenario.state.units['opponent-1'];
  const damageResult: IResolveDamageResult = {
    state: buildDamageState(target),
    result: {
      locationDamages: [],
      criticalHits: [],
      unitDestroyed: false,
    },
    criticalEvents: [
      {
        type: 'critical_hit_resolved',
        payload: {
          unitId: 'opponent-1',
          location: 'right_torso',
          slotIndex: 0,
          componentType: 'weapon',
          componentName: 'LRM 20',
          weaponId: 'lrm-20',
          effect: 'Equipment destroyed: LRM 20',
          destroyed: true,
          explosionDamage: 12,
        },
      },
    ],
  };

  const result = applyCritAmmoExplosions({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    damageResult,
    d6Roller: () => 6,
    weaponsByUnit: scenario.weaponsByUnit,
    critUnitDestroyed: false,
    critDestructionCause: undefined,
  });

  expect(
    events.some((event) => event.type === GameEventType.AmmoExplosion),
  ).toBe(false);
  expect(result.currentState.units['opponent-1'].structure.right_torso).toBe(
    scenario.state.units['opponent-1'].structure.right_torso,
  );
  expect(result.critUnitDestroyed).toBe(false);
});

it('cascades represented Prototype Improved Jump Jet critical explosions through runner damage events', () => {
  const scenario = buildPrimedRunnerScenario();
  const manifest = buildCriticalSlotManifest({
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'ISPrototypeImprovedJumpJet',
        destroyed: false,
        explosionDamage: 10,
        explosionRequiresSecondaryEffects: true,
      },
    ],
  });
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    ['opponent-1', manifest],
  ]);
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'prototype-jump-jet-crit-probe',
    weapon: createCritProbeWeapon('prototype-jump-jet-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // Hit location 3+3 = right_torso, crit trigger 4+4 = one crit.
    d6Roller: scriptedRoller([3, 3, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
    manifestsByUnit,
    weaponsByUnit: new Map<string, readonly IWeapon[]>([
      ['player-1', [createCritProbeWeapon('prototype-jump-jet-crit-probe')]],
      ['opponent-1', []],
    ]),
  });

  const resolved = events.find(
    (event) => event.type === GameEventType.CriticalHitResolved,
  ) as IGameEvent & { payload: ICriticalHitResolvedPayload };
  const explosionIndex = events.findIndex(
    (event) => event.type === GameEventType.AmmoExplosion,
  );
  const explosion = events[explosionIndex] as IGameEvent & {
    payload: IAmmoExplosionPayload;
  };
  const postExplosionDamage = events
    .slice(explosionIndex + 1)
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(resolved.payload).toMatchObject({
    componentType: 'equipment',
    componentName: 'ISPrototypeImprovedJumpJet',
    effect: 'Equipment explosion: ISPrototypeImprovedJumpJet (10 damage)',
    destroyed: true,
    explosionDamage: 10,
  });
  expect(explosion.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_torso',
    equipmentName: 'ISPrototypeImprovedJumpJet',
    damage: 10,
    source: 'CritInduced',
  });
  expect(explosion.payload).not.toHaveProperty('binId');
  expect(postExplosionDamage).toEqual([
    expect.objectContaining({
      location: 'right_torso',
      damage: 10,
      structureRemaining: 6,
      locationDestroyed: false,
    }),
  ]);
  expect(next.units['opponent-1'].structure.right_torso).toBe(6);
});
