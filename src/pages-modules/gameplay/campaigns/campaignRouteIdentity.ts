import type { NextRouter } from 'next/router';

type CampaignRouteValue = string | string[] | undefined;
type CampaignRouteRouter = Pick<NextRouter, 'asPath' | 'query'>;

export function campaignRouteIdFrom(value: CampaignRouteValue): string | null {
  const candidate = Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  const normalized = candidate?.trim() ?? '';
  return normalized.length > 0 && !/^\[[^\]]+\]$/.test(normalized)
    ? normalized
    : null;
}

export function campaignRouteIdFromPath(path: string): string | null {
  const segments = path
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);
  if (segments[0] !== 'gameplay' || segments[1] !== 'campaigns') {
    return null;
  }
  return campaignRouteIdFrom(segments[2]);
}

export function campaignRouteIdFromRouter(
  router: CampaignRouteRouter,
  browserPathname = currentBrowserPathname(),
): string | null {
  return (
    campaignRouteIdFrom(router.query.id) ??
    campaignRouteIdFromPath(browserPathname) ??
    campaignRouteIdFromPath(router.asPath)
  );
}

function currentBrowserPathname(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
