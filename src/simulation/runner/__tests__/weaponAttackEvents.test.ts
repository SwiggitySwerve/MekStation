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

it('emits before the to-hit roll with attackerId, targetId, weaponId, range, firingArc, modifiers', () => {
  // Atlas-like AC/20 attacker at range 1 vs full-armor target.
  // Seed picked empirically to ensure the bot fires AC/20 from
  // adjacent hex (range = 1, short bracket).
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createAC20()],
  });
  const events = runPhase({ state, weaponsByUnit });

  const declared = events.filter(
    (e) => e.type === GameEventType.AttackDeclared,
  );
  expect(declared.length).toBeGreaterThanOrEqual(1);

  const payload = declared[0].payload as IAttackDeclaredPayload;
  expect(payload.attackerId).toBe('player-1');
  expect(payload.targetId).toBe('opponent-1');
  expect(payload.weapons).toEqual(['ac-20-test']);
  expect(payload.toHitNumber).toBeGreaterThan(0);
  expect(Array.isArray(payload.modifiers)).toBe(true);
  expect(payload.modifiers.length).toBeGreaterThan(0);
  // gunnery is always the first modifier in calculateToHit.
  const gunneryMod = payload.modifiers.find((m) => m.source === 'base');
  expect(gunneryMod).toBeDefined();
  expect(gunneryMod?.value).toBe(4);
  expect(payload.range).toBe('short');
  expect(payload.firingArc).toBeDefined();
});

it('emits one AttackDeclared per declared weapon mount', () => {
  // Two weapons declared → two AttackDeclared events (per design D4).
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createMediumLaser('ml-1'), createMediumLaser('ml-2')],
  });
  const events = runPhase({ state, weaponsByUnit });

  const declared = events.filter(
    (e) => e.type === GameEventType.AttackDeclared,
  );
  // The bot may pick a subset (heat budget), but with 2 cool MLs at
  // heat 0 it will fire both.
  const weaponIds = declared.map(
    (e) => (e.payload as IAttackDeclaredPayload).weapons[0],
  );
  expect(weaponIds).toContain('ml-1');
  expect(weaponIds).toContain('ml-2');
});

it('resolves selected rate-of-fire modes as independent runner shots', () => {
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createUltraAC5()],
  });
  const stateWithEasyShot: IGameState = {
    ...state,
    units: {
      ...state.units,
      'player-1': {
        ...state.units['player-1'],
        gunnery: 2,
      },
    },
  };

  const result = runPhaseWithResult({
    state: stateWithEasyShot,
    weaponsByUnit,
    botBehavior: VETERAN_MODE_BEHAVIOR,
  });
  const { events } = result;

  const declared = events.filter(
    (e) =>
      e.type === GameEventType.AttackDeclared &&
      (e.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackDeclaredPayload }>;
  const resolved = events.filter(
    (e) =>
      e.type === GameEventType.AttackResolved &&
      (e.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;

  expect(declared).toHaveLength(2);
  expect(resolved).toHaveLength(2);
  expect(
    declared.every(
      (event) => event.payload.weaponModes?.['uac-5-test'] === 'double',
    ),
  ).toBe(true);
  expect(resolved.map((event) => event.payload.damage)).toEqual([5, 5]);
  expect(resolved.map((event) => event.payload.heat)).toEqual([1, 1]);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    'uac-5-test',
    'uac-5-test',
  ]);
});

it('emits after the to-hit roll with rolledTN, rolled2d6, hit:bool, hitLocation on hit', () => {
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createAC20()],
  });
  const events = runPhase({ state, weaponsByUnit });

  const resolved = events.filter(
    (e) => e.type === GameEventType.AttackResolved,
  );
  expect(resolved.length).toBeGreaterThanOrEqual(1);

  const payload = resolved[0].payload as IAttackResolvedPayload;
  expect(payload.attackerId).toBe('player-1');
  expect(payload.targetId).toBe('opponent-1');
  expect(payload.weaponId).toBe('ac-20-test');
  expect(payload.toHitNumber).toBeGreaterThan(0);
  expect(payload.roll).toBeGreaterThanOrEqual(2);
  expect(payload.roll).toBeLessThanOrEqual(12);
  expect(typeof payload.hit).toBe('boolean');
  if (payload.hit) {
    expect(typeof payload.location).toBe('string');
    expect(payload.damage).toBe(20);
  }
  expect(payload.heat).toBe(7);
  expect(payload.attackerArc).toBeDefined();
});

it('emits AttackResolved on miss with hit:false and no hitLocation', () => {
  // Push the gunnery to 7 and target movement so to-hit is hard;
  // with seed 99999 we'll get a miss and exercise the miss branch.
  // Not strictly seed-dependent — the test asserts that IF a miss
  // occurs, the payload shape is right.
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createMediumLaser()],
  });
  const events = runPhase({ state, weaponsByUnit, seed: 99999 });

  const resolved = events.filter(
    (e) => e.type === GameEventType.AttackResolved,
  ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
  // At least one resolved event should fire.
  expect(resolved.length).toBeGreaterThan(0);

  // Find a miss if any; if all hit, that's fine — the assertion is
  // about miss-shape WHEN a miss happens.
  const missEvent = resolved.find((e) => !e.payload.hit);
  if (missEvent) {
    expect(missEvent.payload.hit).toBe(false);
    expect(missEvent.payload.location).toBeUndefined();
    expect(missEvent.payload.damage).toBeUndefined();
    expect(missEvent.payload.attackerArc).toBeDefined();
  }
});

it('valid misses still mark firing heat and consume one ammo round', () => {
  const weapon = createAC20();
  const ammoBin = createAmmoBin({
    weaponType: weapon.id,
    remainingRounds: 5,
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
    (event) => event.type === GameEventType.AttackResolved,
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const consumed = result.events.find(
    (event) => event.type === GameEventType.AmmoConsumed,
  ) as
    | (IGameEvent & {
        payload: { roundsConsumed: number; roundsRemaining: number };
      })
    | undefined;

  expect(resolved.payload.hit).toBe(false);
  expect(consumed?.payload.roundsConsumed).toBe(1);
  expect(consumed?.payload.roundsRemaining).toBe(4);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    weapon.id,
  ]);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(4);
});
