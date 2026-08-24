/**
 * Which log is authoritative for ONE campaign (task 5.7; design D10).
 *
 * Everything since 5.1 has landed behind a single process-wide boolean.
 * That is the wrong shape for a cutover: campaigns migrate one at a
 * time, and a global switch would move every campaign at once including
 * the ones whose parity has not been proven. Authority is therefore read
 * per campaign from the durable cutover marker, and the flag is demoted
 * to what it actually is - a master switch deciding whether NEW
 * campaigns are born journal-native.
 *
 * The one branch that matters is a campaign the marker says is on
 * journal authority whose journal has no stream. Two failures hide in
 * it, and they are the same branch seen from different sides:
 *
 * - **A fresh log.** Starting a new stream at sequence 0 would silently
 *   discard the campaign's history and present an empty campaign as if
 *   it were correct.
 * - **A silent fallback.** Quietly reading the snapshot instead would
 *   look healthy while the durable record says the snapshot is no longer
 *   authoritative - the campaign would take writes against a log that
 *   the marker claims has already been superseded.
 *
 * Both are refused the same way: the campaign is BLOCKED, truthfully,
 * carrying the reason. A blocked campaign is readable through whatever
 * surfaced it and refuses commands; it never quietly picks an authority.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 */

import type { ICampaignCutoverMarker } from './campaignAuthorityMigration';

/** Why a campaign refuses to name an authority. */
export const CAMPAIGN_AUTHORITY_BLOCKED_REASONS = {
  /** Marker says journal, journal has nothing. Never a fresh log. */
  journalStreamMissing: 'journal-authority-without-stream',
  /** The marker itself recorded a block (shadow-parity mismatch, D10). */
  markerBlocked: 'marker-blocked',
  /** The stored marker could not be read; guessing would be worse. */
  markerUnreadable: 'marker-unreadable',
} as const;

export type CampaignAuthorityBlockedReason =
  (typeof CAMPAIGN_AUTHORITY_BLOCKED_REASONS)[keyof typeof CAMPAIGN_AUTHORITY_BLOCKED_REASONS];

export type CampaignAuthorityMode =
  | { readonly kind: 'snapshot' }
  | { readonly kind: 'journal' }
  | {
      readonly kind: 'blocked';
      readonly reason: CampaignAuthorityBlockedReason | string;
    };

export interface ICampaignAuthorityModeInput {
  /**
   * The durable cutover marker. `null` means no row, which is the
   * pre-migration world and reads as snapshot authority - an ABSENT
   * marker is a fact about a campaign that never began migrating, not an
   * unknown to fail closed on.
   */
  readonly marker: ICampaignCutoverMarker | null;
  /** True when the marker row exists but could not be parsed. */
  readonly markerUnreadable?: boolean;
  /** True when this campaign has at least one event in the journal. */
  readonly journalHasStream: boolean;
}

/**
 * Resolves authority for one campaign. Total, pure, and deliberately
 * unable to return a hopeful answer: every path either names an
 * authority the durable record supports, or blocks.
 */
export function resolveCampaignAuthorityMode(
  input: ICampaignAuthorityModeInput,
): CampaignAuthorityMode {
  if (input.markerUnreadable === true) {
    // A corrupt marker cannot say which log is authoritative. Reading it
    // as snapshot would be a guess that silently keeps writing to a log
    // the campaign may have already migrated off.
    return {
      kind: 'blocked',
      reason: CAMPAIGN_AUTHORITY_BLOCKED_REASONS.markerUnreadable,
    };
  }
  if (input.marker === null) return { kind: 'snapshot' };

  switch (input.marker.state) {
    case 'legacy':
      return { kind: 'snapshot' };
    case 'shadowing':
      // Shadowing means the journal is being written and compared but has
      // NOT been proven equal. The snapshot stays authoritative until
      // parity passes - that is what makes shadowing safe to enter.
      return { kind: 'snapshot' };
    case 'journal':
      if (!input.journalHasStream) {
        return {
          kind: 'blocked',
          reason: CAMPAIGN_AUTHORITY_BLOCKED_REASONS.journalStreamMissing,
        };
      }
      return { kind: 'journal' };
    case 'blocked':
      return {
        kind: 'blocked',
        reason:
          input.marker.blocked?.reason ??
          CAMPAIGN_AUTHORITY_BLOCKED_REASONS.markerBlocked,
      };
    default: {
      // A new marker state must decide its authority explicitly rather
      // than inheriting whichever branch happens to be last.
      const exhaustive: never = input.marker.state;
      return { kind: 'blocked', reason: String(exhaustive) };
    }
  }
}

/** Commands run only where a log is actually authoritative. */
export function campaignAcceptsCommands(mode: CampaignAuthorityMode): boolean {
  return mode.kind !== 'blocked';
}
