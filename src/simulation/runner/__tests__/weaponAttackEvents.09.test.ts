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

it('iNARC haywire pods apply the source-backed attacker to-hit penalty', () => {
  const laser = createMediumLaser();
  const baseline = buildScenario({
    attackerWeapons: [laser],
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [laser],
    attackerStateOverride: {
      iNarcPods: [{ teamId: GameSide.Opponent, podType: 'haywire' }],
    },
  });

  const baselineResult = runPhaseWithResult({
    state: baseline.state,
    weaponsByUnit: baseline.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(laser.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });
  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(laser.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(declared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber + 1,
  );
  expect(declared.payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'iNARC Haywire',
        value: 1,
        source: 'equipment',
      }),
    ]),
  );
});

it('same-side iNARC haywire pods still penalize the attacker once attached', () => {
  const laser = createMediumLaser();
  const baseline = buildScenario({
    attackerWeapons: [laser],
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [laser],
    attackerStateOverride: {
      iNarcPods: [{ teamId: GameSide.Player, podType: 'haywire' }],
    },
  });

  const baselineResult = runPhaseWithResult({
    state: baseline.state,
    weaponsByUnit: baseline.weaponsByUnit,
    botPlayer: new ScriptedAttackAI(laser.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });
  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(laser.id),
    random: new SequenceRandom([6, 6, 1, 1]),
  });

  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const baselineDeclared = baselineResult.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };

  expect(declared.payload.toHitNumber).toBe(
    baselineDeclared.payload.toHitNumber + 1,
  );
  expect(declared.payload.modifiers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'iNARC Haywire',
        value: 1,
        source: 'equipment',
      }),
    ]),
  );
});

it('Artemis IV flags shift missile cluster results in direct and runner resolution', () => {
  const lrm = createLRM10();
  const artemisLRM: IWeapon = { ...lrm, hasArtemisIV: true };
  const unmodified = resolveSpecialProjectileHit({
    baseWeapon: lrm,
    shotWeapon: lrm,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(1, 2),
  });
  const artemisModified = resolveSpecialProjectileHit({
    baseWeapon: artemisLRM,
    shotWeapon: artemisLRM,
    selectedMode: undefined,
    d6Roller: sequenceD6Roller(1, 2),
  });
  const baseScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const artemisScenario = buildScenario({
    attackerWeapons: [artemisLRM],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const noArtemisResult = runPhaseWithResult({
    ...baseScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const artemisResult = runPhaseWithResult({
    ...artemisScenario,
    botPlayer: new ScriptedAttackAI(artemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const noArtemisResolved = noArtemisResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const artemisResolved = artemisResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(unmodified).toMatchObject({
    projectileCount: 3,
    weapon: { damage: 3 },
  });
  expect(artemisModified).toMatchObject({
    projectileCount: 6,
    weapon: { damage: 6 },
  });
  expect(noArtemisResolved.payload.projectileCount).toBe(3);
  expect(artemisResolved.payload.projectileCount).toBe(6);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].level,
  ).toBe('integrated');
});

it('destroyed Artemis FCS strips same-location guidance without suppressing other launchers', () => {
  const rightArtemisLRM: IWeapon = {
    ...createLRM10('right-lrm-10'),
    location: 'right_torso',
    hasArtemisIV: true,
  };
  const leftArtemisLRM: IWeapon = {
    ...createLRM10('left-lrm-10'),
    location: 'left_torso',
    hasArtemisIV: true,
  };
  const scenario = buildScenario({
    attackerWeapons: [rightArtemisLRM, leftArtemisLRM],
    attackerStateOverride: {
      gunnery: 0,
      destroyedArtemisFcs: [
        {
          kind: 'artemis_iv',
          location: 'right_torso',
          componentName: 'Artemis IV FCS',
        },
      ],
    },
    targetPosition: { q: 7, r: 0 },
  });

  const rightResult = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedAttackAI(rightArtemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });
  const leftResult = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedAttackAI(leftArtemisLRM.id),
    random: new SequenceRandom([6, 6, 1, 2, 1, 1]),
  });

  const rightResolved = rightResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).weaponId === rightArtemisLRM.id,
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const leftResolved = leftResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).weaponId === leftArtemisLRM.id,
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(rightResolved.payload.projectileCount).toBe(3);
  expect(leftResolved.payload.projectileCount).toBe(6);
});
