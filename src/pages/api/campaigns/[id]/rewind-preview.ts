/**
 * POST /api/campaigns/[id]/rewind-preview — GM rewind impact, not a commit.
 *
 * Result is returned verbatim. 200 preview, 403 not-gm, 404
 * unknown-campaign, 409 other typed refusals. Transport errors stay
 * `{ error }`. GM is `isActiveCampaignGm`, then remapped to `role: 'gm'`
 * (campaign analogue of the combat host-as-GM remap). store() runs only
 * AFTER a preview result, using the route-injected clock. No GET; not
 * on any timeline.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { GmCampaignRewindImpactResult } from '@/lib/interventions/GmCampaignRewindImpactPreview';
import type {
  IMembershipRecord,
  IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import { expectedScopeForCampaign } from '@/lib/campaign/authority/campaignSessionScope';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import {
  previewGmCampaignRewind,
  readCampaignJournalForRewindPreview,
} from '@/lib/interventions/GmCampaignRewindImpactPreview';
import { authenticateRequest } from '@/lib/multiplayer/server/auth';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { GmPrivatePreviewRecordWriter } from '@/lib/multiplayer/server/history/GmPrivatePreviewRecordWriter';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { isActiveCampaignGm } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

export type CampaignRewindPreviewNowIso = () => string;

let routeNowIso: CampaignRewindPreviewNowIso = () => new Date().toISOString();

/** Test seam: private-record createdAt must be this clock. */
export function _setCampaignRewindPreviewNowIsoForTests(
  clock: CampaignRewindPreviewNowIso | undefined,
): void {
  routeNowIso = clock ?? (() => new Date().toISOString());
}

interface IPreviewBody {
  readonly cutoff: number;
}

function isPreviewBody(value: unknown): value is IPreviewBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isSafeInteger((value as Partial<IPreviewBody>).cutoff)
  );
}

function statusForRefusal(
  reason: Extract<GmCampaignRewindImpactResult, { kind: 'refused' }>['reason'],
): number {
  if (reason === 'not-gm') return 403;
  return reason === 'unknown-campaign' ? 404 : 409;
}

/**
 * Seat lookup keyed by campaign id. The writer uses campaignSessionId
 * the way combat uses matchId; the row is rebound to that id so the
 * resolver bind check and the private-record session check agree.
 */
class CampaignSeatMembershipSource implements IMembershipSource {
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    const row = getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT campaign_id, participant_id, seat
           FROM campaign_session_participant
          WHERE campaign_id = ? AND participant_id = ?
            AND revoked_at IS NULL LIMIT 1`,
      )
      .get(campaignSessionId, principalId) as
      | {
          readonly campaign_id: string;
          readonly participant_id: string;
          readonly seat: 'gm' | 'player';
        }
      | undefined;
    if (row === undefined) return null;
    return {
      principalId,
      principalKind: 'human',
      campaignId: row.campaign_id,
      campaignSessionId,
      matchId: campaignSessionId,
      participantId: row.participant_id,
      role: row.seat === 'gm' ? 'gm' : 'player',
      ownedForceIds: [],
      membershipRevision: 1,
      active: true,
    };
  }

  public async currentMembershipRevision(
    campaignSessionId: string,
  ): Promise<number> {
    const row = getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT 1 AS present FROM campaign_session_participant
          WHERE campaign_id = ? AND revoked_at IS NULL LIMIT 1`,
      )
      .get(campaignSessionId) as { readonly present: number } | undefined;
    return row === undefined ? 0 : 1;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;
  const id = rejectMissingQueryString(
    req,
    res,
    'id',
    'missing or invalid campaign id',
  );
  if (!id) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!isPreviewBody(req.body)) {
    res.status(400).json({ error: 'missing or invalid request body' });
    return;
  }

  const auth = await authenticateRequest(
    req,
    undefined,
    expectedScopeForCampaign(id),
  );
  if (!auth.ok) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }
  if (!isActiveCampaignGm(id, auth.playerId)) {
    res.status(403).json({
      kind: 'refused',
      reason: 'not-gm',
      detail: 'Only the campaign GM may preview a rewind.',
    });
    return;
  }

  try {
    const result = await previewGmCampaignRewind({
      campaignId: id,
      cutoff: req.body.cutoff,
      role: 'gm',
      readEvents: readCampaignJournalForRewindPreview,
    });
    if (result.kind !== 'preview') {
      res.status(statusForRefusal(result.reason)).json(result);
      return;
    }

    const createdAt = routeNowIso();
    await new GmPrivatePreviewRecordWriter(
      new SQLitePrivateRecordRepository(getSQLiteService().getDatabase()),
    ).store({
      resolver: new AuthorizedViewerResolver(new CampaignSeatMembershipSource()),
      principalId: auth.playerId,
      campaignSessionId: id,
      commandId: null,
      createdAt,
      preview: result,
      derivedSummary: `Campaign rewind impact preview cutoff=${result.cutoff} revision=${result.currentRevision}`,
    });
    res.status(200).json(result);
  } catch (error) {
    sendCaughtApiError(res, error, 'campaign rewind preview failed');
  }
}
