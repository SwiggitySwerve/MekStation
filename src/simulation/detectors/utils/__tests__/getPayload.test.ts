/**
 * getPayload — typed, discriminant-checked payload extraction.
 *
 * Audit 2026-06-09 G (W5.1b): the unconstrained `getPayload<T>` cast let
 * detector code read fields that no emitter ever set (the `attackerFacing`
 * vs `attackerArc` rear-arc-hit bug). The constrained form ties the
 * returned payload type to the `event.type` discriminant through a
 * compile-time lookup map and throws on a runtime mismatch so a detector
 * can never silently read a payload of the wrong event family.
 */

import {
  GameEventType,
  GamePhase,
  type IAttackResolvedPayload,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from '../getPayload';

function makeAttackResolvedEvent(): IGameEvent {
  const payload: IAttackResolvedPayload = {
    attackerId: 'atlas',
    targetId: 'timberwolf',
    weaponId: 'ac20',
    roll: 9,
    toHitNumber: 7,
    hit: true,
    location: 'ct',
    damage: 20,
    attackerArc: 'rear',
  };
  return {
    id: 'evt-1',
    gameId: 'game-1',
    sequence: 1,
    timestamp: '2026-06-10T00:00:00Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
    type: GameEventType.AttackResolved,
    payload,
  };
}

describe('getPayload', () => {
  it('returns the payload narrowed to the requested event type', () => {
    const event = makeAttackResolvedEvent();

    const payload = getPayload(event, GameEventType.AttackResolved);

    // The returned type is IAttackResolvedPayload — canonical field reads
    // compile and carry the emitter's values.
    expect(payload.attackerId).toBe('atlas');
    expect(payload.attackerArc).toBe('rear');
  });

  it('throws when the event type does not match the requested discriminant', () => {
    const event = makeAttackResolvedEvent();

    expect(() => getPayload(event, GameEventType.DamageApplied)).toThrow(
      /attack_resolved/,
    );
  });
});
