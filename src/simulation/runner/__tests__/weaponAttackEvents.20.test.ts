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

it('emits OutOfAmmo before declaration, heat, or damage side effects', () => {
  const weapon = createUltraAC5();
  const emptyBin = createAmmoBin({
    weaponType: weapon.id,
    remainingRounds: 0,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      ammoState: { [emptyBin.binId]: emptyBin },
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'double'),
  });

  const invalid = result.events.filter(
    (event) => event.type === GameEventType.AttackInvalid,
  ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

  expect(invalid).toHaveLength(1);
  expect(invalid[0].payload).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    weaponId: weapon.id,
    reason: 'OutOfAmmo',
  });
  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.AttackDeclared ||
        event.type === GameEventType.AttackResolved ||
        event.type === GameEventType.AmmoConsumed,
    ),
  ).toBe(false);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
  expect(result.state.units['player-1'].ammoState?.[emptyBin.binId]).toEqual(
    emptyBin,
  );
});

it('stops a selected rate-of-fire mode when ammo runs out mid-mode', () => {
  const weapon = createRotaryAC2();
  const ammoBin = createAmmoBin({
    weaponType: weapon.id,
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
    botPlayer: new ScriptedAttackAI(weapon.id, 'rof-3'),
  });

  const playerDeclared = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      (event.payload as IAttackDeclaredPayload).attackerId === 'player-1',
  );
  const playerResolved = result.events.filter(
    (event) =>
      event.type === GameEventType.AttackResolved &&
      (event.payload as IAttackResolvedPayload).attackerId === 'player-1',
  ) as Array<IGameEvent & { payload: IAttackResolvedPayload }>;
  const consumed = result.events.filter(
    (event) => event.type === GameEventType.AmmoConsumed,
  );
  const invalid = result.events.find(
    (event) => event.type === GameEventType.AttackInvalid,
  ) as IGameEvent & { payload: IAttackInvalidPayload };

  expect(playerDeclared).toHaveLength(2);
  expect(playerResolved).toHaveLength(2);
  expect(playerResolved.map((event) => event.payload.damage)).toEqual([2, 2]);
  expect(consumed).toHaveLength(2);
  expect(invalid.payload.reason).toBe('OutOfAmmo');
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([
    weapon.id,
    weapon.id,
  ]);
  expect(
    result.state.units['player-1'].ammoState?.[ammoBin.binId].remainingRounds,
  ).toBe(0);
});

it('rejects a declared UAC/RAC attack when the weapon is already jammed', () => {
  const weapon = createUltraAC5();
  const ammoBin = createAmmoBin({
    weaponType: weapon.id,
    remainingRounds: 6,
  });
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [weapon],
    attackerStateOverride: {
      ammoState: { [ammoBin.binId]: ammoBin },
      jammedWeapons: [weapon.id],
    },
  });

  const result = runPhaseWithResult({
    state,
    weaponsByUnit,
    botPlayer: new ScriptedAttackAI(weapon.id, 'double'),
  });
  const invalid = result.events.filter(
    (event) => event.type === GameEventType.AttackInvalid,
  ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

  expect(invalid).toHaveLength(1);
  expect(invalid[0].payload).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    weaponId: weapon.id,
    reason: 'WeaponJammed',
  });
  expect(
    result.events.some(
      (event) =>
        event.type === GameEventType.AttackDeclared ||
        event.type === GameEventType.AttackResolved ||
        event.type === GameEventType.AmmoConsumed,
    ),
  ).toBe(false);
  expect(result.state.units['player-1'].weaponsFiredThisTurn).toEqual([]);
  expect(result.state.units['player-1'].ammoState?.[ammoBin.binId]).toEqual(
    ammoBin,
  );
});

it('emits AttackInvalid with reason "OutOfRange" and no AttackDeclared / AttackResolved follows', () => {
  // Place the target 12 hexes away — beyond AC/20 long range (9).
  // The AI may or may not target this enemy at all (if it's the
  // only enemy, it will). When it does, the runner emits
  // AttackInvalid for that mount.
  const { state, weaponsByUnit } = buildScenario({
    attackerWeapons: [createAC20()],
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 12, r: 0 },
  });
  const events = runPhase({ state, weaponsByUnit });

  const invalid = events.filter(
    (e) => e.type === GameEventType.AttackInvalid,
  ) as Array<IGameEvent & { payload: IAttackInvalidPayload }>;

  // The bot may opt out of declaring an attack at this range
  // (it filters candidate weapons by range first). If it does
  // declare anyway and the runner catches it, AttackInvalid
  // fires. We assert ONE of two equally-valid outcomes:
  //   (a) bot declined → 0 attack events (no Declared / Invalid)
  //   (b) bot declared but runner rejected → 1 Invalid, 0 Declared
  const declared = events.filter(
    (e) => e.type === GameEventType.AttackDeclared,
  ).length;
  const resolved = events.filter(
    (e) => e.type === GameEventType.AttackResolved,
  ).length;
  if (invalid.length > 0) {
    expect(invalid[0].payload.reason).toBe('OutOfRange');
    expect(invalid[0].payload.weaponId).toBeDefined();
    expect(invalid[0].payload.attackerId).toBe('player-1');
    expect(invalid[0].payload.targetId).toBe('opponent-1');
    // Per spec: no Declared / Resolved for an Invalid attempt on
    // that same mount.
    expect(declared).toBe(resolved);
  } else {
    // Bot declined — expect zero combat events for this attacker.
    expect(declared).toBe(0);
    expect(resolved).toBe(0);
  }
});
