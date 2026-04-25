/**
 * Per `implement-physical-attack-phase` tasks 13.4 + 6.6 / 7.5:
 * cluster fan-out + dual PSR queueing for charge + DFA.
 *
 * Asserts:
 * - DFA hit emits target damage × 3 (clustered) + attacker leg damage
 *   (clustered), both attacker + target queue PSRs.
 * - Charge hit emits target damage clustered + attacker damage clustered
 *   + dual PSRs.
 *
 * @spec openspec/changes/implement-physical-attack-phase/specs/physical-attack-system/spec.md
 *  - Requirement "Charge Resolution"
 *  - Requirement "Death From Above (DFA) Resolution"
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
  IDamageAppliedPayload,
  IPSRTriggeredPayload,
  IPhysicalAttackResolvedPayload,
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
  center_torso: 30,
  left_torso: 25,
  right_torso: 25,
  left_arm: 18,
  right_arm: 18,
  left_leg: 24,
  right_leg: 24,
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

describe('physical-attack — charge + DFA cluster fan-out (tasks 6.4-6.6, 7.4-7.5, 13.4)', () => {
  it('DFA hit: target takes ×3 damage clustered, attacker takes leg damage, BOTH PSRs queued', () => {
    let session = setupPhysicalPhase();
    session = seedArmor(session, 'target', heavyArmor, heavyStructure);
    session = seedArmor(session, 'attacker', heavyArmor, heavyStructure);

    // 60-ton attacker performing DFA: target damage = ceil(60/10)*3 = 18,
    // attacker leg damage per-leg = ceil(60/5)/2 = ceil(12/2) = 6.
    // DFA TN base = piloting (4); two d6=6 → roll 12 hits.
    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 60,
      targetTonnage: 75,
      pilotingSkill: 4,
      hexesMoved: 0,
      attackerJumpedThisTurn: true, // DFA requires jump
      weaponsFiredFromArm: [],
    };
    session = declarePhysicalAttack(session, 'attacker', 'target', 'dfa', ctx);

    const ctxMap = new Map<string, IPhysicalAttackContext>([['attacker', ctx]]);
    session = resolveAllPhysicalAttacks(
      session,
      ctxMap,
      // Plenty of d6=6 rolls (each `roll.dice[0]` is the d6 the resolver
      // wraps). Need: 2 for to-hit, 1 for first hit-location, plus
      // additional rolls for cluster hit-locations.
      mockDiceRoller([
        { dice: [6, 0], total: 6 }, // to-hit d6 #1
        { dice: [6, 0], total: 6 }, // to-hit d6 #2 (12 total → hit)
        { dice: [3, 0], total: 3 }, // first cluster hit-location → CT
        { dice: [3, 0], total: 3 }, // cluster #2 → CT
        { dice: [3, 0], total: 3 }, // cluster #3 → CT
        { dice: [3, 0], total: 3 }, // cluster #4 → CT
        { dice: [3, 0], total: 3 }, // safety
        { dice: [3, 0], total: 3 }, // safety
      ]),
    );

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackResolved,
    );
    expect(resolved).toBeDefined();
    const resolvedPayload = resolved!.payload as IPhysicalAttackResolvedPayload;
    expect(resolvedPayload.hit).toBe(true);
    expect(resolvedPayload.damage).toBe(18);

    // Damage events split into clusters: target gets 18 damage as
    // 5+5+5+3 = 4 clusters minimum. Plus attacker leg damage (12 total
    // = ceil(60/5), split per-leg 6 each → per resolver clusters).
    const targetDamageEvents = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as IDamageAppliedPayload).unitId === 'target' &&
        (e.payload as IDamageAppliedPayload).damage > 0,
    );
    // Sum target damage across DamageApplied events (some may be split
    // by location if armor depletes). At minimum it should equal 18.
    const totalTargetDamage = targetDamageEvents.reduce(
      (sum, e) => sum + (e.payload as IDamageAppliedPayload).damage,
      0,
    );
    expect(totalTargetDamage).toBe(18);

    // Attacker leg damage: per resolver, clusters total
    // attackerLegDamagePerLeg * 2 = 6 * 2 = 12.
    const attackerDamageEvents = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as IDamageAppliedPayload).unitId === 'attacker' &&
        (e.payload as IDamageAppliedPayload).damage > 0,
    );
    const totalAttackerDamage = attackerDamageEvents.reduce(
      (sum, e) => sum + (e.payload as IDamageAppliedPayload).damage,
      0,
    );
    expect(totalAttackerDamage).toBe(12);

    // Per task 6.6 / 7.5: both attacker AND target queue PSRs on hit.
    const targetPSR = session.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource ===
          'physical_attack_target',
    );
    const attackerPSR = session.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource ===
          'dfa_attacker_hit',
    );
    expect(targetPSR).toBeDefined();
    expect(attackerPSR).toBeDefined();
  });

  it('Charge hit: target + attacker both take clustered damage and BOTH PSRs queued', () => {
    let session = setupPhysicalPhase();
    session = seedArmor(session, 'target', heavyArmor, heavyStructure);
    session = seedArmor(session, 'attacker', heavyArmor, heavyStructure);

    // 50-ton attacker running 5 hexes into 70-ton target:
    // target damage = ceil(50/10) * (5-1) = 5*4 = 20.
    // attacker damage = ceil(70/10) = 7.
    const ctx: IPhysicalAttackContext = {
      attackerTonnage: 50,
      targetTonnage: 70,
      pilotingSkill: 4,
      hexesMoved: 5,
      attackerRanThisTurn: true, // charge requires run
      weaponsFiredFromArm: [],
    };
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'charge',
      ctx,
    );

    const ctxMap = new Map<string, IPhysicalAttackContext>([['attacker', ctx]]);
    session = resolveAllPhysicalAttacks(
      session,
      ctxMap,
      mockDiceRoller([
        { dice: [6, 0], total: 6 }, // to-hit
        { dice: [6, 0], total: 6 }, // to-hit (12 → hit)
        { dice: [3, 0], total: 3 }, // hit-location rolls (CT for stability)
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
        { dice: [3, 0], total: 3 },
      ]),
    );

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.PhysicalAttackResolved,
    );
    expect(resolved).toBeDefined();
    const resolvedPayload = resolved!.payload as IPhysicalAttackResolvedPayload;
    expect(resolvedPayload.hit).toBe(true);
    expect(resolvedPayload.damage).toBe(20);

    // Target damage total = 20.
    const targetDamageEvents = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as IDamageAppliedPayload).unitId === 'target' &&
        (e.payload as IDamageAppliedPayload).damage > 0,
    );
    const totalTargetDamage = targetDamageEvents.reduce(
      (sum, e) => sum + (e.payload as IDamageAppliedPayload).damage,
      0,
    );
    expect(totalTargetDamage).toBe(20);

    // Attacker damage total = 7.
    const attackerDamageEvents = session.events.filter(
      (e: IGameEvent) =>
        e.type === GameEventType.DamageApplied &&
        (e.payload as IDamageAppliedPayload).unitId === 'attacker' &&
        (e.payload as IDamageAppliedPayload).damage > 0,
    );
    const totalAttackerDamage = attackerDamageEvents.reduce(
      (sum, e) => sum + (e.payload as IDamageAppliedPayload).damage,
      0,
    );
    expect(totalAttackerDamage).toBe(7);

    // Both PSRs queued on hit per task 6.6.
    const targetPSR = session.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource ===
          'physical_attack_target',
    );
    const attackerPSR = session.events.find(
      (e: IGameEvent) =>
        e.type === GameEventType.PSRTriggered &&
        (e.payload as IPSRTriggeredPayload).triggerSource ===
          'charge_attacker_hit',
    );
    expect(targetPSR).toBeDefined();
    expect(attackerPSR).toBeDefined();
  });
});
