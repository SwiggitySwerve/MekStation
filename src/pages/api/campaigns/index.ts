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

import { listCampaignSummaries } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<readonly ICampaignSummary[] | ErrorResponse>,
): Promise<void> {
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    res.status(500).json({ error: message });
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    const summaries = listCampaignSummaries();
    res.status(200).json(summaries);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'failed to list campaigns';
    res.status(500).json({ error: message });
  }
}
