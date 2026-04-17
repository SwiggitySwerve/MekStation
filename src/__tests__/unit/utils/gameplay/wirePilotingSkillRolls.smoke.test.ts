/**
 * Per-change smoke test for wire-piloting-skill-rolls.
 *
 * Asserts the full PSR queue → resolution → fall flow:
 * - PSRTriggered event pushes onto unit.pendingPSRs
 * - resolvePendingPSRs rolls 2d6 vs TN, emits PSRResolved
 * - Failure → UnitFell + PilotHit chain
 * - attemptStandUp: prone unit success → UnitStood; failure → still prone
 *
 * @spec openspec/changes/wire-piloting-skill-rolls/tasks.md § 11
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
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IUnitStoodPayload,
  MovementType,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  attemptStandUp,
  checkAndQueueDamagePSRs,
  createGameSession,
  declareMovement,
  DiceRoller,
  lockMovement,
  resolvePendingPSRs,
  startGame,
} from '@/utils/gameplay/gameSession';
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
    piloting: 5, // PSR base TN
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

/** Inject a synthesized DamageApplied event with N damage to set
 *  damageThisPhase via the reducer, so checkAndQueueDamagePSRs picks
 *  up the 20+ trigger. */
function seedDamageThisPhase(
  session: IGameSession,
  unitId: string,
  damage: number,
): IGameSession {
  const event: IGameEvent = {
    id: `seed-dmg-${unitId}`,
    gameId: session.id,
    sequence: session.events.length,
    timestamp: new Date().toISOString(),
    type: GameEventType.DamageApplied,
    turn: session.currentState.turn,
    phase: session.currentState.phase,
    actorId: unitId,
    payload: {
      unitId,
      location: 'center_torso',
      damage,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
    },
  };
  const newEvents = [...session.events, event];
  return {
    ...session,
    events: newEvents,
    currentState: deriveState(session.id, newEvents),
  };
}

function setupActiveSession(): IGameSession {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
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
    { q: 0, r: -3 },
    { q: 0, r: -3 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'target');
  session = advancePhase(session); // weapon
  return session;
}

describe('wire-piloting-skill-rolls — smoke test', () => {
  it('20+ phase damage queues a PSR that resolvePendingPSRs consumes', () => {
    let session = setupActiveSession();
    // Seed 20+ damage on attacker → triggers TwentyPlusPhaseDamage PSR
    session = seedDamageThisPhase(session, 'attacker', 20);
    session = checkAndQueueDamagePSRs(session);

    // After checkAndQueue, attacker should have a PSRTriggered event
    // and pendingPSRs should be non-empty.
    const triggered = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource === '20+_damage',
    );
    expect(triggered.length).toBe(1);
    expect(session.currentState.units['attacker'].pendingPSRs?.length).toBe(1);

    // Roll 9 — passes TN 5 (piloting). resolveAllPSRs internally calls
    // d6Roller twice (taking dice[0] each time), so the mock must
    // return two rolls whose dice[0] values sum to the desired total.
    // 4 + 5 = 9.
    session = resolvePendingPSRs(
      session,
      mockDiceRoller([
        { dice: [4, 0], total: 4 },
        { dice: [5, 0], total: 5 },
      ]),
    );

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PSRResolved,
    );
    expect(resolved).toBeDefined();
    const payload = resolved!.payload as IPSRResolvedPayload;
    expect(payload.passed).toBe(true);
    expect(payload.roll).toBe(9);

    const fellEvents = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.UnitFell,
    );
    expect(fellEvents).toHaveLength(0);
  });

  it('PSR failure triggers UnitFell + PilotHit chain', () => {
    let session = setupActiveSession();
    session = seedDamageThisPhase(session, 'attacker', 20);
    session = checkAndQueueDamagePSRs(session);

    // Roll 2 (snake eyes) — fails TN 5. Expect PSRResolved failure +
    // UnitFell + PilotHit. The fall direction roll uses dice[0] of the
    // next dice; we feed extra rolls to cover the fall path.
    session = resolvePendingPSRs(
      session,
      mockDiceRoller([
        { dice: [1, 1], total: 2 }, // PSR roll → fail
        { dice: [3, 0], total: 3 }, // fall direction (uses dice[0] = 3)
      ]),
    );

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PSRResolved,
    );
    const psrPayload = resolved!.payload as IPSRResolvedPayload;
    expect(psrPayload.passed).toBe(false);

    const fellEvents = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.UnitFell,
    );
    expect(fellEvents).toHaveLength(1);

    const pilotHits = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.PilotHit,
    );
    expect(pilotHits.length).toBeGreaterThan(0);

    // Reducer should have set prone=true.
    expect(session.currentState.units['attacker'].prone).toBe(true);
  });

  it('attemptStandUp succeeds → emits UnitStood and clears prone', () => {
    let session = setupActiveSession();
    // Get attacker into prone state via the failure flow above.
    session = seedDamageThisPhase(session, 'attacker', 20);
    session = checkAndQueueDamagePSRs(session);
    session = resolvePendingPSRs(
      session,
      mockDiceRoller([
        { dice: [1, 1], total: 2 },
        { dice: [3, 0], total: 3 },
      ]),
    );
    expect(session.currentState.units['attacker'].prone).toBe(true);

    // Now attempt to stand up with a passing roll (10 vs piloting TN 5).
    session = attemptStandUp(
      session,
      'attacker',
      mockDiceRoller([{ dice: [5, 5], total: 10 }]),
    );

    const stood = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.UnitStood,
    );
    expect(stood).toBeDefined();
    const payload = stood!.payload as IUnitStoodPayload;
    expect(payload.unitId).toBe('attacker');
    expect(payload.roll).toBe(10);

    expect(session.currentState.units['attacker'].prone).toBe(false);
  });

  it('attemptStandUp failure leaves the unit prone (no UnitStood)', () => {
    let session = setupActiveSession();
    session = seedDamageThisPhase(session, 'attacker', 20);
    session = checkAndQueueDamagePSRs(session);
    session = resolvePendingPSRs(
      session,
      mockDiceRoller([
        { dice: [1, 1], total: 2 },
        { dice: [3, 0], total: 3 },
      ]),
    );

    // Roll 2 — fails the stand-up TN 5. Expect PSRResolved failure but
    // NO UnitStood event, and unit remains prone.
    session = attemptStandUp(
      session,
      'attacker',
      mockDiceRoller([{ dice: [1, 1], total: 2 }]),
    );

    const stoodEvents = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.UnitStood,
    );
    expect(stoodEvents).toHaveLength(0);
    expect(session.currentState.units['attacker'].prone).toBe(true);
  });

  it('UnitStood enum value is wired (0.5.2 alignment)', () => {
    expect(GameEventType.UnitStood).toBe('unit_stood');
  });
});
