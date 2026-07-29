import type { NextRouter } from 'next/router';

import {
  campaignRouteIdFromPath,
  campaignRouteIdFromRouter,
} from '../campaignRouteIdentity';

type CampaignRouteRouter = Pick<NextRouter, 'asPath' | 'query'>;

function routerWith(
  query: NextRouter['query'],
  asPath: string,
): CampaignRouteRouter {
  return { query, asPath };
}

describe('campaign route identity', () => {
  it('prefers the parsed query id when every source is populated', () => {
    // Given
    const router = routerWith(
      { id: 'query-campaign' },
      '/gameplay/campaigns/as-path-campaign/missions',
    );

    // When
    const campaignId = campaignRouteIdFromRouter(
      router,
      '/gameplay/campaigns/browser-campaign/missions',
    );

    // Then
    expect(campaignId).toBe('query-campaign');
  });

  it('uses the concrete browser pathname when the query id is absent', () => {
    // Given
    const router = routerWith(
      {},
      '/gameplay/campaigns/as-path-campaign/missions',
    );

    // When
    const campaignId = campaignRouteIdFromRouter(
      router,
      '/gameplay/campaigns/browser-campaign/missions/mission-1/launch',
    );

    // Then
    expect(campaignId).toBe('browser-campaign');
  });

  it('uses the concrete router path when browser identity is unavailable', () => {
    // Given
    const router = routerWith(
      {},
      '/gameplay/campaigns/as-path-campaign/missions/mission-1/launch',
    );

    // When
    const campaignId = campaignRouteIdFromRouter(router, '');

    // Then
    expect(campaignId).toBe('as-path-campaign');
  });

  it('rejects missing and placeholder campaign identities', () => {
    // Given
    const router = routerWith(
      { id: '[id]' },
      '/gameplay/campaigns/%5Bid%5D/missions/mission-1/launch',
    );

    // When
    const campaignId = campaignRouteIdFromRouter(router, '/gameplay/campaigns');

    // Then
    expect(campaignId).toBeNull();
    expect(
      campaignRouteIdFromPath('/api/campaigns/server-campaign'),
    ).toBeNull();
  });
});
