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

it('applies indirect-fire to-hit penalty strongly enough to change hit outcome', () => {
  const lrm15: IWeapon = { ...makeLRM15(), damage: 15 };
  const directScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: lrm15,
    attackerOverrides: { gunnery: 1 },
  });
  const indirectScenario = buildScenario({
    includeSpotter: true,
    attackerWeapon: lrm15,
    attackerOverrides: { gunnery: 1 },
  });

  const directEvents = runPhase({
    ...directScenario,
    grid: makeClearGrid(),
    random: new SequenceRandom([1, 2, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(lrm15.id),
  });
  const indirectEvents = runPhase({
    ...indirectScenario,
    grid: makeBlockedGrid(),
    random: new SequenceRandom([1, 2]),
    botPlayer: new ScriptedAttackAI(lrm15.id),
  });

  const directResolved = directEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const indirectResolved = indirectEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(directResolved.payload).toMatchObject({
    hit: true,
    roll: 3,
    toHitNumber: 3,
  });
  expect(indirectResolved.payload).toMatchObject({
    hit: false,
    roll: 3,
    toHitNumber: 4,
  });
});

it('suppresses Artemis IV cluster bonus during indirect LRM fire', () => {
  const artemisLRM: IWeapon = {
    ...makeLRM15(),
    damage: 15,
    hasArtemisIV: true,
  };
  const directScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0 },
  });
  const indirectScenario = buildScenario({
    includeSpotter: true,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0 },
  });

  const directEvents = runPhase({
    ...directScenario,
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });
  const indirectEvents = runPhase({
    ...indirectScenario,
    grid: makeBlockedGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });

  const directResolved = directEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const indirectResolved = indirectEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const indirectDeclared = indirectEvents.find(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );

  expect(directResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 9,
    damage: 9,
    toHitNumber: 2,
  });
  expect(indirectResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 5,
    damage: 5,
    toHitNumber: 3,
  });
  expect(
    (indirectDeclared!.payload as IAttackDeclaredPayload).modifiers.find(
      (modifier) => modifier.name === 'Indirect fire',
    ),
  ).toMatchObject({ value: 1 });
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
    'indirect-fire suppression',
  );
});

it('suppresses Artemis IV cluster bonus when target ECM covers direct fire', () => {
  const artemisLRM: IWeapon = {
    ...makeLRM15(),
    damage: 15,
    hasArtemisIV: true,
  };
  const noEcmScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0 },
  });
  const ecmScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0 },
  });
  const electronicWarfare: IElectronicWarfareState = {
    ecmSuites: [
      {
        type: 'guardian',
        mode: 'ecm',
        operational: true,
        entityId: 'opponent-ecm',
        teamId: GameSide.Opponent,
        position: { q: 10, r: 0 },
      },
    ],
    activeProbes: [],
  };

  const noEcmEvents = runPhase({
    ...noEcmScenario,
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });
  const ecmEvents = runPhase({
    ...ecmScenario,
    state: { ...ecmScenario.state, electronicWarfare },
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });

  const noEcmResolved = noEcmEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const ecmResolved = ecmEvents.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(noEcmResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 9,
    damage: 9,
  });
  expect(ecmResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 5,
    damage: 5,
  });
});

it.each([
  ['ecm', 5],
  ['eccm', 9],
  ['off', 9],
] as const)(
  'uses target ECM suite %s mode when applying Artemis IV suppression',
  (mode, expectedProjectileCount) => {
    const artemisLRM: IWeapon = {
      ...makeLRM15(),
      damage: 15,
      hasArtemisIV: true,
    };
    const scenario = buildScenario({
      includeSpotter: false,
      attackerWeapon: artemisLRM,
      attackerOverrides: { gunnery: 0 },
    });
    const electronicWarfare: IElectronicWarfareState = {
      ecmSuites: [
        {
          type: 'guardian',
          mode,
          operational: true,
          entityId: 'opponent-ecm',
          teamId: GameSide.Opponent,
          position: { q: 10, r: 0 },
        },
      ],
      activeProbes: [],
    };

    const events = runPhase({
      ...scenario,
      state: { ...scenario.state, electronicWarfare },
      grid: makeClearGrid(),
      random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
      botPlayer: new ScriptedAttackAI(artemisLRM.id),
    });

    const resolved = events.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };

    expect(resolved.payload).toMatchObject({
      hit: true,
      projectileCount: expectedProjectileCount,
      damage: expectedProjectileCount,
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ecm-mode-lifecycle']
        .evidence,
    ).toContain('ECM mode');
  },
);
