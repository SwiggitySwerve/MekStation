import type { NextRouter } from 'next/router';

type RouteValue = string | string[] | undefined;
type EncounterRouter = Pick<NextRouter, 'asPath' | 'query'>;

interface BrowserLocation {
  readonly pathname: string;
  readonly search: string;
}

export interface EncounterRouteIdentity {
  readonly encounterId: string | null;
  readonly campaignId: string | null;
  readonly missionId: string | null;
}

export function encounterRouteIdentityFromRouter(
  router: EncounterRouter,
  browserLocation = currentBrowserLocation(),
): EncounterRouteIdentity {
  return {
    encounterId:
      routeValue(router.query.id) ??
      encounterIdFromPath(browserLocation.pathname) ??
      encounterIdFromPath(router.asPath),
    campaignId:
      routeValue(router.query.campaignId) ??
      searchValue(browserLocation.search, 'campaignId') ??
      searchValue(router.asPath, 'campaignId'),
    missionId:
      routeValue(router.query.missionId) ??
      searchValue(browserLocation.search, 'missionId') ??
      searchValue(router.asPath, 'missionId'),
  };
}

function routeValue(value: RouteValue): string | null {
  const candidate = Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  const normalized = candidate?.trim() ?? '';
  return normalized.length > 0 && !/^\[[^\]]+\]$/.test(normalized)
    ? normalized
    : null;
}

function encounterIdFromPath(path: string): string | null {
  const segments = path
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);
  if (segments[0] !== 'gameplay' || segments[1] !== 'encounters') {
    return null;
  }
  return routeValue(segments[2]);
}

function searchValue(pathOrSearch: string, key: string): string | null {
  const queryIndex = pathOrSearch.indexOf('?');
  const search =
    queryIndex >= 0 ? pathOrSearch.slice(queryIndex + 1) : pathOrSearch;
  return routeValue(new URLSearchParams(search).get(key) ?? undefined);
}

function currentBrowserLocation(): BrowserLocation {
  return typeof window === 'undefined'
    ? { pathname: '', search: '' }
    : { pathname: window.location.pathname, search: window.location.search };
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
