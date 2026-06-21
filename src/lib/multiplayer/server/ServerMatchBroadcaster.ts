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

export class ServerMatchBroadcaster {
  /**
   * Live registry of attached sockets. The lifecycle collaborator owns
   * the `attach`/`detach` calls — the broadcaster only reads this set
   * during fan-out.
   */
  private readonly sockets = new Set<IMatchSocket>();

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
    this.sockets.forEach((socket) => {
      try {
        socket.send(payload);
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
