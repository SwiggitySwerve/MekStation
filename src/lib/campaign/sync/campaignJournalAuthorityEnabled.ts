/**
 * Campaign journal-authority resolver (council D2). Answers the production
 * constant `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED`, which is on; no
 * environment key overrides it (U35d deleted the e2e fixture arm). The
 * campaign PUT create, the adopt route and co-op match creation read it
 * through this function.
 */

import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from './JournalCampaignEventStore';

/**
 * Whether a create or adoption writes the journal genesis and the
 * journal-native marker, and co-op creation runs its genesis-branch step:
 * the production constant, with no override.
 */
export function isCampaignJournalAuthorityEnabled(): boolean {
  return CAMPAIGN_JOURNAL_AUTHORITY_ENABLED;
}
