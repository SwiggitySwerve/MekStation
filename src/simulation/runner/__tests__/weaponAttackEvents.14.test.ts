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

it('only lets target AMS intercept from its mounted firing arc when arc state is available', () => {
  const lrm = createLRM10();
  const ams = createAMS();
  const amsBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });

  const frontArcAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      incomingAttackArc: FiringArc.Front,
      targetWeapons: [{ ...ams, mountingArc: FiringArc.Front }],
      targetAmmoState: { [amsBin.binId]: amsBin },
    },
  });
  const rearArcAMS = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      incomingAttackArc: FiringArc.Front,
      targetWeapons: [{ ...ams, mountingArc: FiringArc.Rear }],
      targetAmmoState: { [amsBin.binId]: amsBin },
    },
  });

  expect(frontArcAMS.amsInterception?.amsWeaponId).toBe(ams.id);
  expect(frontArcAMS.projectileCount).toBe(3);
  expect(rearArcAMS.amsInterception).toBeUndefined();
  expect(rearArcAMS.projectileCount).toBe(6);
});

it('filters multi-arc arm-mounted AMS by the unioned front+side coverage (audit C-8)', () => {
  const lrm = createLRM10();
  const ams = createAMS();
  const amsBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const leftArmAMS = {
    ...ams,
    mountingArcs: [FiringArc.Front, FiringArc.Left],
  };

  const leftArcIntercept = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      incomingAttackArc: FiringArc.Left,
      targetWeapons: [leftArmAMS],
      targetAmmoState: { [amsBin.binId]: amsBin },
    },
  });
  const rearArcMiss = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      incomingAttackArc: FiringArc.Rear,
      targetWeapons: [leftArmAMS],
      targetAmmoState: { [amsBin.binId]: amsBin },
    },
  });

  expect(leftArcIntercept.amsInterception?.amsWeaponId).toBe(ams.id);
  expect(leftArcIntercept.projectileCount).toBe(3);
  expect(rearArcMiss.amsInterception).toBeUndefined();
  expect(rearArcMiss.projectileCount).toBe(6);
});

it('honors an explicit defender-selected AMS id when the selected mount is eligible', () => {
  const firstAms = createAMS('ams-0');
  const selectedAms = createAMS('ams-1');
  const amsBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });

  const interception = resolveAMSInterception({
    incomingProjectiles: 6,
    rackSize: 10,
    clusterRoll: 7,
    clusterModifier: 0,
    clusterDice: [3, 4],
    incomingAttackArc: FiringArc.Front,
    targetWeapons: [firstAms, selectedAms],
    targetAmmoState: { [amsBin.binId]: amsBin },
    selectedAMSWeaponId: selectedAms.id,
  });

  expect(interception?.amsWeaponId).toBe(selectedAms.id);
  expect(interception?.projectilesRemaining).toBe(3);
});

it('does not fall back to automatic AMS selection when an explicit choice is ineligible', () => {
  const eligibleAms = createAMS('ams-0');
  const rearAms = {
    ...createAMS('ams-1'),
    mountingArc: FiringArc.Rear,
  };
  const amsBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });

  const automaticInterception = resolveAMSInterception({
    incomingProjectiles: 6,
    rackSize: 10,
    clusterRoll: 7,
    clusterModifier: 0,
    clusterDice: [3, 4],
    incomingAttackArc: FiringArc.Front,
    targetWeapons: [eligibleAms, rearAms],
    targetAmmoState: { [amsBin.binId]: amsBin },
  });
  const selectedOutOfArcInterception = resolveAMSInterception({
    incomingProjectiles: 6,
    rackSize: 10,
    clusterRoll: 7,
    clusterModifier: 0,
    clusterDice: [3, 4],
    incomingAttackArc: FiringArc.Front,
    targetWeapons: [eligibleAms, rearAms],
    targetAmmoState: { [amsBin.binId]: amsBin },
    selectedAMSWeaponId: rearAms.id,
  });

  expect(automaticInterception?.amsWeaponId).toBe(eligibleAms.id);
  expect(selectedOutOfArcInterception).toBeUndefined();
});
