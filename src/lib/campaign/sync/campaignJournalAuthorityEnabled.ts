/**
 * Fixture-scoped journal-authority resolver (council D2).
 *
 * Production stays on `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` (hardcoded
 * false). The only extra true path is an e2e process that opted in with
 * MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY=1. Both keys are required so
 * a production process can never arm this and a default e2e run cannot
 * either.
 */

import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from './JournalCampaignEventStore';

/** Env key the authority-recovery QC group sets on the e2e server. */
export const CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV =
  'MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY' as const;

/**
 * True only when this process is in Playwright e2e mode (the same
 * NEXT_PUBLIC_E2E_MODE==='true' check e2eFaultRoute uses) AND the
 * recovery group set the explicit opt-in env to '1'. Either key alone
 * must stay false so production and unarmed e2e cannot write genesis.
 */
export function e2eJournalAuthorityArmed(): boolean {
  return (
    process.env.NEXT_PUBLIC_E2E_MODE === 'true' &&
    process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV] === '1'
  );
}

/**
 * Whether create/adopt may write journal-authority markers. Reads the
 * production constant first so a future cutover flip stays one switch;
 * ORs the e2e fixture arm so E2E-01/02 can prove recovery without
 * moving that production default.
 */
export function isCampaignJournalAuthorityEnabled(): boolean {
  return CAMPAIGN_JOURNAL_AUTHORITY_ENABLED || e2eJournalAuthorityArmed();
}
