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

export type EncounterForceSelectionSide = 'player' | 'opponent';

type EncounterRouteLinkage = Pick<
  EncounterRouteIdentity,
  'campaignId' | 'missionId'
>;

export function buildEncounterDetailHref(
  encounterId: string,
  linkage: EncounterRouteLinkage,
): string {
  return appendEncounterLinkage(
    `/gameplay/encounters/${encodeURIComponent(encounterId)}`,
    linkage,
  );
}

export function buildEncounterForceSelectionHref(
  encounterId: string,
  side: EncounterForceSelectionSide,
  linkage: EncounterRouteLinkage,
): string {
  const params = encounterLinkageParams(linkage);
  params.set('type', side);
  return `/gameplay/encounters/${encodeURIComponent(
    encounterId,
  )}/select-force?${params.toString()}`;
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

export function encounterForceSelectionSideFromRouter(
  router: EncounterRouter,
  browserLocation = currentBrowserLocation(),
): EncounterForceSelectionSide | null {
  const candidate =
    routeValue(router.query.type) ??
    searchValue(browserLocation.search, 'type') ??
    searchValue(router.asPath, 'type');

  return candidate === 'player' || candidate === 'opponent' ? candidate : null;
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

function appendEncounterLinkage(
  path: string,
  linkage: EncounterRouteLinkage,
): string {
  const suffix = encounterLinkageParams(linkage).toString();
  return suffix ? `${path}?${suffix}` : path;
}

function encounterLinkageParams(
  linkage: EncounterRouteLinkage,
): URLSearchParams {
  const params = new URLSearchParams();
  if (linkage.campaignId) {
    params.set('campaignId', linkage.campaignId);
  }
  if (linkage.missionId) {
    params.set('missionId', linkage.missionId);
  }
  return params;
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
