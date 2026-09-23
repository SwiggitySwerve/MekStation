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
 * Status codes (owner decision OD-launch-head-gate, as
 * `resolveCampaignLaunchHead` implements it):
 * - `200 {kind:'head', ...}` - the campaign has a journal stream; the
 *   branch and revision are the journal's effective head, the generation
 *   the effective head's.
 * - `200 {kind:'no-authoritative-stream'}` - the campaign exists and the
 *   journal holds no committed event for it. NOT a 404: the campaign is
 *   launchable and has no head to name.
 * - `404` - no such campaign.
 * - `500 {error}` - a journaled campaign with no effective head: the
 *   resolver throws `no-effective-branch` rather than answering
 *   `no-authoritative-stream`, which would name no head for a campaign
 *   the journal holds.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { CampaignLaunchHeadResult } from '@/lib/campaign/authority/campaignLaunchHead';

import {
  campaignLaunchHeadPorts,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import {
  initializeApiDatabase,
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';

type ResponseBody =
  | Exclude<CampaignLaunchHeadResult, { kind: 'campaign-not-found' }>
  | { readonly error: string };

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
    const result = resolveCampaignLaunchHead(campaignLaunchHeadPorts(), id);
    if (result.kind === 'campaign-not-found') {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    sendCaughtApiError(res, error, 'failed to read campaign head');
  }
}
