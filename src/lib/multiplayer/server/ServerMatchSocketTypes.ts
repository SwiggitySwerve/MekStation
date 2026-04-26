/**
 * ServerMatchSocketTypes — shared socket interface used by every
 * `ServerMatchHost` collaborator (broadcaster, socket lifecycle, etc.).
 *
 * Lives in its own leaf module so collaborators can import it without
 * pulling in the whole host facade — that keeps the dependency graph
 * acyclic (broadcaster → types; lifecycle → broadcaster + types; facade
 * → all of the above).
 */

import type { WebSocket as WsWebSocket } from 'ws';

/**
 * Minimal interface the host needs from a connected socket. Lets tests
 * inject a `Set<MockSocket>` without standing up a real WebSocket
 * server. In production this is a `ws.WebSocket`.
 */
export interface IMatchSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

// Re-export the WebSocket type for the upgrade handler so it doesn't
// need a direct `ws` import alongside the host.
export type { WsWebSocket };
