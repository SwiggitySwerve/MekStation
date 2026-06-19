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

it('runner attack resolution honors replayable defender-selected AMS ids', () => {
  const lrm = createLRM10();
  const automaticAms = createAMS('ams-0');
  const selectedAms = createAMS('ams-1');
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const scenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: {
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [automaticAms, selectedAms],
    targetPosition: { q: 7, r: 0 },
  });

  const result = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedSelectedAMSAttackAI(lrm.id, selectedAms.id),
    random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
  });
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const amsInterception = result.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  );

  expect(declared.payload.selectedAMSWeaponIds).toEqual({
    [lrm.id]: selectedAms.id,
  });
  expect(amsInterception?.payload).toMatchObject({
    incomingWeaponId: lrm.id,
    amsWeaponId: selectedAms.id,
    ammoRemaining: 1,
  });
  expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
    selectedAms.id,
  ]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].evidence,
  ).toContain('AttackDeclared.selectedAMSWeaponIds');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .evidence,
  ).toContain('PLAYTEST_3');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .gap,
  ).toContain('outside the current BattleMech blocker matrix');
});

it('runner attack resolution rejects invalid defender-selected AMS ids without automatic fallback or side effects', () => {
  const lrm = createLRM10();
  const automaticAms = createAMS('ams-0');
  const selectedOutOfArcAms = {
    ...createAMS('ams-1'),
    mountingArc: FiringArc.Rear,
  };
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const scenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: {
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [automaticAms, selectedOutOfArcAms],
    targetPosition: { q: 7, r: 0 },
  });

  const result = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedSelectedAMSAttackAI(lrm.id, selectedOutOfArcAms.id),
    random: new SequenceRandom([6, 6, 3, 4, 1, 1]),
  });
  const declared = result.events.find(
    (event) => event.type === GameEventType.AttackDeclared,
  ) as IGameEvent & { payload: IAttackDeclaredPayload };
  const resolved = result.events.find(
    (event) => event.type === GameEventType.AttackResolved,
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const defenderAmmoConsumed = result.events.find(
    (event) =>
      event.type === GameEventType.AmmoConsumed &&
      (event.payload as { unitId?: string }).unitId === 'opponent-1',
  );
  const amsInterception = result.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  );

  expect(declared.payload.selectedAMSWeaponIds).toEqual({
    [lrm.id]: selectedOutOfArcAms.id,
  });
  expect(amsInterception).toBeUndefined();
  expect(defenderAmmoConsumed).toBeUndefined();
  expect(resolved.payload.projectileCount).toBe(6);
  expect(
    result.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(2);
  expect(result.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([]);
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].evidence,
  ).toContain('rejects ineligible explicit selections');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].gap,
  ).toBeUndefined();
});

it('runner attack resolution does not reuse the same standard AMS after it fired this phase', () => {
  const firstLrm = createLRM10('lrm-10-first');
  const secondLrm = createLRM10('lrm-10-second');
  const ams = createAMS();
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const scenario = buildScenario({
    attackerWeapons: [firstLrm, secondLrm],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: {
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [ams],
    targetPosition: { q: 7, r: 0 },
  });

  const result = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedMultiWeaponAttackAI([firstLrm.id, secondLrm.id]),
    random: new SequenceRandom([6, 6, 3, 4, 1, 1, 6, 6, 3, 4, 1, 1]),
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
});
