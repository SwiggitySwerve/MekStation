/**
 * Unit tests for the in-battle morale-shift rules.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: Morale Shift Rules
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 1.4
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDestroyedPayload,
  type IGameEvent,
  type IGameState,
  type IUnitDestroyedPayload,
  type IUnitGameState,
} from '@/types/gameplay';

import {
  computeMoraleShifts,
  heaviestUnitIdForSide,
  shiftMoraleLevel,
} from '../moraleShift';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function unit(
  id: string,
  side: GameSide,
  structureTotal: number,
): IUnitGameState {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: 0,
    heat: 0,
    movementThisTurn: 'stationary' as IUnitGameState['movementThisTurn'],
    hexesMovedThisTurn: 0,
    armor: {},
    structure: { CT: structureTotal },
    startingInternalStructure: { CT: structureTotal },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: 'pending' as IUnitGameState['lockState'],
  };
}

function stateWith(units: IUnitGameState[]): IGameState {
  const byId: Record<string, IUnitGameState> = {};
  for (const u of units) byId[u.id] = u;
  return {
    gameId: 'g1',
    status: 'active' as IGameState['status'],
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: byId,
    turnEvents: [],
    battleMorale: {
      [GameSide.Player]: 'STEADY',
      [GameSide.Opponent]: 'STEADY',
    },
  };
}

function destroyedEvent(unitId: string): IGameEvent {
  const payload: IUnitDestroyedPayload = { unitId, cause: 'damage' };
  return {
    id: `e-${unitId}`,
    gameId: 'g1',
    sequence: 1,
    timestamp: '2026-05-19T00:00:00.000Z',
    type: GameEventType.UnitDestroyed,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

function vitalCritEvent(unitId: string, componentType: string): IGameEvent {
  const payload: IComponentDestroyedPayload = {
    unitId,
    location: 'CT',
    componentType,
    slotIndex: 0,
  };
  return {
    id: `c-${unitId}`,
    gameId: 'g1',
    sequence: 2,
    timestamp: '2026-05-19T00:00:00.000Z',
    type: GameEventType.ComponentDestroyed,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shiftMoraleLevel — clamping', () => {
  it('shifts up and down by ordinal steps', () => {
    expect(shiftMoraleLevel('STEADY', 1)).toBe('CONFIDENT');
    expect(shiftMoraleLevel('STEADY', -1)).toBe('SHAKEN');
    expect(shiftMoraleLevel('STEADY', -2)).toBe('BROKEN');
  });

  it('clamps at ROUTED (worst)', () => {
    expect(shiftMoraleLevel('ROUTED', -1)).toBe('ROUTED');
    expect(shiftMoraleLevel('BROKEN', -5)).toBe('ROUTED');
  });

  it('clamps at OVERWHELMING (best)', () => {
    expect(shiftMoraleLevel('OVERWHELMING', 1)).toBe('OVERWHELMING');
    expect(shiftMoraleLevel('INSPIRED', 5)).toBe('OVERWHELMING');
  });
});

describe('heaviestUnitIdForSide', () => {
  it('picks the unit with the most starting internal structure', () => {
    const state = stateWith([
      unit('player-light', GameSide.Player, 20),
      unit('player-heavy', GameSide.Player, 60),
    ]);
    expect(heaviestUnitIdForSide(state, GameSide.Player)).toBe('player-heavy');
  });

  it('returns null when a side has no units', () => {
    const state = stateWith([unit('player-1', GameSide.Player, 30)]);
    expect(heaviestUnitIdForSide(state, GameSide.Opponent)).toBeNull();
  });
});

describe('computeMoraleShifts — unit destruction', () => {
  it('lowers the owning side and raises the enemy side', () => {
    const state = stateWith([
      unit('player-1', GameSide.Player, 30),
      unit('opponent-1', GameSide.Opponent, 30),
    ]);
    const shifts = computeMoraleShifts(
      state,
      destroyedEvent('player-1'),
      new Set(),
    );
    const ownShift = shifts.find((s) => s.side === GameSide.Player);
    const enemyShift = shifts.find((s) => s.side === GameSide.Opponent);
    expect(ownShift?.delta).toBe(-1);
    expect(enemyShift?.delta).toBe(1);
  });

  it('adds an extra downshift when the heaviest unit is lost', () => {
    const state = stateWith([
      unit('player-light', GameSide.Player, 20),
      unit('player-heavy', GameSide.Player, 60),
    ]);
    const shifts = computeMoraleShifts(
      state,
      destroyedEvent('player-heavy'),
      new Set(),
    );
    const playerShifts = shifts.filter((s) => s.side === GameSide.Player);
    const total = playerShifts.reduce((sum, s) => sum + s.delta, 0);
    // -1 for the destruction itself, -2 for losing the heaviest unit.
    expect(total).toBe(-3);
  });

  it('does NOT add the heaviest downshift for a non-heaviest unit', () => {
    const state = stateWith([
      unit('player-light', GameSide.Player, 20),
      unit('player-heavy', GameSide.Player, 60),
    ]);
    const shifts = computeMoraleShifts(
      state,
      destroyedEvent('player-light'),
      new Set(),
    );
    const playerShifts = shifts.filter((s) => s.side === GameSide.Player);
    const total = playerShifts.reduce((sum, s) => sum + s.delta, 0);
    expect(total).toBe(-1);
  });
});

describe('computeMoraleShifts — vital crit', () => {
  it('lowers the owning side on an engine crit', () => {
    const state = stateWith([unit('player-1', GameSide.Player, 30)]);
    const shifts = computeMoraleShifts(
      state,
      vitalCritEvent('player-1', 'engine'),
      new Set(),
    );
    expect(shifts).toHaveLength(1);
    expect(shifts[0].side).toBe(GameSide.Player);
    expect(shifts[0].delta).toBe(-1);
  });

  it('is capped to once per unit', () => {
    const state = stateWith([unit('player-1', GameSide.Player, 30)]);
    const shifts = computeMoraleShifts(
      state,
      vitalCritEvent('player-1', 'gyro'),
      new Set(['player-1']),
    );
    expect(shifts).toHaveLength(0);
  });

  it('ignores a non-vital component crit', () => {
    const state = stateWith([unit('player-1', GameSide.Player, 30)]);
    const shifts = computeMoraleShifts(
      state,
      vitalCritEvent('player-1', 'heat_sink'),
      new Set(),
    );
    expect(shifts).toHaveLength(0);
  });
});
