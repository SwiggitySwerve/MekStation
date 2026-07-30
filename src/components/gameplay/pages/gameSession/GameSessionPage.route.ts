import type { NextRouter } from 'next/router';

import { resolveSpectatorRouteMode } from '@/lib/gameplay/tacticalNavigation';

import { resolveGameSessionRouteId } from './GameSessionPage.lifecycle';

export interface GameSessionRouteContext {
  readonly routeId: string | null;
  readonly campaignId?: string;
  readonly missionId?: string;
  readonly matchId: string | null;
  readonly isSpectatorMode: boolean;
}

export function gameSessionRouteContext(
  router: NextRouter,
): GameSessionRouteContext {
  const { id, campaignId, missionId, spectator } = router.query;
  const routeId = resolveGameSessionRouteId(
    id,
    typeof window === 'undefined' ? router.asPath : window.location.pathname,
  );
  const routeHref =
    typeof window === 'undefined' ? router.asPath : window.location.href;

  return {
    routeId,
    campaignId: stringQueryValue(campaignId),
    missionId: stringQueryValue(missionId),
    matchId: routeId && routeId !== 'demo' ? routeId : null,
    isSpectatorMode: resolveSpectatorRouteMode(spectator, routeHref),
  };
}

function stringQueryValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
