/** @jest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';

import type { IPlayerToken } from '@/types/multiplayer/Player';

import {
  readCoopCampaignToken,
  storeCoopCampaignToken,
} from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

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

// Absent features are callable no-ops for RED, so assertions reach observable
// storage/request/results behavior rather than failing module resolution.
function feature(name: string, ...args: unknown[]) {
  return typeof api[name] === 'function' ? api[name](...args) : undefined;
}
const choiceKey = 'mekstation.coopCredential.choice';
const bindingKey = 'mekstation.coopCredential.joined.match-a';
const playerA = 'pid_11111111111111111111';
const playerB = 'pid_22222222222222222222';
const now = Date.parse('2026-10-20T12:00:00Z');
function token(patch: Partial<IPlayerToken> = {}): IPlayerToken {
  return {
    playerId: playerA,
    issuedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 3_599_000).toISOString(),
    publicKey: 'cHVibGljLWtleQ==',
    signature: 'c2lnbmF0dXJl',
    ...patch,
  };
}
function minted(value = token()) {
  return {
    wireToken: encodeTokenForWire(value),
    token: value,
    displayName: 'Pilot',
  };
}
function mintBody(value = token()) {
  return {
    token: encodeTokenForWire(value),
    playerId: value.playerId,
    expiresAt: value.expiresAt,
    displayName: 'Pilot',
  };
}
function joined(value = token()) {
  storeCoopCampaignToken({
    matchId: 'match-a',
    playerId: value.playerId,
    wireToken: encodeTokenForWire(value),
    displayName: 'Pilot',
  });
  feature('rememberCoopCredential', 'match-a', 'seat2', value.playerId);
  return { matchId: 'match-a', choice: 'seat2', playerId: value.playerId };
}

describe('LSC-2C public choice and credential adapter', () => {
  let logs: jest.SpyInstance[];
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockFetch.mockReset();
    global.fetch = mockFetch;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((name) =>
      jest.spyOn(console, name).mockImplementation(() => undefined),
    );
  });
  afterEach(() => {
    for (const log of logs)
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /seat-secret|primary-secret/,
      );
    jest.restoreAllMocks();
  });

  it('C05 persists only the public choice across reload, without minting', () => {
    expect(feature('readCoopCredentialChoice')).toBe('primary');
    feature('writeCoopCredentialChoice', 'seat2');
    expect(localStorage.getItem(choiceKey)).toBe('seat2');
    jest.isolateModules(() => {
      const reloaded = require('../localSeatCredentialStore');
      expect(reloaded.readCoopCredentialChoice?.()).toBe('seat2');
    });
    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(['admin', 'local-seat-1', '', '{"password":"seat-secret"}'])(
    'C06 refuses an invalid saved choice %s',
    (invalid) => {
      localStorage.setItem(choiceKey, invalid);
      expect(() => feature('readCoopCredentialChoice')).toThrow(
        'Saved credential choice is invalid',
      );
      expect(() => feature('writeCoopCredentialChoice', invalid)).toThrow(
        'Saved credential choice is invalid',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('C06 reports storage failure without reflecting its error', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('seat-secret');
    });
    expect(() => feature('readCoopCredentialChoice')).toThrow(
      'Browser storage is unavailable',
    );
  });

  it.each([
    [
      'seat1',
      '/api/multiplayer/auth/local-seats',
      { action: 'mint', seatId: 'local-seat-1', password: 'seat-secret' },
    ],
    [
      'seat2',
      '/api/multiplayer/auth/local-seats',
      { action: 'mint', seatId: 'local-seat-2', password: 'seat-secret' },
    ],
    ['primary', '/api/multiplayer/auth/token', { password: 'seat-secret' }],
  ])(
    'C01 C02 mints %s exactly once at its URL with the exact payload',
    async (choice, url, body) => {
      const storage = jest.spyOn(Storage.prototype, 'setItem');
      mockFetch.mockResolvedValue(response(mintBody()));
      expect(
        await feature('mintCoopCredential', choice, 'seat-secret'),
      ).toEqual(minted());
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(storage).not.toHaveBeenCalled();
    },
  );

  it.each([
    [401, '17', 'LOCAL_SEAT_DENIED', undefined],
    [429, '17', 'LOCAL_SEAT_THROTTLED', 17],
    [429, '-2', 'LOCAL_SEAT_THROTTLED', undefined],
    [429, 'NaN', 'LOCAL_SEAT_THROTTLED', undefined],
    [500, '17', 'REQUEST_FAILED', undefined],
  ])(
    'C03 sanitizes mint HTTP %s with retry metadata %s, without retry',
    async (status, retry, code, retryAfter) => {
      mockFetch.mockResolvedValue(
        response(
          { error: 'seat-secret', code: 'seat-secret' },
          Number(status),
          String(retry),
        ),
      );
      await expect(
        Promise.resolve().then(() =>
          feature('mintCoopCredential', 'seat2', 'seat-secret'),
        ),
      ).rejects.toMatchObject({ status, code, retryAfter });
      expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
        '/api/multiplayer/auth/local-seats',
      ]);
    },
  );

  it.each(['network', 'json'])(
    'C04 sanitizes %s failures without logging credentials',
    async (kind) => {
      if (kind === 'network')
        mockFetch.mockRejectedValue(new Error('seat-secret'));
      else
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error('seat-secret');
          },
        });
      await expect(
        Promise.resolve().then(() =>
          feature('mintCoopCredential', 'seat2', 'seat-secret'),
        ),
      ).rejects.toMatchObject({
        code: 'REQUEST_FAILED',
        message: 'Local seat request failed.',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(localStorage.length + sessionStorage.length).toBe(0);
    },
  );

  it.each(['', 'x'.repeat(513)])(
    'C04 refuses invalid password length without a request',
    async (password) => {
      await expect(
        Promise.resolve().then(() =>
          feature('mintCoopCredential', 'seat2', password),
        ),
      ).rejects.toMatchObject({ code: 'LOCAL_SEAT_DENIED' });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it('C07 C17 binds public match identity independently from the next-join preference', () => {
    const binding = joined();
    feature('writeCoopCredentialChoice', 'primary');
    expect(feature('readCoopCredentialStatus', 'match-a')).toEqual({
      ...binding,
      expiresAt: now + 3_599_000,
    });
    expect(JSON.parse(sessionStorage.getItem(bindingKey) ?? 'null')).toEqual(
      binding,
    );
    expect(
      Object.keys(
        JSON.parse(sessionStorage.getItem(bindingKey) ?? '{}'),
      ).sort(),
    ).toEqual(['choice', 'matchId', 'playerId']);
    expect(localStorage.getItem(choiceKey)).toBe('primary');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    null,
    '{}',
    'invalid-json',
    JSON.stringify({ matchId: 'other', choice: 'seat2', playerId: playerA }),
    JSON.stringify({
      matchId: 'match-a',
      choice: 'seat2',
      playerId: playerA,
      password: 'seat-secret',
    }),
  ])('C08 refuses a missing or malformed joined binding %s', (raw) => {
    joined();
    if (raw === null) sessionStorage.removeItem(bindingKey);
    else sessionStorage.setItem(bindingKey, raw);
    expect(() => feature('readCoopCredentialStatus', 'match-a')).toThrow(
      'joined credential is unavailable',
    );
  });

  it('C09 refuses binding when no matching bearer was stored', () => {
    expect(() =>
      feature('rememberCoopCredential', 'match-a', 'seat2', playerA),
    ).toThrow('joined credential is unavailable');
    joined();
    expect(() =>
      feature('rememberCoopCredential', 'match-a', 'seat2', playerB),
    ).toThrow('joined credential is unavailable');
  });

  it('C10 explicit match forget clears choice, joined binding and bearer, preserving other matches', () => {
    joined();
    feature('writeCoopCredentialChoice', 'seat2');
    storeCoopCampaignToken({
      matchId: 'other-match',
      playerId: playerA,
      wireToken: encodeTokenForWire(token()),
      displayName: 'Other',
    });
    feature('forgetCoopCredential', 'match-a');
    expect(localStorage.getItem(choiceKey)).toBeNull();
    expect(sessionStorage.getItem(bindingKey)).toBeNull();
    expect(readCoopCampaignToken('match-a')).toBeNull();
    expect(readCoopCampaignToken('other-match')?.displayName).toBe('Other');
  });

  it('C11 attempts remaining removals after storage fails and reports incomplete forget', () => {
    joined();
    const remove = Storage.prototype.removeItem;
    const calls: string[] = [];
    jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(function (this: Storage, key) {
        calls.push(key);
        if (key === choiceKey) throw new Error('seat-secret');
        return remove.call(this, key);
      });
    expect(() => feature('forgetCoopCredential', 'match-a')).toThrow(
      'Browser storage is unavailable',
    );
    expect(calls).toEqual([
      choiceKey,
      bindingKey,
      'mekstation.coopCampaign.token.match-a',
    ]);
    expect(readCoopCampaignToken('match-a')).toBeNull();
  });

  it('C12 refuses rotated principal without replacing the original bearer', () => {
    const binding = joined();
    expect(() =>
      feature(
        'replaceCoopCredential',
        binding,
        minted(token({ playerId: playerB })),
      ),
    ).toThrow('different player');
    expect(readCoopCampaignToken('match-a')?.wireToken).toBe(
      encodeTokenForWire(token()),
    );
  });

  it('C13 refuses a binding changed during the in-flight mint', () => {
    const binding = joined();
    sessionStorage.setItem(
      bindingKey,
      JSON.stringify({ ...binding, choice: 'primary' }),
    );
    expect(() => feature('replaceCoopCredential', binding, minted())).toThrow(
      'different player',
    );
  });

  it('C16 renews an expired same-player bearer without changing the joined choice', () => {
    const expired = token({ expiresAt: new Date(now - 1).toISOString() });
    const binding = joined(expired);
    feature('writeCoopCredentialChoice', 'primary');
    feature('replaceCoopCredential', binding, minted());
    expect(readCoopCampaignToken('match-a')?.wireToken).toBe(
      minted().wireToken,
    );
    expect(feature('readCoopCredentialStatus', 'match-a')).toEqual({
      ...binding,
      expiresAt: now + 3_599_000,
    });
  });

  it('C14 refuses replacement when the wire bearer and decoded result disagree', () => {
    const binding = joined();
    expect(() =>
      feature('replaceCoopCredential', binding, {
        ...minted(),
        wireToken: encodeTokenForWire(token({ playerId: playerB })),
      }),
    ).toThrow();
    expect(readCoopCampaignToken('match-a')?.wireToken).toBe(
      minted().wireToken,
    );
  });

  it.each([
    'player',
    'expiry',
    'expired',
    'future',
    'scope',
    'lifetime',
    'malformed',
    'display',
  ])('C14 C15 rejects invalid minted %s metadata', async (kind) => {
    let value = token();
    if (kind === 'expired')
      value = token({ expiresAt: new Date(now - 1).toISOString() });
    if (kind === 'future')
      value = token({ issuedAt: new Date(now + 60_000).toISOString() });
    if (kind === 'lifetime')
      value = token({ expiresAt: new Date(now + 7_200_000).toISOString() });
    if (kind === 'scope')
      value = token({ scope: { kind: 'match', id: 'match-a' } });
    const body = {
      ...mintBody(value),
      ...(kind === 'player'
        ? { playerId: playerB }
        : kind === 'expiry'
          ? { expiresAt: new Date(now + 1).toISOString() }
          : kind === 'malformed'
            ? { token: 'bad-wire-token' }
            : kind === 'display'
              ? { displayName: '' }
              : {}),
    };
    mockFetch.mockResolvedValue(response(body));
    await expect(
      Promise.resolve().then(() =>
        feature('mintCoopCredential', 'seat2', 'seat-secret'),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('C18 uses the canonical four-minute prompt without automatic mint', () => {
    expect(api.RENEWAL_WINDOW_MS).toBe(4 * 60 * 1000);
    expect(mockFetch).not.toHaveBeenCalled();
  });
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
