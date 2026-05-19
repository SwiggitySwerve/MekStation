/**
 * Mirror Match Session — client-side mirror of a server-authoritative
 * networked match.
 *
 * Per `complete-multiplayer-game-surface` D2: the networked game surface
 * drives the tactical map from a client mirror `IGameSession` built
 * solely by applying the server's broadcast `IGameEvent` stream. The
 * mirror is **read-only** to the UI — no local engine resolution ever
 * runs against it (D3). This module is the small set of pure helpers
 * the React layer uses to build and advance that mirror.
 *
 * Why this exists alongside `src/lib/p2p/mirrorSession.ts`: the P2P
 * mirror is fed by y-webrtc and constructs the session from a config
 * snapshot the host ships separately. The *networked-server* mirror is
 * fed by the WebSocket `Event` stream where the very first event
 * (`GameCreated`) already carries the `IGameConfig` + `IGameUnit[]`
 * snapshot — so the mirror is rebuilt directly from the event log via
 * the same `hydrateGameSessionFromEvents` reducer the replay viewer
 * uses. One reducer, one source of truth (D2 / DP1).
 *
 * Fog tolerance (D5): the server omits or partially-redacts events for
 * a fog-on match. `hydrateGameSessionFromEvents` + `appendEvent` walk
 * whatever events arrived in `sequence` order and never assume a
 * contiguous range, so an omitted event simply leaves the affected unit
 * at its last-known state — exactly the "last seen" contract. Redacted
 * payloads (`{ unitId }` stubs) pass through `deriveState` untouched.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import {
  GameEventType,
  isGameEvent,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

// =============================================================================
// Event coercion
// =============================================================================

/**
 * Coerce a raw broadcast payload into an `IGameEvent` if it structurally
 * qualifies, otherwise `null`. The WebSocket layer types `event` as
 * `unknown` (the wire schema keeps the engine event shape opaque), so
 * the mirror builder validates each candidate before applying it.
 *
 * Lifecycle envelopes (`LobbyUpdated`, `MatchPaused`, ...) carry a
 * `kind` discriminant and NO `sequence`/`type` engine fields, so
 * `isGameEvent` rejects them — they never enter the mirror.
 */
export function asGameEvent(raw: unknown): IGameEvent | null {
  return isGameEvent(raw) ? raw : null;
}

/**
 * Filter + sort an arbitrary list of broadcast payloads into the ordered
 * `IGameEvent[]` the mirror builder consumes. Non-events are dropped;
 * the remainder is sorted ascending by `sequence` so a replay burst
 * that arrived interleaved with live events still applies in canonical
 * order (D2 / scenario "Join replay rebuilds the board").
 *
 * Duplicate sequences (a replayed event the client also saw live during
 * a reconnect race) are de-duplicated — the first occurrence wins.
 */
export function orderGameEvents(raw: readonly unknown[]): IGameEvent[] {
  const seen = new Set<number>();
  const events: IGameEvent[] = [];
  for (const candidate of raw) {
    const event = asGameEvent(candidate);
    if (!event) continue;
    if (seen.has(event.sequence)) continue;
    seen.add(event.sequence);
    events.push(event);
  }
  events.sort((left, right) => left.sequence - right.sequence);
  return events;
}

// =============================================================================
// Mirror builder
// =============================================================================

/**
 * Build the client mirror `IGameSession` from the accumulated server
 * event stream. Returns `null` until the seed `GameCreated` event has
 * arrived — the surface renders a "loading match…" state in that window
 * (D2 / task 3.3).
 *
 * The build is a pure, idempotent re-derivation: callers pass the full
 * ordered event log every time and get back a fresh immutable session.
 * This keeps the mirror trivially correct under replay-then-live
 * interleaving and reconnect — there is no incremental cursor to drift.
 *
 * @param rawEvents the accumulated broadcast payloads (replay + live),
 *                  in any order; non-events are tolerated and skipped.
 */
export function buildMirrorSession(
  rawEvents: readonly unknown[],
): IGameSession | null {
  const ordered = orderGameEvents(rawEvents);
  if (ordered.length === 0) return null;
  // The seed event MUST be `GameCreated` for `hydrateGameSessionFromEvents`
  // to recover the config + unit roster. A fog-on stream can omit
  // mid-match events but never the public `GameCreated` seed, so the
  // mirror always has a roster to render.
  if (ordered[0].type !== GameEventType.GameCreated) return null;
  return hydrateGameSessionFromEvents(ordered[0].gameId, ordered);
}

/**
 * The set of `IGameEvent`s the mirror has applied, derived from the same
 * accumulated stream. Exposed so the surface can feed `HexMapDisplay`
 * the exact event list the mirror was built from (animations, effects,
 * and the event-log panel all key off it). Returns `[]` before the seed
 * event arrives.
 */
export function mirrorEvents(rawEvents: readonly unknown[]): IGameEvent[] {
  return orderGameEvents(rawEvents);
}
