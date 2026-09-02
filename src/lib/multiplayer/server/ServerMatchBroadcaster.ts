/**
 * ServerMatchBroadcaster — fan-out helper for outbound `IServerMessage`
 * envelopes.
 *
 * Owns nothing about lifecycle: callers register sockets when they
 * attach, deregister on detach, and call `broadcast` / `safeSend` to
 * push envelopes. Send failures are swallowed (the heartbeat / close
 * handler is responsible for reaping dead sockets — the broadcaster
 * never throws out of a send).
 *
 * Extracted from `ServerMatchHost` so the host facade can orchestrate
 * collaborators (lifecycle, pause controller, intent dispatchers) that
 * all need to push envelopes without each one knowing about the socket
 * registry.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from './ServerMatchSocketTypes';

/**
 * Per-connection outbound cap, in bytes already handed to the socket
 * and not yet flushed to the network.
 *
 * There is no queue of our own to bound: `send` hands the payload to
 * `ws`, which buffers it without limit. `bufferedAmount` IS the queue,
 * so the bound is a check on it. A megabyte is far more than a healthy
 * client ever holds - frames are small and drain in milliseconds - and
 * far less than a stalled client can grow to in a long match.
 */
export const MAX_BUFFERED_BYTES = 1_048_576;

export class ServerMatchBroadcaster {
  /**
   * Live registry of attached sockets. The lifecycle collaborator owns
   * the `attach`/`detach` calls — the broadcaster only reads this set
   * during fan-out.
   */
  private readonly sockets = new Set<IMatchSocket>();

  /** Connections whose outbound buffer passed `MAX_BUFFERED_BYTES`. */
  private readonly behind = new Set<IMatchSocket>();

  /** Last event sequence each connection actually received. */
  private readonly deliveredSeq = new Map<IMatchSocket, number>();

  /**
   * Register a socket so subsequent `broadcast` calls reach it.
   * Idempotent — re-registering the same socket is a no-op.
   */
  register = (socket: IMatchSocket): void => {
    this.sockets.add(socket);
  };

  /**
   * Drop a socket from the fan-out set. Idempotent. Does NOT close the
   * underlying socket — that's the caller's responsibility.
   */
  unregister = (socket: IMatchSocket): void => {
    this.sockets.delete(socket);
    // Clear the side-tables too. They are keyed by socket identity,
    // and a detached socket never comes back - keeping its row would
    // leak one entry per connection for the life of the match.
    this.behind.delete(socket);
    this.deliveredSeq.delete(socket);
  };

  /**
   * True once this connection's outbound buffer passed the cap. A
   * behind connection receives no further live frames: resuming
   * mid-stream would leave a HOLE in its event sequence, which is
   * worse than a gap it knows about. The lifecycle reaps it on the
   * next heartbeat tick, and the client reconnects and replays from
   * its cursor.
   */
  isBehind = (socket: IMatchSocket): boolean => {
    return this.behind.has(socket);
  };

  /** Sockets currently in the behind state. */
  behindSockets = (): readonly IMatchSocket[] => {
    return Array.from(this.behind);
  };

  /**
   * Whether this connection may be handed one more frame - and the ONE
   * place the bound is applied.
   *
   * Both halves of the bound live here so every fan-out path shares
   * them: a connection already behind is refused outright, and a
   * connection whose buffer has just passed the cap is moved into the
   * behind set and refused from now on. A refusal means the frame was
   * OWED and lost, never that it was withheld - so a caller that
   * numbers its frames per viewer asks this LAST, after the number is
   * assigned, and the unfilled number is what tells the viewer's rejoin
   * where to resume (see the call site in `ServerMatchHostEvents`).
   *
   * Extracted from `broadcast` when the per-viewer event fan-out was
   * found to bypass the bound entirely (it reached `safeSend` directly,
   * so a stalled viewer was handed authorized facts without limit).
   * Duplicating the check at the second call site would have let the
   * two drift; one method cannot.
   */
  admitForSend = (socket: IMatchSocket): boolean => {
    if (this.behind.has(socket)) return false;
    if (isSaturated(socket)) {
      this.behind.add(socket);
      return false;
    }
    return true;
  };

  /**
   * The last event sequence this connection actually received - the
   * durable cursor a resynchronization resumes from. Undefined when
   * no sequenced event has reached it yet.
   */
  deliveredCursor = (socket: IMatchSocket): number | undefined => {
    return this.deliveredSeq.get(socket);
  };

  /**
   * Snapshot the current socket count. Test/observability hook.
   */
  count = (): number => {
    return this.sockets.size;
  };

  /**
   * Snapshot the registered sockets. Returned as an array so callers
   * can iterate without observing concurrent mutations to the set.
   */
  snapshot = (): readonly IMatchSocket[] => {
    return Array.from(this.sockets);
  };

  /**
   * Send to every attached socket. Failures (closed socket, etc.) are
   * swallowed — the heartbeat timer will reap dead sockets.
   */
  broadcast = (message: IServerMessage): void => {
    const payload = JSON.stringify(message);
    const sequence = sequenceOf(message);
    this.sockets.forEach((socket) => {
      // One slow consumer must not grow the server's memory, and must
      // not delay anyone else. The bound itself lives in `admitForSend`
      // so this path and the per-viewer event fan-out share it.
      if (!this.admitForSend(socket)) return;
      try {
        socket.send(payload);
        // Recorded AFTER a successful send: the cursor is what this
        // connection actually received, not what we tried to give it.
        if (sequence !== null) this.deliveredSeq.set(socket, sequence);
      } catch {
        // Socket is dead — let the heartbeat / close handler clean up.
      }
    });
  };

  /**
   * Send to a single socket, swallowing send errors. Used for join +
   * replay paths where we don't want a single bad socket to throw out
   * of the upgrade handler.
   */
  safeSend = (socket: IMatchSocket, message: IServerMessage): void => {
    let payload: string;
    try {
      payload = JSON.stringify(message);
    } catch (error) {
      traceSendFailure(message, socket, error, 'serialize');
      return;
    }

    try {
      traceSendAttempt(message, socket, payload.length);
      if (process.env.MULTIPLAYER_SOCKET_TRACE !== '1') {
        socket.send(payload);
        return;
      }
      const callbackSocket = socket as IMatchSocket & {
        send(data: string, cb?: (error?: Error) => void): void;
      };
      callbackSocket.send(payload, (error?: Error) => {
        traceSendResult(message, socket, error);
      });
    } catch (error) {
      traceSendFailure(message, socket, error, 'send');
    }
  };
}

function traceSendAttempt(
  message: IServerMessage,
  socket: IMatchSocket,
  byteLength: number,
): void {
  if (process.env.MULTIPLAYER_SOCKET_TRACE !== '1') return;
  // eslint-disable-next-line no-console
  console.log(
    `[mp-socket:trace] send kind=${message.kind} readyState=${socket.readyState} bytes=${byteLength}`,
  );
}

function traceSendFailure(
  message: IServerMessage,
  socket: IMatchSocket,
  error: unknown,
  stage: 'serialize' | 'send',
): void {
  if (process.env.MULTIPLAYER_SOCKET_TRACE !== '1') return;
  // eslint-disable-next-line no-console
  console.error(
    `[mp-socket:trace] send ${stage} failed kind=${message.kind} readyState=${socket.readyState}`,
    error,
  );
}

function traceSendResult(
  message: IServerMessage,
  socket: IMatchSocket,
  error: Error | undefined,
): void {
  if (process.env.MULTIPLAYER_SOCKET_TRACE !== '1') return;
  if (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[mp-socket:trace] send callback failed kind=${message.kind} readyState=${socket.readyState}`,
      error,
    );
    return;
  }
  // eslint-disable-next-line no-console
  console.log(
    `[mp-socket:trace] send flushed kind=${message.kind} readyState=${socket.readyState}`,
  );
}

/**
 * Whether this connection's outbound buffer has passed the cap.
 *
 * `bufferedAmount` is optional on `IMatchSocket` because test doubles
 * and non-`ws` sockets do not have one. Absent means "no backpressure
 * signal", which is read as healthy - inventing saturation for a socket
 * that cannot report it would disconnect every mock in the suite.
 */
function isSaturated(socket: IMatchSocket): boolean {
  const buffered = socket.bufferedAmount;
  return typeof buffered === 'number' && buffered > MAX_BUFFERED_BYTES;
}

/**
 * The sequence an `Event` frame carries, or null for frames outside the
 * sequenced stream. Mirrors the client's own reading of
 * `event.sequence` - the cursor only means something if both ends
 * count the same thing.
 */
function sequenceOf(message: IServerMessage): number | null {
  if (message.kind !== 'Event') return null;
  const event = message.event;
  if (typeof event !== 'object' || event === null) return null;
  const sequence = (event as { sequence?: unknown }).sequence;
  return typeof sequence === 'number' ? sequence : null;
}
