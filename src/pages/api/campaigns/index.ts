/**
 * /api/campaigns collection endpoint
 *
 * GET — returns `ICampaignSummary[]` for every stored campaign, newest
 * saved first. Lightweight projection — never the full body (design D7).
 *
 * Spec scenario this satisfies:
 *  - "List returns summaries only"
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D7)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';

import {
  initializeApiDatabase,
  sendCaughtApiError,
} from '@/pages-modules/api/routeHelpers';
import { listCampaignSummaries } from '@/services/campaignPersistence/CampaignPersistenceService';

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<readonly ICampaignSummary[] | ErrorResponse>,
): Promise<void> {
  if (!initializeApiDatabase(res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    const summaries = listCampaignSummaries();
    res.status(200).json(summaries);
  } catch (error) {
    sendCaughtApiError(res, error, 'failed to list campaigns');
  }
}
