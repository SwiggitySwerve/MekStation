/**
 * Disarm campaign/combat E2E overrides for a test row, then restore its caller's
 * environment. The adjacent guard test pins all runtime MEKSTATION_E2E_ names
 * so a new arm cannot silently bypass this named-key isolation.
 */
export function useCampaignE2eEnvironment(): void {
  let campaignArm: string | undefined;
  let combatArm: string | undefined;

  beforeEach(() => {
    campaignArm = process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
    combatArm = process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
    delete process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
    delete process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
  });

  afterEach(() => {
    if (campaignArm === undefined) {
      delete process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
    } else {
      process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY = campaignArm;
    }
    if (combatArm === undefined) {
      delete process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
    } else {
      process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE = combatArm;
    }
  });
}
