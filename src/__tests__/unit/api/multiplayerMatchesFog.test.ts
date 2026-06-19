import type { NextApiRequest, NextApiResponse } from 'next';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import handler from '@/pages/api/multiplayer/matches';

jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    ok: true,
    playerId: 'pid_host',
    publicKey: 'host-public-key',
    token: {
      playerId: 'pid_host',
      issuedAt: '2026-04-30T00:00:00.000Z',
      expiresAt: '2026-04-30T01:00:00.000Z',
      publicKey: 'host-public-key',
      signature: 'host-signature',
    },
  }),
}));

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly wsUrl: string;
  readonly roomCode?: string;
  readonly meta: IMatchMeta;
}

interface IErrorResponse {
  readonly error: string;
}

interface MockResponse<T> {
  statusCode: number;
  body: T | undefined;
  headers: Record<string, string | readonly string[]>;
}

function mockReqRes(body: unknown): {
  req: NextApiRequest;
  res: NextApiResponse<ICreateMatchResponse | IErrorResponse>;
  result: MockResponse<ICreateMatchResponse | IErrorResponse>;
} {
  const result: MockResponse<ICreateMatchResponse | IErrorResponse> = {
    statusCode: 0,
    body: undefined,
    headers: {},
  };
  const req = {
    method: 'POST',
    headers: { host: 'test.local' },
    query: {},
    body,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: ICreateMatchResponse | IErrorResponse) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: string | readonly string[]) {
      result.headers[name] = value;
      return this;
    },
  } as unknown as NextApiResponse<ICreateMatchResponse | IErrorResponse>;
  return { req, res, result };
}

function createdMeta(
  result: MockResponse<ICreateMatchResponse | IErrorResponse>,
): IMatchMeta {
  expect(result.statusCode).toBe(201);
  expect(result.body).toBeDefined();
  const body = result.body;
  if (!body || 'error' in body) {
    throw new Error('Expected create-match response');
  }
  return body.meta;
}

describe('POST /api/multiplayer/matches fog config', () => {
  beforeEach(() => {
    _resetDefaultMatchStore();
  });

  it('defaults omitted fog config to false in match metadata', async () => {
    const { req, res, result } = mockReqRes({
      config: { mapRadius: 8, turnLimit: 20 },
      layout: '1v1',
      displayName: 'Host',
    });

    await handler(req, res);

    expect(createdMeta(result).config).toMatchObject({
      mapRadius: 8,
      turnLimit: 20,
      fogOfWar: false,
    });
  });

  it('preserves selected fog config in match metadata', async () => {
    const { req, res, result } = mockReqRes({
      config: { mapRadius: 8, turnLimit: 20, fogOfWar: true },
      layout: '1v1',
      displayName: 'Host',
    });

    await handler(req, res);

    expect(createdMeta(result).config).toMatchObject({
      mapRadius: 8,
      turnLimit: 20,
      fogOfWar: true,
    });
  });
});
