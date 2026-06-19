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

it('Sandblaster shifts designated cluster-table weapons by source-backed range bands', () => {
  const lbx = createLBX10();
  const clusterMode = lbx.firingModes?.modes.find(
    (mode) => mode.id === 'cluster',
  );
  const baseCluster = resolveSpecialProjectileHit({
    baseWeapon: lbx,
    shotWeapon: lbx,
    selectedMode: clusterMode,
    d6Roller: sequenceD6Roller(4, 4),
  });
  const sandblasterCluster = resolveSpecialProjectileHit({
    baseWeapon: lbx,
    shotWeapon: lbx,
    selectedMode: clusterMode,
    d6Roller: sequenceD6Roller(4, 4),
    clusterContext: {
      sandblasterSPA: true,
      designatedWeaponType: 'LB 10-X AC',
      attackRange: 6,
    },
  });
  const lowProfileCluster = resolveSpecialProjectileHit({
    baseWeapon: lbx,
    shotWeapon: lbx,
    selectedMode: clusterMode,
    d6Roller: sequenceD6Roller(4, 4),
    clusterContext: {
      targetLowProfile: true,
    },
  });
  const baseScenario = buildScenario({
    attackerWeapons: [lbx],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 6, r: 0 },
  });
  const sandblasterScenario = buildScenario({
    attackerWeapons: [lbx],
    attackerStateOverride: {
      abilities: ['sandblaster'],
      designatedWeaponType: 'LB 10-X AC',
      gunnery: 0,
    },
    targetPosition: { q: 6, r: 0 },
  });
  const lowProfileScenario = buildScenario({
    attackerWeapons: [lbx],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: { unitQuirks: ['low_profile'] },
    targetPosition: { q: 6, r: 0 },
  });
  const baseResult = runPhaseWithResult({
    ...baseScenario,
    botPlayer: new ScriptedAttackAI(lbx.id, 'cluster'),
    random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
  });
  const sandblasterResult = runPhaseWithResult({
    ...sandblasterScenario,
    botPlayer: new ScriptedAttackAI(lbx.id, 'cluster'),
    random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
  });
  const lowProfileResult = runPhaseWithResult({
    ...lowProfileScenario,
    botPlayer: new ScriptedAttackAI(lbx.id, 'cluster'),
    random: new SequenceRandom([6, 6, 4, 4, 1, 1]),
  });

  const baseResolved = baseResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const sandblasterResolved = sandblasterResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const lowProfileResolved = lowProfileResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(baseCluster).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(sandblasterCluster).toMatchObject({
    projectileCount: 10,
    weapon: { damage: 10 },
  });
  expect(lowProfileCluster).toMatchObject({
    projectileCount: 4,
    weapon: { damage: 4 },
  });
  expect(baseResolved.payload.projectileCount).toBe(6);
  expect(sandblasterResolved.payload.projectileCount).toBe(10);
  expect(lowProfileResolved.payload.projectileCount).toBe(4);
  expect(SPA_COMBAT_SUPPORT.sandblaster).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('official ordinary AC rapid-fire modes'),
  });
});

it('resolves designated Sandblaster autocannon shot counts with cluster-table range bands', () => {
  const uac = createUltraAC5();
  const uacDoubleMode = uac.firingModes?.modes.find(
    (mode) => mode.id === 'double',
  );
  const rac = createRotaryAC2();
  const racThreeShotMode = rac.firingModes?.modes.find(
    (mode) => mode.id === 'rof-3',
  );
  const racSingleShotMode = rac.firingModes?.modes.find(
    (mode) => mode.id === 'rof-1',
  );

  const uacShotCount = resolveSandblasterAutocannonRateOfFireShotCount({
    baseWeapon: uac,
    selectedMode: uacDoubleMode,
    d6Roller: sequenceD6Roller(3, 3),
    clusterContext: {
      sandblasterSPA: true,
      designatedWeaponType: 'Ultra AC/5',
      attackRange: 6,
    },
  });
  const racShotCount = resolveSandblasterAutocannonRateOfFireShotCount({
    baseWeapon: rac,
    selectedMode: racThreeShotMode,
    d6Roller: sequenceD6Roller(4, 4),
    clusterContext: {
      sandblasterSPA: true,
      designatedWeaponType: 'Rotary AC/2',
      attackRange: 7,
    },
  });
  const undesignated = resolveSandblasterAutocannonRateOfFireShotCount({
    baseWeapon: rac,
    selectedMode: racThreeShotMode,
    d6Roller: sequenceD6Roller(6, 6),
    clusterContext: {
      sandblasterSPA: true,
      designatedWeaponType: 'LRM 10',
      attackRange: 7,
    },
  });
  const singleShotMode = resolveSandblasterAutocannonRateOfFireShotCount({
    baseWeapon: rac,
    selectedMode: racSingleShotMode,
    d6Roller: sequenceD6Roller(6, 6),
    clusterContext: {
      sandblasterSPA: true,
      designatedWeaponType: 'Rotary AC/2',
      attackRange: 7,
    },
  });
  const ordinaryACWithRapidFireShape = createTacOpsRapidFireAC20(
    'ac-20-rapid-fire-shape-test',
  );
  const ordinaryACRapidFireMode =
    ordinaryACWithRapidFireShape.firingModes?.modes.find(
      (mode) => mode.id === 'rapid-fire',
    );
  const tacOpsRapidFireRuntime =
    resolveSandblasterAutocannonRateOfFireShotCount({
      baseWeapon: ordinaryACWithRapidFireShape,
      selectedMode: ordinaryACRapidFireMode,
      d6Roller: sequenceD6Roller(1, 1),
      clusterContext: {
        sandblasterSPA: true,
        designatedWeaponType: 'AC/20',
        attackRange: 3,
      },
    });

  expect(uacShotCount).toEqual({
    clusterRoll: 6,
    clusterModifier: 4,
    modifiedRoll: 10,
    shotCount: 2,
  });
  expect(racShotCount).toEqual({
    clusterRoll: 8,
    clusterModifier: 3,
    modifiedRoll: 11,
    shotCount: 3,
  });
  expect(undesignated).toBeUndefined();
  expect(singleShotMode).toBeUndefined();
  expect(tacOpsRapidFireRuntime).toEqual({
    clusterRoll: 2,
    clusterModifier: 4,
    modifiedRoll: 6,
    shotCount: 1,
  });
});
