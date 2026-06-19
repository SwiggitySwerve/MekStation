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

it('plasma cannon hits queue external target heat for Heat Phase without BattleMech damage', () => {
  const weapon = createPlasmaCannon();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: { heat: 4, heatSinks: 0 },
    targetPosition: { q: 5, r: 0 },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
    random: new SequenceRandom([6, 6, 3, 4, 2, 5]),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const immediateHeatGenerated = result.events.find(
    (event) =>
      event.type === GameEventType.HeatGenerated &&
      (event.payload as { unitId?: string }).unitId === 'opponent-1',
  );
  const heatEvents: IGameEvent[] = [];
  const heatPhaseState = runHeatPhase({
    state: {
      ...result.state,
      phase: GamePhase.Heat,
    },
    events: heatEvents,
    gameId: result.state.gameId,
    random: new SequenceRandom([]),
    weaponsByUnit,
  });
  const heatGenerated = heatEvents.find(
    (event) =>
      event.type === GameEventType.HeatGenerated &&
      (event.payload as { unitId?: string }).unitId === 'opponent-1',
  ) as
    | (IGameEvent & {
        payload: {
          amount: number;
          source: string;
          previousTotal: number;
          newTotal: number;
        };
      })
    | undefined;

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 0,
    heat: 7,
    location: expect.any(String),
  });
  expect(immediateHeatGenerated).toBeUndefined();
  expect(result.state.units['opponent-1'].heat).toBe(4);
  expect(result.state.units['opponent-1'].pendingExternalHeat).toBe(7);
  expect(result.state.units['opponent-1'].externalHeatThisTurn).toBe(undefined);
  expect(heatGenerated?.payload).toMatchObject({
    amount: 7,
    source: 'external',
    previousTotal: 4,
    newTotal: 11,
  });
  expect(heatPhaseState.units['opponent-1'].heat).toBe(11);
  expect(heatPhaseState.units['opponent-1'].externalHeatThisTurn).toBe(7);
  expect(heatPhaseState.units['opponent-1'].pendingExternalHeat).toBe(0);
  expect(
    result.events.some((event) => event.type === GameEventType.DamageApplied),
  ).toBe(false);
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
  ).toContain('HeatGenerated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
  ).not.toContain('heatFromExternal Heat Phase pending-bucket timing');
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
  ).not.toContain('timing/caps/lifecycle');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-heat-phase-pending-bucket'
    ].level,
  ).toBe('integrated');
});

it('plasma cannon pending external heat is capped at 15 points in Heat Phase', () => {
  const plasmaOne = createPlasmaCannon('clan-plasma-cannon-1');
  const plasmaTwo = createPlasmaCannon('clan-plasma-cannon-2');
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [plasmaOne, plasmaTwo],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: { heat: 0, heatSinks: 0 },
    targetPosition: { q: 5, r: 0 },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedMultiWeaponAttackAI([plasmaOne.id, plasmaTwo.id]),
    random: new SequenceRandom([6, 6, 3, 4, 6, 6, 6, 6, 3, 4, 6, 6]),
  });
  const immediateHeatPayloads = result.events
    .filter(
      (event) =>
        event.type === GameEventType.HeatGenerated &&
        (event.payload as { unitId?: string }).unitId === 'opponent-1',
    )
    .map((event) => event.payload as { amount: number; newTotal: number });
  const heatEvents: IGameEvent[] = [];
  const heatPhaseState = runHeatPhase({
    state: {
      ...result.state,
      phase: GamePhase.Heat,
    },
    events: heatEvents,
    gameId: result.state.gameId,
    random: new SequenceRandom([]),
    weaponsByUnit,
  });
  const heatPayloads = heatEvents
    .filter(
      (event) =>
        event.type === GameEventType.HeatGenerated &&
        (event.payload as { unitId?: string }).unitId === 'opponent-1',
    )
    .map((event) => event.payload as { amount: number; newTotal: number });

  expect(immediateHeatPayloads).toEqual([]);
  expect(result.state.units['opponent-1'].heat).toBe(0);
  expect(result.state.units['opponent-1'].pendingExternalHeat).toBe(24);
  expect(heatPayloads).toEqual([
    expect.objectContaining({ amount: 15, newTotal: 15 }),
  ]);
  expect(heatPhaseState.units['opponent-1'].heat).toBe(15);
  expect(heatPhaseState.units['opponent-1'].externalHeatThisTurn).toBe(15);
  expect(heatPhaseState.units['opponent-1'].pendingExternalHeat).toBe(0);
});
