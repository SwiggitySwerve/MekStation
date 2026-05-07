/**
 * Tests for `createGameEvent` per
 * `denormalize-event-envelope-and-close-emission-contract-gaps`
 * (game-event-system delta — Event Envelope Side Denormalization).
 *
 * The spec contract:
 *   - `actorId` starting with `'player-'` → envelope SHALL carry
 *     `side: GameSide.Player`.
 *   - `actorId` starting with `'opponent-'` → envelope SHALL carry
 *     `side: GameSide.Opponent`.
 *   - `actorId` undefined or unmatched prefix → envelope SHALL omit
 *     `side` (system-authored events such as `turn_started`).
 *
 * These assertions guard the single-chokepoint derivation that lets
 * every emit site land with `side` denormalized without joining
 * `payload.unitId` against `IGameUnit.side`.
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  IDamageAppliedPayload,
  ITurnStartedPayload,
  ReplaySource,
} from '@/types/gameplay';

import { createGameEvent } from '../utils';

describe('createGameEvent — side denormalization', () => {
  const baseDamagePayload: IDamageAppliedPayload = {
    unitId: 'player-1',
    location: 'center_torso',
    damage: 5,
    armorRemaining: 15,
    structureRemaining: 10,
    locationDestroyed: false,
    sourceUnitId: 'opponent-2',
  };

  const baseTurnStarted: ITurnStartedPayload = {};

  it('derives side=Player from a player-prefixed actorId', () => {
    const event = createGameEvent(
      'game-1',
      0,
      GameEventType.DamageApplied,
      1,
      GamePhase.WeaponAttack,
      baseDamagePayload,
      'player-1',
    );

    expect(event.side).toBe(GameSide.Player);
    expect(event.actorId).toBe('player-1');
  });

  it('derives side=Opponent from an opponent-prefixed actorId', () => {
    const event = createGameEvent(
      'game-1',
      1,
      GameEventType.AttackResolved,
      1,
      GamePhase.WeaponAttack,
      baseDamagePayload,
      'opponent-2',
    );

    expect(event.side).toBe(GameSide.Opponent);
    expect(event.actorId).toBe('opponent-2');
  });

  it('omits side for system-authored events with no actorId', () => {
    const event = createGameEvent(
      'game-1',
      2,
      GameEventType.TurnStarted,
      2,
      GamePhase.Initiative,
      baseTurnStarted,
      // no actorId
    );

    expect(event.side).toBeUndefined();
    expect(event.actorId).toBeUndefined();
    // Contract: JSON.stringify omits undefined properties so the field
    // does not appear in serialized event-log lines.
    expect(JSON.stringify(event)).not.toContain('"side"');
  });

  it('omits side when actorId has no canonical prefix', () => {
    const event = createGameEvent(
      'game-1',
      3,
      GameEventType.DamageApplied,
      1,
      GamePhase.WeaponAttack,
      { ...baseDamagePayload, unitId: 'fixture-99' },
      'fixture-99',
    );

    expect(event.side).toBeUndefined();
    expect(event.actorId).toBe('fixture-99');
  });

  it('preserves the rest of the envelope (id / sequence / type / turn / phase / payload)', () => {
    const event = createGameEvent(
      'game-7',
      42,
      GameEventType.DamageApplied,
      3,
      GamePhase.PhysicalAttack,
      baseDamagePayload,
      'player-1',
    );

    expect(event.id).toBe('game-7-evt-42');
    expect(event.gameId).toBe('game-7');
    expect(event.sequence).toBe(42);
    expect(event.type).toBe(GameEventType.DamageApplied);
    expect(event.turn).toBe(3);
    expect(event.phase).toBe(GamePhase.PhysicalAttack);
    expect(event.payload).toEqual(baseDamagePayload);
    expect(event.side).toBe(GameSide.Player);
    // ISO-8601 timestamp parses as a valid date.
    expect(Number.isFinite(Date.parse(event.timestamp))).toBe(true);
  });
});

describe('createGameEvent — replaySource discriminator', () => {
  // Per add-replay-library (game-event-system delta — Event Envelope Replay
  // Source Discriminator): the optional `replaySource` argument flows
  // through to the envelope. Field is omitted from the serialized line
  // when not provided so legacy NDJSON streams round-trip unchanged.
  const turnStarted: ITurnStartedPayload = {};

  it('attaches replaySource=Swarm when caller passes it', () => {
    const event = createGameEvent(
      'swarm-1',
      0,
      GameEventType.TurnStarted,
      1,
      GamePhase.Initiative,
      turnStarted,
      undefined,
      ReplaySource.Swarm,
    );

    expect(event.replaySource).toBe(ReplaySource.Swarm);
    expect(JSON.stringify(event)).toContain('"replaySource":"swarm"');
  });

  it('attaches replaySource=Quick for in-app quick games', () => {
    const event = createGameEvent(
      'quick-9',
      3,
      GameEventType.TurnStarted,
      2,
      GamePhase.Initiative,
      turnStarted,
      undefined,
      ReplaySource.Quick,
    );

    expect(event.replaySource).toBe(ReplaySource.Quick);
  });

  it('omits replaySource when not provided (legacy callers / back-compat)', () => {
    const event = createGameEvent(
      'legacy-1',
      0,
      GameEventType.TurnStarted,
      1,
      GamePhase.Initiative,
      turnStarted,
      // no actorId, no replaySource
    );

    expect(event.replaySource).toBeUndefined();
    // Contract: JSON.stringify omits undefined properties so the field
    // does not appear in serialized event-log lines.
    expect(JSON.stringify(event)).not.toContain('"replaySource"');
  });

  it('preserves both side and replaySource when both are derivable', () => {
    const damagePayload: IDamageAppliedPayload = {
      unitId: 'player-1',
      location: 'center_torso',
      damage: 5,
      armorRemaining: 15,
      structureRemaining: 10,
      locationDestroyed: false,
      sourceUnitId: 'opponent-2',
    };

    const event = createGameEvent(
      'swarm-2',
      7,
      GameEventType.DamageApplied,
      3,
      GamePhase.WeaponAttack,
      damagePayload,
      'player-1',
      ReplaySource.Swarm,
    );

    expect(event.side).toBe(GameSide.Player);
    expect(event.replaySource).toBe(ReplaySource.Swarm);
  });
});
