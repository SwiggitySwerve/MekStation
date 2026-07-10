export type BrowserDiagnosticEvent =
  | {
      readonly type: 'pageerror';
      readonly timestamp: string;
      readonly pageUrl: string;
      readonly message: string;
      readonly name?: string;
      readonly stack?: string;
    }
  | {
      readonly type: 'requestfailed';
      readonly timestamp: string;
      readonly pageUrl: string;
      readonly method: string;
      readonly url: string;
      readonly resourceType: string;
      readonly failureText: string;
    }
  | {
      readonly type: 'console';
      readonly timestamp: string;
      readonly pageUrl: string;
      readonly consoleType: string;
      readonly text: string;
      readonly location: {
        readonly url?: string;
        readonly lineNumber?: number;
        readonly columnNumber?: number;
      };
    };

export function shouldCaptureRequestFailure(
  url: string,
  resourceType: string,
): boolean {
  return (
    resourceType === 'fetch' ||
    resourceType === 'xhr' ||
    /\/api(\/|\?|$)/.test(url)
  );
}

export function isFatalBrowserDiagnosticEvent(
  event: BrowserDiagnosticEvent,
): boolean {
  if (event.type !== 'requestfailed') {
    return true;
  }

  if (event.failureText !== 'net::ERR_ABORTED') {
    return true;
  }

  // net::ERR_ABORTED means the BROWSER cancelled an in-flight request
  // (navigation away), not that the app failed. Aborted reads are benign —
  // the next mount refetches. Aborted API WRITES stay fatal: a save cancelled
  // by navigation is silent data loss (the fire-and-forget persistence bug
  // class from the 2026-07 co-op waves).
  return (
    /\/api(\/|\?|$)/.test(event.url) &&
    !['GET', 'HEAD', 'OPTIONS'].includes(event.method.toUpperCase())
  );
}

export function formatBrowserDiagnosticEvents(
  events: readonly BrowserDiagnosticEvent[],
): string {
  if (events.length === 0) {
    return 'No browser diagnostics captured.';
  }

  return events
    .map((event, index) => {
      const prefix = `${index + 1}. [${event.type}] ${event.timestamp}`;
      if (event.type === 'pageerror') {
        return [
          prefix,
          `page: ${event.pageUrl}`,
          `message: ${event.message}`,
          event.stack ? `stack: ${event.stack}` : null,
        ]
          .filter(Boolean)
          .join('\n');
      }
      if (event.type === 'requestfailed') {
        return [
          prefix,
          `page: ${event.pageUrl}`,
          `request: ${event.method} ${event.url}`,
          `resource: ${event.resourceType}`,
          `failure: ${event.failureText}`,
        ].join('\n');
      }
      return [
        prefix,
        `page: ${event.pageUrl}`,
        `console: ${event.consoleType}`,
        `text: ${event.text}`,
        event.location.url ? `source: ${event.location.url}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
