/**
 * Host-side intent router.
 *
 * Wave 4 multiplayer foundation B (`add-p2p-game-session-sync` § 5.3 +
 * § 7.2): the host listens for guest-authored intents on the peer
 * channel, translates each one into events via `intentTranslation`, and
 * either:
 *   1. Appends the events through the host's engine (which broadcasts
 *      them onward to the guest via the channel's normal path), or
 *   2. Broadcasts a structured `peer-rejected` envelope back to the
 *      guest so its UI can surface a toast.
 *
 * § 7.2: when the guest is currently `PeerPending` (their awareness
 * dropped — see `gameSessionRoles.deriveLocalMatchStatusFromAwareness`),
 * the router buffers incoming intents instead of applying them. The
 * host will drain the buffer on reconnect (the channel re-delivers
 * intents because Yjs history is replayed). For tests + integration
 * the buffer drain helper exposes the queued intents so a UI banner
 * can show "1 pending action will run on reconnect".
 *
 * Pure module — no React, no global stores. Wiring is done by the
 * page-level hook.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 5
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 7
 */

import type {
  IGameEvent,
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  translateIntentToEvents,
  type IntentRejectionReason,
  type IIntentTranslationOptions,
  type IntentTranslationResult,
} from './intentTranslation';

/**
 * Adapter the router calls to fetch the current host session, append a
 * translated event, and surface a structured rejection back to the
 * guest. Keeping these as discrete callbacks lets the integration test
 * supply a fake session + capture rejections without spinning up a
 * real `InteractiveSession`.
 */
export interface IHostIntentRouterAdapter {
  /** Returns the host's current session snapshot, or null if no match is live. */
  readonly getSession: () => IGameSession | null;
  /**
   * Append a host-translated event. The router calls this in order
   * for every event the translator produced. The adapter is
   * responsible for both updating local engine state AND broadcasting
   * the event onto the peer channel — the caller's existing
   * `appendEvent` path already does both.
   */
  readonly appendEvent: (event: IGameEvent) => void;
  /**
   * Broadcast a structured rejection back to the guest. Called when
   * the translator returns `{ ok: false }` or when the host is
   * currently rejecting incoming intents (e.g. match concluded).
   */
  readonly broadcastRejection: (rejection: {
    reason: IntentRejectionReason | string;
    detail?: string;
  }) => void;
  /**
   * Optional host-authoritative rules context. When provided, movement
   * intents are validated against the same grid/capability data the local
   * engine uses instead of trusting guest-supplied MP, heat, or path data.
   */
  readonly getIntentTranslationOptions?: () => IIntentTranslationOptions;
  /**
   * True when the host is currently in a `guestPending` state and
   * cannot apply the guest's intents in real time. Defaults to false.
   * The router buffers intents while this returns true and drains
   * them on a subsequent `flushBuffered`.
   */
  readonly isGuestPending?: () => boolean;
}

/**
 * Public buffer state — the page-level UI can show a "1 pending guest
 * action" banner using this.
 */
export interface IHostIntentBufferState {
  readonly pending: readonly IGameIntent[];
}

export interface IHostIntentRouter {
  /** Process a single intent that arrived on the channel. */
  readonly handleIntent: (intent: IGameIntent) => HostIntentRouterResult;
  /**
   * Drain any intents that were buffered while the guest was pending,
   * processing each through `handleIntent` again. Returns the per-
   * intent results so callers can log the drain.
   */
  readonly flushBuffered: () => HostIntentRouterResult[];
  /** Read-only view of the buffer for diagnostics + UI. */
  readonly getBufferState: () => IHostIntentBufferState;
}

export type HostIntentRouterResult =
  | { readonly outcome: 'applied'; readonly events: readonly IGameEvent[] }
  | {
      readonly outcome: 'rejected';
      readonly reason: IntentRejectionReason;
      readonly detail?: string;
    }
  | { readonly outcome: 'buffered' };

/**
 * Build a host intent router around the supplied adapter. Returned
 * router exposes the three operations the host wiring layer needs.
 */
export function createHostIntentRouter(
  adapter: IHostIntentRouterAdapter,
): IHostIntentRouter {
  const buffer: IGameIntent[] = [];

  const tryApply = (
    intent: IGameIntent,
    translation: IntentTranslationResult,
  ): HostIntentRouterResult => {
    if (translation.ok) {
      for (const event of translation.events) {
        adapter.appendEvent(event);
      }
      return { outcome: 'applied', events: translation.events };
    }
    adapter.broadcastRejection({
      reason: translation.reason,
      detail: translation.detail,
    });
    return {
      outcome: 'rejected',
      reason: translation.reason,
      detail: translation.detail,
    };
  };

  const handleIntent = (intent: IGameIntent): HostIntentRouterResult => {
    if (adapter.isGuestPending?.()) {
      buffer.push(intent);
      return { outcome: 'buffered' };
    }
    const session = adapter.getSession();
    const translation = translateIntentToEvents(
      intent,
      session,
      adapter.getIntentTranslationOptions?.(),
    );
    return tryApply(intent, translation);
  };

  const flushBuffered = (): HostIntentRouterResult[] => {
    if (buffer.length === 0) return [];
    const drained = buffer.splice(0, buffer.length);
    const results: HostIntentRouterResult[] = [];
    for (const intent of drained) {
      const session = adapter.getSession();
      const translation = translateIntentToEvents(
        intent,
        session,
        adapter.getIntentTranslationOptions?.(),
      );
      results.push(tryApply(intent, translation));
    }
    return results;
  };

  const getBufferState = (): IHostIntentBufferState => ({
    pending: buffer.slice(),
  });

  return {
    handleIntent,
    flushBuffered,
    getBufferState,
  };
}
