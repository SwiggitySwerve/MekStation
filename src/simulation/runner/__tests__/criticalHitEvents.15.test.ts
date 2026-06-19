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

it('replay deactivates same-unit active probes from represented active-probe equipment critical events', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    electronicWarfare: {
      ecmSuites: [],
      activeProbes: [
        {
          type: 'beagle',
          operational: true,
          entityId: 'opponent-1:1-isbeagleactiveprobe:0',
          teamId: GameSide.Opponent,
          position: target.position,
        },
        {
          type: 'bloodhound',
          operational: true,
          entityId: 'opponent-1:2-isbloodhoundactiveprobe:0',
          teamId: GameSide.Opponent,
          position: target.position,
        },
        {
          type: 'beagle',
          operational: true,
          entityId: 'player-1:1-isbeagleactiveprobe:0',
          teamId: GameSide.Player,
          position: scenario.state.units['player-1'].position,
        },
      ],
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
        componentName: 'Beagle Active Probe',
        effect: 'Equipment destroyed: Beagle Active Probe',
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

  expect(replayed.units['opponent-1'].destroyedEquipment).toContain(
    'Beagle Active Probe',
  );
  expect(replayed.electronicWarfare?.activeProbes).toEqual([
    expect.objectContaining({
      entityId: 'opponent-1:1-isbeagleactiveprobe:0',
      operational: false,
    }),
    expect.objectContaining({
      entityId: 'opponent-1:2-isbloodhoundactiveprobe:0',
      operational: true,
    }),
    expect.objectContaining({
      entityId: 'player-1:1-isbeagleactiveprobe:0',
      operational: true,
    }),
  ]);
});

it('replay records same-location destroyed Artemis FCS lifecycle state', () => {
  const scenario = buildPrimedRunnerScenario();
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Artemis IV FCS',
        effect: 'Equipment destroyed: Artemis IV FCS',
        destroyed: true,
      },
    },
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'left_torso',
        slotIndex: 1,
        componentType: 'equipment',
        componentName: 'Artemis V capable ammo',
        effect: 'Equipment destroyed: Artemis V capable ammo',
        destroyed: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: scenario.state.gameId,
    turn: scenario.state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const replayed = events.reduce(applyEvent, scenario.state);

  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual(
    expect.arrayContaining(['Artemis IV FCS', 'Artemis V capable ammo']),
  );
  expect(replayed.units['opponent-1'].destroyedArtemisFcs).toEqual([
    {
      kind: 'artemis_iv',
      location: 'right_torso',
      componentName: 'Artemis IV FCS',
    },
  ]);
});

it('runner critical event emission preserves missing and breached equipment lifecycle flags for claw and talon replay', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        leftArmHasClaw: true,
        rightArmHasClaw: true,
        leftLegHasTalons: true,
        rightLegHasTalons: true,
      },
    },
  };
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'left_arm',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Claw',
        effect: 'Equipment missing: Claw',
        destroyed: false,
        missing: true,
      },
    },
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_leg',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Talons',
        effect: 'Equipment breached: Talons',
        destroyed: false,
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

  const resolvedPayloads = events
    .filter((event) => event.type === GameEventType.CriticalHitResolved)
    .map((event) => event.payload as ICriticalHitResolvedPayload);
  expect(resolvedPayloads).toEqual([
    expect.objectContaining({
      location: 'left_arm',
      componentName: 'Claw',
      destroyed: false,
      missing: true,
    }),
    expect.objectContaining({
      location: 'right_leg',
      componentName: 'Talons',
      destroyed: false,
      breached: true,
    }),
  ]);
  expect(
    events.some((event) => event.type === GameEventType.ComponentDestroyed),
  ).toBe(false);

  const replayed = events.reduce(applyEvent, state);
  expect(replayed.units['opponent-1'].leftArmHasClaw).toBe(false);
  expect(replayed.units['opponent-1'].rightArmHasClaw).toBe(true);
  expect(replayed.units['opponent-1'].leftLegHasTalons).toBe(true);
  expect(replayed.units['opponent-1'].rightLegHasTalons).toBe(false);
});
