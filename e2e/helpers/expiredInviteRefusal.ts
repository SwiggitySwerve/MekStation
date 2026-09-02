import type { Page } from '@playwright/test';

/**
 * The campaign-join wire refuses the stranger with UNKNOWN_MATCH. On this
 * tactical drive the match was created without a co-op campaign, so the
 * refusal lands at the campaign lookup (unknown-campaign-match) before
 * the room-code check is ever reached; the invite lookup's 404 and the
 * cleared room_code column are what prove the code itself expired.
 */
export const EXPIRED_INVITE_WIRE = {
  code: 'UNKNOWN_MATCH',
  reason: 'unknown-campaign-match',
} as const;

export interface ICampaignJoinRefusal {
  readonly code: string | null;
  readonly reason: string | null;
}

/**
 * Present the pre-launch room code on CampaignJoin.
 *
 * After LaunchMatch the live invite is null, so a stranger is refused
 * with this Error rather than a guessed UI string.
 */
export async function refuseExpiredRoomCodeOnCampaignWire(
  page: Page,
  input: {
    readonly matchId: string;
    readonly playerId: string;
    readonly wireToken: string;
    readonly roomCode: string;
  },
): Promise<ICampaignJoinRefusal> {
  return page.evaluate(
    async ({ matchId, playerId, token, roomCode }) =>
      new Promise<ICampaignJoinRefusal>((resolve) => {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const encoded = token
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const params = new URLSearchParams({
          channel: 'campaign',
          matchId,
          playerId,
        });
        const socket = new WebSocket(
          protocol + '//' + location.host + '/api/multiplayer/socket?' + params,
          ['mekstation.v1', 'mekstation.token.' + encoded],
        );
        const timeout = window.setTimeout(
          () => resolve({ code: null, reason: null }),
          15_000,
        );
        socket.addEventListener('open', () => {
          socket.send(
            JSON.stringify({
              kind: 'CampaignJoin',
              matchId,
              ts: new Date().toISOString(),
              playerId,
              role: 'guest',
              token,
              roomCode,
            }),
          );
        });
        socket.addEventListener('message', (message) => {
          if (typeof message.data !== 'string') return;
          try {
            const frame = JSON.parse(message.data) as {
              kind?: unknown;
              code?: unknown;
              reason?: unknown;
            };
            if (frame.kind !== 'Error') return;
            window.clearTimeout(timeout);
            socket.close();
            resolve({
              code: typeof frame.code === 'string' ? frame.code : null,
              reason: typeof frame.reason === 'string' ? frame.reason : null,
            });
          } catch {
            // Non-JSON frames are not the typed refusal.
          }
        });
        socket.addEventListener('error', () => {
          window.clearTimeout(timeout);
          resolve({ code: null, reason: null });
        });
      }),
    {
      matchId: input.matchId,
      playerId: input.playerId,
      token: input.wireToken,
      roomCode: input.roomCode,
    },
  );
}
