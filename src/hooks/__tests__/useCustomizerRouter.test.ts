import {
  buildCustomizerIndexUrl,
  buildCustomizerUrl,
} from '@/hooks/useCustomizerRouter';

describe('useCustomizerRouter helpers', () => {
  it('preserves campaign refit query state while changing customizer tabs', () => {
    const query = {
      slug: ['11111111-1111-4111-8111-111111111111', 'structure'],
      mode: 'campaign-refit',
      campaignId: 'campaign-1',
      unitId: 'unit-atlas',
      returnTo: 'mission-readiness',
    };

    expect(
      buildCustomizerUrl(
        '11111111-1111-4111-8111-111111111111',
        'armor',
        query,
      ),
    ).toBe(
      '/customizer/11111111-1111-4111-8111-111111111111/armor?mode=campaign-refit&campaignId=campaign-1&unitId=unit-atlas&returnTo=mission-readiness',
    );

    expect(buildCustomizerIndexUrl(query)).toBe(
      '/customizer?mode=campaign-refit&campaignId=campaign-1&unitId=unit-atlas&returnTo=mission-readiness',
    );
  });
});
