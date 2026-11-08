/**
 * Auto-resolve drains the PSR queue at the End phase
 * (wire-interactive-terrain-psrs PR5). Before this, runToCompletion queued
 * PSRs (kicks, critical hits, terrain) and the next turn boundary dropped
 * them unresolved.
 *
 * @spec openspec/changes/wire-interactive-terrain-psrs/specs/piloting-skill-rolls/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IWeapon } from '@/simulation/ai/types';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';

function weapon(id: string): IWeapon {
  return {
    id,
    name: id,
    shortRange: 1,
    mediumRange: 1,
    longRange: 1,
    damage: 1,
    heat: 0,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function adapted(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: { q: 0, r: 0 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [weapon(`${id}-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

/** The C4 auto-resolve baseline setup: one Mek per side, 1-damage 1-hex lasers. */
function play(seed: number): IGameSession {
  const player = adapted('player-1', GameSide.Player);
  const opponent = adapted('opponent-1', GameSide.Opponent);
  return new GameEngine({ seed, turnLimit: 20, mapRadius: 7 }).runToCompletion(
    [player],
    [opponent],
    [gameUnit(player.id, player.side), gameUnit(opponent.id, opponent.side)],
  );
}

const isQueuedPsr = (event: IGameEvent): boolean =>
  (event.type === GameEventType.PSRTriggered ||
    event.type === GameEventType.PSRResolved) &&
  (event.payload as { reasonCode?: string }).reasonCode !==
    PSRTrigger.SwampUnstuck;

describe('GameEngine.runToCompletion End-phase PSR drain', () => {
  it('T-D1 resolves every queued PSR in its own turn, at the End phase', () => {
    let queued = 0;
    for (const seed of [42, 12345]) {
      const session = play(seed);
      const byTurn = new Map<number, { triggered: number; resolved: number }>();
      for (const event of session.events.filter(isQueuedPsr)) {
        const entry = byTurn.get(event.turn) ?? { triggered: 0, resolved: 0 };
        if (event.type === GameEventType.PSRTriggered) {
          entry.triggered++;
          queued++;
        } else {
          entry.resolved++;
          expect({ seed, turn: event.turn, phase: event.phase }).toEqual({
            seed,
            turn: event.turn,
            phase: GamePhase.End,
          });
        }
        byTurn.set(event.turn, entry);
      }
      for (const [turn, counts] of byTurn) {
        expect({ seed, turn, resolved: counts.resolved }).toEqual({
          seed,
          turn,
          resolved: counts.triggered,
        });
      }
      for (const unit of Object.values(session.currentState.units)) {
        expect(unit.pendingPSRs ?? []).toEqual([]);
      }
    }
    expect(queued).toBeGreaterThan(0);
  });

  it('T-D2 the drain draws from the seeded stream, so a seed repeats exactly', () => {
    const strip = (session: IGameSession) =>
      session.events.map(({ type, turn, phase, payload }) => ({
        type,
        turn,
        phase,
        payload,
      }));
    expect(strip(play(42))).toEqual(strip(play(42)));
  });
});
