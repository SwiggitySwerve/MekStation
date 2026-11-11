import type { BrowserContext, Request, Response } from '@playwright/test';

import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';

import type { CampaignPollTrace, ContextCampaignWrite } from './unloadDelivery';
import type { CampaignRecord } from './unloadFlushEvidence';

/** Context request events include Chromium SW-owned fetches. No routing,
 * worker evaluation, response substitution or HTTP-cache override is installed.
 * Keep SW-owned requests separate: matching bytes alone cannot prove forwarding.
 */
interface ContextCampaignCapture {
  writes: ContextCampaignWrite[];
  workerTraffic: {
    url: string;
    method: string;
    elapsedMs: number;
    serviceWorker: string;
  }[];
  startedEpochMs: number;
  available: boolean;
  stop: () => void;
}

interface CampaignPoll {
  trace: CampaignPollTrace;
  stop: () => Promise<CampaignPollTrace>;
}

export function captureContextCampaignWrites(
  context: BrowserContext,
): ContextCampaignCapture {
  const startedAt = performance.now();
  const writes: ContextCampaignWrite[] = [];
  const requests = new Map<Request, ContextCampaignWrite>();
  const workerTraffic: {
    url: string;
    method: string;
    elapsedMs: number;
    serviceWorker: string;
  }[] = [];
  const onRequest = (request: Request): void => {
    if (!/^\/api\/campaigns(?:\/|$)/.test(new URL(request.url()).pathname))
      return;
    const elapsedMs = performance.now() - startedAt;
    const serviceWorker = request.serviceWorker()?.url() ?? null;
    if (serviceWorker)
      workerTraffic.push({
        url: request.url(),
        method: request.method(),
        elapsedMs,
        serviceWorker,
      });
    if (!['PUT', 'POST', 'PATCH', 'DELETE'].includes(request.method())) return;
    const write: ContextCampaignWrite = {
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
      elapsedMs,
      serviceWorker,
      resourceType: request.resourceType(),
      status: null,
      failure: null,
      finishedMs: null,
    };
    writes.push(write);
    requests.set(request, write);
  };
  const onResponse = (response: Response): void => {
    const write = requests.get(response.request());
    if (write) write.status = response.status();
  };
  const onFinished = (request: Request): void => {
    const write = requests.get(request);
    if (write) write.finishedMs = performance.now() - startedAt;
  };
  const onFailed = (request: Request): void => {
    const write = requests.get(request);
    if (write) {
      write.failure = request.failure()?.errorText ?? 'unknown';
      onFinished(request);
    }
  };
  context.on('request', onRequest);
  context.on('response', onResponse);
  context.on('requestfinished', onFinished);
  context.on('requestfailed', onFailed);
  return {
    writes,
    workerTraffic,
    startedEpochMs: performance.timeOrigin + startedAt,
    available: !process.env.PLAYWRIGHT_DISABLE_SERVICE_WORKER_NETWORK,
    stop: (): void => {
      context.off('request', onRequest);
      context.off('response', onResponse);
      context.off('requestfinished', onFinished);
      context.off('requestfailed', onFailed);
    },
  };
}

/** Starts before the edit/reload is armed. Only the runner's APIRequestContext
 * GET is used by readRecord; it cannot be intercepted by the page's worker.
 * One request at a time, 75 ms between starts when response time permits.
 */
export async function startCampaignPoll(
  readRecord: () => Promise<CampaignRecord>,
): Promise<CampaignPoll> {
  const startedAt = performance.now();
  const trace: CampaignPollTrace = {
    startedEpochMs: performance.timeOrigin + startedAt,
    versions: [],
    samples: [],
    errors: [],
    stoppedMs: 0,
  };
  let stopping = false;
  let lastSampleStart = 0;
  const sample = async (): Promise<void> => {
    const startedMs = performance.now() - startedAt;
    lastSampleStart = startedMs;
    try {
      const record = await readRecord();
      const elapsedMs = performance.now() - startedAt;
      trace.samples.push({ startedMs, elapsedMs, version: record.version });
      const previous = trace.versions.at(-1)?.record;
      if (!previous || !isDeepStrictEqual(previous, record))
        trace.versions.push({ elapsedMs, record });
    } catch (error) {
      trace.errors.push({
        elapsedMs: performance.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  await sample(); // A completed sample before reload() is even scheduled.
  const running = (async (): Promise<void> => {
    while (!stopping) {
      await delay(
        Math.max(0, 75 - (performance.now() - startedAt - lastSampleStart)),
      );
      if (!stopping) await sample();
    }
  })();
  return {
    trace,
    stop: async (): Promise<CampaignPollTrace> => {
      stopping = true;
      await running;
      trace.stoppedMs = performance.now() - startedAt;
      return trace;
    },
  };
}
