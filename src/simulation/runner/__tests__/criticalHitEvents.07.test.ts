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
  createAC20,
  createAmmoBin,
  createCritProbeWeapon,
  scriptedRoller,
} from './criticalHitEvents.test-helpers';

it('keeps ambiguous RISC Laser Pulse Module criticals generic instead of guessing a linked laser', () => {
  const scenario = buildPrimedRunnerScenario();
  const manifest = buildCriticalSlotManifest({
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'RISC Laser Pulse Module',
        destroyed: false,
      },
    ],
  });
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    ['opponent-1', manifest],
  ]);
  const ambiguousTargetLasers: readonly IWeapon[] = [
    {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      location: 'right_torso',
      destroyed: false,
    },
    {
      id: 'small-laser-1',
      name: 'Small Laser',
      shortRange: 1,
      mediumRange: 2,
      longRange: 3,
      damage: 3,
      heat: 1,
      minRange: 0,
      ammoPerTon: -1,
      location: 'right_torso',
      destroyed: false,
    },
  ];
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'ambiguous-risc-lpm-crit-probe',
    weapon: createCritProbeWeapon('ambiguous-risc-lpm-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    d6Roller: scriptedRoller([3, 3, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
    manifestsByUnit,
    weaponsByUnit: new Map<string, readonly IWeapon[]>([
      ['player-1', [createCritProbeWeapon('ambiguous-risc-lpm-crit-probe')]],
      ['opponent-1', ambiguousTargetLasers],
    ]),
  });

  const resolved = events.find(
    (event) => event.type === GameEventType.CriticalHitResolved,
  ) as IGameEvent & { payload: ICriticalHitResolvedPayload };

  expect(resolved.payload).toMatchObject({
    componentType: 'equipment',
    componentName: 'RISC Laser Pulse Module',
    effect: 'Equipment destroyed: RISC Laser Pulse Module',
    destroyed: true,
  });
  expect(resolved.payload).not.toHaveProperty('linkedCriticalWeaponId');
  expect(resolved.payload).not.toHaveProperty('linkedCriticalWeaponName');
  expect(
    events.some((event) => event.type === GameEventType.AmmoExplosion),
  ).toBe(false);
  expect(next.units['opponent-1'].componentDamage?.weaponsDestroyed).toEqual(
    [],
  );
  expect(next.units['opponent-1'].destroyedEquipment).not.toContain(
    'RISC Laser Pulse Module',
  );
});

it('spends edge_when_explosion to avoid a crit-induced ammo explosion', () => {
  const loadedBin = createAmmoBin('right-torso-loaded-bin', 5);
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        abilities: ['edge_when_explosion'],
        edgePointsRemaining: 1,
        ammoState: {
          [loadedBin.binId]: loadedBin,
        },
      },
    },
  };
  const manifest = buildCriticalSlotManifest({
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'ammo',
        componentName: 'IS Ammo AC/20',
        ammoBinId: loadedBin.binId,
        destroyed: false,
      },
      {
        slotIndex: 1,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
        destroyed: false,
      },
    ],
  });
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    ['opponent-1', manifest],
  ]);
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: state,
    events,
    gameId: state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'ammo-crit-probe',
    weapon: createCritProbeWeapon('ammo-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // Hit location 3+3 = right_torso, crit trigger 4+4 = one crit,
    // first slot pair hits ammo, Edge reroll redirects to the safe slot.
    d6Roller: scriptedRoller([3, 3, 4, 4, 1, 1, 1, 2]),
    getOrSeedManifest: () => manifest,
    manifestsByUnit,
    weaponsByUnit: new Map<string, readonly IWeapon[]>([
      ['player-1', [createCritProbeWeapon('ammo-crit-probe')]],
      ['opponent-1', [createAC20('ac-20-0')]],
    ]),
  });

  const resolved = events.find(
    (event) => event.type === GameEventType.CriticalHitResolved,
  ) as IGameEvent & { payload: ICriticalHitResolvedPayload };

  expect(resolved.payload).toMatchObject({
    componentType: 'heat_sink',
    slotIndex: 1,
  });
  expect(
    events.some((event) => event.type === GameEventType.AmmoExplosion),
  ).toBe(false);
  expect(next.units['opponent-1'].edgePointsRemaining).toBe(0);
  expect(
    next.units['opponent-1'].ammoState?.[loadedBin.binId].remainingRounds,
  ).toBe(5);
  expect(manifestsByUnit.get('opponent-1')?.right_torso).toEqual([
    expect.objectContaining({ slotIndex: 0, destroyed: false }),
    expect.objectContaining({ slotIndex: 1, destroyed: true }),
  ]);
});
