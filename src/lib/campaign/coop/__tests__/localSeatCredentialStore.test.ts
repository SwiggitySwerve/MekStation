/** @jest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';

const leaf = path.resolve(
  process.cwd(),
  'src/lib/campaign/coop/localSeatCredentialStore.ts',
);
const absent = async () => undefined;
const api = fs.existsSync(leaf)
  ? require('../localSeatCredentialStore')
  : { listLocalSeats: absent, writeLocalSeat: absent };
const mockFetch = jest.fn();
const input = {
  action: 'provision',
  seatId: 'local-seat-1',
  expectedGeneration: 0,
  operatorPassword: 'primary-secret',
  password: 'seat-secret',
  label: 'Pilot',
};
const seats = [
  {
    seatId: 'local-seat-1',
    status: 'active',
    label: 'Pilot',
    playerId: 'p1',
    generation: 2,
    lockedUntil: null,
  },
];
const response = (
  body: unknown,
  status = 200,
  retry: string | null = null,
) => ({
  ok: status === 200,
  status,
  json: async () => body,
  headers: { get: () => retry },
});

describe('local seat request adapter', () => {
  afterEach(() => {
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual(
      mockFetch.mock.calls.map(() => '/api/multiplayer/auth/local-seats'),
    );
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
    let next = 0;
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () =>
        `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`,
    });
  });

  it('loads public seats through an uncached same-origin GET', async () => {
    mockFetch.mockResolvedValue(response({ seats }));
    expect(await api.listLocalSeats()).toEqual(seats);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/multiplayer/auth/local-seats',
      {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      },
    );
  });

  it('sends primary authorization, generation and fresh operation IDs without storing secrets', async () => {
    const storage = jest.spyOn(Storage.prototype, 'setItem');
    mockFetch.mockResolvedValue(
      response({ generation: 1, replayed: true, seats }),
    );
    expect(await api.writeLocalSeat(input)).toEqual({
      generation: 1,
      replayed: true,
      seats,
    });
    await api.writeLocalSeat(input);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const first = JSON.parse(mockFetch.mock.calls[0][1].body);
    const second = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(first).toEqual({ ...input, operationId: expect.any(String) });
    expect(second.operationId).not.toBe(first.operationId);
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it('sends revoke without provisioning fields', async () => {
    mockFetch.mockResolvedValue(
      response({ generation: 3, replayed: false, seats }),
    );
    const revoke = {
      action: 'revoke',
      seatId: 'local-seat-2',
      expectedGeneration: 2,
      operatorPassword: 'primary-secret',
    };
    await api.writeLocalSeat(revoke);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      ...revoke,
      operationId: expect.any(String),
    });
  });

  it.each([
    [
      401,
      'OPERATOR_DENIED',
      null,
      undefined,
      'Primary vault password was refused.',
    ],
    [
      401,
      'LOCAL_SEAT_DENIED',
      null,
      undefined,
      'Local seat credentials were refused.',
    ],
    [429, 'LOCAL_SEAT_THROTTLED', '17', 17, 'Retry after 17 seconds.'],
    [409, 'OPERATOR_IDENTITY_REQUIRED', null, undefined, 'Settings'],
  ])(
    'handles %s %s with safe metadata and no retries',
    async (status, code, retry, retryAfter, text) => {
      mockFetch.mockResolvedValue(
        response(
          { code, error: 'primary-secret private-key' },
          Number(status),
          retry as string | null,
        ),
      );
      await expect(api.writeLocalSeat(input)).rejects.toMatchObject({
        status,
        code,
        retryAfter,
        message: expect.stringContaining(text as string),
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['GENERATION_CONFLICT', 'OPERATION_MISMATCH'])(
    'preserves the %s conflict shape',
    async (code) => {
      mockFetch.mockResolvedValue(
        response({ code, currentGeneration: 4 }, 409),
      );
      await expect(api.writeLocalSeat(input)).rejects.toMatchObject({
        status: 409,
        code,
        currentGeneration: code === 'GENERATION_CONFLICT' ? 4 : undefined,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['network', 'json', 'unknown'])(
    'sanitizes %s failures',
    async (kind) => {
      const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
        (method) =>
          jest.spyOn(console, method).mockImplementation(() => undefined),
      );
      if (kind === 'network')
        mockFetch.mockRejectedValue(new Error('primary-secret private-key'));
      else if (kind === 'json')
        mockFetch.mockResolvedValue({
          ok: false,
          json: async () => {
            throw new Error('primary-secret');
          },
        });
      else
        mockFetch.mockResolvedValue(
          response({ code: 'primary-secret', error: 'private-key' }, 500),
        );
      await expect(api.writeLocalSeat(input)).rejects.toMatchObject({
        code: 'REQUEST_FAILED',
        message: 'Local seat request failed.',
      });
      for (const log of logs)
        expect(JSON.stringify(log.mock.calls)).not.toMatch(
          /primary-secret|seat-secret/,
        );
    },
  );
});
