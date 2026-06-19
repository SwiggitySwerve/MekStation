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

it('plasma cannon non-Mek hits remain out-of-scope for special damage lifecycle', () => {
  const weapon = createPlasmaCannon();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: { unitType: 'Vehicle', heat: 4 },
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

  expect(resolved.payload).toMatchObject({
    hit: true,
    damage: 0,
    heat: 7,
  });
  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.HeatGenerated &&
        (event.payload as { unitId?: string }).unitId === 'opponent-1',
    ),
  ).toBe(false);
  expect(
    result.events.some((event) => event.type === GameEventType.DamageApplied),
  ).toBe(false);
  expect(result.state.units['opponent-1'].heat).toBe(4);
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].level).toBe(
    'out-of-scope',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].level,
  ).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
    'non-Mek special damage paths',
  );
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
    'terrain/building special damage paths',
  );
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
  ).toContain('zero BattleMech damage');
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
  ).toContain('consume plasma ammunition');
  expect(
    SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
  ).not.toContain('external target heat');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].evidence,
  ).toContain('zero BattleMech damage');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].evidence,
  ).toContain('consume source-backed plasma ammo');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].evidence,
  ).toContain('Heat Phase pending bucket');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-target-heat'
    ].evidence,
  ).toContain('reflective or heat-dissipating armor');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'plasma-cannon-battlemech-heat-phase-pending-bucket'
    ].evidence,
  ).toContain('15-point external heat per-turn cap');
});

it('plasma cannon hits consume source-backed plasma ammunition', () => {
  const weapon = createPlasmaCannon();
  const ammoBin = createAmmoBin({
    binId: 'right-arm-plasma-bin',
    weaponType: 'CLPlasmaCannonAmmo',
    remainingRounds: 2,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 0,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
    targetStateOverride: { heat: 4 },
    targetPosition: { q: 5, r: 0 },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
    random: new SequenceRandom([6, 6, 3, 4, 2, 5]),
  });
  const consumed = result.events.find(
    (event) => event.type === GameEventType.AmmoConsumed,
  );

  expect(consumed?.payload).toMatchObject({
    unitId: 'player-1',
    binId: ammoBin.binId,
    weaponType: 'clan-plasma-cannon',
    roundsConsumed: 1,
    roundsRemaining: 1,
  });
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(1);
  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.HeatGenerated &&
        (event.payload as { unitId?: string }).unitId === 'opponent-1',
    ),
  ).toBe(false);
  expect(result.state.units['opponent-1'].pendingExternalHeat).toBe(7);
});

it('standard missile salvos use the cluster table with NARC and MRM modifiers', () => {
  const lrm = createLRM10();
  const unmarked = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4, 4),
  });
  const narced = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetNarcedBy: [GameSide.Player],
    },
  });
  const narcedThroughTargetEcm = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetNarcedBy: [GameSide.Player],
      targetEcmProtected: true,
    },
  });
  const mrm = createMRM10();
  const mrmWithPenalty = resolveSpecialProjectileHit({
    baseWeapon: mrm,
    shotWeapon: mrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(4, 5),
  });
  const lowProfileTarget = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      targetLowProfile: true,
    },
  });

  expect(unmarked).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(narced).toMatchObject({
    projectileCount: 8,
    weapon: { damage: 8 },
  });
  expect(narcedThroughTargetEcm).toMatchObject(unmarked);
  expect(mrmWithPenalty).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(lowProfileTarget).toMatchObject({
    projectileCount: 3,
    weapon: { damage: 3 },
  });
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.evidence).toContain(
    'cluster',
  );
});
