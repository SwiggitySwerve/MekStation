import {
  expect,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
  type TestInfo,
} from '@playwright/test';

import {
  diffAcknowledgedPut,
  evaluateAbortedWriteReceipt,
  formatBrowserDiagnosticEvents,
  isAbortedApiWrite,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  type BrowserDiagnosticEvent,
} from './browserDiagnosticsModel';
import { putBaseVersion } from './browserWriteComparison';

export {
  formatBrowserDiagnosticEvents,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  type BrowserDiagnosticEvent,
} from './browserDiagnosticsModel';

export interface BrowserDiagnostics {
  readonly events: readonly BrowserDiagnosticEvent[];
  assertNoErrors(testInfo?: TestInfo): Promise<void>;
  attach(testInfo?: TestInfo): Promise<void>;
  dispose(): void;
}

export async function withBrowserDiagnostics<T>(
  page: Page,
  testInfo: TestInfo | undefined,
  run: (diagnostics: BrowserDiagnostics) => Promise<T>,
): Promise<T> {
  const diagnostics = installBrowserDiagnostics(page);
  let failed = false;
  try {
    const result = await run(diagnostics);
    await diagnostics.assertNoErrors(testInfo);
    return result;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (failed) {
      await diagnostics.attach(testInfo);
    }
    diagnostics.dispose();
  }
}

const DEFAULT_CONSOLE_TYPES = new Set(['error']);

export function installBrowserDiagnostics(page: Page): BrowserDiagnostics {
  const events: BrowserDiagnosticEvent[] = [];
  let attached = false;
  const acknowledgedPuts = new Map<string, string>();
  const inFlightPuts = new Set<Request>();
  const putSnapshots = new WeakMap<
    Request,
    {
      readonly acknowledgedPutPostData: string | undefined;
      readonly sameBasePutsInFlight: readonly {
        readonly url: string;
        readonly postData: string | null;
      }[];
    }
  >();
  const resourceKey = (url: string): string => {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  };
  const onResponse = (response: Response): void => {
    const request = response.request();
    if (request.method() === 'PUT' && response.ok()) {
      const body = request.postData();
      if (body !== null) acknowledgedPuts.set(resourceKey(request.url()), body);
    }
    inFlightPuts.delete(request);
  };
  const onRequest = (request: Request): void => {
    if (request.method() !== 'PUT') return;
    const key = resourceKey(request.url());
    const base = putBaseVersion(request.postData());
    // Snapshot before adding this request. A may acknowledge after B starts
    // but before B reports failure; that must not erase their overlap.
    putSnapshots.set(request, {
      acknowledgedPutPostData: acknowledgedPuts.get(key),
      sameBasePutsInFlight: [...inFlightPuts]
        .filter(
          (other) =>
            base !== undefined &&
            resourceKey(other.url()) === key &&
            putBaseVersion(other.postData()) === base,
        )
        .map((other) => ({ url: other.url(), postData: other.postData() })),
    });
    inFlightPuts.add(request);
  };
  const onRequestFinished = (request: Request): void => {
    inFlightPuts.delete(request);
  };

  const now = (): string => new Date().toISOString();
  const currentPageUrl = (): string => {
    try {
      return page.url();
    } catch {
      return '<page-url-unavailable>';
    }
  };

  const onPageError = (error: Error): void => {
    events.push({
      type: 'pageerror',
      timestamp: now(),
      pageUrl: currentPageUrl(),
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  };

  const onRequestFailed = (request: Request): void => {
    inFlightPuts.delete(request);
    const url = request.url();
    const resourceType = request.resourceType();
    if (!shouldCaptureRequestFailure(url, resourceType)) {
      return;
    }

    const snapshot = putSnapshots.get(request);
    events.push({
      type: 'requestfailed',
      timestamp: now(),
      pageUrl: currentPageUrl(),
      method: request.method(),
      url,
      resourceType,
      failureText: request.failure()?.errorText ?? 'unknown request failure',
      postData: request.postData(),
      acknowledgedPutPostData: snapshot?.acknowledgedPutPostData,
      sameBasePutInFlight: (snapshot?.sameBasePutsInFlight.length ?? 0) > 0,
      sameBasePutsInFlight: snapshot?.sameBasePutsInFlight ?? [],
      acknowledgedPutDiff: diffAcknowledgedPut(
        request.postData(),
        snapshot?.acknowledgedPutPostData,
      ),
    });
  };

  const onConsole = (message: ConsoleMessage): void => {
    const consoleType = message.type();
    if (!DEFAULT_CONSOLE_TYPES.has(consoleType)) {
      return;
    }

    events.push({
      type: 'console',
      timestamp: now(),
      pageUrl: currentPageUrl(),
      consoleType,
      text: message.text(),
      location: message.location(),
    });
  };

  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('request', onRequest);
  page.on('requestfinished', onRequestFinished);

  const confirmAbortedWrites = async (): Promise<void> => {
    for (const event of events.filter(isAbortedApiWrite)) {
      if (event.receipt) continue;
      const initial = evaluateAbortedWriteReceipt(event, 0, undefined);
      if (initial.reflected) {
        // An unchanged document is redundant regardless of transport outcome.
        event.receipt = initial;
        continue;
      }
      // Direct APIRequestContext GET bypasses both the page and service worker.
      // Poll briefly because requestfailed may precede the keepalive commit.
      let reason = 'receipt GET did not complete';
      try {
        await expect
          .poll(
            async () => {
              let response;
              try {
                response = await page.context().request.get(event.url, {
                  headers: { 'Cache-Control': 'no-cache' },
                  timeout: 1000,
                  maxRedirects: 0,
                });
                const stored: unknown =
                  response.status() === 200 ? await response.json() : undefined;
                event.receipt = evaluateAbortedWriteReceipt(
                  event,
                  response.status(),
                  stored,
                );
              } catch (error) {
                event.receipt = {
                  reflected: false,
                  reason: `aborted write NOT reflected by server: receipt GET failed: ${String(error)}`,
                };
              } finally {
                await response?.dispose();
              }
              reason = event.receipt.reason;
              return event.receipt.reflected;
            },
            { timeout: 5000, intervals: [100, 250, 500] },
          )
          .toBe(true);
      } catch {
        // The assertion below reports the receipt verdict, including GET errors.
        event.receipt = { reflected: false, reason };
      }
    }
  };

  const attach = async (testInfo?: TestInfo): Promise<void> => {
    await confirmAbortedWrites();
    if (!testInfo || attached || events.length === 0) {
      return;
    }
    attached = true;
    await testInfo.attach('browser-diagnostics.json', {
      body: JSON.stringify(events, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('browser-diagnostics.txt', {
      body: formatBrowserDiagnosticEvents(events),
      contentType: 'text/plain',
    });
  };

  return {
    get events() {
      return [...events];
    },
    async assertNoErrors(testInfo?: TestInfo): Promise<void> {
      await confirmAbortedWrites();
      const fatalEvents = events.filter(isFatalBrowserDiagnosticEvent);
      // Preserve delivered aborts too: their bodies answer what navigation sent.
      await attach(testInfo);
      expect(fatalEvents, formatBrowserDiagnosticEvents(events)).toEqual([]);
    },
    attach,
    dispose(): void {
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
      page.off('console', onConsole);
      page.off('response', onResponse);
      page.off('request', onRequest);
      page.off('requestfinished', onRequestFinished);
      inFlightPuts.clear();
    },
  };
}
