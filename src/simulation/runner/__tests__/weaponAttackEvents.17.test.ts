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

it('does not treat helper-authored AMS bay metadata as supported same-phase reuse', () => {
  const firstLrm = createLRM10('lrm-10-first');
  const secondLrm = createLRM10('lrm-10-second');
  const ams = createAMS();
  const bayShapedAMS = {
    ...ams,
    amsBay: true,
    mountingArc: FiringArc.Front,
  } as IWeapon & { readonly amsBay: true };
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const scenario = buildScenario({
    attackerWeapons: [firstLrm, secondLrm],
    attackerPosition: { q: 0, r: -7 },
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 0, r: 0 },
    targetStateOverride: {
      facing: Facing.North,
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [bayShapedAMS],
  });

  const result = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedMultiWeaponAttackAI([firstLrm.id, secondLrm.id]),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4, 6, 6, 3, 4, 3, 4]),
  });
  const interceptions = result.events.filter(
    (event) => event.type === GameEventType.AMSInterception,
  );
  const resolvedPayloads = result.events
    .filter((event) => event.type === GameEventType.AttackResolved)
    .map((event) => event.payload as IAttackResolvedPayload);

  expect(interceptions).toHaveLength(1);
  expect(interceptions[0]?.payload).toMatchObject({
    incomingWeaponId: firstLrm.id,
    amsWeaponId: ams.id,
    projectilesRemaining: 3,
    ammoRemaining: 1,
  });
  expect(resolvedPayloads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        weaponId: firstLrm.id,
        projectileCount: 3,
      }),
      expect.objectContaining({
        weaponId: secondLrm.id,
        projectileCount: 6,
      }),
    ]),
  );
  expect(
    result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
  expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
    ams.id,
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].evidence,
  ).toContain('AMS bay-shaped helper metadata');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
  ).toContain('outside the current BattleMech blocker matrix');
});

it('runner attack resolution respects target AMS mounted arc when resolving interception', () => {
  const lrm = createLRM10();
  const ams = createAMS();
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const frontArcScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerPosition: { q: 0, r: -7 },
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 0, r: 0 },
    targetStateOverride: {
      facing: Facing.North,
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [{ ...ams, mountingArc: FiringArc.Front }],
  });
  const rearArcScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerPosition: { q: 0, r: -7 },
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 0, r: 0 },
    targetStateOverride: {
      facing: Facing.North,
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [{ ...ams, mountingArc: FiringArc.Rear }],
  });

  const frontArcResult = runPhaseWithResult({
    ...frontArcScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4]),
  });
  const rearArcResult = runPhaseWithResult({
    ...rearArcScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4]),
  });

  const frontArcInterception = frontArcResult.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  );
  const rearArcInterception = rearArcResult.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  );
  const frontArcResolved = frontArcResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const rearArcResolved = rearArcResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(frontArcInterception).toBeDefined();
  expect(rearArcInterception).toBeUndefined();
  expect(frontArcResolved.payload.attackerArc).toBe(FiringArc.Front);
  expect(frontArcResolved.payload.projectileCount).toBe(3);
  expect(
    frontArcResult.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
  expect(frontArcResult.state.units['opponent-1'].weaponsFiredThisTurn).toEqual(
    [ams.id],
  );
  expect(rearArcResolved.payload.attackerArc).toBe(FiringArc.Front);
  expect(rearArcResolved.payload.projectileCount).toBe(6);
  expect(
    rearArcResult.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(2);
  expect(rearArcResult.state.units['opponent-1'].weaponsFiredThisTurn).toEqual(
    [],
  );
});

it('laser AMS intercepts without ammo consumption and still enters heat accounting', () => {
  const lrm = createLRM10();
  const laserAMS = createLaserAMS();
  const laserAmsScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetWeapons: [laserAMS],
    targetPosition: { q: 7, r: 0 },
  });

  const result = runPhaseWithResult({
    ...laserAmsScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4]),
  });
  const amsInterception = result.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  ) as
    | (IGameEvent & {
        payload: {
          amsWeaponId: string;
          ammoConsumed: number;
          projectilesRemaining: number;
        };
      })
    | undefined;

  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.AmmoConsumed &&
        (event.payload as { unitId?: string }).unitId === 'opponent-1',
    ),
  ).toBe(false);
  expect(amsInterception?.payload).toMatchObject({
    amsWeaponId: laserAMS.id,
    ammoConsumed: 0,
    projectilesRemaining: 3,
  });
  expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
    laserAMS.id,
  ]);

  const heatEvents: IGameEvent[] = [];
  runHeatPhase({
    state: result.state,
    events: heatEvents,
    gameId: laserAmsScenario.state.gameId,
    random: new SeededRandom(78),
    weaponsByUnit: laserAmsScenario.weaponsByUnit,
  });
  const laserAmsHeat = heatEvents.find(
    (event) =>
      event.type === GameEventType.HeatGenerated &&
      (event.payload as { unitId?: string; source?: string }).unitId ===
        'opponent-1' &&
      (event.payload as { source?: string }).source === 'firing',
  ) as
    | (IGameEvent & {
        payload: { amount: number; source: string };
      })
    | undefined;

  expect(laserAmsHeat?.payload).toMatchObject({
    amount: laserAMS.heat,
    source: 'firing',
  });
});
