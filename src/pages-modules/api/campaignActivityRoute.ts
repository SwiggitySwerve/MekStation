/**
 * `GET /api/campaigns/:id/activity` - one viewer's authoritative feed.
 *
 * This is the read that makes campaign activity recoverable at all. The
 * browser log it replaces lives in one device's storage, so "the GM
 * reloads the campaign" has never been a question the server could
 * answer; after this route it is, and the answer is derived from the
 * committed journal rather than from whatever that browser happened to
 * retain.
 *
 * Read-only by construction - there is no write path in this file, which
 * is how "reading your history never changes it" is guaranteed rather
 * than intended.
 *
 * THE CALLER NAMES A PARTICIPANT; IT DOES NOT NAME A ROLE. `sessionId`
 * and `participantId` are required because the durable membership row
 * they select is what resolves the seat, and a request that could omit
 * them would have to be answered with a guess. A participant this
 * session has not bound - or has revoked - is 403, not a reduced feed:
 * the `campaign` scope tier means "every participant in this session",
 * and answering a stranger with it would silently widen the tier to
 * "everyone".
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { CampaignActivityReadResult } from '@/lib/campaign/activity/campaignActivityRead';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';

import { readCampaignActivityForViewer } from '@/lib/campaign/activity/campaignActivityRead';
import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { activeCampaignSessionMembership } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ResponseBody =
  | Extract<CampaignActivityReadResult, { kind: 'activity' }>
  | { readonly error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  if (rejectUnexpectedMethod(req, res, ['GET'])) return;
  if (!initializeApiDatabase(res)) return;

  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid campaign id',
  );
  if (!id) return;
  const sessionId = rejectMissingQueryString(
    req,
    res,
    'sessionId',
    'missing or invalid sessionId',
  );
  if (!sessionId) return;
  const participantId = rejectMissingQueryString(
    req,
    res,
    'participantId',
    'missing or invalid participantId',
  );
  if (!participantId) return;

  try {
    const result = await readCampaignActivityForViewer(
      {
        readMembership: activeCampaignSessionMembership,
        // Opened per request rather than per module, so importing this
        // route never reaches for a database that may not be up yet.
        readEvents: (campaignId) =>
          readCampaignJournalEvents(
            new SQLiteEventJournal<ICampaignJournalEnvelope>(
              getSQLiteService().getDatabase(),
              () => new Date().toISOString(),
            ),
            campaignId,
          ),
      },
      { campaignId: id, sessionId, participantId },
    );
    if (result.kind === 'not-a-participant') {
      res.status(403).json({ error: 'not a participant in this session' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    sendCaughtApiError(res, error, 'failed to read campaign activity');
  }
}
