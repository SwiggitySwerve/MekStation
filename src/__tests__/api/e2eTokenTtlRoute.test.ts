import type { NextApiRequest, NextApiResponse } from 'next';

import handler, {
  consumeE2ETokenTtlOverride,
} from '@/pages-modules/api/e2eTokenTtlRoute';

const RUN_ID = 'token-ttl-suite-run';
const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

function stubRes() {
  const record: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      record.status = code;
      return res;
    },
    json(body: unknown) {
      record.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    end() {
      return res;
    },
  };
  return { res: res as unknown as NextApiResponse, record };
}

function req(input: {
  readonly method: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}): NextApiRequest {
  return {
    method: input.method,
    body: input.body ?? {},
    headers: input.headers ?? {},
    query: {},
  } as unknown as NextApiRequest;
}

describe('e2e token TTL route', () => {
  const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedRun = process.env.PLAYWRIGHT_E2E_RUN_ID;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = RUN_ID;
    consumeE2ETokenTtlOverride();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_E2E_MODE = savedMode;
    process.env.PLAYWRIGHT_E2E_RUN_ID = savedRun;
    consumeE2ETokenTtlOverride();
  });

  it('answers 404 outside e2e mode even with the matching run token', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';
    const { res, record } = stubRes();

    await handler(
      req({
        method: 'POST',
        body: { ttlMs: 20_000 },
        headers: { [RUN_ID_HEADER]: RUN_ID },
      }),
      res,
    );

    expect(record.status).toBe(404);
    expect(consumeE2ETokenTtlOverride()).toBeNull();
  });

  it('answers 404 for a different run token', async () => {
    const { res, record } = stubRes();

    await handler(
      req({
        method: 'POST',
        body: { ttlMs: 20_000 },
        headers: { [RUN_ID_HEADER]: 'another-run' },
      }),
      res,
    );

    expect(record.status).toBe(404);
    expect(consumeE2ETokenTtlOverride()).toBeNull();
  });

  it('rejects a TTL outside the bounded short-lived range', async () => {
    const { res, record } = stubRes();

    await handler(
      req({
        method: 'POST',
        body: { ttlMs: 999 },
        headers: { [RUN_ID_HEADER]: RUN_ID },
      }),
      res,
    );

    expect(record.status).toBe(400);
    expect(consumeE2ETokenTtlOverride()).toBeNull();
  });

  it('arms only the next ordinary vault mint', async () => {
    const { res, record } = stubRes();

    await handler(
      req({
        method: 'POST',
        body: { ttlMs: 20_000 },
        headers: { [RUN_ID_HEADER]: RUN_ID },
      }),
      res,
    );

    expect(record).toEqual({
      status: 200,
      body: { success: true, armed: true },
    });
    expect(consumeE2ETokenTtlOverride()).toBe(20_000);
    expect(consumeE2ETokenTtlOverride()).toBeNull();
  });
});
