interface SessionRouter {
  push: (href: string) => Promise<boolean> | boolean | void;
}

export function gameSessionHref(sessionId: string): string {
  return `/gameplay/games/${encodeURIComponent(sessionId)}`;
}

export function navigateToGameSession(
  sessionId: string,
  router?: SessionRouter,
): void {
  const href = gameSessionHref(sessionId);

  if (router) {
    void router?.push(href);
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === href) {
    return;
  }

  window.location.assign(href);
}
