/**
 * Co-op session start on a campaign that holds a contract above the reader
 * level (S1b answer 3): refused with a named reason until S6.
 *
 * The campaign sync path carries no version gate, and a host and guest would
 * each fold the contract with the legacy rules. The check reads the STORED
 * campaign (the co-op `state` is a roster projection and has no contracts) and
 * runs before any match, seat, force claim or host registration exists.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { NextApiResponse } from 'next';

import { scanLifecycleRequirement } from '@/lib/campaign/persistence/lifecycleReaderGate';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { exceedsReaderLevel } from '@/types/campaign/ContractLifecycleRules';

export const COOP_LIFECYCLE_BLOCKED_CODE = 'CAMPAIGN_COOP_LIFECYCLE_BLOCKED';
export const COOP_LIFECYCLE_BLOCKED_REASON =
  'contract-rules-not-supported-in-coop';

/**
 * True when the start was refused and the response is already sent.
 * With no database there is no stored campaign to read, the same structural
 * convention the creation checkpoint ports use.
 */
export function refuseCoopStartOnLifecycleCampaign(
  res: NextApiResponse,
  campaignId: string,
): boolean {
  if (!getSQLiteService().isInitialized()) return false;
  const stored = readCampaign(campaignId);
  if (stored.kind !== 'ok') return false;
  const scan = scanLifecycleRequirement(stored.record.body);
  if (!scan.unreadable && !exceedsReaderLevel(scan.required)) return false;
  res.status(409).json({
    error:
      'This campaign has contracts that use newer rules, and co-op sessions do not support them yet. You can keep playing it solo, or wait for a version that supports both. Nothing was changed.',
    code: COOP_LIFECYCLE_BLOCKED_CODE,
    reason: COOP_LIFECYCLE_BLOCKED_REASON,
  });
  return true;
}
