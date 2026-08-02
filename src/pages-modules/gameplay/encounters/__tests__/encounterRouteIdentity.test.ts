import type { NextRouter } from 'next/router';

import {
  buildEncounterDetailHref,
  buildEncounterForceSelectionHref,
  encounterForceSelectionSideFromRouter,
  encounterRouteIdentityFromRouter,
} from '../encounterRouteIdentity';

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

  it('recovers a force-selection side from the concrete browser URL', () => {
    expect(
      encounterForceSelectionSideFromRouter(
        routerWith({}, '/gameplay/encounters/[id]/select-force'),
        {
          pathname: '/gameplay/encounters/encounter-one/select-force',
          search: '?type=opponent',
        },
      ),
    ).toBe('opponent');
  });

  it('rejects missing and unsupported force-selection sides', () => {
    expect(
      encounterForceSelectionSideFromRouter(
        routerWith(
          { type: 'spectator' },
          '/gameplay/encounters/encounter-one/select-force?type=guest',
        ),
        { pathname: '', search: '?type=host' },
      ),
    ).toBeNull();
  });

  it('preserves campaign linkage in detail and force-selection links', () => {
    const linkage = {
      campaignId: 'campaign one',
      missionId: 'mission/one',
    };

    expect(buildEncounterDetailHref('encounter/one', linkage)).toBe(
      '/gameplay/encounters/encounter%2Fone?campaignId=campaign+one&missionId=mission%2Fone',
    );
    expect(
      buildEncounterForceSelectionHref('encounter/one', 'opponent', linkage),
    ).toBe(
      '/gameplay/encounters/encounter%2Fone/select-force?campaignId=campaign+one&missionId=mission%2Fone&type=opponent',
    );
  });
});
