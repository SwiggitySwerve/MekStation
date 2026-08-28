/**
 * Replica-stream chain verification using the journal's own digest.
 *
 * hydrateEvent already recomputes canonicalizeEventDigestV1 on read, so
 * a payload tamper surfaces as a journal integrity throw. This walk
 * additionally proves previousStreamEventDigest linkage and contiguous
 * streamRevision so a rewritten predecessor or a swapped revision is
 * detected even when each row's digest was recomputed to match.
 *
 * Time is not read here.
 */

import type { IStoredEvent } from '@/lib/events/journal/EventJournalContract';

import { canonicalizeEventDigestV1 } from '@/lib/events/journal/EventJournalCanonicalizer';

import type { ICampaignReplicaEnvelope } from './campaignReplicaTypes';
import type { CampaignReplicaChainVerifyResult } from './campaignReplicaTypes';

/**
 * Walks stored replica rows in streamRevision order and checks digest
 * recomputation plus predecessor linkage.
 */
export function verifyCampaignReplicaStoredChain(
  events: readonly IStoredEvent<ICampaignReplicaEnvelope>[],
): CampaignReplicaChainVerifyResult {
  let previousDigest: string | null = null;
  let previousRevision = 0;
  for (const event of events) {
    const recomputed = canonicalizeEventDigestV1(event).digest;
    if (recomputed !== event.eventDigest) {
      return {
        kind: 'invalid',
        reason: 'digest-mismatch',
        eventId: event.eventId,
      };
    }
    if (event.streamRevision !== previousRevision + 1) {
      return {
        kind: 'invalid',
        reason: 'revision-gap',
        eventId: event.eventId,
      };
    }
    if (event.previousStreamEventDigest !== previousDigest) {
      return {
        kind: 'invalid',
        reason: 'chain-break',
        eventId: event.eventId,
      };
    }
    previousDigest = event.eventDigest;
    previousRevision = event.streamRevision;
  }
  return { kind: 'valid', eventCount: events.length };
}
