import {
  missionRouteIdFromPath,
  routeParam,
  searchParam,
} from '../missionLaunchPage.helpers';

describe('missionLaunchPage.helpers', () => {
  it('uses the first route param value', () => {
    expect(routeParam(['mission-alpha', 'mission-beta'])).toBe('mission-alpha');
    expect(routeParam('mission-alpha')).toBe('mission-alpha');
    expect(routeParam('[missionId]')).toBeNull();
    expect(routeParam(undefined)).toBeNull();
  });

  it('recovers the mission launch id from the path when router.query is sparse', () => {
    expect(
      missionRouteIdFromPath(
        '/gameplay/campaigns/campaign-1/missions/mission-alpha/launch?unit=atlas',
      ),
    ).toBe('mission-alpha');
    expect(
      missionRouteIdFromPath(
        '/gameplay/campaigns/campaign-1/missions/mission%20alpha/launch',
      ),
    ).toBe('mission alpha');
    expect(
      missionRouteIdFromPath('/gameplay/campaigns/campaign-1/mech-bay'),
    ).toBeNull();
  });

  it('recovers concrete query params from the browser search string', () => {
    expect(searchParam('?customizerResult=saved', 'customizerResult')).toBe(
      'saved',
    );
    expect(
      searchParam(
        '?customizerResult=%5BcustomizerResult%5D',
        'customizerResult',
      ),
    ).toBeNull();
    expect(searchParam('?unit=atlas', 'customizerResult')).toBeNull();
  });
});
