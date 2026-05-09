/**
 * Browser-side persist trigger for encounter-driven game sessions.
 *
 * Per `link-encounters-to-replays` PR 3 (game-session-management spec —
 * Encounter Game Event Log Persistence ADDED): when the gameplay page
 * sees a session reach `Completed` status with `config.encounterId`
 * set, this helper builds the `IPersistEncounterGameInput` body from
 * the session's accumulated event log + the `encounterMeta` snapshot
 * stamped on the `GameCreated` payload, then POSTs to
 * `/api/replay-library/encounter`.
 *
 * Extracted as a standalone helper (rather than inlined in the page
 * component) for two reasons:
 *
 *   1. The page already has a dense pile of effect hooks; adding a
 *      ~60-LOC body-builder + winner-derivation block inline made the
 *      hook hard to read.
 *   2. Unit-testing the persist trigger in isolation is far simpler
 *      than mounting the full gameplay page and faking an interactive
 *      session — the helper takes a session-shaped input and returns a
 *      promise.
 *
 * The helper is a pure function except for the `fetch` call. Callers
 * inject a `fetch`-shape function (`fetchImpl`) so tests can spy
 * without touching `global.fetch` and races with concurrent tests.
 *
 * Returns the parsed `Response`-like outcome so callers can branch on
 * status / log warnings. The function NEVER throws — network errors
 * are surfaced as a `{ ok: false, error }` result so the caller's
 * "warn but don't block UI" pattern stays trivial.
 */

import type { IGameSession } from '@/types/gameplay';

import { GameSide } from '@/types/gameplay';

export interface IPersistEncounterFromSessionResult {
  readonly ok: boolean;
  readonly status?: number;
  readonly error?: unknown;
}

export interface IPersistEncounterFromSessionOptions {
  /** Override `globalThis.fetch` for tests. Defaults to `globalThis.fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Override the route URL — primarily for tests pinning the contract. */
  readonly url?: string;
}

/**
 * Build the POST body that the encounter persist route expects. Pure
 * derivation — no side effects. Exposed so tests + the page can share
 * the exact body shape.
 */
export function buildEncounterPersistBody(session: IGameSession): {
  readonly gameId: string;
  readonly events: IGameSession['events'];
  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly encounterId: string;
  readonly encounterName: string;
  readonly templateType: string | null;
  readonly playerForceSummary: string;
  readonly opponentSummary: string;
} {
  // Recover the encounter snapshot from the GameCreated event's
  // `encounterMeta` field — written by `EncounterService.launchEncounter`
  // (or the pre-battle launch handler) at session creation. Falls back
  // to empty strings + null template if the event is missing
  // (defensive — should never happen for encounter-launched sessions
  // but the persist must never throw).
  const created = session.events.find((e) => e.type === 'game_created');
  const meta = (
    created?.payload as
      | {
          encounterMeta?: {
            encounterId?: string;
            encounterName?: string;
            templateType?: string | null;
            playerForceSummary?: string;
            opponentSummary?: string;
          };
        }
      | undefined
  )?.encounterMeta;

  // Winner derivation mirrors what the Library row will display:
  // `'player' | 'opponent' | 'draw' | null`. The session result is
  // already on `currentState.result` for Completed sessions.
  const result = session.currentState.result;
  let winner: 'player' | 'opponent' | 'draw' | null = null;
  if (result) {
    if (result.winner === 'draw') winner = 'draw';
    else if (result.winner === GameSide.Player) winner = 'player';
    else if (result.winner === GameSide.Opponent) winner = 'opponent';
  }

  return {
    gameId: session.id,
    events: session.events,
    winner,
    // session.config.encounterId is guaranteed non-null by the caller's
    // gating check; coerce the optional to a string for the body.
    encounterId: meta?.encounterId ?? session.config.encounterId ?? '',
    encounterName: meta?.encounterName ?? '',
    templateType: meta?.templateType ?? null,
    playerForceSummary: meta?.playerForceSummary ?? '',
    opponentSummary: meta?.opponentSummary ?? '',
  };
}

/**
 * Fire-and-forget POST that surfaces Replay Library persist outcome.
 *
 * Caller MUST guard against double-fire (the page does this via a
 * `useRef` inside the effect — server-side dedup in the route handler
 * is the durable backstop).
 */
export async function persistEncounterFromSession(
  session: IGameSession,
  options: IPersistEncounterFromSessionOptions = {},
): Promise<IPersistEncounterFromSessionResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const url = options.url ?? '/api/replay-library/encounter';
  const body = JSON.stringify(buildEncounterPersistBody(session));

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, error };
  }
}
