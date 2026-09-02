/**
 * `GET /api/campaigns/:id/head` - the authoritative head a launch names.
 *
 * Read-only by construction: there is no write path in this file, which
 * is how "asking what the head is never changes it" is guaranteed rather
 * than merely intended.
 *
 * THE REVISION IS THE JOURNAL REVISION. Not `SerializedCampaign.version`
 * (the campaigns table write counter) and not the co-op snapshot's
 * `revision` (a campaign event SEQUENCE, one below the journal revision -
 * see `JournalCampaignEventStore`). It is the number
 * `validateExpectedBranchHead` compares against, so the client can send
 * it straight back as its expected head.
 *
 * Status codes:
 * - `200 {kind:'head', ...}` - the campaign has an effective branch.
 * - `200 {kind:'no-authoritative-stream'}` - the campaign exists and has
 *   no journal stream. NOT a 404: the campaign is launchable, it simply
 *   has no head to name while the cutover flag is off, and the launch
 *   acts on it by proceeding ungated.
 * - `404` - no such campaign. The launch refuses.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { CampaignLaunchHeadResult } from '@/lib/campaign/authority/campaignLaunchHead';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

import { resolveCampaignLaunchHead } from '@/lib/campaign/authority/campaignLaunchHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ResponseBody =
  | Exclude<CampaignLaunchHeadResult, { kind: 'campaign-not-found' }>
  | { readonly error: string };

/**
 * The journal's head revision for this stream and branch.
 *
 * A branch with no head row is at revision 0 - it exists and nothing has
 * been appended to it yet. That is the genesis case, not a missing
 * stream, and treating it as absent would make a fresh campaign
 * unlaunchable.
 */
function readJournalRevision(
  stream: IEventHistoryStreamRef,
  branchId: string,
): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT stream_revision AS revision
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(stream.streamType, stream.streamId, branchId) as
    | { readonly revision: number }
    | undefined;
  return row?.revision ?? 0;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): void {
  if (rejectUnexpectedMethod(req, res, ['GET'])) return;
  if (!initializeApiDatabase(res)) return;

  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid campaign id',
  );
  if (!id) return;

  try {
    const result = resolveCampaignLaunchHead(
      {
        readCampaign,
        readEffectiveHead: (stream) =>
          new SQLiteEventHistoryBranchStore(
            getSQLiteService().getDatabase(),
          ).readEffectiveHead(stream),
        readJournalRevision,
      },
      id,
    );
    if (result.kind === 'campaign-not-found') {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    sendCaughtApiError(res, error, 'failed to read campaign head');
  }
}
