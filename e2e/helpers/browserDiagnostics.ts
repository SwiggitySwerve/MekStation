import {
  expect,
  type ConsoleMessage,
  type Page,
  type Request,
  type TestInfo,
} from '@playwright/test';

import {
  formatBrowserDiagnosticEvents,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  type BrowserDiagnosticEvent,
} from './browserDiagnosticsModel';

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
    const url = request.url();
    const resourceType = request.resourceType();
    if (!shouldCaptureRequestFailure(url, resourceType)) {
      return;
    }

    events.push({
      type: 'requestfailed',
      timestamp: now(),
      pageUrl: currentPageUrl(),
      method: request.method(),
      url,
      resourceType,
      failureText: request.failure()?.errorText ?? 'unknown request failure',
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

  const attach = async (testInfo?: TestInfo): Promise<void> => {
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
      const fatalEvents = events.filter(isFatalBrowserDiagnosticEvent);
      if (fatalEvents.length > 0) {
        await attach(testInfo);
      }
      expect(fatalEvents, formatBrowserDiagnosticEvents(events)).toEqual([]);
    },
    attach,
    dispose(): void {
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
      page.off('console', onConsole);
    },
  };
}
