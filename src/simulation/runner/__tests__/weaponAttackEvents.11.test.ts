/**
 * Phase 2 of `add-combat-fidelity-suite` — per-event-type unit tests for
 * `runAttackPhase`'s lifecycle event chain.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Weapon Attack Lifecycle Events"
 *     - "Location Destruction and Damage Transfer Events"
 *
 * Each test constructs a synthetic minimal scenario (1v1 mech mirror or
 * skewed armor budget) and asserts the discriminated-union payload
 * shape of the events produced by `runAttackPhase`. Determinism is
 * driven by a fixed `SeededRandom` seed; tests never depend on
 * Math.random.
 *
 * This file is intentionally narrow: per-event-type SHAPE assertions.
 * Cross-cutting causal-ordering invariants ("AttackDeclared count ===
 * AttackResolved count over a 5-turn match") live in the integration
 * test at `src/simulation/__tests__/atlasMirrorEventChain.integration.test.ts`.
 */

import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IDesignatorMarkerAppliedPayload,
  IGameEvent,
  IGameState,
  ILocationDestroyedPayload,
  ITransferDamagePayload,
  IUnitGameState,
  LockState,
  MovementType,
  GameEventType,
} from '@/types/gameplay';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';

import type { IAIPlayer, IAIUnitState, IAttackEvent } from '../../ai/IAIPlayer';
import type { IBotBehavior, IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import { runHeatPhase } from '../phases/postCombat';
import { runAttackPhase } from '../phases/weaponAttack';
import { resolveAMSInterception } from '../phases/weaponAttackAMS';
import {
  isSemiGuidedAmmoSelectedForWeapon,
  resolveSandblasterAutocannonRateOfFireShotCount,
  resolveSpecialProjectileHit,
} from '../phases/weaponAttackFiringModes';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
  type ICatalogWeaponStats,
} from '../UnitHydration';
import {
  weaponLookup,
  createAC20,
  createTacOpsRapidFireAC20,
  createMediumLaser,
  createPlasmaCannon,
  createUltraAC5,
  createRotaryAC2,
  createLBX10,
  createMML3,
  createNarcBeacon,
  createINarcBeacon,
  createSelectableINarcBeacon,
  createTAGDesignator,
  createAMS,
  createLaserAMS,
  createLRM10,
  createMRM10,
  createStreakSRM6,
  createThunderbolt10,
  sequenceD6Roller,
  SequenceRandom,
  createAmmoBin,
  VETERAN_MODE_BEHAVIOR,
  ScriptedAttackAI,
  ScriptedMultiWeaponAttackAI,
  ScriptedSelectedAMSAttackAI,
  createUnit,
  buildScenario,
  runPhase,
  runPhaseWithResult,
} from './weaponAttackEvents.test-helpers';

it('iNARC Nemesis pods do not redirect non-confusable MRM fire', () => {
  const mrm = createMRM10();
  const scenario = buildScenario({
    attackerWeapons: [mrm],
    attackerStateOverride: { gunnery: 0 },
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const nemesisCarrier = {
    ...createUnit('player-2', GameSide.Player, { q: 3, r: 0 }),
    iNarcPods: [{ teamId: GameSide.Opponent, podType: 'nemesis' as const }],
  };
  const weaponsByUnit = new Map(scenario.weaponsByUnit);
  weaponsByUnit.set('player-2', []);

  const result = runPhaseWithResult({
    state: {
      ...scenario.state,
      units: {
        ...scenario.state.units,
        'player-2': nemesisCarrier,
      },
    },
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(mrm.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const resolved = result.events.find(
    (event) => event.type === GameEventType.AttackResolved,
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(declared.payload.targetId).toBe('opponent-1');
  expect(resolved.payload.targetId).toBe('opponent-1');
  expect(result.state.units['player-2'].armor).toEqual(nemesisCarrier.armor);
});

it('prototype Artemis IV flags shift missile cluster results by +1 in direct and runner resolution', () => {
  const lrm = createLRM10();
  const prototypeArtemisLRM: IWeapon = {
    ...lrm,
    hasPrototypeArtemisIV: true,
  };
  const prototypeModified = resolveSpecialProjectileHit({
    baseWeapon: prototypeArtemisLRM,
    shotWeapon: prototypeArtemisLRM,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(1, 2),
  });
  const prototypeScenario = buildScenario({
    attackerWeapons: [prototypeArtemisLRM],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const prototypeResult = runPhaseWithResult({
    ...prototypeScenario,
    botPlayer: new ScriptedAttackAI(prototypeArtemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const prototypeResolved = prototypeResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(prototypeModified).toMatchObject({
    projectileCount: 4,
    weapon: { damage: 4 },
  });
  expect(prototypeResolved.payload.projectileCount).toBe(4);
});

it('Cluster Hitter SPA shifts missile cluster results in direct and runner resolution', () => {
  const lrm = createLRM10();
  const baseCluster = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4, 4),
  });
  const clusterHitter = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4, 4),
    clusterContext: {
      clusterHitterSPA: true,
    },
  });
  const baseScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const skilledScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: {
      abilities: ['cluster-hitter'],
      gunnery: 0,
    },
    targetPosition: { q: 7, r: 0 },
  });
  const noSpaResult = runPhaseWithResult({
    ...baseScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
  });
  const spaResult = runPhaseWithResult({
    ...skilledScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
  });

  const noSpaResolved = noSpaResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const spaResolved = spaResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(baseCluster).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(clusterHitter).toMatchObject({
    projectileCount: 8,
    weapon: { damage: 8 },
  });
  expect(noSpaResolved.payload.projectileCount).toBe(6);
  expect(spaResolved.payload.projectileCount).toBe(8);
  expect(SPA_COMBAT_SUPPORT['cluster-hitter'].level).toBe('integrated');
});
