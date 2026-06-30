import { RulesLevel } from '@/types/enums/RulesLevel';

import {
  buildCampaignCustomizerHref,
  buildCampaignCustomizerReturnHref,
  parseCampaignCustomizerRouteState,
} from '../campaignCustomizerRoute';

describe('campaignCustomizerRoute', () => {
  it('round-trips campaign refit route state including optional mission context', () => {
    const href = buildCampaignCustomizerHref({
      campaignId: 'campaign-1',
      unitId: 'unit-atlas',
      missionId: 'mission-1',
      returnTo: 'mission-readiness',
      campaignDate: '3025-01-03T00:00:00.000Z',
      budget: 1250000,
      rulesLevel: RulesLevel.ADVANCED,
      refitConstraints: 'campaign-owned-refit',
      editorUnitId: '11111111-1111-4111-8111-111111111111',
      tabId: 'armor',
    });

    expect(href).toContain(
      '/customizer/11111111-1111-4111-8111-111111111111/armor?',
    );

    const parsed = parseCampaignCustomizerRouteState(
      Object.fromEntries(new URL(`http://test.local${href}`).searchParams),
    );

    expect(parsed).toEqual({
      mode: 'campaign-refit',
      campaignId: 'campaign-1',
      unitId: 'unit-atlas',
      missionId: 'mission-1',
      returnTo: 'mission-readiness',
      campaignDate: '3025-01-03T00:00:00.000Z',
      budget: 1250000,
      rulesLevel: RulesLevel.ADVANCED,
      refitConstraints: 'campaign-owned-refit',
      editorUnitId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('builds readiness and stable return hrefs that request validation refresh', () => {
    const readiness = parseCampaignCustomizerRouteState({
      mode: 'campaign-refit',
      campaignId: 'campaign-1',
      unitId: 'unit-atlas',
      missionId: 'mission-1',
      returnTo: 'mission-readiness',
      campaignDate: '3025-01-03T00:00:00.000Z',
      budget: '100',
      rulesLevel: RulesLevel.STANDARD,
      refitConstraints: 'campaign-owned-refit',
    });
    expect(readiness).not.toBeNull();

    expect(
      buildCampaignCustomizerReturnHref(readiness!, {
        status: 'saved',
        refitOrderId: 'refit-1',
      }),
    ).toBe(
      '/gameplay/campaigns/campaign-1/missions/mission-1/launch?unit=unit-atlas&refresh=deployment-validation&customizerResult=saved&refitOrderId=refit-1',
    );

    expect(
      buildCampaignCustomizerReturnHref({
        ...readiness!,
        returnTo: 'mek-stable',
      }),
    ).toBe(
      '/gameplay/campaigns/campaign-1/mech-bay?unit=unit-atlas&refresh=deployment-validation',
    );
  });
});
