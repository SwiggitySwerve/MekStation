/**
 * Per-campaign authority and the two cutover proofs (task 5.7, D10).
 *
 * The branch the whole task turns on is a campaign the marker says is on
 * journal authority whose journal has no stream. Two failures hide in
 * it — starting a fresh log, and silently falling back to the snapshot —
 * and they are the same branch seen from two sides. Both rows are here
 * because a future reader should not have to infer that one covers the
 * other.
 */

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import {
  createJournalNativeMarker,
  createLegacyMarker,
} from '../campaignAuthorityMigration';
import { CAMPAIGN_AUTHORITY_BLOCKED_REASONS } from '../campaignAuthorityMode';
import {
  campaignAcceptsCommands,
  resolveCampaignAuthorityMode,
} from '../campaignAuthorityMode';

const CAMPAIGN_ID = 'campaign-cutover';

function markerInState(
  state: ICampaignCutoverMarker['state'],
): ICampaignCutoverMarker {
  const base = createLegacyMarker(CAMPAIGN_ID);
  if (state === 'blocked') {
    return {
      ...base,
      state,
      blocked: {
        reason: 'shadow-projection-mismatch',
        journalDigest: 'jjj',
        snapshotDigest: 'sss',
      },
    };
  }
  return { ...base, state };
}

describe('per-campaign authority', () => {
  it('reads an absent marker as the pre-migration world', () => {
    // No row is a FACT about a campaign that never began migrating, not
    // an unknown to fail closed on - every campaign predating the marker
    // table would otherwise block on first write.
    expect(
      resolveCampaignAuthorityMode({ marker: null, journalHasStream: false }),
    ).toEqual({ kind: 'snapshot' });
  });

  it('keeps the snapshot authoritative while a campaign is shadowing', () => {
    // Shadowing means the journal is being written and compared but NOT
    // yet proven equal. That is exactly what makes entering it safe.
    expect(
      resolveCampaignAuthorityMode({
        marker: markerInState('shadowing'),
        journalHasStream: true,
      }),
    ).toEqual({ kind: 'snapshot' });
  });

  it('uses the journal once a campaign has cut over', () => {
    expect(
      resolveCampaignAuthorityMode({
        marker: createJournalNativeMarker(CAMPAIGN_ID),
        journalHasStream: true,
      }),
    ).toEqual({ kind: 'journal' });
  });

  it('never starts a fresh log for a journal campaign with no stream', () => {
    const mode = resolveCampaignAuthorityMode({
      marker: createJournalNativeMarker(CAMPAIGN_ID),
      journalHasStream: false,
    });

    // Beginning a new stream at sequence 0 here would present an empty
    // campaign as though it were correct, discarding its history.
    expect(mode).toEqual({
      kind: 'blocked',
      reason: CAMPAIGN_AUTHORITY_BLOCKED_REASONS.journalStreamMissing,
    });
  });

  it('never falls back to the snapshot for a journal campaign with no stream', () => {
    const mode = resolveCampaignAuthorityMode({
      marker: createJournalNativeMarker(CAMPAIGN_ID),
      journalHasStream: false,
    });

    // The same branch, stated the other way round: reading the snapshot
    // would look healthy while the durable record says the snapshot has
    // already been superseded, so writes would land on a log the marker
    // no longer considers authoritative.
    expect(mode.kind).not.toBe('snapshot');
    expect(campaignAcceptsCommands(mode)).toBe(false);
  });

  it('carries the marker its own recorded block reason', () => {
    expect(
      resolveCampaignAuthorityMode({
        marker: markerInState('blocked'),
        journalHasStream: true,
      }),
    ).toEqual({ kind: 'blocked', reason: 'shadow-projection-mismatch' });
  });

  it('refuses to name an authority from a marker it cannot read', () => {
    // Guessing "snapshot" would keep writing to a log the campaign may
    // already have migrated off.
    expect(
      resolveCampaignAuthorityMode({
        marker: null,
        markerUnreadable: true,
        journalHasStream: true,
      }),
    ).toEqual({
      kind: 'blocked',
      reason: CAMPAIGN_AUTHORITY_BLOCKED_REASONS.markerUnreadable,
    });
  });

  it('accepts commands in every state that names an authority', () => {
    expect(campaignAcceptsCommands({ kind: 'snapshot' })).toBe(true);
    expect(campaignAcceptsCommands({ kind: 'journal' })).toBe(true);
    expect(campaignAcceptsCommands({ kind: 'blocked', reason: 'x' })).toBe(
      false,
    );
  });
});
