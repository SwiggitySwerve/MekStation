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

it('iNARC explosive ammo resolves source-backed damage without marker attachment', () => {
  const weapon = createSelectableINarcBeacon();
  const ammoBin = createAmmoBin({
    weaponType: 'inarc-explosive-pods',
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
    botPlayer: new ScriptedAttackAI(weapon.id, 'explosive'),
    random: new SequenceRandom([6, 6, 3, 4]),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const damageApplied = result.events.find(
    (event) => event.type === GameEventType.DamageApplied,
  ) as IGameEvent & { payload: IDamageAppliedPayload };
  const markerApplied = result.events.find(
    (event) => event.type === GameEventType.DesignatorMarkerApplied,
  );

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 6,
    heat: 0,
  });
  expect(damageApplied.payload).toMatchObject({
    unitId: 'opponent-1',
    damage: 6,
    sourceUnitId: 'player-1',
  });
  expect(markerApplied).toBeUndefined();
  expect(result.state.units['opponent-1'].iNarcPods).toBeUndefined();
  expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(1);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-explosive-ammo-compatibility']
      .level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-explosive-ammo-compatibility']
      .evidence,
  ).toContain('source-backed 6-point impact damage');
});

it('iNARC unknown ammo does not fall back to Homing marker attachment', () => {
  const weapon = createSelectableINarcBeacon();
  const ammoBin = createAmmoBin({
    weaponType: 'experimental-pods',
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
    botPlayer: new ScriptedAttackAI(weapon.id, 'unknown'),
    random: new SequenceRandom([6, 6, 3, 4]),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const markerApplied = result.events.find(
    (event) => event.type === GameEventType.DesignatorMarkerApplied,
  );

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 0,
    heat: 0,
  });
  expect(markerApplied).toBeUndefined();
  expect(result.state.units['opponent-1'].iNarcPods).toBeUndefined();
  expect(result.state.units['opponent-1'].narcedBy).toBeUndefined();
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(1);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
  ).toContain('markerless unknown-ammo guard behavior');
});

it('TAG hits designate the target without applying damage', () => {
  const weapon = createTAGDesignator();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 2 },
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
    marker: 'tag',
    persistent: false,
  });
  expect(result.state.units['opponent-1'].tagDesignated).toBe(true);
  expect(
    result.events.some((event) => event.type === GameEventType.DamageApplied),
  ).toBe(false);
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
    'tagDesignated',
  );
});
