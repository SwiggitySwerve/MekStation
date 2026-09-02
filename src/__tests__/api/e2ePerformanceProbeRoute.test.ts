import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages-modules/api/e2ePerformanceProbeRoute';

const RUN_ID = 'performance-probe-suite-run';
const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

function stubRes() {
  const record: {
    status?: number;
    body?: unknown;
    headers: Record<string, unknown>;
  } = { headers: {} };
  const res = {
    status(code: number) {
      record.status = code;
      return res;
    },
    json(body: unknown) {
      record.body = body;
      return res;
    },
    // RECORDED, not swallowed. A 405 that forgets to advertise `Allow`
    // is a different bug from a 405 that never fires, and a stub that
    // drops the header cannot tell them apart.
    setHeader(name: string, value: unknown) {
      record.headers[name] = value;
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as NextApiResponse, record };
}

/** The probe body shape, for rows that read the numbers back. */
interface IProbeBody {
  readonly success: boolean;
  readonly wallMs: number;
  readonly monotonicMs: number;
  readonly memory: { readonly rss: number; readonly heapUsed: number };
}

function req(input: {
  readonly method: string;
  readonly headers?: Record<string, string>;
}): NextApiRequest {
  return {
    method: input.method,
    body: {},
    headers: input.headers ?? {},
    query: {},
  } as unknown as NextApiRequest;
}

describe('e2e performance probe route', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedRun = process.env.PLAYWRIGHT_E2E_RUN_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = RUN_ID;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = savedMode;
    process.env.PLAYWRIGHT_E2E_RUN_ID = savedRun;
  });

  it.each([
    ['outside e2e mode', () => (process.env.NEXT_PUBLIC_E2E_MODE = 'false')],
    ['with no run token armed', () => delete process.env.PLAYWRIGHT_E2E_RUN_ID],
  ])('answers 404 %s', (_label: string, arrange: () => unknown) => {
    arrange();
    const { res, record } = stubRes();
    handler(req({ method: 'GET', headers: { [RUN_ID_HEADER]: RUN_ID } }), res);
    expect(record.status).toBe(404);
  });

  it('answers 404 for a different run token', () => {
    const { res, record } = stubRes();
    handler(
      req({ method: 'GET', headers: { [RUN_ID_HEADER]: 'another-run' } }),
      res,
    );
    expect(record.status).toBe(404);
  });

  it('reports a paired clock reading and this process memory', () => {
    const { res, record } = stubRes();
    const before = Date.now();
    handler(req({ method: 'GET', headers: { [RUN_ID_HEADER]: RUN_ID } }), res);
    expect(record.status).toBe(200);
    const body = record.body as {
      readonly success: boolean;
      readonly wallMs: number;
      readonly monotonicMs: number;
      readonly memory: { readonly rss: number; readonly heapUsed: number };
    };
    expect(body.success).toBe(true);
    expect(body.wallMs).toBeGreaterThanOrEqual(before);
    expect(body.monotonicMs).toBeGreaterThan(0);
    // A probe that reported a constant would let every memory-growth
    // comparison come out at zero and pass.
    expect(body.memory.rss).toBeGreaterThan(0);
    expect(body.memory.heapUsed).toBeGreaterThan(0);
  });

  it('refuses a non-GET method and still answers GET', () => {
    // THE METHOD GUARD IS LOAD-BEARING, not decoration. Without it a
    // POST is answered with the probe body - and a route that responds
    // to any verb is a wider seam than the one this file argues is
    // safe, in a build where the e2e guard is open by definition.
    const posted = stubRes();
    handler(
      req({ method: 'POST', headers: { [RUN_ID_HEADER]: RUN_ID } }),
      posted.res,
    );
    expect(posted.record.status).toBe(405);
    expect(posted.record.headers.Allow).toEqual(['GET']);
    expect(posted.record.body).toEqual({ error: 'Method POST Not Allowed' });

    // VACUITY CONTROL. The same request shape, GET, must still answer
    // 200 - otherwise the row above could pass because the handler
    // refuses everything, which proves nothing about the method guard.
    const fetched = stubRes();
    handler(
      req({ method: 'GET', headers: { [RUN_ID_HEADER]: RUN_ID } }),
      fetched.res,
    );
    expect(fetched.record.status).toBe(200);
  });

  it('reads its two stamps from DIFFERENT clocks', () => {
    // WHY THIS MATTERS, and why a same-clock pair would be silently
    // wrong rather than loudly wrong. The performance pack takes ONE
    // paired reading here and derives a single offset from it; each
    // side then measures ELAPSED time on its own monotonic source, and
    // only that offset crosses the process boundary. If `monotonicMs`
    // were just another wall-clock read, the pair would still yield an
    // arithmetically fine offset - and every latency in the run would
    // inherit any wall-clock adjustment (an NTP step or slew) that
    // landed between the anchor and the measurement, with nothing to
    // detect it. `serverMonotonicOf` would also collapse to an identity
    // and the design's guarantee would be vacuous while still looking
    // like it held.
    //
    // SCALE is what separates them. `process.hrtime.bigint()` counts
    // from an arbitrary boot-relative origin on every platform Node
    // supports, so it is uptime-scale; `Date.now()` is epoch-scale.
    // MEASURED on this machine: monotonic 1.54e9 against wall 1.79e12,
    // three orders apart. The /100 margin holds unless the host has
    // been up for roughly 566 years.
    const first = stubRes();
    handler(
      req({ method: 'GET', headers: { [RUN_ID_HEADER]: RUN_ID } }),
      first.res,
    );
    const one = first.record.body as IProbeBody;
    expect(one.monotonicMs).toBeGreaterThan(0);
    expect(one.monotonicMs).toBeLessThan(one.wallMs / 100);

    // ...and it is a clock, not a constant: two successive probes
    // advance the monotonic stamp by about the elapsed wall time. This
    // pins that the stamp moves; the scale check above is what pins
    // WHICH clock it came from.
    const startedAt = Date.now();
    let elapsed = 0;
    while (elapsed < 5) elapsed = Date.now() - startedAt;
    const second = stubRes();
    handler(
      req({ method: 'GET', headers: { [RUN_ID_HEADER]: RUN_ID } }),
      second.res,
    );
    const two = second.record.body as IProbeBody;
    const monotonicDelta = two.monotonicMs - one.monotonicMs;
    const wallDelta = two.wallMs - one.wallMs;
    expect(monotonicDelta).toBeGreaterThan(0);
    expect(Math.abs(monotonicDelta - wallDelta)).toBeLessThan(50);
  });
});
