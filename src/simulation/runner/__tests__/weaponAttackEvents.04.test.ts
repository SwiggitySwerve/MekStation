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

it('target AMS can destroy a NARC pod before marker attachment', () => {
  const weapon = createNarcBeacon();
  const ams = createAMS();
  const narcAmmoBin = createAmmoBin({
    weaponType: 'narc',
    remainingRounds: 2,
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
      ammoState: { [narcAmmoBin.binId]: narcAmmoBin },
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
    random: new SequenceRandom([6, 6, 2]),
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
          resolution: string;
          incomingProjectiles: number;
          projectilesIntercepted: number;
          projectilesRemaining: number;
          roll: readonly number[];
          ammoBinId?: string;
          ammoRemaining?: number;
        };
      })
    | undefined;

  expect(resolved.payload).toMatchObject({
    hit: false,
    damage: 0,
    heat: 0,
    projectileCount: 0,
  });
  expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
  expect(amsInterception?.payload).toMatchObject({
    resolution: 'single-missile',
    incomingProjectiles: 1,
    projectilesIntercepted: 1,
    projectilesRemaining: 0,
    roll: [2],
    ammoBinId: amsAmmoBin.binId,
    ammoRemaining: 1,
  });
  expect(
    result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
  expect(
    result.events.some(
      (event) => event.type === GameEventType.DesignatorMarkerApplied,
    ),
  ).toBe(false);
  expect(
    result.state.units['player-1'].ammoState?.[narcAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
});

it('NARC pod attaches when single-missile AMS fails its interception roll', () => {
  const weapon = createNarcBeacon();
  const ams = createAMS();
  const narcAmmoBin = createAmmoBin({
    weaponType: 'narc',
    remainingRounds: 2,
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
      ammoState: { [narcAmmoBin.binId]: narcAmmoBin },
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
    random: new SequenceRandom([6, 6, 4, 1, 1]),
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
          resolution: string;
          projectilesIntercepted: number;
          projectilesRemaining: number;
          roll: readonly number[];
        };
      })
    | undefined;
  const markerApplied = result.events.find(
    (event) => event.type === GameEventType.DesignatorMarkerApplied,
  ) as (IGameEvent & { payload: IDesignatorMarkerAppliedPayload }) | undefined;

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 0,
    heat: 0,
    projectileCount: 1,
  });
  expect(result.state.units['opponent-1'].narcedBy).toContain(GameSide.Player);
  expect(amsInterception?.payload).toMatchObject({
    resolution: 'single-missile',
    projectilesIntercepted: 0,
    projectilesRemaining: 1,
    roll: [4],
  });
  expect(markerApplied?.payload).toMatchObject({
    marker: 'narc',
    persistent: true,
    teamId: GameSide.Player,
  });
});

it('iNARC homing pod hits attach variant marker state without standard NARC state', () => {
  const weapon = createINarcBeacon();
  const ammoBin = createAmmoBin({
    weaponType: 'inarc',
    remainingRounds: 2,
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
  const markerApplied = result.events.find(
    (event) => event.type === GameEventType.DesignatorMarkerApplied,
  ) as (IGameEvent & { payload: IDesignatorMarkerAppliedPayload }) | undefined;

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 0,
    heat: 0,
  });
  expect(markerApplied?.payload).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    weaponId: weapon.id,
    marker: 'inarc',
    podType: 'homing',
    persistent: true,
    teamId: GameSide.Player,
  });
  expect(result.state.units['opponent-1'].iNarcPods).toEqual([
    expect.objectContaining({
      teamId: GameSide.Player,
      podType: 'homing',
    }),
  ]);
  expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
});
