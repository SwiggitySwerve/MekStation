import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/health';

function response() {
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

describe('container health', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports high heap and RSS without failing the container healthcheck', () => {
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 2 * 1024 ** 3,
      heapTotal: 3 * 1024 ** 3,
      rss: 4 * 1024 ** 3,
      external: 1024 ** 2,
      arrayBuffers: 0,
    });
    const { res, record } = response();
    handler({ method: 'GET' } as NextApiRequest, res);
    expect(record.status).toBe(200);
    expect(record.body).toMatchObject({
      status: 'healthy',
      checks: { server: 'ok' },
      memoryUsage: { heapUsed: 2048, heapTotal: 3072, rss: 4096, external: 1 },
    });
  });

  it('returns 503 when the health probe actually throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
      throw new Error('probe failed');
    });
    const { res, record } = response();
    handler({ method: 'GET' } as NextApiRequest, res);
    expect(record.status).toBe(503);
    expect(record.body).toMatchObject({
      status: 'unhealthy',
      checks: { server: 'error' },
    });
  });

  it('rejects an unsupported probe method', () => {
    const { res, record } = response();
    handler({ method: 'POST' } as NextApiRequest, res);
    expect(record.status).toBe(405);
  });
});
