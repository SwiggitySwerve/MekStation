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
import { buildPrimedRunnerScenario } from './criticalHitEvents.test-helpers';

it('replay records generic equipment destruction from EquipmentDestroyed critical events', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        leftArmHasClaw: true,
        rightLegHasTalons: true,
      },
    },
  };
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'CASE',
        effect: 'Equipment destroyed: CASE',
        destroyed: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: state.gameId,
    turn: state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const replayed = events.reduce(applyEvent, state);

  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.ComponentDestroyed,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_torso',
        componentType: 'equipment',
        componentName: 'CASE',
      }),
    }),
  );
  expect(replayed.units['opponent-1'].destroyedEquipment).toContain('CASE');
  expect(
    events.reduce(applyEvent, replayed).units['opponent-1'].destroyedEquipment,
  ).toEqual(['CASE']);
  expect(replayed.units['opponent-1'].componentDamage).toEqual(
    state.units['opponent-1'].componentDamage,
  );
  expect(replayed.units['opponent-1'].leftArmHasClaw).toBe(true);
  expect(replayed.units['opponent-1'].rightLegHasTalons).toBe(true);
});

it('replay records represented RISC Laser Pulse Module linked-laser criticals without generic equipment destruction', () => {
  const scenario = buildPrimedRunnerScenario();
  const state = scenario.state;
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'RISC Laser Pulse Module',
        linkedCriticalWeaponId: 'medium-laser-0',
        linkedCriticalWeaponName: 'Medium Laser',
        effect: 'Weapon destroyed: Medium Laser',
        destroyed: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: state.gameId,
    turn: state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const replayed = events.reduce(applyEvent, state);

  expect(
    replayed.units['opponent-1'].componentDamage?.weaponsDestroyed,
  ).toContain('medium-laser-0');
  expect(replayed.units['opponent-1'].destroyedEquipment).not.toContain(
    'RISC Laser Pulse Module',
  );
});

it('replay records inoperable-linked RISC Laser Pulse Module criticals as generic module destruction', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        componentDamage: {
          ...(target.componentDamage ?? DEFAULT_COMPONENT_DAMAGE),
          weaponsDestroyed: ['medium-laser-0'],
        },
      },
    },
  };
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'RISC Laser Pulse Module',
        effect: 'Equipment destroyed: RISC Laser Pulse Module',
        destroyed: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: state.gameId,
    turn: state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const replayed = events.reduce(applyEvent, state);

  expect(
    replayed.units['opponent-1'].componentDamage?.weaponsDestroyed,
  ).toEqual(['medium-laser-0']);
  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual([
    'RISC Laser Pulse Module',
  ]);
});

it('replay records HarJel critical breach state while preserving destroyed-equipment idempotency', () => {
  const scenario = buildPrimedRunnerScenario();
  const state = scenario.state;
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'HarJel',
        effect: 'Equipment destroyed: HarJel',
        destroyed: true,
        breached: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: state.gameId,
    turn: state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const resolvedPayload = events.find(
    (event) => event.type === GameEventType.CriticalHitResolved,
  )?.payload as ICriticalHitResolvedPayload | undefined;
  expect(resolvedPayload).toEqual(
    expect.objectContaining({
      componentName: 'HarJel',
      destroyed: true,
      breached: true,
    }),
  );

  const replayed = events.reduce(applyEvent, state);
  const replayedTarget = replayed.units['opponent-1'];
  expect(replayedTarget).toBeDefined();
  expect(replayedTarget?.componentDamage).toBeDefined();
  expect(replayedTarget?.destroyedEquipment).toContain('HarJel');
  expect(replayedTarget?.componentDamage?.breachedLocations).toEqual([
    'right_torso',
  ]);

  const replayedTwiceTarget = events.reduce(applyEvent, replayed).units[
    'opponent-1'
  ];
  expect(replayedTwiceTarget).toBeDefined();
  expect(replayedTwiceTarget?.componentDamage).toBeDefined();
  expect(replayedTwiceTarget?.destroyedEquipment).toEqual(['HarJel']);
  expect(replayedTwiceTarget?.componentDamage?.breachedLocations).toEqual([
    'right_torso',
  ]);
});
