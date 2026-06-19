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

it('Thunderbolt-style single missiles use the MegaMek AMS 1d6 destroy check', () => {
  const weapon = createThunderbolt10();
  const ams = createAMS();
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });

  const destroyed = resolveSpecialProjectileHit({
    baseWeapon: weapon,
    shotWeapon: weapon,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3),
    clusterContext: {
      targetWeapons: [ams],
      targetAmmoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
  });
  const survived = resolveSpecialProjectileHit({
    baseWeapon: weapon,
    shotWeapon: weapon,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4),
    clusterContext: {
      targetWeapons: [ams],
      targetAmmoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
  });

  expect(destroyed).toMatchObject({
    projectileCount: 0,
    weapon: { damage: 0 },
    amsInterception: {
      resolution: 'single-missile',
      incomingProjectiles: 1,
      projectilesIntercepted: 1,
      projectilesRemaining: 0,
      roll: [3],
    },
  });
  expect(survived).toMatchObject({
    projectileCount: 1,
    weapon: { damage: 10 },
    amsInterception: {
      resolution: 'single-missile',
      incomingProjectiles: 1,
      projectilesIntercepted: 0,
      projectilesRemaining: 1,
      roll: [4],
    },
  });
});

it('semi-guided LRM ammo leaves missile cluster counts unchanged by TAG', () => {
  const lrm = createLRM10();
  const ammoBin = createAmmoBin({
    weaponType: 'semi-guided-lrm-10',
    remainingRounds: 3,
  });
  const { state } = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: {
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });
  const isSemiGuided = isSemiGuidedAmmoSelectedForWeapon(
    state.units['player-1'],
    lrm,
  );

  const baseline = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
  });
  const contextOnly = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {},
  });

  expect(isSemiGuided).toBe(true);
  expect(baseline).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(contextOnly).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
    'semi-guided',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-semi-guided-to-hit'].level,
  ).toBe('integrated');
  expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).not.toHaveProperty(
    'tag-semi-guided-cluster-bonus',
  );
});

it('semi-guided TAG cancels runner target movement to-hit while preserving the TMM row', () => {
  const lrm = createLRM10();
  const ammoBin = createAmmoBin({
    weaponType: 'semi-guided-lrm-10',
    remainingRounds: 3,
  });
  const movingTarget = {
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 5,
  };
  const baselineScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 7, r: 0 },
    attackerStateOverride: {
      ammoState: { [ammoBin.binId]: ammoBin },
    },
    targetStateOverride: movingTarget,
  });
  const taggedScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 7, r: 0 },
    attackerStateOverride: {
      ammoState: { [ammoBin.binId]: ammoBin },
    },
    targetStateOverride: {
      ...movingTarget,
      tagDesignated: true,
    },
  });
  const baselineResult = runPhaseWithResult({
    ...baselineScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
  });
  const taggedResult = runPhaseWithResult({
    ...taggedScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
  });
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const taggedDeclared = taggedResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(taggedDeclared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber - 2,
  );
  expect(taggedDeclared.payload.modifiers).toContainEqual(
    expect.objectContaining({
      name: 'Target Movement (TMM)',
      value: 2,
      source: 'target_movement',
    }),
  );
  expect(taggedDeclared.payload.modifiers).toContainEqual(
    expect.objectContaining({
      name: 'Semi-guided TAG target movement',
      value: -2,
      source: 'equipment',
    }),
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-semi-guided-to-hit'].level,
  ).toBe('integrated');
});

it('applies LB-X cluster-mode -1 to-hit adjustment in declared attack math', () => {
  const weapon = createLBX10();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 4 },
  });

  const slugResult = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'slug'),
  });
  const clusterResult = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'cluster'),
  });
  const slugDeclared = slugResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const clusterDeclared = clusterResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(clusterDeclared.payload.weaponModes?.[weapon.id]).toBe('cluster');
  expect(clusterDeclared.payload.toHitNumber).toBe(
    slugDeclared.payload.toHitNumber - 1,
  );
  expect(
    clusterDeclared.payload.modifiers.some((modifier) =>
      /LB-X|cluster/i.test(modifier.name),
    ),
  ).toBe(true);
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].level).toBe(
    'integrated',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].evidence).toContain(
    'selectedModeToHitModifier',
  );
});
