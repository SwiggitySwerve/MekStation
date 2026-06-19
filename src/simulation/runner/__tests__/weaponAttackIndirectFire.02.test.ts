/**
 * Tests for Quick-Sim indirect-fire dispatch (PR-K7).
 *
 * The interactive path + bot AI path both pre-compute indirect-fire
 * resolution via `computeIndirectFireContext` and thread it through
 * `declareAttack` (PR-K4/K5). The Quick-Sim runner uses a PARALLEL
 * pipeline that hand-rolls `AttackDeclared` / `AttackResolved` from
 * `calculateToHit` directly — it does NOT go through `declareAttack`.
 *
 * PR-K7 wires the same dispatch into the Quick-Sim path so mass-scale
 * BV-balance Monte Carlo runs reflect indirect-fire to-hit math.
 *
 * Verifies:
 *   - LRM attacker with NO LOS + friendly spotter with LOS → AttackDeclared
 *     carries 'Indirect fire' modifier AND IndirectFireSpotterSelected event
 *     emitted with basis='los' + spotterId set
 *   - Direct LOS path: clear-grid LRM attacker → no indirect events (LOS
 *     present, direct fire works)
 *   - Backward-compat: no grid → no indirect events emitted
 */

import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT } from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  makeLRM15,
  SequenceRandom,
  ScriptedAttackAI,
  makeUnit,
  makeHex,
  makeBlockedGrid,
  makeClearGrid,
  buildScenario,
  runPhase,
} from './weaponAttackIndirectFire.test-helpers';

it('does not apply C3 range sharing to indirect fire', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  const network = createC3MasterSlaveNetwork('runner-indirect-c3', [
    createC3Unit({
      entityId: 'player-1',
      teamId: GameSide.Player,
      role: 'master',
      position: { q: 0, r: 0 },
    }),
    createC3Unit({
      entityId: 'player-2',
      teamId: GameSide.Player,
      role: 'slave',
      position: { q: 10, r: 1 },
    }),
  ]);

  expect(network).not.toBeNull();

  const events = runPhase({
    state: {
      ...state,
      c3Network: addC3Network(createEmptyC3State(), network!),
    },
    weaponsByUnit,
    grid: makeBlockedGrid(),
  });
  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );

  expect(declared).toBeDefined();

  const declaredPayload = declared!.payload as IAttackDeclaredPayload;
  expect(declaredPayload.toHitNumber).toBe(7);
  expect(declaredPayload.modifiers).toContainEqual(
    expect.objectContaining({
      name: 'Range (medium)',
      value: 2,
      source: 'range',
    }),
  );
  expect(declaredPayload.modifiers).toContainEqual(
    expect.objectContaining({ name: 'Indirect fire' }),
  );
  expect(declaredPayload.modifiers).not.toContainEqual(
    expect.objectContaining({ name: 'C3 Network' }),
  );
});

it('emits Forward Observer event when a walking spotter cancels the walked penalty', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  state.units['player-2'] = {
    ...state.units['player-2'],
    movementThisTurn: MovementType.Walk,
    abilities: ['forward_observer'],
  };

  const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  expect(declared).toBeDefined();
  const declaredPayload = declared!.payload as IAttackDeclaredPayload;
  expect(
    declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
  ).toMatchObject({ value: 1 });

  const indirectEvents = events.filter(
    (e) =>
      e.type === GameEventType.IndirectFireSpotterSelected ||
      e.type === GameEventType.IndirectFireForwardObserver,
  );
  expect(indirectEvents.map((e) => e.type)).toEqual([
    GameEventType.IndirectFireSpotterSelected,
    GameEventType.IndirectFireForwardObserver,
  ]);

  const forwardObserverPayload = indirectEvents[1]
    .payload as IIndirectFireForwardObserverPayload;
  expect(forwardObserverPayload).toMatchObject({
    attackerId: 'player-1',
    spotterId: 'player-2',
    weaponId: 'lrm-15-1',
    basis: 'los',
    toHitPenalty: 1,
    penaltyCancelled: 1,
  });
});

it('applies Comm Implant spotter relief to runner indirect-fire penalty math', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  state.units['player-2'] = {
    ...state.units['player-2'],
    movementThisTurn: MovementType.Walk,
    abilities: ['comm_implant'],
  };

  const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  expect(declared).toBeDefined();
  const declaredPayload = declared!.payload as IAttackDeclaredPayload;
  expect(
    declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
  ).toMatchObject({ value: 1 });

  const spotterEvent = events.find(
    (e) => e.type === GameEventType.IndirectFireSpotterSelected,
  );
  expect(spotterEvent?.payload).toMatchObject({
    attackerId: 'player-1',
    spotterId: 'player-2',
    weaponId: 'lrm-15-1',
    basis: 'los',
    toHitPenalty: 1,
  });
});

it('applies Oblique Attacker to runner indirect-fire penalty math', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  state.units['player-1'] = {
    ...state.units['player-1'],
    abilities: ['oblique-attacker'],
  };

  const events = runPhase({ state, weaponsByUnit, grid: makeBlockedGrid() });

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  expect(declared).toBeDefined();
  const declaredPayload = declared!.payload as IAttackDeclaredPayload;
  expect(
    declaredPayload.modifiers.find((m) => m.name === 'Indirect fire'),
  ).toBeUndefined();

  const spotterEvent = events.find(
    (e) => e.type === GameEventType.IndirectFireSpotterSelected,
  );
  expect(spotterEvent?.payload).toMatchObject({
    attackerId: 'player-1',
    spotterId: 'player-2',
    weaponId: 'lrm-15-1',
    basis: 'los',
    toHitPenalty: 0,
  });
});

it('BACKWARD-COMPAT: no grid passed → no indirect events emitted', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: true });
  const events = runPhase({ state, weaponsByUnit });

  const indirectEvents = events.filter(
    (e) =>
      e.type === GameEventType.IndirectFireSpotterSelected ||
      e.type === GameEventType.IndirectFireNarcOverride,
  );
  expect(indirectEvents.length).toBe(0);

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  if (declared) {
    const declaredPayload = declared.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeUndefined();
  }
});

it('DIRECT-LOS PATH: clear grid → no indirect events (LRM uses direct fire)', () => {
  const { state, weaponsByUnit } = buildScenario({ includeSpotter: false });
  const events = runPhase({ state, weaponsByUnit, grid: makeClearGrid() });

  const indirectEvents = events.filter(
    (e) =>
      e.type === GameEventType.IndirectFireSpotterSelected ||
      e.type === GameEventType.IndirectFireNarcOverride,
  );
  expect(indirectEvents.length).toBe(0);

  const declared = events.find(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  if (declared) {
    const declaredPayload = declared.payload as IAttackDeclaredPayload;
    const indirectMod = declaredPayload.modifiers.find(
      (m) => m.name === 'Indirect fire',
    );
    expect(indirectMod).toBeUndefined();
  }
});
