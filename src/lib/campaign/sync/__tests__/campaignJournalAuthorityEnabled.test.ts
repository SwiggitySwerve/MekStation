/**
 * The campaign journal-authority resolver after the flip (U35d): it answers
 * the production constant, which is on, and no environment key overrides
 * it. The keys the deleted e2e fixture arm read (NEXT_PUBLIC_E2E_MODE with
 * MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY) are set in every combination to
 * show that no arm is left.
 */

import { isCampaignJournalAuthorityEnabled } from '../campaignJournalAuthorityEnabled';
import { CAMPAIGN_JOURNAL_AUTHORITY_ENABLED } from '../JournalCampaignEventStore';

/** The env key the deleted e2e arm read; nothing exports it any more. */
const RETIRED_ARM_KEY = 'MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY';

type ResolverModule = Pick<
  typeof import('../campaignJournalAuthorityEnabled'),
  'isCampaignJournalAuthorityEnabled'
>;

describe('isCampaignJournalAuthorityEnabled', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedArm = process.env[RETIRED_ARM_KEY];

  afterEach(() => {
    restoreEnv('NEXT_PUBLIC_E2E_MODE', savedMode);
    restoreEnv(RETIRED_ARM_KEY, savedArm);
  });

  it('answers the production constant, which is on', () => {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    delete process.env[RETIRED_ARM_KEY];

    expect(CAMPAIGN_JOURNAL_AUTHORITY_ENABLED).toBe(true);
    expect(isCampaignJournalAuthorityEnabled()).toBe(true);
  });

  it.each([
    ['false', undefined],
    ['true', undefined],
    ['false', '1'],
    ['true', '1'],
  ])(
    'answers true with NEXT_PUBLIC_E2E_MODE=%s and the retired arm key %s',
    (mode, arm) => {
      process.env.NEXT_PUBLIC_E2E_MODE = mode;
      restoreEnv(RETIRED_ARM_KEY, arm);

      expect(isCampaignJournalAuthorityEnabled()).toBe(true);
    },
  );

  it('has no environment override: with the constant forced off, the retired arm keys answer false', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[RETIRED_ARM_KEY] = '1';
    let answer: boolean | undefined;
    jest.isolateModules(() => {
      jest.doMock('../JournalCampaignEventStore', () => ({
        CAMPAIGN_JOURNAL_AUTHORITY_ENABLED: false,
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const resolver =
        require('../campaignJournalAuthorityEnabled') as ResolverModule;
      answer = resolver.isCampaignJournalAuthorityEnabled();
    });

    expect(answer).toBe(false);
  });
});

/** Restores a process env key (deleting it for undefined) so later suites cannot inherit it. */
function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
