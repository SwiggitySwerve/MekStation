import {
  evaluateAbortedWriteReceipt,
  isFatalBrowserDiagnosticEvent,
  type BrowserDiagnosticEvent,
  type WriteReceipt,
} from '../../e2e/helpers/browserDiagnosticsModel';

// Reference copied from origin/main at c4b9f7a0ce957a3976ddfcfba99cb701cc98a05e.
// Keep independent of the new predicate and its helper predicates.
function oldIsFatalBrowserDiagnosticEvent(
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

const common = {
  timestamp: '3025-01-01T00:00:00.000Z',
  pageUrl: 'http://localhost:3600/gameplay/campaigns/campaign-1',
};
const previous = JSON.stringify({ envelope: { body: { funds: 7 } } });
const changed = JSON.stringify({
  baseVersion: 5,
  envelope: { body: { funds: 8 } },
});

function generatedEvents(): BrowserDiagnosticEvent[] {
  const events: BrowserDiagnosticEvent[] = [
    { ...common, type: 'pageerror', message: 'Failed to fetch' },
    {
      ...common,
      type: 'console',
      consoleType: 'error',
      text: 'save failed',
      location: {},
    },
  ];
  for (const method of [
    'GET',
    'get',
    'HEAD',
    'head',
    'OPTIONS',
    'options',
    'PUT',
    'put',
    'POST',
    'PATCH',
    'DELETE',
    'TRACE',
    '',
  ]) {
    for (const url of [
      '/api',
      '/api?query=1',
      '/api/campaigns/one',
      'http://localhost:3600/api/campaigns/one?query=1',
      '/api/other/one',
      '/apiary',
      '/API/campaigns/one',
      '/data/equipment.json',
      '/nested/api/one',
      '/unrelated?path=/api',
    ]) {
      for (const failureText of ['net::ERR_ABORTED', 'net::ERR_FAILED', '']) {
        for (const resourceType of ['fetch', 'xhr', 'document', 'script']) {
          // Receipt inputs span redundant/reflected/lost, malformed/missing
          // predecessor/body, unsupported contract, GET failure and DELETE.
          for (const [postData, acknowledgedPutPostData, status, stored] of [
            [changed, previous, 200, { version: 6, body: { funds: 8 } }],
            [changed, previous, 200, { version: 6, body: { funds: 7 } }],
            [previous, previous, 0, undefined],
            [changed, undefined, 200, { version: 99, body: { funds: 8 } }],
            ['{invalid', previous, 200, {}],
            [changed, '{invalid', 200, {}],
            ['{}', previous, 200, {}],
            [changed, previous, 404, undefined],
            [changed, previous, 500, undefined],
          ] as const) {
            const event = {
              ...common,
              type: 'requestfailed' as const,
              method,
              url,
              failureText,
              resourceType,
              postData,
              acknowledgedPutPostData,
            };
            for (const receipt of [
              undefined,
              evaluateAbortedWriteReceipt(event, status, stored),
            ] satisfies (WriteReceipt | undefined)[]) {
              events.push({ ...event, receipt });
            }
          }
        }
      }
    }
  }
  return events;
}

describe('browser guard direction against the pinned old predicate', () => {
  it('new-fatal implies old-fatal for generated event lists, including fail-closed receipts', () => {
    const events = generatedEvents();
    const lists: BrowserDiagnosticEvent[][] = [[]];
    // Every event occurs alone and in mixed ordered lists. The pointwise
    // subset check implies the property for arbitrary lists/multiplicities.
    for (let index = 0; index < events.length; index++) {
      lists.push([events[index]]);
      if (index % 7 === 0) lists.push(events.slice(index, index + 7).reverse());
    }
    let newlyBenign = 0;
    const newlyFatal: BrowserDiagnosticEvent[] = [];
    for (const list of lists) {
      for (const event of list) {
        const oldFatal = oldIsFatalBrowserDiagnosticEvent(event);
        const newFatal = isFatalBrowserDiagnosticEvent(event);
        if (newFatal && !oldFatal) newlyFatal.push(event);
        if (oldFatal && !newFatal) newlyBenign++;
      }
    }
    expect(events.length).toBe(28082);
    expect(newlyFatal).toEqual([]);
    expect(newlyBenign).toBeGreaterThan(0);
  });
});
