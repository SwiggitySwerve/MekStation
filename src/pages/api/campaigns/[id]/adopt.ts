/**
 * /api/campaigns/[id]/adopt — legacy browser-copy adoption (task 1.4, D8).
 *
 * POST takes the browser's serialized campaign and makes this server its
 * source instance, recording the import honestly: the created record is
 * accompanied by a baseline event carrying the digest of the state that
 * came in and a `shadowing` cutover marker naming the imported revision.
 *
 * This is deliberately NOT the ordinary create path. A `PUT` at
 * `baseVersion` 0 stamps a journal-native marker, which asserts that the
 * campaign's entire history lives in this journal — true for a campaign
 * created here, a false provenance claim for a browser copy that has been
 * played for months elsewhere. The D10 rollback law reads that same field,
 * so the false claim would also strand the campaign with no route back to
 * snapshot authority.
 *
 * An already-present server record is `409`, not an overwrite: whatever
 * the server holds is either this campaign already adopted or a different
 * campaign wearing the same id, and neither is something an import may
 * silently replace.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  CAMPAIGN_ALREADY_ADOPTED_REASON,
  maybeAdoptLegacyCampaign,
} from '@/lib/campaign/authority/campaignLegacyAdoption';
import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  initializeApiDatabase as initCampaignDb,
  rejectMissingQueryString as readCampaignId,
  sendCaughtApiError as sendCampaignError,
} from '@/pages-modules/api/routeHelpers';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type AdoptErrorResponse =
  | { error: string }
  | {
      error: string;
      kind: 'refused';
      reason: typeof CAMPAIGN_ALREADY_ADOPTED_REASON;
      current: SerializedCampaign;
    };

interface AdoptBody {
  readonly envelope: SerializedCampaign;
}

/**
 * Narrow guard for the POST body. Matches the item route's depth: the
 * fields this handler itself depends on are checked, the deep envelope
 * shape is the client builder's contract.
 */
function isValidAdoptBody(value: unknown): value is AdoptBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const envelope = (value as Partial<AdoptBody>).envelope as
    | Partial<SerializedCampaign>
    | undefined;
  if (!envelope || typeof envelope !== 'object') {
    return false;
  }
  return (
    typeof envelope.campaignId === 'string' &&
    typeof envelope.schemaVersion === 'number' &&
    typeof envelope.body === 'object' &&
    envelope.body !== null
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedCampaign | AdoptErrorResponse>,
): Promise<void> {
  if (!initCampaignDb(res)) return;

  const id = readCampaignId(req, res, 'id', 'missing or invalid campaign id');
  if (!id) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body as unknown;
  if (!isValidAdoptBody(body)) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }
  if (body.envelope.campaignId !== id) {
    res
      .status(400)
      .json({ error: 'envelope campaignId does not match url id' });
    return;
  }

  try {
    const existing = readCampaign(id);
    if (existing.kind === 'ok') {
      res.status(409).json({
        error: 'campaign is already held by this server',
        kind: 'refused',
        reason: CAMPAIGN_ALREADY_ADOPTED_REASON,
        current: existing.record,
      });
      return;
    }
    if (existing.kind === 'corrupt') {
      // A corrupt row still occupies the id. Importing over it would
      // destroy whatever is repairable there.
      res.status(500).json({ error: 'stored campaign record is corrupt' });
      return;
    }
    if (existing.kind === 'invalid_authority') {
      res.status(422).json({
        error: 'stored campaign authority is invalid',
      });
      return;
    }

    // Import BEFORE creating the record, so a failed import leaves the id
    // untouched and a retry starts clean. The reverse order would leave a
    // created-but-unimported record that the 409 above then refuses to
    // finish - a campaign stuck half-adopted with no way through. The
    // incoming envelope is what carries the imported revision; the record
    // this server is about to write is a copy, not the source snapshot.
    const adoption = await maybeAdoptLegacyCampaign({
      enabled: CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
      envelope: body.envelope,
      importedAt: new Date().toISOString(),
      journal: () =>
        new SQLiteEventJournal(getSQLiteService().getDatabase(), () =>
          new Date().toISOString(),
        ),
      markerIo: {
        // Only a readable marker counts as a prior import. A corrupt one
        // cannot say what was imported, and this route is only reached
        // when no record holds the id, so writing a fresh honest marker
        // is the recovery rather than a rewrite of anything meaningful.
        read: (campaignId) => {
          const stored = readCampaignMigrationMarker(campaignId);
          return stored.kind === 'ok' ? stored.marker : null;
        },
        write: writeCampaignMigrationMarker,
      },
    });
    if (adoption.kind === 'invalid-campaign-projection') {
      res
        .status(500)
        .json({ error: `campaign adoption failed: ${adoption.reason}` });
      return;
    }

    const saved = saveCampaign(body.envelope, 0);
    if (saved.kind !== 'ok') {
      // The not-found read above means a create; anything else here is a
      // race with a concurrent writer, reported rather than retried.
      res.status(409).json({ error: 'campaign was created concurrently' });
      return;
    }

    res.status(201).json(saved.record);
  } catch (error) {
    sendCampaignError(res, error, 'failed to adopt campaign');
  }
}
