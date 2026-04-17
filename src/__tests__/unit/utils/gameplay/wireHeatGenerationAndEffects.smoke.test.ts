/**
 * Per-change smoke test for wire-heat-generation-and-effects.
 *
 * Asserts that the heat phase now emits per-source HeatGenerated events
 * (movement / firing / engine_hit) and that shut-down units attempt a
 * startup roll after dissipation brings heat below the auto-shutdown
 * threshold.
 *
 * @spec openspec/changes/wire-heat-generation-and-effects/tasks.md § 14
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameUnit,
  IHeatPayload,
  IStartupAttemptPayload,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  declareMovement,
  DiceRoller,
  lockMovement,
  resolveAllAttacks,
  startGame,
} from '@/utils/gameplay/gameSession';
import { resolveHeatPhase } from '@/utils/gameplay/gameSessionHeat';
import { deriveState } from '@/utils/gameplay/gameState';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

const units: IGameUnit[] = [
  {
    id: 'attacker',
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
  },
  {
    id: 'target',
    name: 'Target',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'pilot-2',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
  },
];

const ppc = [
  {
    weaponId: 'ppc-1',
    weaponName: 'PPC',
    damage: 10,
    heat: 10,
    category: WeaponCategory.ENERGY,
    minRange: 3,
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    isCluster: false,
  },
];

function mockDiceRoller(
  rolls: Array<{ dice: [number, number]; total: number }>,
): DiceRoller {
  let i = 0;
  return () => {
    const r = rolls[i] ?? rolls[rolls.length - 1];
    i++;
    return {
      dice: r.dice,
      total: r.total,
      isSnakeEyes: r.total === 2,
      isBoxcars: r.total === 12,
    };
  };
}

/**
 * Run the full turn sequence to weapon phase: create → start → movement
 * (both units, with attacker running to generate +2 movement heat) →
 * weapon attack phase advance.
 */
function setupToWeaponPhase(opts: { running?: boolean } = {}) {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = advancePhase(session); // movement

  const movementType = opts.running
    ? MovementType.Run
    : MovementType.Stationary;
  const heatGenerated = opts.running ? 2 : 0;
  session = declareMovement(
    session,
    'attacker',
    { q: 0, r: 0 },
    { q: 0, r: 0 },
    Facing.North,
    movementType,
    0,
    heatGenerated,
  );
  session = lockMovement(session, 'attacker');
  session = declareMovement(
    session,
    'target',
    { q: 0, r: -6 },
    { q: 0, r: -6 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'target');

  session = advancePhase(session); // weapon attack
  return session;
}

function heatGenEvents(session: IGameSession, unitId: string): IGameEvent[] {
  return session.events.filter(
    (e) =>
      e.type === GameEventType.HeatGenerated &&
      (e.payload as IHeatPayload).unitId === unitId,
  );
}

describe('wire-heat-generation-and-effects — smoke test', () => {
  it('emits per-source HeatGenerated events (movement + firing) for a running + firing attacker', () => {
    // Attacker runs (+2 heat) and fires 1 PPC (+10 heat). Expect two
    // HeatGenerated events (source=movement, source=firing) plus a
    // HeatDissipated covering the 10 HS budget. Final heat = 0+2+10-10=2.
    let session = setupToWeaponPhase({ running: true });
    session = declareAttack(
      session,
      'attacker',
      'target',
      ppc,
      4,
      RangeBracket.Medium,
    );
    // Guarantee a hit so firing heat still accrues (heat accrues on
    // fire regardless of hit, but declareAttack's weaponAttacks carries
    // the heat so resolution does not change the heat path).
    session = resolveAllAttacks(
      session,
      mockDiceRoller([
        { dice: [5, 5], total: 10 },
        { dice: [4, 3], total: 7 },
      ]),
    );

    // Advance: physical → heat
    session = advancePhase(session); // physical
    session = advancePhase(session); // heat
    session = resolveHeatPhase(
      session,
      mockDiceRoller([{ dice: [4, 4], total: 8 }]),
    );

    const attackerHeatEvents = heatGenEvents(session, 'attacker');
    const sources = attackerHeatEvents.map(
      (e) => (e.payload as IHeatPayload).source,
    );
    expect(sources).toContain('movement');
    expect(sources).toContain('firing');

    const moveEvent = attackerHeatEvents.find(
      (e) => (e.payload as IHeatPayload).source === 'movement',
    );
    expect((moveEvent!.payload as IHeatPayload).amount).toBe(2);
    const firingEvent = attackerHeatEvents.find(
      (e) => (e.payload as IHeatPayload).source === 'firing',
    );
    expect((firingEvent!.payload as IHeatPayload).amount).toBe(10);

    // Final heat for attacker after dissipation: 0 + 2 + 10 - 10 = 2
    expect(session.currentState.units['attacker'].heat).toBe(2);
  });

  it('does NOT emit a movement HeatGenerated when unit stood still', () => {
    let session = setupToWeaponPhase({ running: false });
    session = declareAttack(
      session,
      'attacker',
      'target',
      ppc,
      4,
      RangeBracket.Medium,
    );
    session = resolveAllAttacks(
      session,
      mockDiceRoller([
        { dice: [5, 5], total: 10 },
        { dice: [4, 3], total: 7 },
      ]),
    );

    session = advancePhase(session);
    session = advancePhase(session);
    session = resolveHeatPhase(
      session,
      mockDiceRoller([{ dice: [4, 4], total: 8 }]),
    );

    const attackerHeatEvents = heatGenEvents(session, 'attacker');
    const sources = attackerHeatEvents.map(
      (e) => (e.payload as IHeatPayload).source,
    );
    expect(sources).not.toContain('movement');
    expect(sources).toContain('firing');
  });

  it('shutdown unit attempts a startup roll after dissipation brings heat ≤ 29', () => {
    // Put the attacker into the shutdown state by synthesizing a
    // ShutdownCheck event with shutdownOccurred=true (persists via
    // the reducer). Also inject a HeatGenerated event to set heat to
    // 20 so post-dissipation (20 - 10 heat sinks = 10) the startup
    // branch fires (10 ≤ 29).
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);

    // Advance to Heat phase via phase events.
    session = advancePhase(session); // movement
    session = declareMovement(
      session,
      'attacker',
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      Facing.North,
      MovementType.Stationary,
      0,
      0,
    );
    session = lockMovement(session, 'attacker');
    session = declareMovement(
      session,
      'target',
      { q: 0, r: -6 },
      { q: 0, r: -6 },
      Facing.South,
      MovementType.Stationary,
      0,
      0,
    );
    session = lockMovement(session, 'target');
    session = advancePhase(session); // weapon
    session = advancePhase(session); // physical
    session = advancePhase(session); // heat

    // Inject a HeatGenerated event to seed attacker heat = 20.
    const heatEvent: IGameEvent = {
      id: 'seed-heat',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.HeatGenerated,
      turn: session.currentState.turn,
      phase: GamePhase.Heat,
      actorId: 'attacker',
      payload: {
        unitId: 'attacker',
        amount: 20,
        source: 'external',
        newTotal: 20,
      } as IHeatPayload,
    };
    session = {
      ...session,
      events: [...session.events, heatEvent],
    };

    // Inject a ShutdownCheck event to flag attacker as shut down.
    const shutdownEvent: IGameEvent = {
      id: 'seed-shutdown',
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.ShutdownCheck,
      turn: session.currentState.turn,
      phase: GamePhase.Heat,
      actorId: 'attacker',
      payload: {
        unitId: 'attacker',
        heatLevel: 20,
        targetNumber: 999, // sentinel; actual TN irrelevant for the reducer
        roll: 0,
        shutdownOccurred: true,
      },
    };
    session = {
      ...session,
      events: [...session.events, shutdownEvent],
    };

    // Manually re-derive so currentState reflects our injected events.
    session = {
      ...session,
      currentState: deriveState(session.id, session.events),
    };

    // Now the attacker is shutdown=true with heat=20 in currentState.
    // Heat phase: no generation, dissipate 10 → heat 10. Startup TN at
    // heat 10 is 0 (auto restart). Startup event should fire.
    const startup = resolveHeatPhase(
      session,
      mockDiceRoller([{ dice: [4, 4], total: 8 }]),
    );

    const startupEvents = startup.events.filter(
      (e: IGameEvent) => e.type === GameEventType.StartupAttempt,
    );
    expect(startupEvents.length).toBeGreaterThan(0);
    const payload = startupEvents[0].payload as IStartupAttemptPayload;
    expect(payload.success).toBe(true);
    expect(payload.targetNumber).toBeGreaterThanOrEqual(0);
  });

  it('source enum accepts movement / firing / engine_hit (0.5.4 alignment)', () => {
    // Compile-time regression guard: the heat-payload source union
    // covers the per-change-spec sources. If a future refactor removes
    // these, this test's imports would still compile but the literal
    // assertions below would be blocked by the union type.
    const movementSource: IHeatPayload['source'] = 'movement';
    const firingSource: IHeatPayload['source'] = 'firing';
    const engineHitSource: IHeatPayload['source'] = 'engine_hit';
    expect(movementSource).toBe('movement');
    expect(firingSource).toBe('firing');
    expect(engineHitSource).toBe('engine_hit');
  });
});
