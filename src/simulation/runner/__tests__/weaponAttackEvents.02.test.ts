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

it('runner ammo consumption matches catalog mount ids to display-style ammo bins', () => {
  const weapon = createAC20('ac-20-0');
  const ammoBin = createAmmoBin({
    weaponType: 'AC/20',
    remainingRounds: 5,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 13,
      ammoState: { [ammoBin.binId]: ammoBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id),
  });

  expect(
    result.events.some((event) => event.type === GameEventType.AttackInvalid),
  ).toBe(false);
  expect(
    result.events.some((event) => event.type === GameEventType.AmmoConsumed),
  ).toBe(true);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(4);
});

it('LB-X slug mode resolves as a single projectile hit', () => {
  const weapon = createLBX10();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 2 },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'slug'),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(resolved.payload.hit).toBe(true);
  expect(resolved.payload.projectileCount).toBeUndefined();
  expect(resolved.payload.damage).toBeGreaterThan(0);
  expect(resolved.payload.damage).toBeLessThanOrEqual(10);
});

it('LB-X cluster mode rolls cluster hits and exposes projectile count', () => {
  const weapon = createLBX10();
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: { gunnery: 2 },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'cluster'),
  });

  const resolved = result.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(resolved.payload.hit).toBe(true);
  expect(resolved.payload.projectileCount).toBeGreaterThan(0);
  expect(resolved.payload.projectileCount).toBeLessThanOrEqual(10);
  expect(resolved.payload.damage).toBeGreaterThan(0);
  expect(resolved.payload.damage).toBeLessThanOrEqual(
    resolved.payload.projectileCount ?? 0,
  );
});

it('MML selected ammo modes drive runner damage without collapsing variable catalog damage', () => {
  const weapon = createMML3();
  const srmAmmoBin = createAmmoBin({
    binId: 'srm-3-bin',
    weaponType: 'srm-3',
    remainingRounds: 4,
  });
  const lrmAmmoBin = createAmmoBin({
    binId: 'lrm-3-bin',
    weaponType: 'lrm-3',
    remainingRounds: 4,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      gunnery: 2,
      ammoState: {
        [srmAmmoBin.binId]: srmAmmoBin,
        [lrmAmmoBin.binId]: lrmAmmoBin,
      },
    },
  });

  const srmResult = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'srm'),
  });
  const lrmResult = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'lrm'),
  });
  const srmResolved = srmResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };
  const lrmResolved = lrmResult.events.find(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as IGameEvent & { payload: IAttackResolvedPayload };

  expect(srmResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 2,
    damage: 4,
  });
  expect(lrmResolved.payload).toMatchObject({
    hit: true,
    projectileCount: 2,
    damage: 2,
  });
  expect(srmResolved.payload.damage).toBeGreaterThan(
    lrmResolved.payload.damage ?? 0,
  );
});
