/**
 * Operator-driven cutover and rollback for one campaign (task 5.7, D10).
 *
 * CONTRACT ONLY at this commit: the shapes the failing rows in
 * `__tests__/campaignAuthorityCutoverOps.test.ts` are written against.
 * Both compositions throw until the next commit supplies them, so the red
 * log is behavioural rather than an unresolved import.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import type {
  CampaignAuthorityMigrationState,
  ICampaignCutoverMarker,
  RollbackDecision,
} from './campaignAuthorityMigration';
import type { ICampaignMarkerIo } from './campaignLegacyAdoption';

export interface ICampaignAuthorityCutoverDeps {
  readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
  readonly markerIo: ICampaignMarkerIo;
  readonly readSnapshotProjection: (
    campaignId: string,
  ) => ICampaignAuthoritativeState | null;
}

export type CampaignParityCutoverOutcome =
  | {
      readonly kind: 'cutover';
      readonly marker: ICampaignCutoverMarker;
      readonly journalDigest: string;
    }
  | {
      readonly kind: 'blocked';
      readonly marker: ICampaignCutoverMarker;
      readonly journalDigest: string;
      readonly snapshotDigest: string;
    }
  | {
      readonly kind: 'not-shadowing';
      readonly state: CampaignAuthorityMigrationState;
    }
  | { readonly kind: 'marker-absent' }
  | { readonly kind: 'snapshot-absent' };

export type CampaignAuthorityRollbackOutcome =
  | RollbackDecision
  | { readonly kind: 'marker-absent' };

/** Run the shadow-parity gate for one campaign and advance it. */
export function runCampaignParityCutover(
  _deps: ICampaignAuthorityCutoverDeps,
  _campaignId: string,
): Promise<CampaignParityCutoverOutcome> {
  throw new Error('parity cutover driver not implemented');
}

/** Return one campaign to snapshot authority (the D10 rollback law). */
export function rollbackCampaignAuthority(
  _deps: ICampaignAuthorityCutoverDeps,
  _campaignId: string,
): Promise<CampaignAuthorityRollbackOutcome> {
  throw new Error('authority rollback surface not implemented');
}
