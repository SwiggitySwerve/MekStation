/**
 * Mirror Session helpers for the P2P guest peer.
 *
 * Wave 4 multiplayer foundation B (`add-p2p-game-session-sync` § 4):
 * the guest peer in a networked match runs a mirror copy of the host's
 * session. The mirror is built from the same `IGameConfig` + `IGameUnit`
 * snapshot as the host, then advanced solely by events the host
 * broadcasts on the peer channel. The guest never appends its own
 * events — only the host has the authority to mutate the
 * canonical event log. This module ships the small set of guarded
 * helpers the React surface uses to enforce that contract.
 *
 * Why a thin wrapper instead of a full subclass:
 *   - `IGameSession` is already an immutable value object; the read API
 *     (units, events, currentState, selectedUnitId, etc.) is identical
 *     between host and guest because the same shape ships back from the
 *     reducer either way.
 *   - The only behavioural divergence is "where do new events come
 *     from?" — the host appends locally, the guest applies events that
 *     arrive on the peer channel. Both flows funnel through the same
 *     `appendEvent` reducer, so we reuse it instead of duplicating the
 *     state machine.
 *   - The guard helpers below (`createMirrorSession`,
 *     `applyMirrorEvent`, `assertMirrorAppendForbidden`) make the
 *     intent explicit at every call site so a future contributor can't
 *     accidentally route a UI commit straight into the guest's
 *     `appendEvent` and silently desync the two peers.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 1
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 4
 */

import {
  GameSide,
  type IGameConfig,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  appendEvent,
  createGameSession,
} from '@/utils/gameplay/gameSessionCore';

/**
 * Options passed when constructing a guest mirror session. The shape
 * mirrors `ICreateGameSessionOptions` but `id` and `createdAt` are
 * mandatory because the guest MUST adopt the host's identifiers
 * verbatim — otherwise the two sessions emit different `gameId`
 * values and the spec scenario "host and guest converge byte-identically"
 * cannot hold.
 */
export interface ICreateMirrorSessionOptions {
  /** Match id from the host's `createGameSession` invocation. */
  readonly id: string;
  /** Wall-clock timestamp on the host when it created the session. */
  readonly createdAt: string;
  /** Host peer id, threaded through to `IGameSession.hostPeerId`. */
  readonly hostPeerId: string;
  /** Guest peer id (the local peer when this helper runs). */
  readonly guestPeerId: string;
  /** Side ownership map — the host pre-computes this and ships it to the guest. */
  readonly sideOwners?: Readonly<Record<GameSide, string>> | null;
}

/**
 * Build a guest mirror session from the same config / units / id /
 * timestamp the host used. The result is a value-equal twin of the
 * host's `createGameSession` output before any further events fire.
 *
 * Spec § 4.1: "Guest creates a session object from the same config as
 * the host (no local rolling, no local time)" — both the timestamp and
 * the id are taken from the caller, never from the local clock or a
 * fresh uuid.
 */
export function createMirrorSession(
  config: IGameConfig,
  units: readonly IGameUnit[],
  options: ICreateMirrorSessionOptions,
): IGameSession {
  return createGameSession(config, units, {
    id: options.id,
    createdAt: options.createdAt,
    hostPeerId: options.hostPeerId,
    guestPeerId: options.guestPeerId,
    sideOwners: options.sideOwners,
  });
}

/**
 * Apply a host-authored event to the mirror. Thin alias over
 * `appendEvent` so the call site reads "this came in from the
 * channel" rather than "the local UI appended an event". Behaviour is
 * identical to a host `appendEvent` because the reducer is pure — that
 * is the property the spec relies on.
 *
 * Spec § 4.3: the read API the guest exposes (units / events /
 * currentState / selectedUnitId / etc.) is the same shape the host
 * exposes; no transformation is needed when piping events through.
 */
export function applyMirrorEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  return appendEvent(session, event);
}

/**
 * Reasons a mirror session might reject a local append attempt. The
 * UI surfaces these values in the `peer-rejected` toast (spec §
 * "Peer cannot append for foreign side"); the strings are stable for
 * tests and the toast content layer.
 */
export type MirrorAppendRejection =
  | 'mirror-readonly'
  | 'foreign-side'
  | 'no-session';

export class MirrorAppendForbiddenError extends Error {
  readonly reason: MirrorAppendRejection;

  constructor(reason: MirrorAppendRejection, message?: string) {
    super(message ?? `Mirror session cannot append events: ${reason}`);
    this.name = 'MirrorAppendForbiddenError';
    this.reason = reason;
  }
}

/**
 * Decision helper for the guest UI: returns `null` when the local peer
 * is allowed to dispatch the action (host path), or a structured
 * rejection when the action would mutate canonical state from the
 * guest. Spec § 4.2 + § 4.4: the guest's "Commit" buttons MUST route
 * through an intent broadcast instead of calling `appendEvent`
 * directly.
 *
 * The helper is intentionally read-only. It does not throw — the UI
 * layer typically wants to swap a "Commit" button for "Send commit to
 * host" rather than crash on press.
 */
export function describeMirrorAppendRejection(input: {
  readonly session: IGameSession | null;
  readonly localPeerId: string | null | undefined;
}): MirrorAppendRejection | null {
  if (!input.session) return 'no-session';
  if (!isMirrorSession(input.session, input.localPeerId)) return null;
  return 'mirror-readonly';
}

/**
 * Hard guard for the engine layer. Call this at the top of any local
 * commit path on the guest (e.g., the React store's
 * `commitPlannedMovement`) to fail loudly if the call ever survives
 * the UI gate. Throws `MirrorAppendForbiddenError` so consumers can
 * `try / catch` and surface a `peer-rejected` toast without leaking
 * unstructured strings.
 */
export function assertMirrorAppendForbidden(
  session: IGameSession | null,
  localPeerId: string | null | undefined,
): void {
  const reason = describeMirrorAppendRejection({ session, localPeerId });
  if (reason !== null) {
    throw new MirrorAppendForbiddenError(reason);
  }
}

/**
 * True when the local peer is the guest in a networked match — i.e.
 * the session has both a host and a guest peer id, the guest matches
 * the local peer, and the host is somebody else. Local hot-seat /
 * single-player sessions return false (no `hostPeerId` recorded), so
 * this helper is safe to call on any session.
 */
export function isMirrorSession(
  session: IGameSession,
  localPeerId: string | null | undefined,
): boolean {
  if (!localPeerId) return false;
  if (!session.hostPeerId) return false;
  if (!session.guestPeerId) return false;
  if (session.hostPeerId === localPeerId) return false;
  return session.guestPeerId === localPeerId;
}
