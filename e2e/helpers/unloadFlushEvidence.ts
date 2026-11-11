import type { Page } from '@playwright/test';

import { isDeepStrictEqual } from 'node:util';

import { isJsonRecord, putBaseVersion } from './browserWriteComparison';

const CAPTURE_KEY = 'campaign-unload-put-evidence';
export const UNLOAD_TIMING_KEY = 'campaign-unload-trial';

export interface CampaignRecord {
  version: number;
  savedAt: string;
  body: Record<string, unknown> & { currentDate: string };
}

export interface CapturedCampaignPut {
  url: string;
  keepalive: boolean;
  postData: string | null;
  documentTimeMs: number;
  documentOriginMs?: number;
  issueEpochMs?: number;
  sinceEditMs?: number | null;
  sincePagehideMs?: number | null;
  lifecycle?: string;
  visibilityState?: string;
  controller?: string | null;
  stack?: string;
}

export interface FlushAcceptance {
  accepted: boolean;
  flushCount: number;
  baseVersion: number | null;
  expectedVersion: number | null;
  versionAdvanced: boolean;
  bodyMatches: boolean;
  savedAtMatches: boolean;
  indistinguishableCompetitors: number;
  reason: string;
}

export function readCampaignRecord(value: unknown): CampaignRecord {
  if (
    !isJsonRecord(value) ||
    typeof value.version !== 'number' ||
    !Number.isSafeInteger(value.version) ||
    typeof value.savedAt !== 'string' ||
    !isJsonRecord(value.body) ||
    typeof value.body.currentDate !== 'string'
  ) {
    throw new Error('Real campaign GET returned an unreadable record');
  }
  return {
    version: value.version,
    savedAt: value.savedAt,
    body: { ...value.body, currentDate: value.body.currentDate },
  };
}

/** Observe the unmodified fetch arguments before unload destroys the document.
 * Session storage survives replacement, including writes in the new document.
 * Dispatch capture alone NEVER counts as server acceptance. No route mocking,
 * response replacement, product changes or server receipt log is involved.
 */
export async function captureCampaignPuts(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, timingKey }) => {
      let lifecycle = 'document-active';
      let pagehideTimeMs: number | null = null;
      // Capture phase runs before the product's bubbling discard listeners.
      window.addEventListener(
        'pagehide',
        () => {
          lifecycle = 'pagehide';
          pagehideTimeMs = performance.now();
        },
        { capture: true },
      );
      document.addEventListener(
        'visibilitychange',
        () => {
          lifecycle = `visibilitychange:${document.visibilityState}`;
        },
        { capture: true },
      );
      const originalFetch = window.fetch;
      window.fetch = function (input, init): Promise<Response> {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
          location.href,
        );
        const method =
          init?.method ?? (input instanceof Request ? input.method : 'GET');
        if (
          method.toUpperCase() === 'PUT' &&
          /^\/api\/campaigns\/[^/]+$/.test(url.pathname)
        ) {
          const puts = JSON.parse(
            sessionStorage.getItem(key) ?? '[]',
          ) as CapturedCampaignPut[];
          const timing = JSON.parse(
            sessionStorage.getItem(timingKey) ?? 'null',
          ) as { editEpochMs?: number } | null;
          const documentTimeMs = performance.now();
          const issueEpochMs = performance.timeOrigin + documentTimeMs;
          puts.push({
            url: url.href,
            keepalive:
              init?.keepalive ?? (input instanceof Request && input.keepalive),
            // The production flush and ordinary save both use a string init.body.
            // Other shapes remain explicitly unreadable, never guessed.
            postData: typeof init?.body === 'string' ? init.body : null,
            documentTimeMs,
            documentOriginMs: performance.timeOrigin,
            issueEpochMs,
            sinceEditMs:
              timing?.editEpochMs === undefined
                ? null
                : issueEpochMs - timing.editEpochMs,
            sincePagehideMs:
              pagehideTimeMs === null ? null : documentTimeMs - pagehideTimeMs,
            lifecycle,
            visibilityState: document.visibilityState,
            controller: navigator.serviceWorker.controller?.scriptURL ?? null,
            stack: new Error('Campaign PUT issue path').stack,
          });
          sessionStorage.setItem(key, JSON.stringify(puts));
        }
        return originalFetch.call(this, input, init);
      };
    },
    { key: CAPTURE_KEY, timingKey: UNLOAD_TIMING_KEY },
  );
}

export async function resetCapturedPuts(page: Page): Promise<void> {
  await page.evaluate((key) => sessionStorage.setItem(key, '[]'), CAPTURE_KEY);
}

export async function readCapturedPuts(
  page: Page,
): Promise<CapturedCampaignPut[]> {
  return page.evaluate(
    (key) =>
      JSON.parse(sessionStorage.getItem(key) ?? '[]') as CapturedCampaignPut[],
    CAPTURE_KEY,
  );
}

export function envelopeOf(
  put: CapturedCampaignPut,
): Record<string, unknown> | null {
  try {
    const payload: unknown = JSON.parse(put.postData ?? 'null');
    return isJsonRecord(payload) && isJsonRecord(payload.envelope)
      ? payload.envelope
      : null;
  } catch {
    return null;
  }
}

export function compareCampaignPutRecord(
  record: CampaignRecord,
  put: CapturedCampaignPut,
): {
  bodyMatches: boolean;
  savedAtMatches: boolean;
} {
  const envelope = envelopeOf(put);
  return {
    bodyMatches:
      envelope !== null &&
      isJsonRecord(envelope.body) &&
      isDeepStrictEqual(record.body, envelope.body),
    savedAtMatches:
      envelope !== null &&
      typeof envelope.savedAt === 'string' &&
      record.savedAt === envelope.savedAt,
  };
}

/** Real API CAS + full body + savedAt identifies this request only when no
 * competing captured PUT can explain that same row. Identical competitors or
 * a later row version cannot be attributed with GET alone; keep them unproven.
 */
export function assessFlushAcceptance(
  puts: readonly CapturedCampaignPut[],
  before: CampaignRecord,
  after: CampaignRecord,
): FlushAcceptance {
  const flushes = puts.filter((put) => put.keepalive);
  const flush = flushes.length === 1 ? flushes[0] : undefined;
  const envelope = flush ? envelopeOf(flush) : null;
  const baseVersion = flush ? putBaseVersion(flush.postData) : undefined;
  const expectedVersion = baseVersion === undefined ? null : baseVersion + 1;
  const versionAdvanced =
    expectedVersion !== null &&
    after.version === expectedVersion &&
    after.version > before.version;
  const { bodyMatches, savedAtMatches } = flush
    ? compareCampaignPutRecord(after, flush)
    : { bodyMatches: false, savedAtMatches: false };
  const indistinguishableCompetitors = flush
    ? puts.filter((put) => {
        if (put === flush || putBaseVersion(put.postData) !== baseVersion)
          return false;
        const other = envelopeOf(put);
        return (
          other !== null &&
          other.savedAt === envelope?.savedAt &&
          isDeepStrictEqual(other.body, envelope?.body)
        );
      }).length
    : 0;
  const accepted =
    flushes.length === 1 &&
    versionAdvanced &&
    bodyMatches &&
    savedAtMatches &&
    indistinguishableCompetitors === 0;
  return {
    accepted,
    flushCount: flushes.length,
    baseVersion: baseVersion ?? null,
    expectedVersion,
    versionAdvanced,
    bodyMatches,
    savedAtMatches,
    indistinguishableCompetitors,
    reason: accepted
      ? 'Real GET: row advanced to flush baseVersion + 1 with its full body and savedAt; no indistinguishable competing PUT'
      : flushes.length !== 1
        ? `Flush acceptance unproven: expected one keepalive PUT, captured ${flushes.length}`
        : indistinguishableCompetitors > 0
          ? 'Flush acceptance unproven: identical competing PUT; real API has no request receipt ID'
          : 'Flush acceptance unproven: real GET version/body/savedAt does not identify the flushed request',
  };
}
