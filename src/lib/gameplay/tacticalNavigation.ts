interface SessionRouter {
  push: (href: string) => Promise<boolean> | boolean | void;
}

interface GameSessionNavigationOptions {
  readonly spectator?: boolean;
}

export function resolveSpectatorRouteMode(
  spectator: string | readonly string[] | undefined,
  asPath: string,
): boolean {
  const queryValue = Array.isArray(spectator) ? spectator[0] : spectator;
  if (queryValue !== undefined) {
    return queryValue === '1';
  }

  return (
    new URLSearchParams(asPath.split('?')[1] ?? '').get('spectator') === '1'
  );
}

export function gameSessionHref(
  sessionId: string,
  options: GameSessionNavigationOptions = {},
): string {
  const href = `/gameplay/games/${encodeURIComponent(sessionId)}`;
  return options.spectator ? `${href}?spectator=1` : href;
}

export function navigateToGameSession(
  sessionId: string,
  router?: SessionRouter,
  options: GameSessionNavigationOptions = {},
): void {
  const href = gameSessionHref(sessionId, options);

  if (router) {
    void router?.push(href);
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (`${window.location.pathname}${window.location.search}` === href) {
    return;
  }

  window.location.assign(href);
}
