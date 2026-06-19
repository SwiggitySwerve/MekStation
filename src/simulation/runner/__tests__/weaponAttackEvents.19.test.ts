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

it('Streak SRM hit exposes the full rack as projectile count', () => {
  const weapon = createStreakSRM6();
  const ammoBin = createAmmoBin({
    weaponType: 'streak-srm-6',
    remainingRounds: 3,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 2,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const consumed = result.events.find(
    (event) => event.type === GameEventType.AmmoConsumed,
  ) as
    | (IGameEvent & {
        payload: { roundsConsumed: number; roundsRemaining: number };
      })
    | undefined;

  expect(resolved.payload.hit).toBe(true);
  expect(resolved.payload.projectileCount).toBe(6);
  expect(resolved.payload.damage).toBeGreaterThan(0);
  expect(resolved.payload.damage).toBeLessThanOrEqual(12);
  expect(resolved.payload.heat).toBe(4);
  expect(consumed?.payload.roundsConsumed).toBe(1);
  expect(consumed?.payload.roundsRemaining).toBe(2);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    weapon.id,
  ]);
});

it('Streak SRM hit resolves target AMS through the cluster table', () => {
  const weapon = createStreakSRM6();
  const ams = createAMS();
  const streakAmmoBin = createAmmoBin({
    weaponType: 'streak-srm-6',
    remainingRounds: 3,
  });
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 2,
      ammoState: { [streakAmmoBin.binId]: streakAmmoBin },
    },
    targetStateOverride: {
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [ams],
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const amsInterception = result.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  ) as
    | (IGameEvent & {
        payload: {
          incomingProjectiles: number;
          projectilesIntercepted: number;
          projectilesRemaining: number;
          roll: readonly number[];
          clusterRoll: number;
          clusterModifier: number;
          modifiedClusterRoll: number;
        };
      })
    | undefined;

  expect(resolved.payload.hit).toBe(true);
  expect(resolved.payload.projectileCount).toBe(4);
  expect(resolved.payload.damage).toBe(8);
  expect(amsInterception?.payload).toMatchObject({
    incomingProjectiles: 6,
    projectilesIntercepted: 2,
    projectilesRemaining: 4,
    roll: [11],
    clusterRoll: 11,
    clusterModifier: -4,
    modifiedClusterRoll: 7,
  });
  expect(
    result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
  expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
    ams.id,
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-streak-cluster-parity'].level,
  ).toBe('integrated');
});

it('Streak SRM failed lock does not spend ammo or firing heat', () => {
  const weapon = createStreakSRM6();
  const ammoBin = createAmmoBin({
    weaponType: 'streak-srm-6',
    remainingRounds: 3,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 13,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(resolved.payload.hit).toBe(false);
  expect(resolved.payload.damage).toBeUndefined();
  expect(resolved.payload.projectileCount).toBeUndefined();
  expect(resolved.payload.heat).toBe(0);
  expect(
    result.events.some((event) => event.type === GameEventType.AmmoConsumed),
  ).toBe(false);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(3);
});

it('AttackDeclared count equals AttackResolved count (per-mount invariant)', () => {
  // Causal-ordering invariant: every declared shot resolves to
  // hit-or-miss. No in-flight attacks at end of phase.
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [
      createMediumLaser('ml-1'),
      createMediumLaser('ml-2'),
      createMediumLaser('ml-3'),
    ],
  });
  const events = runPhase({ state, weaponsByUnit });

  const declared = events.filter(
    (e) => e.type === GameEventType.AttackDeclared,
  ).length;
  const resolved = events.filter(
    (e) => e.type === GameEventType.AttackResolved,
  ).length;
  expect(declared).toBe(resolved);
  expect(declared).toBeGreaterThan(0);
});
