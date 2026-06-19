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

it('allows active probes to counter target ECM before Artemis IV suppression', () => {
  const artemisLRM: IWeapon = {
    ...makeLRM15(),
    damage: 15,
    hasArtemisIV: true,
  };
  const baseScenario = buildScenario({
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
        position: { q: 4, r: 0 },
      },
    ],
    activeProbes: [
      {
        type: 'beagle',
        operational: true,
        entityId: 'player-1',
        teamId: GameSide.Player,
        position: { q: 0, r: 0 },
      },
    ],
  };

  const events = runPhase({
    ...baseScenario,
    state: { ...baseScenario.state, electronicWarfare },
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
    projectileCount: 9,
    damage: 9,
  });
});

it('suppresses Artemis IV cluster bonus while attacker stealth armor is active', () => {
  const artemisLRM: IWeapon = {
    ...makeLRM15(),
    damage: 15,
    hasArtemisIV: true,
  };
  const noStealthScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0 },
  });
  const stealthWithoutEcmScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0, hasStealthArmor: true },
  });
  const stealthWithEcmScenario = buildScenario({
    includeSpotter: false,
    attackerWeapon: artemisLRM,
    attackerOverrides: { gunnery: 0, hasStealthArmor: true },
  });
  const electronicWarfare: IElectronicWarfareState = {
    ecmSuites: [
      {
        type: 'guardian',
        mode: 'ecm',
        operational: true,
        entityId: 'player-1:ISGuardianECMSuite:0',
        teamId: GameSide.Player,
        position: { q: 0, r: 0 },
      },
    ],
    activeProbes: [],
  };

  const noStealthEvents = runPhase({
    ...noStealthScenario,
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });
  const stealthWithoutEcmEvents = runPhase({
    ...stealthWithoutEcmScenario,
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });
  const stealthWithEcmEvents = runPhase({
    ...stealthWithEcmScenario,
    state: { ...stealthWithEcmScenario.state, electronicWarfare },
    grid: makeClearGrid(),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
  });

  const findResolved = (
    events: readonly IGameEvent[],
  ): IGameEvent & { payload: IAttackResolvedPayload } =>
    events.find(
      (event) =>
        event.type === GameEventType.AttackResolved &&
        (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
    ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(findResolved(noStealthEvents).payload).toMatchObject({
    hit: true,
    projectileCount: 9,
    damage: 9,
  });
  expect(findResolved(stealthWithoutEcmEvents).payload).toMatchObject({
    hit: true,
    projectileCount: 9,
    damage: 9,
  });
  expect(findResolved(stealthWithEcmEvents).payload).toMatchObject({
    hit: true,
    projectileCount: 5,
    damage: 5,
  });
});
