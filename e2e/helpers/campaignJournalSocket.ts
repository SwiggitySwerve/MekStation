/**
 * A Node-side campaign-sync WebSocket client for the two-process drive
 * (R2.authority-live, rows R and D).
 *
 * WHY THIS EXISTS RATHER THAN `page.evaluate`. Every campaign socket in
 * `e2e/` today is opened from inside a browser page
 * (`gm-two-player-membership.smoke.spec.ts:363-383`,
 * `gmTwoPlayerAuthorityRecovery.ts:262`), because those drives already
 * have a page for their own reasons. The two-process drive has no page
 * for its SOURCE process at all - the source is a server this spec
 * spawned on its own port, and Playwright's browser is pointed at the
 * other one. A browser-hosted socket would therefore have to dial across
 * origins from the replica's page into the source, which is a different
 * topology from the one under test. `ws` is already a production
 * dependency (`src/pages/api/campaigns/[id]/replica-sync.ts:46` dials
 * with it server-side), so this adds nothing to the manifest.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not reimplement any
 * admission rule. The subprotocol credential shape, the `channel=campaign`
 * query and the `CampaignJoin` frame are all copied from the membership
 * smoke's own in-page client, and every decision about who is admitted,
 * what seat they take, and what they may see is made by the server.
 */

import { WebSocket } from 'ws';

import type {
  ICampaignIntent,
  ICampaignIntentPayloadMap,
} from '@/types/campaign/CampaignSync';

/**
 * One frame as this client reads it. Narrow on purpose: the spec asserts
 * on the discriminant, the refusal reason and the carried event type,
 * and widening this would invite assertions on fields the server is free
 * to reshape.
 */
export interface IWireFrame {
  readonly kind: string;
  readonly code: string | null;
  readonly reason: string | null;
  readonly eventType: string | null;
  readonly eventSequence: number | null;
}

/** How a join attempt ended. */
export type JoinTerminal = 'snapshot' | 'refusal' | 'closed' | 'timeout';

export interface ICampaignSyncClient {
  /** The verified principal this socket carries. */
  readonly playerId: string;
  /** How the join ended - `snapshot` is admission. */
  readonly terminal: JoinTerminal;
  /** Every frame received so far, in arrival order. */
  readonly frames: readonly IWireFrame[];
  /** Frames received since the last call to `drain()`. */
  drain(): readonly IWireFrame[];
  /** Send one host-authorized intent. Host sockets only. */
  sendHostIntent<K extends keyof ICampaignIntentPayloadMap>(
    kind: K,
    intentId: string,
    payload: ICampaignIntentPayloadMap[K],
    campaignId: string,
  ): void;
  /** Resolve once `predicate` matches a frame, or throw at the deadline. */
  waitForFrame(
    predicate: (frame: IWireFrame) => boolean,
    what: string,
    timeoutMs?: number,
  ): Promise<IWireFrame>;
  close(): void;
}

/** Base64url, the transform `server.js:283-288` reverses on the way in. */
function toBase64Url(wireToken: string): string {
  return wireToken.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Read the fields this client asserts on; anything else is ignored. */
function parseFrame(raw: unknown): IWireFrame | null {
  if (typeof raw !== 'string') return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.kind !== 'string') return null;
  const event =
    typeof record.event === 'object' && record.event !== null
      ? (record.event as Record<string, unknown>)
      : null;
  const str = (source: Record<string, unknown>, key: string): string | null =>
    typeof source[key] === 'string' ? (source[key] as string) : null;
  return {
    kind: record.kind,
    code: str(record, 'code'),
    reason: str(record, 'reason'),
    eventType: event === null ? null : str(event, 'type'),
    eventSequence:
      event !== null && typeof event.sequence === 'number'
        ? event.sequence
        : null,
  };
}

/**
 * Open one campaign-sync socket and send its `CampaignJoin`.
 *
 * Resolves once the server has ANSWERED the join - with a snapshot, an
 * error frame, or a close - rather than on `open`. A caller that
 * resolved on open would go on to assert about admission before the
 * server had decided anything.
 */
export async function openCampaignSyncSocket(input: {
  readonly origin: string;
  readonly matchId: string;
  readonly playerId: string;
  readonly wireToken: string;
  readonly role: 'host' | 'guest';
  readonly roomCode?: string;
  readonly timeoutMs?: number;
}): Promise<ICampaignSyncClient> {
  const parameters = new URLSearchParams({
    channel: 'campaign',
    matchId: input.matchId,
    playerId: input.playerId,
  });
  const url = `${input.origin.replace(/^http/, 'ws')}/api/multiplayer/socket?${parameters.toString()}`;
  const socket = new WebSocket(url, [
    'mekstation.v1',
    `mekstation.token.${toBase64Url(input.wireToken)}`,
  ]);

  const frames: IWireFrame[] = [];
  let drainedTo = 0;
  const waiters: {
    predicate: (frame: IWireFrame) => boolean;
    resolve: (frame: IWireFrame) => void;
  }[] = [];

  socket.on('message', (data: unknown) => {
    const frame = parseFrame(String(data));
    if (!frame) return;
    frames.push(frame);
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      if (waiters[index].predicate(frame)) {
        waiters[index].resolve(frame);
        waiters.splice(index, 1);
      }
    }
  });
  // Drained rather than thrown: a socket the server closes on purpose
  // (a revoked member's) is an OUTCOME this drive asserts on, not a
  // failure of the harness.
  socket.on('error', () => undefined);

  const terminal = await new Promise<JoinTerminal>((resolve) => {
    let settled = false;
    const finish = (value: JoinTerminal): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(
      () => finish('timeout'),
      input.timeoutMs ?? 20_000,
    );
    socket.on('open', () => {
      socket.send(
        JSON.stringify({
          kind: 'CampaignJoin',
          matchId: input.matchId,
          ts: new Date().toISOString(),
          playerId: input.playerId,
          role: input.role,
          token: input.wireToken,
          ...(input.roomCode ? { roomCode: input.roomCode } : {}),
        }),
      );
    });
    socket.on('message', (data: unknown) => {
      const frame = parseFrame(String(data));
      if (!frame) return;
      if (frame.kind === 'CampaignSnapshot') finish('snapshot');
      if (frame.kind === 'Error') finish('refusal');
    });
    socket.on('close', () => finish('closed'));
  });

  return {
    playerId: input.playerId,
    terminal,
    frames,
    drain(): readonly IWireFrame[] {
      const slice = frames.slice(drainedTo);
      drainedTo = frames.length;
      return slice;
    },
    sendHostIntent(kind, intentId, payload, campaignId): void {
      const intent = { campaignId, intentId, kind, payload } as ICampaignIntent;
      socket.send(
        JSON.stringify({
          kind: 'CampaignHostIntent',
          matchId: input.matchId,
          ts: new Date().toISOString(),
          playerId: input.playerId,
          intent,
        }),
      );
    },
    async waitForFrame(
      predicate,
      what,
      timeoutMs = 20_000,
    ): Promise<IWireFrame> {
      const already = frames.find(predicate);
      if (already) return already;
      return new Promise<IWireFrame>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              `${input.playerId} never received ${what}; saw ` +
                `${frames.map((frame) => frame.kind).join(', ')}`,
            ),
          );
        }, timeoutMs);
        waiters.push({
          predicate,
          resolve: (frame) => {
            clearTimeout(timer);
            resolve(frame);
          },
        });
      });
    },
    close(): void {
      socket.close();
    },
  };
}

/**
 * Let the wire settle, then report what arrived.
 *
 * A SETTLE-based wait rather than a growth-based one: "no frame ever
 * arrives" cannot be proven by watching a counter fail to move for a
 * moment, so the drive waits a fixed span and then asserts on what the
 * span actually delivered - with a positive control on another socket
 * proving the span was long enough to deliver anything at all.
 */
export async function settle(ms = 2_000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
