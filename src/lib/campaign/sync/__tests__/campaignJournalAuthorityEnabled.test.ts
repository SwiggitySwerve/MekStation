/**
 * Two-key law for the journal-authority fixture resolver.
 *
 * Predicted red before the resolver existed: this module had no export,
 * and even after a naive `env === '1'` check the e2e-mode-off case would
 * still return true.
 */

import {
  CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV,
  isCampaignJournalAuthorityEnabled,
} from '../campaignJournalAuthorityEnabled';

describe('isCampaignJournalAuthorityEnabled', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedArm = process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV];

  afterEach(() => {
    restoreEnv('NEXT_PUBLIC_E2E_MODE', savedMode);
    restoreEnv(CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV, savedArm);
  });

  it('is true only when e2e mode and the fixture env are both set', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';
    process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV] = '1';
    expect(isCampaignJournalAuthorityEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    delete process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV];
    expect(isCampaignJournalAuthorityEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV] = '1';
    expect(isCampaignJournalAuthorityEnabled()).toBe(true);
  });
});

/** Restores a process env key so later suites cannot inherit this arm. */
function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
