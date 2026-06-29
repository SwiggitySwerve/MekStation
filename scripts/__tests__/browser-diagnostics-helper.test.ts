import {
  formatBrowserDiagnosticEvents,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  type BrowserDiagnosticEvent,
} from '../../e2e/helpers/browserDiagnosticsModel';

describe('browser diagnostics helper', () => {
  it('captures fetch, xhr, and API request failures while ignoring static asset noise', () => {
    expect(shouldCaptureRequestFailure('/api/campaigns/abc', 'document')).toBe(
      true,
    );
    expect(shouldCaptureRequestFailure('/gameplay/campaigns', 'fetch')).toBe(
      true,
    );
    expect(shouldCaptureRequestFailure('/campaigns/save', 'xhr')).toBe(true);
    expect(
      shouldCaptureRequestFailure('/_next/static/chunk.js', 'script'),
    ).toBe(false);
  });

  it('treats aborted non-API fetches as context while keeping API failures fatal', () => {
    expect(
      isFatalBrowserDiagnosticEvent({
        type: 'requestfailed',
        timestamp: '3025-01-01T00:00:00.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
        method: 'GET',
        url: 'http://localhost:3600/data/equipment/official/ammunition/atm.json',
        resourceType: 'fetch',
        failureText: 'net::ERR_ABORTED',
      }),
    ).toBe(false);

    expect(
      isFatalBrowserDiagnosticEvent({
        type: 'requestfailed',
        timestamp: '3025-01-01T00:00:00.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
        method: 'PUT',
        url: 'http://localhost:3600/api/campaigns/campaign-1',
        resourceType: 'fetch',
        failureText: 'net::ERR_ABORTED',
      }),
    ).toBe(true);
  });

  it('formats page, request, and console diagnostics with triage details', () => {
    const events: BrowserDiagnosticEvent[] = [
      {
        type: 'pageerror',
        timestamp: '3025-01-01T00:00:00.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
        message: 'Failed to fetch',
        name: 'TypeError',
        stack: 'TypeError: Failed to fetch',
      },
      {
        type: 'requestfailed',
        timestamp: '3025-01-01T00:00:01.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
        method: 'PUT',
        url: 'http://localhost:3600/api/campaigns/campaign-1',
        resourceType: 'fetch',
        failureText: 'net::ERR_CONNECTION_RESET',
      },
      {
        type: 'console',
        timestamp: '3025-01-01T00:00:02.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
        consoleType: 'error',
        text: 'campaign save failed',
        location: {
          url: 'webpack-internal:///campaignPersistence.ts',
        },
      },
    ];

    const formatted = formatBrowserDiagnosticEvents(events);

    expect(formatted).toContain('[pageerror]');
    expect(formatted).toContain('message: Failed to fetch');
    expect(formatted).toContain(
      'request: PUT http://localhost:3600/api/campaigns/campaign-1',
    );
    expect(formatted).toContain('failure: net::ERR_CONNECTION_RESET');
    expect(formatted).toContain('console: error');
    expect(formatted).toContain(
      'source: webpack-internal:///campaignPersistence.ts',
    );
  });
});
