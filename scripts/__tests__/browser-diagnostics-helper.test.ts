import type { Page, Request, Response } from '@playwright/test';

import { EventEmitter } from 'node:events';

import { installBrowserDiagnostics } from '../../e2e/helpers/browserDiagnostics';
import {
  diffAcknowledgedPut,
  evaluateAbortedWriteReceipt,
  formatBrowserDiagnosticEvents,
  isFatalBrowserDiagnosticEvent,
  shouldCaptureRequestFailure,
  type BrowserDiagnosticEvent,
} from '../../e2e/helpers/browserDiagnosticsModel';

// Exercise request/response wiring without starting Playwright or a browser.
jest.mock('@playwright/test', () => ({ expect: jest.fn() }));

const previousBody = {
  baseVersion: 3,
  envelope: { body: { date: '3025-01-01', funds: 7 } },
};
const abortedPut = (
  body: unknown,
  acknowledged: unknown = previousBody,
): Extract<BrowserDiagnosticEvent, { type: 'requestfailed' }> => ({
  type: 'requestfailed',
  timestamp: '3025-01-01T00:00:00.000Z',
  pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
  method: 'PUT',
  url: 'http://localhost:3600/api/campaigns/campaign-1',
  resourceType: 'fetch',
  failureText: 'net::ERR_ABORTED',
  postData: JSON.stringify(body),
  acknowledgedPutPostData: JSON.stringify(acknowledged),
});

describe('aborted write outcome guard', () => {
  const body = {
    baseVersion: 4,
    envelope: { body: { date: '3025-01-02', funds: 7 } },
  };

  it('passes an aborted landed write because the stored document carries its changes', () => {
    const event = abortedPut(body);
    event.receipt = evaluateAbortedWriteReceipt(event, 200, {
      version: 5,
      body: body.envelope.body,
    });
    expect(isFatalBrowserDiagnosticEvent(event)).toBe(false);
    expect(event.receipt.reason).toContain(
      'changed fields carried by stored document: /date',
    );
  });

  it('fails an aborted lost write for the receipt reason despite a successful GET', () => {
    const event = abortedPut(body);
    event.receipt = evaluateAbortedWriteReceipt(event, 200, {
      version: 4,
      body: previousBody.envelope.body,
    });
    expect(isFatalBrowserDiagnosticEvent(event)).toBe(true);
    expect(event.receipt.reason).toBe(
      'aborted write NOT reflected by server: fields /date; GET 200; server version 4, request base 4',
    );
    expect(formatBrowserDiagnosticEvents([event])).toContain(
      event.receipt.reason,
    );
  });

  it.each([undefined, {}, { envelope: {} }, { baseVersion: 5 }])(
    'fails closed with no comparable document: %j',
    (requestBody) => {
      const event = abortedPut(requestBody);
      event.receipt = evaluateAbortedWriteReceipt(event, 200, {
        version: 999,
        body: body.envelope.body,
      });
      expect(isFatalBrowserDiagnosticEvent(event)).toBe(true);
      expect(event.receipt.reason).toContain(
        'no parseable object envelope.body (fail closed)',
      );
    },
  );

  it('fails the same-base A/B counterexample: version advanced, B content not reflected', () => {
    // A(base 5) writes the date; B(base 5) also edits funds during unload.
    // A lands at v6, B is dropped or refused. The prior >= version rule passed.
    const ack = {
      baseVersion: 4,
      envelope: { body: { date: '3025-01-01', funds: 7 } },
    };
    const a = {
      baseVersion: 5,
      envelope: { body: { date: '3025-01-02', funds: 7 } },
    };
    const b = {
      baseVersion: 5,
      envelope: { body: { date: '3025-01-02', funds: 8 } },
    };
    const event = {
      ...abortedPut(b, ack),
      sameBasePutInFlight: true,
      sameBasePutsInFlight: [
        {
          url: 'http://localhost:3600/api/campaigns/campaign-1',
          postData: JSON.stringify(a),
        },
      ],
    };
    const receipt = evaluateAbortedWriteReceipt(event, 200, {
      version: 6,
      body: a.envelope.body,
    });
    event.receipt = receipt;
    expect(isFatalBrowserDiagnosticEvent(event)).toBe(true);
    expect(receipt.reason).toBe(
      'aborted write NOT reflected by server: fields /funds; GET 200; server version 6, request base 5',
    );
    expect(formatBrowserDiagnosticEvents([event])).toContain(
      'same-base PUT in flight when this request was issued: true',
    );
    expect(formatBrowserDiagnosticEvents([event])).toContain(
      JSON.stringify(ack),
    );
  });

  it('accepts a later legitimate change to another field, regardless of version', () => {
    const event = abortedPut(body);
    for (const version of [3, 5, 6, undefined]) {
      expect(
        evaluateAbortedWriteReceipt(event, 200, {
          version,
          body: { funds: 100, date: '3025-01-02', notes: 'later edit' },
        }).reflected,
      ).toBe(true);
    }
    expect(
      evaluateAbortedWriteReceipt(event, 200, {
        version: 999,
        body: { funds: 100, date: '3025-01-03' },
      }).reflected,
    ).toBe(false);
  });

  it('passes D empty as redundant without consulting the server, ignoring metadata churn', () => {
    const event = abortedPut({
      ...previousBody,
      baseVersion: 5,
      envelope: {
        savedAt: 'new timestamp',
        body: { funds: 7, date: '3025-01-01' },
      },
    });
    event.receipt = evaluateAbortedWriteReceipt(event, 0, undefined);
    expect(isFatalBrowserDiagnosticEvent(event)).toBe(false);
    expect(event.receipt.reason).toContain('redundant write at navigation');
    expect(evaluateAbortedWriteReceipt(event, 500, undefined).reflected).toBe(
      true,
    );
  });

  it('fails closed with no predecessor even when version and content match', () => {
    const event = { ...abortedPut(body), acknowledgedPutPostData: undefined };
    event.receipt = evaluateAbortedWriteReceipt(event, 200, {
      version: 999,
      body: body.envelope.body,
    });
    expect(isFatalBrowserDiagnosticEvent(event)).toBe(true);
    expect(event.receipt.reason).toContain('no acknowledged PUT predecessor');
  });

  it.each(['postData', 'acknowledgedPutPostData'] as const)(
    'fails closed on unparseable %s',
    (field) => {
      const event = { ...abortedPut(body), [field]: '{invalid JSON' };
      expect(
        evaluateAbortedWriteReceipt(event, 200, {
          version: 999,
          body: body.envelope.body,
        }).reason,
      ).toContain('no parseable object envelope.body (fail closed)');
    },
  );

  it('checks nested edits, additions, removals and array ordering without equating null and absence', () => {
    const before = {
      envelope: {
        body: { nested: { keep: 1, remove: 'old', change: 2 }, ids: [1, 2] },
      },
    };
    const after = {
      envelope: {
        body: { nested: { keep: 1, change: 3, added: null }, ids: [2, 1] },
      },
    };
    const event = abortedPut(after, before);
    expect(
      evaluateAbortedWriteReceipt(event, 200, {
        body: {
          nested: { keep: 99, change: 3, added: null },
          ids: [2, 1],
          other: 'later',
        },
      }).reflected,
    ).toBe(true);
    expect(
      evaluateAbortedWriteReceipt(event, 200, {
        body: { nested: { change: 3, added: null, remove: null }, ids: [2, 1] },
      }).reason,
    ).toContain('/nested/remove');
    expect(
      evaluateAbortedWriteReceipt(event, 200, {
        body: { nested: { change: 3 }, ids: [2, 1] },
      }).reason,
    ).toContain('/nested/added');
    expect(
      evaluateAbortedWriteReceipt(event, 200, {
        body: { nested: { change: 3, added: null }, ids: [1, 2] },
      }).reason,
    ).toContain('/ids');
    expect(
      evaluateAbortedWriteReceipt(
        abortedPut(
          { envelope: { body: { 'a/b~c': 2 } } },
          { envelope: { body: { 'a/b~c': 1 } } },
        ),
        200,
        { body: {} },
      ).reason,
    ).toContain('/a~1b~0c');
  });

  it.each([404, 401, 403, 500])(
    'never accepts GET %i as a changed-document PUT receipt',
    (status) => {
      expect(
        evaluateAbortedWriteReceipt(abortedPut(body), status, {
          version: 99,
          body: body.envelope.body,
        }).reflected,
      ).toBe(false);
    },
  );

  it('requires DELETE absence and fails closed for POST/PATCH or unknown PUT contracts', () => {
    const event = abortedPut(body);
    expect(
      evaluateAbortedWriteReceipt(
        { ...event, method: 'DELETE' },
        404,
        undefined,
      ).reflected,
    ).toBe(true);
    expect(
      evaluateAbortedWriteReceipt({ ...event, method: 'DELETE' }, 200, {})
        .reflected,
    ).toBe(false);
    expect(
      evaluateAbortedWriteReceipt({ ...event, method: 'DELETE' }, 403, {})
        .reflected,
    ).toBe(false);
    for (const method of ['POST', 'PATCH']) {
      expect(
        evaluateAbortedWriteReceipt({ ...event, method }, 200, { version: 99 })
          .reason,
      ).toContain('no supported receipt contract');
    }
    expect(
      evaluateAbortedWriteReceipt(
        { ...event, url: 'http://localhost:3600/api/other/1' },
        200,
        { version: 99 },
      ).reflected,
    ).toBe(false);
  });

  it('does not exempt non-abort failures even with a receipt', () => {
    expect(
      isFatalBrowserDiagnosticEvent({
        ...abortedPut(body),
        failureText: 'net::ERR_FAILED',
        receipt: { reflected: true, reason: 'test' },
      }),
    ).toBe(true);
  });

  it('reports document field diffs and retains both raw bodies', () => {
    const sent = JSON.stringify(body);
    expect(diffAcknowledgedPut(sent, sent)).toBe(
      'identical document: redundant write at navigation',
    );
    expect(
      diffAcknowledgedPut(sent, JSON.stringify({ ...body, baseVersion: 3 })),
    ).toBe('identical document: redundant write at navigation');
    const diff = diffAcknowledgedPut(sent, JSON.stringify(previousBody));
    expect(diff).toBe(
      'changed document fields (JSON pointers relative to envelope.body): /date',
    );
    expect(diffAcknowledgedPut(sent, undefined)).toContain(
      'no acknowledged PUT predecessor',
    );
    expect(diffAcknowledgedPut('invalid JSON', sent)).toContain('no parseable');
    const formatted = formatBrowserDiagnosticEvents([
      { ...abortedPut(body), acknowledgedPutDiff: diff },
    ]);
    expect(formatted).toContain(sent);
    expect(formatted).toContain(JSON.stringify(previousBody));
    expect(formatted).toContain(diff);
  });
});

describe('aborted PUT capture', () => {
  it('retains the predecessor and same-base overlap at issuance after A acknowledges before B fails', () => {
    class DiagnosticPage extends EventEmitter {
      url(): string {
        return 'http://localhost:3600/gameplay/campaigns/campaign-1';
      }
    }
    const page = new DiagnosticPage();
    const diagnostics = installBrowserDiagnostics(page as Page);
    const request = (baseVersion: number, funds: number): Request =>
      ({
        method: () => 'PUT',
        url: () => 'http://localhost:3600/api/campaigns/campaign-1',
        postData: () =>
          JSON.stringify({ baseVersion, envelope: { body: { funds } } }),
        resourceType: () => 'fetch',
        failure: () => ({ errorText: 'net::ERR_ABORTED' }),
      }) as Request;
    const response = (put: Request): Response =>
      ({ request: () => put, ok: () => true }) as Response;
    const predecessor = request(4, 7);
    const a = request(5, 8);
    const b = request(5, 9);
    page.emit('request', predecessor);
    page.emit('response', response(predecessor));
    page.emit('request', a);
    page.emit('request', b);
    page.emit('response', response(a));
    page.emit('requestfailed', b);
    expect(diagnostics.events[0]).toMatchObject({
      acknowledgedPutPostData: predecessor.postData(),
      postData: b.postData(),
      sameBasePutInFlight: true,
      sameBasePutsInFlight: [{ url: a.url(), postData: a.postData() }],
    });
    const c = request(6, 10);
    page.emit('request', c);
    page.emit('requestfailed', c);
    expect(diagnostics.events[1]).toMatchObject({
      acknowledgedPutPostData: a.postData(),
      sameBasePutInFlight: false,
      sameBasePutsInFlight: [],
    });
    diagnostics.dispose();
    expect(page.listenerCount('request')).toBe(0);
    expect(page.listenerCount('response')).toBe(0);
    expect(page.listenerCount('requestfailed')).toBe(0);
    expect(page.listenerCount('requestfinished')).toBe(0);
  });
});
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

    // Navigation-aborted API READS are browser cancellations, not app
    // failures — the next mount refetches. Only aborted API writes are fatal.
    expect(
      isFatalBrowserDiagnosticEvent({
        type: 'requestfailed',
        timestamp: '3025-01-01T00:00:00.000Z',
        pageUrl: 'http://localhost:3600/gameplay/campaigns',
        method: 'GET',
        url: 'http://localhost:3600/api/campaigns',
        resourceType: 'fetch',
        failureText: 'net::ERR_ABORTED',
      }),
    ).toBe(false);
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
