/**
 * Protocol envelope schema tests.
 *
 * Asserts that:
 *   - well-formed envelopes parse cleanly through the discriminated
 *     unions
 *   - representative malformed envelopes are rejected
 *   - shared `kind` / `matchId` / `ts` invariants hold across every
 *     variant
 */

import {
  ClientMessageSchema,
  ErrorMessageSchema,
  IntentSchema,
  ServerMessageSchema,
  SessionJoinSchema,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_MAX_MS,
  nowIso,
} from '../Protocol';

describe('Protocol envelope schemas', () => {
  describe('SessionJoin', () => {
    it('accepts a minimal valid envelope', () => {
      const env = {
        kind: 'SessionJoin' as const,
        matchId: 'match-1',
        ts: nowIso(),
        playerId: 'p1',
        token: 'tok',
      };
      expect(SessionJoinSchema.safeParse(env).success).toBe(true);
      expect(ClientMessageSchema.safeParse(env).success).toBe(true);
    });

    it('accepts an envelope with optional lastSeq for reconnect', () => {
      const env = {
        kind: 'SessionJoin' as const,
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        token: 't',
        lastSeq: 12,
      };
      expect(SessionJoinSchema.safeParse(env).success).toBe(true);
    });

    it('rejects empty matchId', () => {
      const env = {
        kind: 'SessionJoin',
        matchId: '',
        ts: nowIso(),
        playerId: 'p',
        token: 't',
      };
      expect(SessionJoinSchema.safeParse(env).success).toBe(false);
    });

    it('rejects negative lastSeq', () => {
      const env = {
        kind: 'SessionJoin',
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        token: 't',
        lastSeq: -1,
      };
      expect(SessionJoinSchema.safeParse(env).success).toBe(false);
    });
  });

  describe('Intent', () => {
    it('parses a Move intent', () => {
      const env = {
        kind: 'Intent' as const,
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: {
          kind: 'Move' as const,
          unitId: 'u1',
          to: { q: 1, r: -1 },
          facing: 0,
          movementType: 'walk',
        },
      };
      expect(IntentSchema.safeParse(env).success).toBe(true);
    });

    it('parses an Attack intent', () => {
      const env = {
        kind: 'Intent' as const,
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: {
          kind: 'Attack' as const,
          attackerId: 'u1',
          targetId: 'u2',
          weaponIds: ['w1', 'w2'],
        },
      };
      expect(IntentSchema.safeParse(env).success).toBe(true);
    });

    it('parses an AdvancePhase intent', () => {
      const env = {
        kind: 'Intent' as const,
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: { kind: 'AdvancePhase' as const },
      };
      expect(IntentSchema.safeParse(env).success).toBe(true);
    });

    it('parses a Concede intent', () => {
      const env = {
        kind: 'Intent' as const,
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: { kind: 'Concede' as const, side: 'player' },
      };
      expect(IntentSchema.safeParse(env).success).toBe(true);
    });

    it('rejects Attack with empty weaponIds', () => {
      const env = {
        kind: 'Intent',
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: {
          kind: 'Attack',
          attackerId: 'u1',
          targetId: 'u2',
          weaponIds: [],
        },
      };
      expect(IntentSchema.safeParse(env).success).toBe(false);
    });

    it('rejects Move with out-of-range facing', () => {
      const env = {
        kind: 'Intent',
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: {
          kind: 'Move',
          unitId: 'u1',
          to: { q: 0, r: 0 },
          facing: 9,
          movementType: 'walk',
        },
      };
      expect(IntentSchema.safeParse(env).success).toBe(false);
    });

    it('rejects unknown intent kind', () => {
      const env = {
        kind: 'Intent',
        matchId: 'm',
        ts: nowIso(),
        playerId: 'p',
        intent: { kind: 'TimeTravel' },
      };
      expect(IntentSchema.safeParse(env).success).toBe(false);
    });
  });

  describe('Server-side messages', () => {
    it('parses ReplayStart, Chunk, End, Event, Heartbeat, Error, Close', () => {
      const variants = [
        {
          kind: 'ReplayStart' as const,
          matchId: 'm',
          ts: nowIso(),
          fromSeq: 0,
          totalEvents: 3,
        },
        {
          kind: 'ReplayChunk' as const,
          matchId: 'm',
          ts: nowIso(),
          events: [{}],
        },
        {
          kind: 'ReplayEnd' as const,
          matchId: 'm',
          ts: nowIso(),
          toSeq: 3,
        },
        {
          kind: 'Event' as const,
          matchId: 'm',
          ts: nowIso(),
          event: { foo: 'bar' },
        },
        { kind: 'Heartbeat' as const, matchId: 'm', ts: nowIso() },
        {
          kind: 'Error' as const,
          matchId: 'm',
          ts: nowIso(),
          code: 'INVALID_INTENT' as const,
          reason: 'no',
        },
        {
          kind: 'Close' as const,
          matchId: 'm',
          ts: nowIso(),
          code: 'STORE_FAILURE' as const,
          reason: 'oops',
        },
      ];
      for (const v of variants) {
        const r = ServerMessageSchema.safeParse(v);
        expect(r.success).toBe(true);
      }
    });

    it('rejects Error with unknown code', () => {
      const env = {
        kind: 'Error',
        matchId: 'm',
        ts: nowIso(),
        code: 'NOPE',
      };
      expect(ErrorMessageSchema.safeParse(env).success).toBe(false);
    });
  });

  describe('Constants', () => {
    it('exposes heartbeat + reconnect tunables', () => {
      expect(HEARTBEAT_INTERVAL_MS).toBe(20_000);
      expect(HEARTBEAT_TIMEOUT_MS).toBe(60_000);
      expect(RECONNECT_MAX_MS).toBe(30_000);
    });
  });
});
