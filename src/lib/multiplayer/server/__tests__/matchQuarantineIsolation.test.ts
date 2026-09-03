/**
 * One corrupt session is isolated; the healthy one keeps serving
 * (umbrella task 15.4, the letter's control).
 *
 * One store, one recovery sweep, two active matches built from the same
 * host code: one whose authority sequence has a hole in it, one intact.
 * The corrupt session is refused by name and quarantined; the healthy
 * session recovers into a live host that still admits a socket. The
 * isolation is per scope key - there is no global flag that could take
 * the healthy session down with it.
 *
 * Before this slice a gapped log was not corruption to anything:
 * hydration folds whatever it is handed, so the match was rebuilt and
 * served as though its history were whole.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { recoverActiveMatches } from '../MatchRecovery';

import {
  isolationLiveHost,
  isolationMatchMeta,
  isolationProbeSocket,
  punchSequenceGap,
} from './matchIsolationFixtures';

describe('per-session quarantine isolation', () => {
  it('a gapped session is quarantined while the healthy one keeps serving', async () => {
    const store = new InMemoryMatchStore();
    await store.createMatch(isolationMatchMeta('match-healthy'));
    await isolationLiveHost('match-healthy', store);
    const healthyLog = await store.getEvents('match-healthy', 0);
    expect(healthyLog.length).toBeGreaterThanOrEqual(2);

    await store.createMatch(isolationMatchMeta('match-gapped'));
    await punchSequenceGap(store, 'match-gapped', healthyLog);

    const quarantine = new ReplayQuarantineRegistry();
    const result = await recoverActiveMatches(store, quarantine);

    expect(result.blocked.map((entry) => entry.matchId)).toEqual([
      'match-gapped',
    ]);
    expect(result.blocked[0]?.reason).toBe('sequence-gap');
    expect(result.hosts.has('match-gapped')).toBe(false);
    expect(
      quarantine.isQuarantined({
        authorityType: 'match',
        authorityId: 'match-gapped',
      }),
    ).toBe(true);

    const recovered = result.hosts.get('match-healthy');
    expect(recovered).toBeDefined();
    expect(
      quarantine.isQuarantined({
        authorityType: 'match',
        authorityId: 'match-healthy',
      }),
    ).toBe(false);
    expect(() =>
      quarantine.assertScopeOperational({
        authorityType: 'match',
        authorityId: 'match-healthy',
      }),
    ).not.toThrow();
    expect(
      await recovered!.admitSocket(isolationProbeSocket(), 'pA'),
    ).not.toBeNull();
  });
});
