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

it('iNARC homing pods drive source-backed missile guidance without using narcedBy', () => {
  const lrm = createLRM10();
  const inarced = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetINarcedBy: [GameSide.Player],
    },
  });
  const indirectINarced = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetINarcedBy: [GameSide.Player],
      isIndirectFire: true,
    },
  });
  const ecmProtectedINarced = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetINarcedBy: [GameSide.Player],
      targetEcmProtected: true,
    },
  });
  const mrm = createMRM10();
  const mrmWithoutGuidance = resolveSpecialProjectileHit({
    baseWeapon: mrm,
    shotWeapon: mrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
  });
  const mrmWithINarcPod = resolveSpecialProjectileHit({
    baseWeapon: mrm,
    shotWeapon: mrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(3, 4),
    clusterContext: {
      attackerTeamId: GameSide.Player,
      targetINarcedBy: [GameSide.Player],
    },
  });

  expect(inarced).toMatchObject({
    projectileCount: 8,
    weapon: { damage: 8 },
  });
  expect(indirectINarced).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(ecmProtectedINarced).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(mrmWithINarcPod).toMatchObject(mrmWithoutGuidance);
});

it('iNARC homing pods apply the source-backed missile to-hit bonus', () => {
  const lrm = createLRM10();
  const baseline = buildScenario({
    attackerWeapons: [lrm],
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [lrm],
    targetStateOverride: {
      iNarcPods: [{ teamId: GameSide.Player, podType: 'homing' }],
    },
  });

  const baselineResult = runPhaseWithResult({
    state: baseline.state,
    weaponsByUnit: baseline.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });
  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(declared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber - 1,
  );
  expect(declared.payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'iNARC Homing',
        value: -1,
        source: 'equipment',
      }),
    ]),
  );
});

it('target ECM suppresses source-backed iNARC homing to-hit guidance', () => {
  const lrm = createLRM10();
  const baseline = buildScenario({
    attackerWeapons: [lrm],
  });
  const ecmProtected = buildScenario({
    attackerWeapons: [lrm],
    targetStateOverride: {
      iNarcPods: [{ teamId: GameSide.Player, podType: 'homing' }],
    },
  });
  const targetPosition = ecmProtected.state.units['opponent-1'].position;
  const ecmProtectedState: IGameState = {
    ...ecmProtected.state,
    electronicWarfare: {
      ecmSuites: [
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'opponent-ecm-suite',
          teamId: GameSide.Opponent,
          position: targetPosition,
        },
      ],
      activeProbes: [],
    },
  };

  const baselineResult = runPhaseWithResult({
    state: baseline.state,
    weaponsByUnit: baseline.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });
  const ecmProtectedResult = runPhaseWithResult({
    state: ecmProtectedState,
    weaponsByUnit: ecmProtected.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const declared = ecmProtectedResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(declared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber,
  );
  expect(declared.payload.modifiers).not.toContainEqual(
    expect.objectContaining({ name: 'iNARC Homing' }),
  );
  expect(declared.payload.modifiers).not.toContainEqual(
    expect.objectContaining({ name: expect.stringContaining('ECM') }),
  );
});

it('iNARC homing pods do not guide non-NARC-compatible MRM launchers', () => {
  const mrm = createMRM10();
  const baseline = buildScenario({
    attackerWeapons: [mrm],
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [mrm],
    targetStateOverride: {
      iNarcPods: [{ teamId: GameSide.Player, podType: 'homing' }],
    },
  });

  const baselineResult = runPhaseWithResult({
    state: baseline.state,
    weaponsByUnit: baseline.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(mrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });
  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(mrm.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(declared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber,
  );
  expect(declared.payload.modifiers).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'iNARC Homing' })]),
  );
});
