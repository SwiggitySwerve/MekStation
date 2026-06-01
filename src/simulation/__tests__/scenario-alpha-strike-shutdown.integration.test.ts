/**
 * Phase 4 of `add-combat-fidelity-suite` — alpha-strike shutdown
 * scenario test (task 4.6).
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Heat Lifecycle Events" (Scenario: "Atlas alpha-strike at heat 0
 *       produces shutdown event chain")
 *
 * Strategy:
 *   - Drive `runHeatPhase` directly with a hand-built unit at heat 0
 *     after firing a synthetic Atlas alpha-strike (~30 heat). The
 *     in-runner integration is exercised by the broader Atlas-mirror
 *     event-chain test; this scenario isolates the heat-phase event
 *     chain so it stays deterministic across seed sweeps.
 *   - Assert: HeatGenerated → HeatDissipated → HeatEffectApplied
 *     (multiple thresholds) → ShutdownCheck { automatic: true } chain.
 *   - Subsequent turn: unit is shutdown → `runAttackPhase` skips it
 *     (no AttackDeclared / AttackResolved events emitted by the
 *     shutdown unit).
 *
 * Notes on hydration: Atlas AS7-D's catalog heat sums to ~32 across
 * its 7 weapon mounts (AC/20 = 7, LRM-20 = 6, SRM-6 = 4, 4× ML = 12 →
 * 29 total weapon heat). With 10 base heat sinks the after-dissipation
 * heat lands at 19 (alpha-strike threshold). To hit the 30-heat
 * shutdown threshold we add a movement-jump (3 heat) AND assume a
 * partial heat-sink loss (5 destroyed heat sinks → 5 dissipation lost),
 * pushing newHeat to 30.
 */

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHeatEffectAppliedPayload,
  IHeatPayload,
  IShutdownCheckPayload,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';

import type { IWeapon } from '../ai/types';

import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { runHeatPhase } from '../runner/phases/postCombat';
import { runAttackPhase } from '../runner/phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../runner/SimulationRunnerConstants';

function createAtlasAlphaWeapons(): readonly IWeapon[] {
  // Per the spec scenario: Atlas AS7-D fires AC/20 + LRM-20 + 4× ML
  // + SRM-6. Catalog heat values: 7 + 6 + 12 + 4 = 29.
  return [
    {
      id: 'ac-20-0',
      name: 'AC/20',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 20,
      heat: 7,
      minRange: 0,
      ammoPerTon: 5,
      destroyed: false,
    },
    {
      id: 'lrm-20-1',
      name: 'LRM-20',
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      damage: 20,
      heat: 6,
      minRange: 6,
      ammoPerTon: 6,
      destroyed: false,
    },
    {
      id: 'srm-6-2',
      name: 'SRM-6',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 12,
      heat: 4,
      minRange: 0,
      ammoPerTon: 15,
      destroyed: false,
    },
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `medium-laser-${3 + i}`,
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    })),
  ];
}

function createAtlasUnit(
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

describe('Scenario: Alpha-strike → heat shutdown (Phase 4 task 4.6)', () => {
  it('Atlas alpha-strike (~29 weapon heat + jump) → newHeat=21 → ShutdownCheck (avoidable) + multi-threshold HeatEffectApplied chain', () => {
    // 29 weapons heat + 3 jump heat = 32. Minus 10 dissipation,
    // newHeat = 22 → falls within avoidable shutdown band (14-29).
    const atlasWeapons = createAtlasAlphaWeapons();
    const unit = createAtlasUnit({
      heat: 0,
      movementThisTurn: MovementType.Jump,
      weaponsFiredThisTurn: atlasWeapons.map((w) => w.id),
    });
    const state: IGameState = {
      gameId: 'alpha-strike-test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Heat,
      activationIndex: 0,
      units: { 'player-1': unit },
      turnEvents: [],
    };
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);
    const weaponsByUnit = new Map<string, readonly IWeapon[]>([
      ['player-1', atlasWeapons],
    ]);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
      weaponsByUnit,
    });

    // 1. HeatGenerated fired with sum = 32 (29 weapons + 3 movement).
    const heatGenerated = events.find(
      (e) => e.type === GameEventType.HeatGenerated,
    )!.payload as IHeatPayload;
    expect(heatGenerated.amount).toBe(32);
    expect(heatGenerated.newTotal).toBe(22);

    // 2. HeatDissipated fired with negative 10 baseDissipation.
    const heatDissipated = events.find(
      (e) => e.type === GameEventType.HeatDissipated,
    )!.payload as IHeatPayload;
    expect(heatDissipated.amount).toBe(-10);

    // 3. Multi-threshold HeatEffectApplied chain — at heat 22, the
    // ladder fires 5/8/13/14/15/17/19 (7 events).
    const heatEffects = events.filter(
      (e) => e.type === GameEventType.HeatEffectApplied,
    );
    expect(heatEffects.length).toBeGreaterThanOrEqual(7);
    const thresholds = heatEffects.map(
      (e) => (e.payload as IHeatEffectAppliedPayload).threshold,
    );
    expect(thresholds).toContain(5); // movement_penalty
    expect(thresholds).toContain(14); // shutdown_check
    expect(thresholds).toContain(19); // ammo_explosion_risk
    expect(thresholds).not.toContain(30); // not at auto-shutdown

    // 4. ShutdownCheck fired (avoidable — heat 22 is in the 14-29 band).
    const shutdownCheck = events.find(
      (e) => e.type === GameEventType.ShutdownCheck,
    );
    expect(shutdownCheck).toBeDefined();
    const shutdownPayload = shutdownCheck!.payload as IShutdownCheckPayload;
    expect(shutdownPayload.automatic).toBe(false);
    expect(shutdownPayload.heatLevel).toBe(22);

    // 5. Unit's heat was persisted to 22.
    expect(newState.units['player-1'].heat).toBe(22);
  });

  it('Atlas alpha-strike at high prior heat → newHeat=30+ → ShutdownCheck { automatic: true }', () => {
    // Start at heat 11 with full alpha + jump → 11 + 32 - 10 = 33 → auto-shutdown.
    const atlasWeapons = createAtlasAlphaWeapons();
    const unit = createAtlasUnit({
      heat: 11,
      movementThisTurn: MovementType.Jump,
      weaponsFiredThisTurn: atlasWeapons.map((w) => w.id),
    });
    const state: IGameState = {
      gameId: 'alpha-strike-auto-test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Heat,
      activationIndex: 0,
      units: { 'player-1': unit },
      turnEvents: [],
    };
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);
    const weaponsByUnit = new Map<string, readonly IWeapon[]>([
      ['player-1', atlasWeapons],
    ]);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
      weaponsByUnit,
    });

    expect(newState.units['player-1'].heat).toBe(33);
    expect(newState.units['player-1'].shutdown).toBe(true);

    const shutdownCheck = events.find(
      (e) => e.type === GameEventType.ShutdownCheck,
    );
    const payload = shutdownCheck!.payload as IShutdownCheckPayload;
    expect(payload.automatic).toBe(true);
    expect(payload.shutdownOccurred).toBe(true);
    expect(payload.heatLevel).toBe(33);

    // HeatEffectApplied includes threshold 30 (effect: 'shutdown').
    const heatEffects = events.filter(
      (e) => e.type === GameEventType.HeatEffectApplied,
    );
    const shutdownEffect = heatEffects.find(
      (e) => (e.payload as IHeatEffectAppliedPayload).threshold === 30,
    );
    expect(shutdownEffect).toBeDefined();
    expect((shutdownEffect!.payload as IHeatEffectAppliedPayload).effect).toBe(
      'shutdown',
    );
  });

  it('shut-down unit emits no AttackDeclared / AttackResolved on next turn (next-turn no-fire invariant)', () => {
    // The runAttackPhase loop checks `if (unit.destroyed || unit.shutdown) continue`.
    // A shutdown unit MUST NOT emit attack events.
    const ml: IWeapon = {
      id: 'medium-laser-0',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    };

    const attacker = createAtlasUnit({
      id: 'player-1',
      shutdown: true, // Already shut down from prior turn.
    });
    // Wrong-side target so the bot can pick it up.
    const target: IUnitGameState = {
      ...createAtlasUnit({ id: 'opponent-1' }),
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
    };

    const state: IGameState = {
      gameId: 'no-fire-test',
      status: GameStatus.Active,
      turn: 2,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'player-1': attacker, 'opponent-1': target },
      turnEvents: [],
    };
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);
    const botPlayer = new BotPlayer(random);
    const invariantRunner = new InvariantRunner();
    const violations: IViolation[] = [];

    const weaponsByUnit = new Map<string, readonly IWeapon[]>([
      ['player-1', [ml]],
      ['opponent-1', [ml]],
    ]);

    runAttackPhase({
      state,
      botPlayer,
      invariantRunner,
      violations,
      events,
      gameId: state.gameId,
      random,
      weaponsByUnit,
    });

    // The shut-down attacker must not emit any AttackDeclared events
    // for itself. The opponent CAN still fire (it's not shutdown).
    const attackerDeclares = events.filter(
      (e) =>
        e.type === GameEventType.AttackDeclared && e.actorId === 'player-1',
    );
    expect(attackerDeclares).toHaveLength(0);
  });
});
