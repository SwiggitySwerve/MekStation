/**
 * Operator-driven cutover and rollback for one campaign (task 5.7, D10).
 *
 * The state machine, the parity gate and the rollback law all shipped in
 * 5.2/5.7 and all three are correct. What never existed is anything that
 * CALLS them: `runCampaignShadowParity` and `rollbackToSnapshotAuthority`
 * had no production caller anywhere in `src/` or `scripts/`, so a campaign
 * that reached `shadowing` had no route to `journal` or `blocked`, and a
 * campaign that needed to go back to its snapshot had no route at all.
 * A decision nothing can invoke is not a decision.
 *
 * These are the two composition points, and deliberately nothing more:
 * they read the marker, supply the one input the runner refuses to invent
 * (the snapshot projection the operator considers current), and persist
 * the answer. Every refusal the machinery already has is passed through
 * with its own typed shape rather than flattened into a boolean.
 *
 * NOT ON A REQUEST PATH. Cutting a campaign over is a reviewed act with a
 * human behind it, so the only entry point is the maintenance CLI in
 * `scripts/campaign-authority-cutover.ts`. Nothing here is imported by an
 * API route, a cron, or a socket handler, and a parity run that fired
 * itself on a request would be exactly the unreviewed cutover D10's
 * `shadowing` state exists to prevent.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import type {
  CampaignAuthorityMigrationState,
  ICampaignCutoverMarker,
  RollbackDecision,
} from './campaignAuthorityMigration';
import type { ICampaignMarkerIo } from './campaignLegacyAdoption';

import { JournalCampaignEventStore } from '../sync/JournalCampaignEventStore';
import { rollbackToSnapshotAuthority } from './campaignAuthorityMigration';
import { durableCampaignMarkerIo } from './campaignCutoverMarkerIo';
import { runCampaignShadowParity } from './campaignShadowParityRunner';
import { authoritativeStateFromSerializedCampaign } from './campaignSourceGenesis';

export interface ICampaignAuthorityCutoverDeps {
  /**
   * A FACTORY, not a handle: the rollback path needs the journal and the
   * parity path needs it too, but a caller that only wants to read a
   * marker should not have opened a database to find out the campaign is
   * not a candidate.
   */
  readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
  readonly markerIo: ICampaignMarkerIo;
  /**
   * The projection the operator considers current. Supplied rather than
   * probed, matching the runner's own contract: a module that invented
   * its own snapshot input would be comparing the journal against
   * something no one had reviewed.
   */
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

/**
 * Run the shadow-parity gate for one campaign and advance it.
 *
 * Refuses before reading anything expensive when the campaign is not a
 * candidate, and reports WHY as its own kind. "Not shadowing" is not an
 * error — re-running parity on a campaign that already cut over would
 * compare a live journal against a snapshot nothing maintains, and a
 * mismatch there would be an artefact of the check. That is also what
 * makes a second run idempotent: the first run leaves the marker in
 * `journal` or `blocked`, and the second declines.
 */
export async function runCampaignParityCutover(
  deps: ICampaignAuthorityCutoverDeps,
  campaignId: string,
): Promise<CampaignParityCutoverOutcome> {
  const marker = deps.markerIo.read(campaignId);
  if (marker === null) return { kind: 'marker-absent' };
  if (marker.state !== 'shadowing') {
    return { kind: 'not-shadowing', state: marker.state };
  }

  const snapshotProjection = deps.readSnapshotProjection(campaignId);
  // Refused rather than defaulted to an empty campaign: parity against a
  // state nobody holds would "prove" a mismatch and block a healthy
  // campaign, or worse, prove equality against an empty journal.
  if (snapshotProjection === null) return { kind: 'snapshot-absent' };

  return runCampaignShadowParity(
    { journal: deps.journal(), writeMarker: deps.markerIo.write },
    { marker, snapshotProjection },
  );
}

/**
 * Return one campaign to snapshot authority (the D10 rollback law).
 *
 * The law is the pure function's; this only supplies the journal head it
 * compares against and persists a permitted rollback. A prohibited one
 * writes nothing and keeps its reason, because "you cannot roll back
 * because your own commands committed" and "you cannot roll back because
 * the log has moved past the baseline" are different facts with
 * different remedies.
 *
 * A `blocked` campaign IS eligible while both guards pass: D10 permits
 * rollback "only while the journal head equals the imported baseline and
 * no journal-authority command has committed" and says nothing about the
 * state it is leaving, and a campaign blocked by a parity mismatch has by
 * definition committed nothing of its own. Its snapshot is still the
 * authority it never left.
 */
export async function rollbackCampaignAuthority(
  deps: ICampaignAuthorityCutoverDeps,
  campaignId: string,
): Promise<CampaignAuthorityRollbackOutcome> {
  const marker = deps.markerIo.read(campaignId);
  if (marker === null) return { kind: 'marker-absent' };

  const store = new JournalCampaignEventStore(deps.journal());
  const decision = rollbackToSnapshotAuthority(
    marker,
    await store.highestSequence(campaignId),
  );
  if (decision.kind === 'rolled-back') {
    deps.markerIo.write(decision.marker);
  }
  return decision;
}

/**
 * The tools' default wiring against this process's database.
 *
 * The snapshot projection is derived from the stored envelope by the same
 * function legacy adoption uses, so the state parity compares is the one
 * the server would have imported — not a second, subtly different reading
 * of the same row. An envelope this cannot project is reported as absent
 * rather than thrown: the campaign is not a parity candidate either way,
 * and the CLI says so instead of printing a stack trace.
 */
export function durableCampaignAuthorityCutoverDeps(): ICampaignAuthorityCutoverDeps {
  return {
    journal: () =>
      new SQLiteEventJournal<ICampaignJournalEnvelope>(
        getSQLiteService().getDatabase(),
        () => new Date().toISOString(),
      ),
    markerIo: durableCampaignMarkerIo,
    readSnapshotProjection: (campaignId) => {
      const stored = readCampaign(campaignId);
      if (stored.kind !== 'ok') return null;
      try {
        return authoritativeStateFromSerializedCampaign(stored.record);
      } catch {
        return null;
      }
    },
  };
}
