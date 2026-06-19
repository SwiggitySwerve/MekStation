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

it('destroyed linked Artemis FCS strips only the explicitly linked launcher', () => {
  const linkedArtemisLRM: IWeapon = {
    ...createLRM10('linked-lrm-10'),
    location: 'right_torso',
    hasArtemisIV: true,
  };
  const fallbackArtemisLRM: IWeapon = {
    ...createLRM10('fallback-lrm-10'),
    location: 'right_torso',
    hasArtemisIV: true,
  };
  const scenario = buildScenario({
    attackerWeapons: [linkedArtemisLRM, fallbackArtemisLRM],
    attackerStateOverride: {
      gunnery: 0,
      destroyedArtemisFcs: [
        {
          kind: 'artemis_iv',
          location: 'right_torso',
          linkedWeaponId: linkedArtemisLRM.id,
          componentName: 'Artemis IV FCS',
        },
      ],
    },
    targetPosition: { q: 7, r: 0 },
  });

  const linkedResult = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedAttackAI(linkedArtemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const fallbackResult = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedAttackAI(fallbackArtemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const linkedResolved = linkedResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).weaponId ===
        linkedArtemisLRM.id,
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const fallbackResolved = fallbackResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).weaponId ===
        fallbackArtemisLRM.id,
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(linkedResolved.payload.projectileCount).toBe(3);
  expect(fallbackResolved.payload.projectileCount).toBe(6);
});

it('iNARC ECM pods on the attacker suppress source-backed Artemis flight-path guidance', () => {
  const lrm = createLRM10();
  const artemisLRM: IWeapon = { ...lrm, hasArtemisIV: true };
  const baselineScenario = buildScenario({
    attackerWeapons: [artemisLRM],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const ecmPodScenario = buildScenario({
    attackerWeapons: [artemisLRM],
    attackerStateOverride: {
      gunnery: 0,
      iNarcPods: [{ teamId: GameSide.Opponent, podType: 'ecm' }],
    },
    targetPosition: { q: 7, r: 0 },
  });

  const baselineResult = runPhaseWithResult({
    ...baselineScenario,
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const ecmPodResult = runPhaseWithResult({
    ...ecmPodScenario,
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const narcedWithAttackerECM = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      flightPathEcmAffected: true,
      targetNarcedBy: [GameSide.Player],
    },
  });

  const baselineResolved = baselineResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const ecmPodResolved = ecmPodResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(baselineResolved.payload.projectileCount).toBe(6);
  expect(ecmPodResolved.payload.projectileCount).toBe(3);
  expect(narcedWithAttackerECM).toMatchObject({
    projectileCount: 8,
    weapon: { damage: 8 },
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'inarc-ecm-attacker-flight-path-suppression'
    ].level,
  ).toBe('integrated');
});

it('same-side iNARC ECM pods on the attacker still suppress Artemis guidance once attached', () => {
  const lrm = createLRM10();
  const artemisLRM: IWeapon = { ...lrm, hasArtemisIV: true };
  const baselineScenario = buildScenario({
    attackerWeapons: [artemisLRM],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const friendlyPodScenario = buildScenario({
    attackerWeapons: [artemisLRM],
    attackerStateOverride: {
      gunnery: 0,
      iNarcPods: [{ teamId: GameSide.Player, podType: 'ecm' }],
    },
    targetPosition: { q: 7, r: 0 },
  });

  const baselineResult = runPhaseWithResult({
    ...baselineScenario,
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const friendlyPodResult = runPhaseWithResult({
    ...friendlyPodScenario,
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const baselineResolved = baselineResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const friendlyPodResolved = friendlyPodResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(baselineResolved.payload.projectileCount).toBe(6);
  expect(friendlyPodResolved.payload.projectileCount).toBe(3);
});

it('iNARC Nemesis pods redirect source-backed confusable missiles to friendly intervening units', () => {
  const lrm = createLRM10();
  const scenario = buildScenario({
    attackerWeapons: [lrm],
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
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const resolved = result.events.find(
    (event) => event.type === GameEventType.AttackResolved,
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(declared.payload.targetId).toBe('player-2');
  expect(resolved.payload).toMatchObject({
    targetId: 'player-2',
    hit: true,
  });
  expect(result.state.units['player-2'].armor).not.toEqual(
    nemesisCarrier.armor,
  );
  expect(result.state.units['opponent-1'].armor).toEqual(
    scenario.state.units['opponent-1'].armor,
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-nemesis-redirect'].level,
  ).toBe('integrated');
});
