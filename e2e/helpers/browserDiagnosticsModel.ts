import {
  compareAcknowledgedPut,
  fieldPointer,
  isJsonRecord,
  putBaseVersion,
  storedFieldMatches,
} from './browserWriteComparison';
export { diffAcknowledgedPut } from './browserWriteComparison';

export interface WriteReceipt {
  readonly reflected: boolean;
  readonly reason: string;
}

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
      readonly postData?: string | null;
      readonly acknowledgedPutDiff?: string;
      readonly acknowledgedPutPostData?: string;
      readonly sameBasePutInFlight?: boolean;
      readonly sameBasePutsInFlight?: readonly {
        readonly url: string;
        readonly postData: string | null;
      }[];
      receipt?: WriteReceipt;
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

  // Unload keepalive writes can reach the server despite ERR_ABORTED.
  // Reads are benign; writes require an outcome confirmed by the real API.
  return isAbortedApiWrite(event) && event.receipt?.reflected !== true;
}

export type FailedRequestEvent = Extract<
  BrowserDiagnosticEvent,
  { type: 'requestfailed' }
>;

export function isAbortedApiWrite(
  event: BrowserDiagnosticEvent,
): event is FailedRequestEvent {
  return (
    event.type === 'requestfailed' &&
    event.failureText === 'net::ERR_ABORTED' &&
    /\/api(\/|\?|$)/.test(event.url) &&
    !['GET', 'HEAD', 'OPTIONS'].includes(event.method.toUpperCase())
  );
}

/** Version is supporting evidence only: another same-base write may land. */
export function evaluateAbortedWriteReceipt(
  event: FailedRequestEvent,
  status: number,
  stored: unknown,
): WriteReceipt {
  const evidence = `server version ${isJsonRecord(stored) ? (stored.version ?? 'unknown') : 'unknown'}, request base ${putBaseVersion(event.postData) ?? 'unknown'}`;
  const pass = (reason: string): WriteReceipt => ({
    reflected: true,
    reason: `aborted write reflected (${reason}; ${evidence})`,
  });
  const fail = (reason: string): WriteReceipt => ({
    reflected: false,
    reason: `aborted write NOT reflected by server: ${reason}; ${evidence}`,
  });
  const method = event.method.toUpperCase();
  if (method === 'DELETE') {
    return status === 404
      ? pass('resource absent, GET 404')
      : fail(`DELETE requires absence; GET ${status}`);
  }
  if (method !== 'PUT' || !/\/api\/campaigns\/[^/?]+(?:\?|$)/.test(event.url)) {
    return fail(`${method} has no supported receipt contract (fail closed)`);
  }
  const comparison = compareAcknowledgedPut(
    event.postData,
    event.acknowledgedPutPostData,
  );
  if (!comparison.comparable) return fail(comparison.reason);
  if (comparison.fields.length === 0)
    return pass('redundant write at navigation');
  const missing = comparison.fields.filter(
    (field) =>
      status !== 200 ||
      !isJsonRecord(stored) ||
      !isJsonRecord(stored.body) ||
      !storedFieldMatches(stored.body, field),
  );
  return missing.length === 0
    ? pass(
        `changed fields carried by stored document: ${comparison.fields.map(fieldPointer).join(', ')}`,
      )
    : fail(`fields ${missing.map(fieldPointer).join(', ')}; GET ${status}`);
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
          `postData: ${event.postData ?? '<unavailable>'}`,
          `last acknowledged PUT: ${event.acknowledgedPutDiff ?? '<unavailable>'}`,
          `acknowledgedPutPostData: ${event.acknowledgedPutPostData ?? '<unavailable>'}`,
          `same-base PUT in flight when this request was issued: ${event.sameBasePutInFlight ?? '<unavailable>'}`,
          `sameBasePutsInFlight: ${JSON.stringify(event.sameBasePutsInFlight ?? [])}`,
          ...(isAbortedApiWrite(event)
            ? [
                `receipt: ${event.receipt?.reason ?? 'aborted write NOT reflected by server: receipt not checked (fail closed)'}`,
              ]
            : []),
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
