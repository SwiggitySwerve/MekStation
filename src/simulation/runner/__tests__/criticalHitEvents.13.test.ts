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
  playtest3AutocannonCriticalEventCases,
} from './criticalHitEvents.test-helpers';

it('replay marks Emergency Coolant System state damaged from equipment critical events', () => {
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
        componentName: 'Emergency Coolant System',
        effect: 'Equipment destroyed: Emergency Coolant System',
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
        componentType: 'equipment',
        componentName: 'Emergency Coolant System',
      }),
    }),
  );
  expect(replayed.units['opponent-1'].componentDamage).toEqual({
    ...(state.units['opponent-1'].componentDamage ?? DEFAULT_COMPONENT_DAMAGE),
    emergencyCoolantSystemDamaged: true,
  });
  expect(replayed.units['opponent-1'].destroyedEquipment).toContain(
    'Emergency Coolant System',
  );
});

it.each(playtest3AutocannonCriticalEventCases)(
  'replay records first PLAYTEST_3 $componentName critical without destroying the weapon',
  ({ componentName, weaponId }) => {
    const scenario = buildPrimedRunnerScenario();
    const state = scenario.state;
    const criticalEvents: CriticalHitEvent[] = [
      {
        type: 'critical_hit_resolved',
        payload: {
          unitId: 'opponent-1',
          location: 'right_torso',
          slotIndex: 0,
          componentType: 'weapon',
          componentName,
          weaponId,
          effect: `Equipment hit: ${componentName}`,
          destroyed: false,
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

    expect(events).not.toContainEqual(
      expect.objectContaining({
        type: GameEventType.ComponentDestroyed,
        payload: expect.objectContaining({
          componentName,
        }),
      }),
    );
    expect(replayed.units['opponent-1'].componentDamage).toEqual({
      ...(state.units['opponent-1'].componentDamage ??
        DEFAULT_COMPONENT_DAMAGE),
      playtestAutocannonFirstCrits: [weaponId],
    });
    expect(
      replayed.units['opponent-1'].componentDamage?.weaponsDestroyed,
    ).not.toContain(weaponId);
  },
);

it.each(playtest3AutocannonCriticalEventCases)(
  'replay destroys a PLAYTEST_3 $componentName after first-hit state exists',
  ({ componentName, weaponId }) => {
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
            playtestAutocannonFirstCrits: [weaponId],
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
          componentType: 'weapon',
          componentName,
          weaponId,
          effect: `Weapon destroyed: ${componentName}`,
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
          componentType: 'weapon',
          componentName,
        }),
      }),
    );
    expect(replayed.units['opponent-1'].componentDamage).toEqual({
      ...(state.units['opponent-1'].componentDamage ??
        DEFAULT_COMPONENT_DAMAGE),
      weaponsDestroyed: [weaponId],
    });
  },
);
