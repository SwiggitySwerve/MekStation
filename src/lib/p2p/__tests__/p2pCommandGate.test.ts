/**
 * The P2P command gate (umbrella 19.2, findings #61 / #63).
 *
 * A peer-to-peer match has no server to refuse a command. When the other
 * peer is gone, a command the player issues is applied LOCALLY against a
 * session the absent peer will never see - divergence, not a retry. So
 * the refusal has to happen on this side, and these rows pin what the
 * mapper answers for every member of the store's status union.
 */

import type { LocalMatchStatus } from '@/stores/useGameplayStore';

import { p2pCommandAvailability } from '../p2pCommandGate';

const ALL_STATUSES: readonly LocalMatchStatus[] = [
  'live',
  'guestPending',
  'hostPending',
  'aborted',
];

describe('p2pCommandAvailability', () => {
  it('allows commands while the match is live', () => {
    expect(p2pCommandAvailability('live')).toStrictEqual({ available: true });
  });

  it.each(['hostPending', 'guestPending', 'aborted'] as const)(
    'refuses commands in the %s status',
    (status) => {
      const availability = p2pCommandAvailability(status);
      expect(availability.available).toBe(false);
    },
  );

  it('gives each refused status its own words', () => {
    // Not one generic refusal: a host who left and a guest who left are
    // different facts, and the player acts on them differently.
    const reasons = (['hostPending', 'guestPending', 'aborted'] as const).map(
      (status) => {
        const availability = p2pCommandAvailability(status);
        if (availability.available) throw new Error(`${status} must refuse`);
        return availability.reason;
      },
    );
    expect(new Set(reasons).size).toBe(reasons.length);
    for (const reason of reasons) {
      expect(reason.length).toBeGreaterThan(0);
      // The words are this transport's own. A P2P peer leaving is not
      // "the match stream" - that phrase belongs to the WebSocket gate,
      // and borrowing it would tell the player about a server that is
      // not there.
      expect(reason).not.toContain('match stream');
      expect(reason).not.toMatch(/[0-9]/);
    }
  });

  it('answers for every member of the status union', () => {
    // A sweep over the real union rather than the three names above, so
    // a status added to the store cannot slip through unanswered.
    for (const status of ALL_STATUSES) {
      const availability = p2pCommandAvailability(status);
      expect(typeof availability.available).toBe('boolean');
      if (!availability.available) {
        expect(typeof availability.reason).toBe('string');
      }
    }
  });
});
