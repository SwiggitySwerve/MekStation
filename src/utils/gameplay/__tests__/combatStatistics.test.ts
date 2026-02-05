/**
 * Tests for Combat Statistics Projection Functions
 */

import { IGameEvent, GameEventType, GamePhase } from '@/types/gameplay';

import {
  projectDamageMatrix,
  projectKillCredits,
  projectUnitPerformance,
} from '../combatStatistics';

// =============================================================================
// Test Helpers
// =============================================================================

function createDamageEvent(
  sequence: number,
  turn: number,
  unitId: string,
  damage: number,
  sourceUnitId?: string,
): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'test-game',
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.DamageApplied,
    turn,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId,
      location: 'center_torso',
      damage,
      armorRemaining: 10,
      structureRemaining: 10,
      locationDestroyed: false,
      sourceUnitId,
    },
  };
}

function createKillEvent(
  sequence: number,
  turn: number,
  unitId: string,
  killerUnitId?: string,
): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'test-game',
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.UnitDestroyed,
    turn,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId,
      cause: 'damage',
      killerUnitId,
    },
  };
}

// =============================================================================
// projectDamageMatrix Tests
// =============================================================================

describe('projectDamageMatrix', () => {
  it('returns empty matrix for empty events array', () => {
    const result = projectDamageMatrix([]);

    expect(result.matrix.size).toBe(0);
    expect(result.totalDealt.size).toBe(0);
    expect(result.totalReceived.size).toBe(0);
  });

  it('aggregates damage from multiple events correctly', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createDamageEvent(2, 1, 'unit-b', 5, 'unit-a'),
      createDamageEvent(3, 2, 'unit-a', 8, 'unit-b'),
    ];

    const result = projectDamageMatrix(events);

    // unit-a dealt 15 total to unit-b
    expect(result.matrix.get('unit-a')?.get('unit-b')).toBe(15);
    // unit-b dealt 8 total to unit-a
    expect(result.matrix.get('unit-b')?.get('unit-a')).toBe(8);

    // Total dealt
    expect(result.totalDealt.get('unit-a')).toBe(15);
    expect(result.totalDealt.get('unit-b')).toBe(8);

    // Total received
    expect(result.totalReceived.get('unit-a')).toBe(8);
    expect(result.totalReceived.get('unit-b')).toBe(15);
  });

  it('handles undefined sourceUnitId as "Self/Environment"', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-a', 10, undefined), // Self-damage
      createDamageEvent(2, 1, 'unit-a', 5, 'unit-b'),
    ];

    const result = projectDamageMatrix(events);

    // Self/Environment dealt 10 to unit-a
    expect(result.matrix.get('Self/Environment')?.get('unit-a')).toBe(10);
    // unit-b dealt 5 to unit-a
    expect(result.matrix.get('unit-b')?.get('unit-a')).toBe(5);

    // Total received by unit-a
    expect(result.totalReceived.get('unit-a')).toBe(15);
  });

  it('ignores non-DamageApplied events', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createKillEvent(2, 1, 'unit-b', 'unit-a'),
    ];

    const result = projectDamageMatrix(events);

    // Only damage event should be counted
    expect(result.matrix.get('unit-a')?.get('unit-b')).toBe(10);
    expect(result.totalDealt.get('unit-a')).toBe(10);
  });
});

// =============================================================================
// projectKillCredits Tests
// =============================================================================

describe('projectKillCredits', () => {
  it('returns empty array for empty events array', () => {
    const result = projectKillCredits([]);
    expect(result).toEqual([]);
  });

  it('extracts kill credits with correct turn numbers', () => {
    const events: IGameEvent[] = [
      createKillEvent(1, 1, 'unit-b', 'unit-a'),
      createKillEvent(2, 3, 'unit-c', 'unit-a'),
      createKillEvent(3, 5, 'unit-d', 'unit-b'),
    ];

    const result = projectKillCredits(events);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      killerId: 'unit-a',
      victimId: 'unit-b',
      turn: 1,
    });
    expect(result[1]).toEqual({
      killerId: 'unit-a',
      victimId: 'unit-c',
      turn: 3,
    });
    expect(result[2]).toEqual({
      killerId: 'unit-b',
      victimId: 'unit-d',
      turn: 5,
    });
  });

  it('handles undefined killerUnitId for self-destruction', () => {
    const events: IGameEvent[] = [
      createKillEvent(1, 2, 'unit-a', undefined), // Self-destruction
      createKillEvent(2, 3, 'unit-b', 'unit-c'),
    ];

    const result = projectKillCredits(events);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      killerId: undefined,
      victimId: 'unit-a',
      turn: 2,
    });
    expect(result[1]).toEqual({
      killerId: 'unit-c',
      victimId: 'unit-b',
      turn: 3,
    });
  });

  it('ignores non-UnitDestroyed events', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createKillEvent(2, 2, 'unit-b', 'unit-a'),
    ];

    const result = projectKillCredits(events);

    expect(result).toHaveLength(1);
    expect(result[0].victimId).toBe('unit-b');
  });
});

// =============================================================================
// projectUnitPerformance Tests
// =============================================================================

describe('projectUnitPerformance', () => {
  it('returns zero stats for empty events array', () => {
    const result = projectUnitPerformance([], 'unit-a');

    expect(result).toEqual({
      unitId: 'unit-a',
      damageDealt: 0,
      damageReceived: 0,
      kills: 0,
      survived: true,
    });
  });

  it('aggregates damage dealt by the unit', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createDamageEvent(2, 1, 'unit-c', 5, 'unit-a'),
      createDamageEvent(3, 2, 'unit-a', 8, 'unit-b'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.damageDealt).toBe(15); // 10 + 5
    expect(result.damageReceived).toBe(8);
  });

  it('aggregates damage received by the unit', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-a', 10, 'unit-b'),
      createDamageEvent(2, 1, 'unit-a', 5, 'unit-c'),
      createDamageEvent(3, 2, 'unit-b', 8, 'unit-a'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.damageReceived).toBe(15); // 10 + 5
    expect(result.damageDealt).toBe(8);
  });

  it('counts kills by the unit', () => {
    const events: IGameEvent[] = [
      createKillEvent(1, 1, 'unit-b', 'unit-a'),
      createKillEvent(2, 2, 'unit-c', 'unit-a'),
      createKillEvent(3, 3, 'unit-d', 'unit-b'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.kills).toBe(2); // unit-b and unit-c
  });

  it('sets survived to false if unit was destroyed', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createKillEvent(2, 2, 'unit-a', 'unit-b'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.survived).toBe(false);
  });

  it('sets survived to true if unit was not destroyed', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createKillEvent(2, 2, 'unit-b', 'unit-a'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.survived).toBe(true);
  });

  it('aggregates all stats correctly for a unit', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-b', 10, 'unit-a'),
      createDamageEvent(2, 1, 'unit-c', 5, 'unit-a'),
      createDamageEvent(3, 2, 'unit-a', 8, 'unit-b'),
      createDamageEvent(4, 2, 'unit-a', 3, 'unit-c'),
      createKillEvent(5, 3, 'unit-b', 'unit-a'),
      createKillEvent(6, 4, 'unit-c', 'unit-a'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result).toEqual({
      unitId: 'unit-a',
      damageDealt: 15, // 10 + 5
      damageReceived: 11, // 8 + 3
      kills: 2, // unit-b and unit-c
      survived: true,
    });
  });

  it('handles self-damage correctly (not counted as dealt)', () => {
    const events: IGameEvent[] = [
      createDamageEvent(1, 1, 'unit-a', 10, undefined), // Self-damage
      createDamageEvent(2, 1, 'unit-b', 5, 'unit-a'),
    ];

    const result = projectUnitPerformance(events, 'unit-a');

    expect(result.damageDealt).toBe(5); // Only damage to unit-b
    expect(result.damageReceived).toBe(10); // Self-damage received
  });
});
