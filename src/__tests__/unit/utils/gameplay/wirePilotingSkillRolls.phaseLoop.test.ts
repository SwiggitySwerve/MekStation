/**
 * Phase-loop + replay test for wire-piloting-skill-rolls.
 *
 * Complements the smoke test by exercising the *engine path* — not just
 * the helpers in isolation. Asserts:
 *
 * - `runInteractivePhaseAdvance` queues damage PSRs when the weapon
 *   phase closes and resolves them when the End phase runs.
 * - Replay determinism (task 10.2 / 11.6): reprocessing the event log
 *   through `deriveState` yields a state equivalent (pendingPSRs,
 *   prone flag, pilot wounds) to the live session.
 *
 * @spec openspec/changes/wire-piloting-skill-rolls/tasks.md § 10.2, 11.6
 */

import { describe, it, expect } from '@jest/globals';

import { runInteractivePhaseAdvance } from '@/engine/GameEngine.phases';
import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameUnit,
  MovementType,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  declareMovement,
  lockMovement,
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

/**
 * Advance the session up to the WeaponAttack phase with each unit in a
 * Stationary lock. Mirrors the smoke-test setup so the engine path can
 * be walked from weapon → heat → end deterministically.
 */
function setupAtWeaponPhase(): IGameSession {
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

/** Seed 20 damage on a unit so `checkPhaseDamagePSR` fires. */
function seedDamage(
  session: IGameSession,
  unitId: string,
  damage: number,
): IGameSession {
  const event: IGameEvent = {
    id: `seed-${unitId}-${session.events.length}`,
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

describe('wire-piloting-skill-rolls — engine phase loop', () => {
  it('engine advance from WeaponAttack queues the PSR', () => {
    let session = setupAtWeaponPhase();
    session = seedDamage(session, 'attacker', 20);

    // runInteractivePhaseAdvance on WeaponAttack should lock + resolve
    // attacks, then call `checkAndQueueDamagePSRs`, then advance to
    // PhysicalAttack. Attacker should have a pendingPSR at that point.
    session = runInteractivePhaseAdvance(session);

    expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);
    const triggered = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.PSRTriggered,
    );
    expect(triggered.length).toBe(1);
    expect(session.currentState.units['attacker'].pendingPSRs?.length).toBe(1);
  });

  it('engine advance through End phase resolves the queued PSR', () => {
    let session = setupAtWeaponPhase();
    session = seedDamage(session, 'attacker', 20);

    // WeaponAttack → PhysicalAttack → Heat → End, resolve at End.
    session = runInteractivePhaseAdvance(session); // → PhysicalAttack
    session = runInteractivePhaseAdvance(session); // → Heat
    session = runInteractivePhaseAdvance(session); // → End
    session = runInteractivePhaseAdvance(session); // resolves + advances past End

    const resolved = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.PSRResolved,
    );
    expect(resolved.length).toBeGreaterThanOrEqual(1);
  });

  it('replay determinism: deriveState from events reproduces live state', () => {
    let session = setupAtWeaponPhase();
    session = seedDamage(session, 'attacker', 20);
    session = runInteractivePhaseAdvance(session); // queues PSR
    session = runInteractivePhaseAdvance(session); // physical → heat
    session = runInteractivePhaseAdvance(session); // heat → end
    session = runInteractivePhaseAdvance(session); // end → resolves PSR

    // Reprocessing the event log produces an identical snapshot for
    // every field `applyPSRTriggered` / `applyPSRResolved` / `applyUnitFell`
    // writes. We don't compare the whole `IGameState` (timestamps /
    // sequence ids drift) — just the PSR-touched fields.
    const replayed = deriveState(session.id, session.events);

    const liveAttacker = session.currentState.units['attacker'];
    const replayedAttacker = replayed.units['attacker'];

    expect(replayedAttacker.pendingPSRs).toEqual(liveAttacker.pendingPSRs);
    expect(replayedAttacker.prone).toBe(liveAttacker.prone);
    expect(replayedAttacker.pilotWounds).toBe(liveAttacker.pilotWounds);
    expect(replayedAttacker.pilotConscious).toBe(liveAttacker.pilotConscious);
    expect(replayedAttacker.destroyed).toBe(liveAttacker.destroyed);
  });

  it('task 1.3: pendingPSRs are cleared at turn start', () => {
    // This is a reducer-level check: a fresh turn starts with an empty
    // PSR queue on every unit, even if the prior turn's End phase was
    // skipped for any reason.
    let session = setupAtWeaponPhase();
    session = seedDamage(session, 'attacker', 20);
    session = runInteractivePhaseAdvance(session); // queues PSR

    expect(
      session.currentState.units['attacker'].pendingPSRs?.length,
    ).toBeGreaterThan(0);

    // Jump past End without resolving by synthesising a TurnStarted event.
    const turnStarted: IGameEvent = {
      id: `ts-${session.events.length}`,
      gameId: session.id,
      sequence: session.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.TurnStarted,
      turn: session.currentState.turn + 1,
      phase: GamePhase.Initiative,
      payload: { _type: 'turn_started' as const },
    };
    const nextEvents = [...session.events, turnStarted];
    const nextState = deriveState(session.id, nextEvents);
    expect(nextState.units['attacker'].pendingPSRs).toEqual([]);
  });
});
