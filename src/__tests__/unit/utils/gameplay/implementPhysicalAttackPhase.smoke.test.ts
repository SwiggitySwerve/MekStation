/**
 * Per-change smoke test for implement-physical-attack-phase.
 *
 * Asserts the session-level wiring of physical attacks:
 * - declarePhysicalAttack emits PhysicalAttackDeclared
 * - resolveAllPhysicalAttacks rolls + emits PhysicalAttackResolved
 * - On hit: DamageApplied + PSRTriggered (PhysicalAttackTarget)
 * - On miss (kick): PSRTriggered (kick_miss) for attacker
 * - Restriction: punching with arm that fired weapons → no
 *   PhysicalAttackDeclared (rejected with hit:false roll:0)
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md § 12
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
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPSRTriggeredPayload,
  IDamageAppliedPayload,
  MovementType,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  declareMovement,
  declarePhysicalAttack,
  DiceRoller,
  IPhysicalAttackContext,
  lockMovement,
  resolveAllPhysicalAttacks,
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
    piloting: 4,
  },
  {
    id: 'target',
    name: 'Target',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'pilot-2',
    gunnery: 4,
    piloting: 4,
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
 * Seed armor + structure so resolveDamagePipeline has values to reduce.
 * Mirrors the helper used in integrate-damage-pipeline smoke tests.
 */
function seedArmor(
  session: IGameSession,
  unitId: string,
  armor: Record<string, number>,
  structure: Record<string, number>,
): IGameSession {
  let current = session;
  const locs: Record<string, true> = {};
  for (const k of Object.keys(armor)) locs[k] = true;
  for (const k of Object.keys(structure)) locs[k] = true;
  for (const loc of Object.keys(locs)) {
    const event: IGameEvent = {
      id: `seed-${unitId}-${loc}`,
      gameId: current.id,
      sequence: current.events.length,
      timestamp: new Date().toISOString(),
      type: GameEventType.DamageApplied,
      turn: current.currentState.turn,
      phase: current.currentState.phase,
      actorId: unitId,
      payload: {
        unitId,
        location: loc,
        damage: 0,
        armorRemaining: armor[loc] ?? 0,
        structureRemaining: structure[loc] ?? 0,
        locationDestroyed: false,
      },
    };
    const newEvents = [...current.events, event];
    current = {
      ...current,
      events: newEvents,
      currentState: deriveState(current.id, newEvents),
    };
  }
  return current;
}

function setupPhysicalPhase(): IGameSession {
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
    { q: 0, r: -1 },
    { q: 0, r: -1 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'target');
  session = advancePhase(session); // weapon
  session = advancePhase(session); // physical
  return session;
}

const heavyArmor = {
  head: 9,
  center_torso: 20,
  left_torso: 15,
  right_torso: 15,
  left_arm: 10,
  right_arm: 10,
  left_leg: 12,
  right_leg: 12,
};
const heavyStructure = {
  head: 3,
  center_torso: 16,
  left_torso: 12,
  right_torso: 12,
  left_arm: 8,
  right_arm: 8,
  left_leg: 12,
  right_leg: 12,
};

describe('implement-physical-attack-phase — smoke test', () => {
  it('declarePhysicalAttack emits PhysicalAttackDeclared with attackType + TN', () => {
    let session = setupPhysicalPhase();
    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 50,
      targetTonnage: 75,
      pilotingSkill: 4,
      arm: 'right',
      hexesMoved: 0,
      weaponsFiredFromArm: [],
    };
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      ctx,
    );

    const declared = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackerId).toBe('attacker');
    expect(payload.targetId).toBe('target');
    expect(payload.attackType).toBe('punch');
    expect(payload.toHitNumber).toBe(4);
  });

  it('resolveAllPhysicalAttacks (kick hit) emits PhysicalAttackResolved + DamageApplied + target PSR', () => {
    // Use a kick: per canonical TT a kick on hit causes a target PSR
    // (punch does not — punch damage table sets `targetPSR: false`).
    // Kick damage = floor(50/5) = 10. Kick TN base = piloting - 2 = 2;
    // max-roll guarantees hit.
    let session = setupPhysicalPhase();
    session = seedArmor(session, 'target', heavyArmor, heavyStructure);

    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 50,
      targetTonnage: 75,
      pilotingSkill: 4,
      hexesMoved: 0,
      weaponsFiredFromArm: [],
    };
    session = declarePhysicalAttack(session, 'attacker', 'target', 'kick', ctx);

    const ctxMap = new Map<string, IPhysicalAttackContext>([['attacker', ctx]]);
    session = resolveAllPhysicalAttacks(
      session,
      ctxMap,
      mockDiceRoller([
        { dice: [6, 0], total: 6 }, // d6 #1 of to-hit
        { dice: [6, 0], total: 6 }, // d6 #2 of to-hit (12 total, hit)
        { dice: [1, 0], total: 1 }, // kick hit-location d6 → right_leg
      ]),
    );

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackResolved,
    );
    expect(resolved).toBeDefined();
    const resolvedPayload = resolved!.payload as IPhysicalAttackResolvedPayload;
    expect(resolvedPayload.hit).toBe(true);
    expect(resolvedPayload.attackType).toBe('kick');
    // Kick damage: floor(50/5) = 10
    expect(resolvedPayload.damage).toBe(10);

    // DamageApplied with damage > 0 (real, not seed)
    const damageEvents = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as IDamageAppliedPayload).damage > 0,
    );
    expect(damageEvents.length).toBeGreaterThan(0);

    // Target PSR queued (kicks always trigger target PSR per canonical
    // damage table in physicalAttacks/damage.ts).
    const psr = session.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource ===
          'physical_attack_target',
    );
    expect(psr).toBeDefined();
  });

  it('kick miss queues a kick_miss PSR for the attacker', () => {
    let session = setupPhysicalPhase();
    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 50,
      targetTonnage: 75,
      pilotingSkill: 4,
      hexesMoved: 0,
      weaponsFiredFromArm: [],
    };
    session = declarePhysicalAttack(session, 'attacker', 'target', 'kick', ctx);

    // Kick TN = piloting - 2 = 2. Force a miss with two d6=1 → roll 2.
    // Wait: roll 2 >= 2 = hit. To miss, the resolver evaluates result.hit
    // first. Let me check: kick base toHit = piloting - 2 = 2. Roll 2 ≥ 2,
    // so it hits. To miss, need roll < 2, which is impossible with 2d6.
    // Use a TN that makes missing achievable: piloting 12 (impossible TN).
    const ctxHardKick: IPhysicalAttackContext = {
      ...ctx,
      pilotingSkill: 12,
    };
    let session2 = setupPhysicalPhase();
    session2 = declarePhysicalAttack(
      session2,
      'attacker',
      'target',
      'kick',
      ctxHardKick,
    );

    const ctxMap = new Map<string, IPhysicalAttackContext>([
      ['attacker', ctxHardKick],
    ]);
    session2 = resolveAllPhysicalAttacks(
      session2,
      ctxMap,
      mockDiceRoller([
        { dice: [1, 0], total: 1 },
        { dice: [1, 0], total: 1 },
      ]),
    );

    const resolved = session2.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackResolved,
    );
    const resolvedPayload = resolved!.payload as IPhysicalAttackResolvedPayload;
    expect(resolvedPayload.hit).toBe(false);

    const kickMissPSR = session2.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource === 'kick_miss',
    );
    expect(kickMissPSR).toBeDefined();
  });

  it('punch restriction: arm that fired weapons cannot punch (no PhysicalAttackDeclared)', () => {
    let session = setupPhysicalPhase();
    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 50,
      targetTonnage: 75,
      pilotingSkill: 4,
      arm: 'right',
      hexesMoved: 0,
      weaponsFiredFromArm: ['ml-1'], // arm fired a weapon → can't punch
    };
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      ctx,
    );

    // Restriction emits PhysicalAttackResolved with hit:false roll:0
    // (per gameSessionPhysical.ts comment); NO PhysicalAttackDeclared.
    const declared = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toHaveLength(0);

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackResolved,
    );
    expect(resolved).toBeDefined();
    const payload = resolved!.payload as IPhysicalAttackResolvedPayload;
    expect(payload.hit).toBe(false);
    expect(payload.toHitNumber).toBe(Infinity);
  });

  it('GamePhase.PhysicalAttack is accessible and PhysicalAttack-prefixed enum values exist', () => {
    expect(GamePhase.PhysicalAttack).toBe('physical_attack');
    expect(GameEventType.PhysicalAttackDeclared).toBe(
      'physical_attack_declared',
    );
    expect(GameEventType.PhysicalAttackResolved).toBe(
      'physical_attack_resolved',
    );
  });
});
