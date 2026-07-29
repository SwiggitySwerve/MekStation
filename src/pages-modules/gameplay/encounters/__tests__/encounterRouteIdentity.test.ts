import type { NextRouter } from 'next/router';

import { encounterRouteIdentityFromRouter } from '../encounterRouteIdentity';

type EncounterRouter = Pick<NextRouter, 'asPath' | 'query'>;

function routerWith(
  query: NextRouter['query'],
  asPath: string,
): EncounterRouter {
  return { query, asPath };
}

describe('encounter route identity', () => {
  it('prefers parsed router values when every source is populated', () => {
    const identity = encounterRouteIdentityFromRouter(
      routerWith(
        {
          id: 'query-encounter',
          campaignId: 'query-campaign',
          missionId: 'query-mission',
        },
        '/gameplay/encounters/as-path-encounter?campaignId=as-path-campaign&missionId=as-path-mission',
      ),
      {
        pathname: '/gameplay/encounters/browser-encounter',
        search: '?campaignId=browser-campaign&missionId=browser-mission',
      },
    );

    expect(identity).toEqual({
      encounterId: 'query-encounter',
      campaignId: 'query-campaign',
      missionId: 'query-mission',
    });
  });

  it('recovers the encounter and campaign linkage from the browser URL', () => {
    const identity = encounterRouteIdentityFromRouter(
      routerWith({}, '/gameplay/encounters/[id]'),
      {
        pathname: '/gameplay/encounters/encounter%20one',
        search: '?campaignId=campaign-one&missionId=mission-one',
      },
    );

    expect(identity).toEqual({
      encounterId: 'encounter one',
      campaignId: 'campaign-one',
      missionId: 'mission-one',
    });
  });

  it('falls back to the concrete router path when the browser URL is unavailable', () => {
    const identity = encounterRouteIdentityFromRouter(
      routerWith(
        { id: '[id]', campaignId: '[campaignId]' },
        '/gameplay/encounters/as-path-encounter/pre-battle?campaignId=as-path-campaign&missionId=as-path-mission',
      ),
      { pathname: '', search: '' },
    );

    expect(identity).toEqual({
      encounterId: 'as-path-encounter',
      campaignId: 'as-path-campaign',
      missionId: 'as-path-mission',
    });
  });

  it('rejects missing, placeholder, and non-encounter identities', () => {
    expect(
      encounterRouteIdentityFromRouter(
        routerWith(
          { id: '[id]' },
          '/gameplay/encounters/%5Bid%5D?campaignId=%5BcampaignId%5D',
        ),
        { pathname: '/api/encounters/server-encounter', search: '' },
      ),
    ).toEqual({
      encounterId: null,
      campaignId: null,
      missionId: null,
    });
  });
});
