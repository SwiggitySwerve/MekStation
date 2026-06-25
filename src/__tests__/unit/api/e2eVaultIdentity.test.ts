import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/e2e/vault-identity';
import { createIdentity } from '@/services/vault/IdentityService';

const mockRepository = {
  save: jest.fn(),
  setActive: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => mockRepository,
}));

jest.mock('@/services/vault/IdentityService', () => ({
  createIdentity: jest.fn(),
}));

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | readonly string[]>;
}

function mockReqRes(opts: {
  method?: string;
  body?: unknown;
  runId?: string;
}): {
  req: NextApiRequest;
  res: NextApiResponse;
  result: MockResponse;
} {
  const result: MockResponse = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method: opts.method ?? 'POST',
    headers: opts.runId ? { 'x-playwright-e2e-run-id': opts.runId } : {},
    query: {},
    body: opts.body ?? {},
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: string | readonly string[]) {
      result.headers[name] = value;
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

const createIdentityMock = createIdentity as jest.MockedFunction<
  typeof createIdentity
>;

describe('/api/e2e/vault-identity', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    createIdentityMock.mockResolvedValue({
      id: 'identity-host',
      displayName: 'E2E Host',
      publicKey: 'public-key',
      encryptedPrivateKey: {
        ciphertext: 'ciphertext',
        iv: 'iv',
        salt: 'salt',
        algorithm: 'AES-GCM-256',
      },
      friendCode: 'ABCD-EFGH-JKLM-NPQR',
      createdAt: '2026-06-25T00:00:00.000Z',
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('404s outside Playwright E2E mode', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';
    process.env.PLAYWRIGHT_E2E_RUN_ID = 'run-1';
    const { req, res, result } = mockReqRes({
      runId: 'run-1',
      body: { displayName: 'E2E Host', password: 'password-123' },
    });

    await handler(req, res);

    expect(result.statusCode).toBe(404);
    expect(createIdentityMock).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('404s when the Playwright run id does not match', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = 'run-1';
    const { req, res, result } = mockReqRes({
      runId: 'wrong-run',
      body: { displayName: 'E2E Host', password: 'password-123' },
    });

    await handler(req, res);

    expect(result.statusCode).toBe(404);
    expect(createIdentityMock).not.toHaveBeenCalled();
  });

  it('creates and activates a vault identity for the matching E2E run', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = 'run-1';
    const { req, res, result } = mockReqRes({
      runId: 'run-1',
      body: { displayName: ' E2E Host ', password: 'password-123' },
    });

    await handler(req, res);

    expect(result.statusCode).toBe(201);
    expect(createIdentityMock).toHaveBeenCalledWith('E2E Host', 'password-123');
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'identity-host' }),
    );
    expect(mockRepository.setActive).toHaveBeenCalledWith('identity-host');
    expect(result.body).toMatchObject({
      success: true,
      id: 'identity-host',
      displayName: 'E2E Host',
    });
  });

  it('deletes requested identities for the matching E2E run', async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env.PLAYWRIGHT_E2E_RUN_ID = 'run-1';
    const { req, res, result } = mockReqRes({
      method: 'DELETE',
      runId: 'run-1',
      body: { ids: ['identity-host', 42, 'identity-guest'] },
    });

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    expect(mockRepository.delete).toHaveBeenCalledWith('identity-host');
    expect(mockRepository.delete).toHaveBeenCalledWith('identity-guest');
    expect(result.body).toEqual({ success: true, deleted: 2 });
  });
});
