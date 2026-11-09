/**
 * Pins the assumption behind "automatic cleanup keeps a live host's own
 * spectator seat" (`holdsAutoReleasableSpectatorSeat`): a normal host holds a
 * PLAYING seat,
 * a host holds a spectator seat only when it asks for one (the co-op campaign
 * GM, `hostSeatKind: 'spectator'`), and a player who holds a playing seat can
 * never register as a viewer. If a change breaks any of these, the detach
 * path and the boot sweep need the rule revisited, so this fails loudly.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import { type IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import {
  addSpectatorSeat,
  holdsAutoReleasableSpectatorSeat,
  SpectatorSeatError,
} from '@/lib/multiplayer/server/lobby/spectatorSeats';
import handler from '@/pages/api/multiplayer/matches';

jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    ok: true,
    playerId: 'pid_host',
    publicKey: 'host-public-key',
    token: {
      playerId: 'pid_host',
      issuedAt: '2026-11-09T00:00:00.000Z',
      expiresAt: '2026-11-09T01:00:00.000Z',
      publicKey: 'host-public-key',
      signature: 'host-signature',
    },
  }),
}));

async function createMatch(
  extra: Record<string, unknown> = {},
): Promise<IMatchMeta> {
  const result: { statusCode: number; body: unknown } = {
    statusCode: 0,
    body: undefined,
  };
  const req = {
    method: 'POST',
    headers: { host: 'test.local' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {
      config: { mapRadius: 6, turnLimit: 10 },
      layout: '1v1',
      displayName: 'Host',
      ...extra,
    },
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
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse;
  await handler(req, res);
  if (result.statusCode !== 201) {
    throw new Error(
      `POST /matches answered ${result.statusCode}: ${JSON.stringify(result.body)}`,
    );
  }
  return (result.body as { meta: IMatchMeta }).meta;
}

const hostSeat = (meta: IMatchMeta) =>
  (meta.seats ?? []).find((seat) => seat.occupant?.playerId === 'pid_host');

describe('where a match host sits', () => {
  beforeEach(() => {
    _resetDefaultMatchStore();
    _resetRateLimitBucketsForTests();
  });

  it('seats a normal host in a playing seat, so it is never an automatically releasable spectator seat', async () => {
    const meta = await createMatch();

    expect(hostSeat(meta)?.kind).toBe('human');
    expect(holdsAutoReleasableSpectatorSeat(meta, 'pid_host')).toBe(false);
    // ...and a player holding a playing seat cannot register as a viewer.
    expect(() =>
      addSpectatorSeat(meta.seats ?? [], {
        playerId: 'pid_host',
        displayName: 'Host',
      }),
    ).toThrow(SpectatorSeatError);
  });

  it('seats a host in a spectator seat only when it asks for one', async () => {
    const meta = await createMatch({ hostSeatKind: 'spectator' });

    expect(hostSeat(meta)?.kind).toBe('spectator');
    expect(meta.hostPlayerId).toBe('pid_host');
    // The host's own spectator seat is the GM's seat, not a registration.
    expect(holdsAutoReleasableSpectatorSeat(meta, 'pid_host')).toBe(false);
  });
});
