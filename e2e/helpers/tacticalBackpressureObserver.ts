/**
 * E2E-74 observation seam for the TACTICAL match channel.
 *
 * WHY A NEW OBSERVER. The controlled loopback observer in
 * `gm-two-player-performance.pack.spec.ts` attaches to
 * `window.__CAMPAIGN_SYNC_TRANSPORT__` - the CAMPAIGN channel. The only
 * slow-client seam on main is the per-viewer unacked bound, and that
 * lives on the TACTICAL match channel, which publishes no transport
 * global. Rather than add one - a `src/` change this unit does not own -
 * this observer wraps `WebSocket` from an init script, keeping the whole
 * seam inside `e2e/`.
 *
 * WHY AN ACCESSOR AND NOT A PLAIN WRAP. Playwright's `routeWebSocket`
 * mock installs itself with `globalThis.WebSocket = <class>`
 * (playwright-core/lib/generated/webSocketMockSource.js:329) from its own
 * init script, and every page in this pack is routed. A wrapper that
 * captured `window.WebSocket` once would be silently replaced if
 * Playwright's script ran second; an accessor makes the wrap
 * order-independent - whoever assigns later is wrapped by the setter.
 *
 * The render clock is the one the performance pack gates on: the first
 * animation frame after the delivering socket message, the earliest paint
 * at which the applied event is eligible to be on screen. Never a
 * `waitForTimeout`.
 */

import { expect, type BrowserContext, type Page } from '@playwright/test';

import {
  correlateClocks,
  nearestRankPercentile,
  type IClockAnchor,
} from '@/lib/multiplayer/performance/controlledLoopbackFixture';

/** One delivered tactical frame, with both ends of its latency. */
export interface ITacticalFrameSample {
  readonly deliverySequence: number;
  readonly serverTs: string;
  readonly renderedAtMs: number;
}

export interface ITacticalObserverReading {
  readonly frames: readonly ITacticalFrameSample[];
  /** APPLICATION-level inbound depth: delivered, not yet painted. */
  readonly peakPendingEnvelopes: number;
  readonly peakPendingBytes: number;
  /** Paired client anchor, read in this order to match the server probe. */
  readonly wallMs: number;
  readonly monotonicMs: number;
}

export interface IServerProbeReading extends IClockAnchor {
  readonly rss: number;
  readonly heapUsed: number;
}

export interface ILatencyScore {
  readonly count: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
}

/**
 * The wire fields the observer reads. Type-only, so it erases before the
 * observer body is stringified into the page.
 */
interface IObservedFrame {
  readonly kind?: unknown;
  readonly ts?: unknown;
  readonly deliverySequence?: unknown;
}

/**
 * The page-side observer, installed at document start.
 *
 * Declared standalone so it is stringified by `addInitScript` as ONE
 * body - every viewer in the pack is observed by the same definition.
 */
function tacticalObserverScript(): void {
  if (window.__TACTICAL_OBSERVER_STATE__) return;
  const state = {
    frames: [] as {
      deliverySequence: number;
      serverTs: string;
      renderedAtMs: number;
    }[],
    peakPendingEnvelopes: 0,
    peakPendingBytes: 0,
    pendingEnvelopes: 0,
    pendingBytes: 0,
  };
  window.__TACTICAL_OBSERVER_STATE__ = state;

  const record = (raw: unknown): void => {
    let frame: IObservedFrame | null = null;
    try {
      frame = JSON.parse(String(raw)) as IObservedFrame;
    } catch {
      return;
    }
    // Only authority Events carry a commit stamp AND this viewer's own
    // gapless delivery number; Heartbeat/Error/ReplayStart do not, and
    // scoring them would put frames nobody waited for in the population.
    if (!frame || frame.kind !== 'Event') return;
    if (typeof frame.ts !== 'string') return;
    if (typeof frame.deliverySequence !== 'number') return;
    const deliverySequence = frame.deliverySequence;
    const serverTs = frame.ts;
    const bytes = String(raw).length;
    state.pendingEnvelopes += 1;
    state.pendingBytes += bytes;
    state.peakPendingEnvelopes = Math.max(
      state.peakPendingEnvelopes,
      state.pendingEnvelopes,
    );
    state.peakPendingBytes = Math.max(
      state.peakPendingBytes,
      state.pendingBytes,
    );
    const drainedEnvelopes = state.pendingEnvelopes;
    const drainedBytes = state.pendingBytes;
    requestAnimationFrame(() => {
      state.pendingEnvelopes -= drainedEnvelopes;
      state.pendingBytes -= drainedBytes;
      state.frames.push({
        deliverySequence,
        serverTs,
        renderedAtMs: performance.now(),
      });
    });
  };

  const wrap = (Base: typeof WebSocket): typeof WebSocket =>
    class ObservedWebSocket extends Base {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes('/api/multiplayer/socket')) {
          this.addEventListener('message', (event) => {
            record((event as MessageEvent).data);
          });
        }
      }
    };

  let wrapped = wrap(window.WebSocket);
  Object.defineProperty(window, 'WebSocket', {
    configurable: true,
    get: () => wrapped,
    set: (value: typeof WebSocket) => {
      wrapped = wrap(value);
    },
  });
}

/** Arm every page this context opens, before any socket can be constructed. */
export async function armTacticalObserver(
  context: BrowserContext,
): Promise<void> {
  await context.addInitScript(tacticalObserverScript);
}

/** Read one viewer's accumulated observation, with its clock anchor. */
export async function readTacticalObserver(
  page: Page,
): Promise<ITacticalObserverReading> {
  return page.evaluate(() => {
    const observer = window.__TACTICAL_OBSERVER_STATE__;
    if (!observer) throw new Error('tactical observer not installed');
    return {
      frames: observer.frames,
      peakPendingEnvelopes: observer.peakPendingEnvelopes,
      peakPendingBytes: observer.peakPendingBytes,
      wallMs: Date.now(),
      monotonicMs: performance.now(),
    };
  });
}

/** The server's paired clock reading and resident memory. */
export async function readServerProbe(
  page: Page,
  runId: string,
): Promise<IServerProbeReading> {
  const probe = await page.evaluate(async (input) => {
    const response = await fetch('/api/e2e/performance-probe', {
      headers: { 'x-playwright-e2e-run-id': input },
    });
    return {
      status: response.status,
      body: (await response.json()) as unknown,
    };
  }, runId);
  expect(probe.status, JSON.stringify(probe.body)).toBe(200);
  const body = probe.body as {
    wallMs: number;
    monotonicMs: number;
    memory: { rss: number; heapUsed: number };
  };
  return {
    wallMs: body.wallMs,
    monotonicMs: body.monotonicMs,
    rss: body.memory.rss,
    heapUsed: body.memory.heapUsed,
  };
}

/**
 * This context's JS heap growth since its own baseline.
 *
 * The FIRST call establishes the baseline and reports zero: the letter
 * gates growth above the post-warm-up reading, not absolute heap. The
 * absolute readings travel with the growth so a zero from two real
 * readings and a zero from an unpopulated metric are distinguishable.
 */
export async function heapGrowthBytes(
  page: Page,
): Promise<{ baseline: number; used: number; growth: number }> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Performance.enable');
    const metrics = await session.send('Performance.getMetrics');
    const used =
      metrics.metrics.find((metric) => metric.name === 'JSHeapUsedSize')
        ?.value ?? 0;
    const baseline = await page.evaluate(
      () => window.__TACTICAL_HEAP_BASELINE__ ?? null,
    );
    if (baseline === null) {
      await page.evaluate((value) => {
        window.__TACTICAL_HEAP_BASELINE__ = value;
      }, used);
      return { baseline: used, used, growth: 0 };
    }
    return { baseline, used, growth: Math.max(0, used - baseline) };
  } finally {
    await session.detach();
  }
}

/**
 * Nearest-rank p95/p99 over one viewer's own sample population.
 *
 * Latency is the commit stamp on the server's monotonic timeline
 * subtracted from the render stamp mapped onto that same timeline - the
 * single offset `correlateClocks` produces from the paired anchors. Only
 * frames delivered at or after `fromDeliverySequence` are scored, so the
 * population is the post-warm-up window and nothing else.
 */
export function scoreViewerLatency(
  reading: ITacticalObserverReading,
  server: IServerProbeReading,
  fromDeliverySequence: number,
): ILatencyScore {
  const correlation = correlateClocks(server, {
    wallMs: reading.wallMs,
    monotonicMs: reading.monotonicMs,
  });
  const values: number[] = [];
  for (const frame of reading.frames) {
    if (frame.deliverySequence < fromDeliverySequence) continue;
    const committedAt =
      server.monotonicMs + (Date.parse(frame.serverTs) - server.wallMs);
    const renderedAt = correlation.toServerMonotonicMs(frame.renderedAtMs);
    const latency = renderedAt - committedAt;
    // A negative sample is a clock artefact, not a measurement; the
    // commit stamp has millisecond resolution and the render stamp is
    // sub-millisecond, so a same-millisecond delivery can land just
    // below zero. Clamping keeps it in the population at its floor
    // rather than discarding a genuinely fast frame.
    values.push(Math.max(0, latency));
  }
  return {
    count: values.length,
    p95Ms: values.length === 0 ? Number.NaN : nearestRankPercentile(values, 95),
    p99Ms: values.length === 0 ? Number.NaN : nearestRankPercentile(values, 99),
  };
}
