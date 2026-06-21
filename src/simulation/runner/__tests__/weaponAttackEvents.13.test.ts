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

it('uses Sandblaster UAC/RAC shot-count resolution for runner selected rate-of-fire attacks', () => {
  const weapon = createRotaryAC2();
  const ammoBin = createAmmoBin({
    weaponType: weapon.id,
    remainingRounds: 10,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      abilities: ['sandblaster'],
      designatedWeaponType: 'Rotary AC/2',
      gunnery: 0,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'rof-3'),
    random: new SequenceRandom([1, 1, 6, 6, 3, 4, 6, 6, 3, 4]),
  });

  const playerDeclared = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackDeclaredPayload }>;
  const playerResolved = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
  const consumed = result.events.filter(
    (event) => event.type === GameEventType.AmmoConsumed,
  );

  expect(playerDeclared).toHaveLength(2);
  expect(playerResolved).toHaveLength(2);
  expect(consumed).toHaveLength(2);
  expect(
    playerDeclared.every(
      (event) => event.payload.weaponModes?.[weapon.id] === 'rof-3',
    ),
  ).toBe(true);
  expect(playerResolved.map((event) => event.payload.damage)).toEqual([2, 2]);
  expect(playerResolved.map((event) => event.payload.heat)).toEqual([1, 1]);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    weapon.id,
    weapon.id,
  ]);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(8);
});

it('uses Sandblaster shot-count resolution for catalog-authored ordinary AC rapid-fire modes', () => {
  const weapon = toAIWeapon(weaponLookup('ac-20') as ICatalogWeaponStats, 0);
  expect(weapon.firingModes?.modes.map((mode) => mode.id)).toEqual([
    'single',
    'rapid-fire',
  ]);
  const ammoBin = createAmmoBin({
    weaponType: 'ac-20',
    remainingRounds: 10,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      abilities: ['sandblaster'],
      designatedWeaponType: 'AC/20',
      gunnery: 0,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'rapid-fire'),
    random: new SequenceRandom([1, 1, 6, 6, 3, 4]),
  });

  const playerDeclared = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackDeclaredPayload }>;
  const playerResolved = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
  const consumed = result.events.filter(
    (event) => event.type === GameEventType.AmmoConsumed,
  );

  expect(playerDeclared).toHaveLength(1);
  expect(playerResolved).toHaveLength(1);
  expect(consumed).toHaveLength(1);
  expect(playerDeclared[0].payload.weaponModes?.[weapon.id]).toBe('rapid-fire');
  expect(playerResolved[0].payload.damage).toBe(20);
  expect(playerResolved[0].payload.heat).toBe(7);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    weapon.id,
  ]);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(9);
});

it('target-mounted AMS reduces incoming missile projectile count', () => {
  const lrm = createLRM10();
  const ams = createAMS();
  const amsBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 1,
  });
  const emptyAmsBin = createAmmoBin({
    binId: 'ams-empty-bin',
    weaponType: 'ams',
    remainingRounds: 0,
  });
  const withoutAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
  });
  const withAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      targetWeapons: [ams],
      targetAmmoState: { [amsBin.binId]: amsBin },
    },
  });
  const noAmmoStateAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      targetWeapons: [ams],
    },
  });
  const destroyedAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      targetWeapons: [{ ...ams, destroyed: true }],
    },
  });
  const outOfAmmoAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      targetWeapons: [ams],
      targetAmmoState: { [emptyAmsBin.binId]: emptyAmsBin },
    },
  });

  expect(withoutAMS).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(withAMS).toMatchObject({
    projectileCount: 3,
    weapon: { damage: 3 },
  });
  expect(withAMS.amsInterception).toMatchObject({
    amsWeaponId: ams.id,
    ammoWeaponType: 'ams',
    incomingProjectiles: 6,
    projectilesIntercepted: 3,
    projectilesRemaining: 3,
    ammoConsumed: 1,
    roll: [3, 4],
    clusterRoll: 7,
    clusterModifier: -4,
    modifiedClusterRoll: 3,
  });
  expect(noAmmoStateAMS).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(noAmmoStateAMS.amsInterception).toBeUndefined();
  expect(destroyedAMS).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(destroyedAMS.amsInterception).toBeUndefined();
  expect(outOfAmmoAMS).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(outOfAmmoAMS.amsInterception).toBeUndefined();
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'cluster-table modifier',
  );
});
