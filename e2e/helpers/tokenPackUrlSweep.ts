import { expect, type Page } from '@playwright/test';

/**
 * Watch every HTTP request and every multiplayer socket URL on a page.
 * The bearer must stay in `Sec-WebSocket-Protocol`, never in a URL.
 */
export function observeSocketAndRequestUrls(
  page: Page,
  socketUrls: string[],
  requestUrls: string[],
): Promise<void> {
  page.on('request', (request) => requestUrls.push(request.url()));
  return page.routeWebSocket(
    (url) => {
      if (url.pathname !== '/api/multiplayer/socket') return false;
      socketUrls.push(url.toString());
      return true;
    },
    (route) => {
      const server = route.connectToServer();
      route.onMessage((message) => server.send(message));
      server.onMessage((message) => route.send(message));
    },
  );
}

/** Reject a `?token=` query or the concrete bearer in any captured URL. */
export function assertNoBearerInUrls(
  urls: readonly string[],
  bearerTokens: readonly string[],
): void {
  for (const value of urls) {
    const url = new URL(value);
    // Mutant: restore `?token=` to the WS URL. This rejects it even if
    // the base64 value is encoded and would otherwise evade raw matching.
    expect(url.searchParams.has('token')).toBe(false);
    for (const token of bearerTokens) {
      // Mutant: move the bearer to any other URL field. This catches the
      // concrete secret, while `socketCredentialProtocol` owns the header.
      expect(value).not.toContain(token);
    }
  }
}
