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

it('runner attack resolution passes target AMS mounts into missile interception', () => {
  const lrm = createLRM10();
  const ams = createAMS();
  const amsAmmoBin = createAmmoBin({
    binId: 'ams-bin',
    weaponType: 'ams',
    remainingRounds: 2,
  });
  const scenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetPosition: { q: 7, r: 0 },
  });
  const noAmsResult = runPhaseWithResult({
    ...scenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4]),
  });
  const withAmsScenario = buildScenario({
    attackerWeapons: [lrm],
    attackerStateOverride: { gunnery: 0 },
    targetStateOverride: {
      ammoState: { [amsAmmoBin.binId]: amsAmmoBin },
    },
    targetWeapons: [ams],
    targetPosition: { q: 7, r: 0 },
  });
  const withAmsResult = runPhaseWithResult({
    ...withAmsScenario,
    botPlayer: new ScriptedAttackAI(lrm.id),
    random: new SequenceRandom([6, 6, 3, 4, 3, 4]),
  });

  const noAmsResolved = noAmsResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const withAmsResolved = withAmsResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const amsConsumed = withAmsResult.events.find(
    (event) =>
      event.type === GameEventType.AmmoConsumed &&
      (event.payload as { unitId?: string }).unitId === 'opponent-1',
  ) as
    | (IGameEvent & {
        payload: {
          binId: string;
          roundsConsumed: number;
          roundsRemaining: number;
        };
      })
    | undefined;
  const amsInterception = withAmsResult.events.find(
    (event) => event.type === GameEventType.AMSInterception,
  ) as
    | (IGameEvent & {
        payload: {
          defenderId: string;
          attackerId: string;
          incomingWeaponId: string;
          amsWeaponId: string;
          incomingProjectiles: number;
          projectilesIntercepted: number;
          projectilesRemaining: number;
          ammoConsumed: number;
          ammoBinId?: string;
          ammoRemaining?: number;
          roll: readonly number[];
          clusterRoll: number;
          clusterModifier: number;
          modifiedClusterRoll: number;
        };
      })
    | undefined;

  expect(noAmsResolved.payload.hit).toBe(true);
  expect(withAmsResolved.payload.hit).toBe(true);
  expect(noAmsResolved.payload.projectileCount).toBe(6);
  expect(withAmsResolved.payload.projectileCount).toBe(3);
  expect(noAmsResolved.payload.projectileCount).toBeGreaterThan(
    withAmsResolved.payload.projectileCount ?? -1,
  );
  expect(withAmsResolved.payload.damage).toBeLessThan(
    noAmsResolved.payload.damage ?? 0,
  );
  expect(amsConsumed?.payload).toMatchObject({
    binId: amsAmmoBin.binId,
    roundsConsumed: 1,
    roundsRemaining: 1,
  });
  expect(amsInterception?.payload).toMatchObject({
    defenderId: 'opponent-1',
    attackerId: 'player-1',
    incomingWeaponId: lrm.id,
    amsWeaponId: ams.id,
    incomingProjectiles: 6,
    projectilesIntercepted: 3,
    projectilesRemaining: 3,
    ammoConsumed: 1,
    ammoBinId: amsAmmoBin.binId,
    ammoRemaining: 1,
    roll: [3, 4],
    clusterRoll: 7,
    clusterModifier: -4,
    modifiedClusterRoll: 3,
  });
  expect(
    withAmsResult.state.units['opponent-1'].ammoState?.[amsAmmoBin.binId]
      .remainingRounds,
  ).toBe(1);
  expect(withAmsResult.state.units['opponent-1'].weaponsFiredThisTurn).toEqual([
    ams.id,
  ]);

  const heatEvents: IGameEvent[] = [];
  runHeatPhase({
    state: withAmsResult.state,
    events: heatEvents,
    gameId: withAmsScenario.state.gameId,
    random: new SeededRandom(77),
    weaponsByUnit: withAmsScenario.weaponsByUnit,
  });
  const amsHeat = heatEvents.find(
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

  expect(amsHeat?.payload).toMatchObject({
    amount: ams.heat,
    source: 'firing',
  });
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-ammo-consumption'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-automatic-interception-assignment'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-interception-events'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
      'ams-runner-selected-defender-choice'
    ].evidence,
  ).toContain('selectedAMSWeaponIds');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'].level,
  ).toBe('integrated');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].level,
  ).toBe('out-of-scope');
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
      .level,
  ).toBe('out-of-scope');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap).toBeUndefined();
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('integrated');
  expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
    'excludes already-fired standard AMS',
  );
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'].gap,
  ).toBeUndefined();
  expect(
    SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
  ).not.toContain('automatic firing-arc assignment');
});
