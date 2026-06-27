/**
 * MatchHostRegistry — singleton-ish lookup for active `ServerMatchHost`
 * instances. The WebSocket upgrade handler asks for `getOrCreate(matchId)`;
 * if the match meta is unknown to the store, it returns null and the
 * handler closes the socket with `UNKNOWN_MATCH`.
 *
 * Wave 1 keeps the registry process-local. Production (multi-replica
 * server) needs sticky routing or a shared registry — out of scope here.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { IMatchStore } from './IMatchStore';

import { getDefaultMatchStore } from './getDefaultMatchStore';
import { recoverActiveMatches } from './MatchRecovery';
import { buildMatchHostBootstrapFromMeta } from './matchUnitBootstrap';
import { ServerMatchHost } from './ServerMatchHost';

// =============================================================================
// Unit-bootstrap creation lives in `matchUnitBootstrap`; the registry
// only owns host lookup and lifecycle.
// =============================================================================

// =============================================================================
// Registry
// =============================================================================

export interface IRegistryDeps {
  /**
   * Match store the registry hands to every host. Defaults to the
   * module-level singleton `InMemoryMatchStore` so Wave 1 wiring is one
   * line.
   */
  store?: IMatchStore;
}

export class MatchHostRegistry {
  private readonly hosts = new Map<string, ServerMatchHost>();
  private readonly store: IMatchStore;

  constructor(deps: IRegistryDeps = {}) {
    this.store = deps.store ?? getDefaultMatchStore();
  }

  /**
   * Get or create a host for `matchId`. Returns null if the match meta
   * doesn't exist in the store — the caller MUST create the meta via
   * the REST `POST /matches` route before opening a WebSocket.
   *
   * The registry boots the host from durable unit metadata rather than
   * inventing placeholder units at socket-connection time.
   *
   * Per `add-authoritative-roll-arbitration` (Wave 3a): an optional
   * `diceSeed` lets the WebSocket upgrade handler propagate the
   * `?seed=N` debug query param. When set, the host's dice roller is
   * `SeededDiceRoller` (deterministic) instead of `CryptoDiceRoller`
   * (production). Off by default — production never reads it.
   */
  getOrCreate = async (
    matchId: string,
    options: { diceSeed?: number } = {},
  ): Promise<ServerMatchHost | null> => {
    const existing = this.hosts.get(matchId);
    if (existing && !existing.isClosed()) return existing;

    let meta;
    try {
      meta = await this.store.getMatchMeta(matchId);
    } catch {
      return null;
    }

    let host: ServerMatchHost;
    try {
      const bootstrap = await buildMatchHostBootstrapFromMeta(meta, {
        diceSeed: options.diceSeed,
      });
      host = ServerMatchHost.create(matchId, this.store, bootstrap);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[MatchHostRegistry] failed to bootstrap ${matchId}`, e);
      return null;
    }
    this.hosts.set(matchId, host);
    return host;
  };

  /** Look up a host without creating one. */
  get = (matchId: string): ServerMatchHost | null => {
    return this.hosts.get(matchId) ?? null;
  };

  /**
   * harden-multiplayer-transport (M2), design D3 — server-startup match
   * recovery. Enumerates every `active` match in the durable store,
   * rebuilds a `ServerMatchHost` for each by replaying its persisted
   * event log, and registers the rebuilt hosts so the WebSocket upgrade
   * handler's `getOrCreate` returns the recovered instance (not a fresh
   * stub). Returns the number of matches successfully recovered.
   *
   * Idempotent: a match already tracked in the registry is left as-is
   * — recovery never clobbers a live host.
   */
  recoverActiveMatches = async (): Promise<{
    readonly recovered: number;
    readonly failed: number;
  }> => {
    const result = await recoverActiveMatches(this.store);
    for (const [matchId, host] of Array.from(result.hosts.entries())) {
      if (!this.hosts.has(matchId)) {
        this.hosts.set(matchId, host);
      }
    }
    return {
      recovered: result.hosts.size,
      failed: result.failed.length,
    };
  };

  /** Number of currently-tracked hosts (open or otherwise). */
  size = (): number => {
    return this.hosts.size;
  };

  /**
   * Close + drop a host. Called on `DELETE /matches/:id` and on
   * server shutdown.
   */
  closeMatch = async (matchId: string): Promise<void> => {
    const host = this.hosts.get(matchId);
    if (!host) return;
    await host.closeMatch();
    this.hosts.delete(matchId);
  };

  /** Test-only: drop everything. */
  _reset = (): void => {
    this.hosts.forEach((host) => {
      void host.closeMatch();
    });
    this.hosts.clear();
  };
}

let _singleton: MatchHostRegistry | null = null;
let _recoveryRan = false;

/** Process-local singleton accessor used by REST routes + WS handler. */
export function getMatchHostRegistry(): MatchHostRegistry {
  if (!_singleton) {
    _singleton = new MatchHostRegistry();
  }
  return _singleton;
}

/**
 * harden-multiplayer-transport (M2), design D3 — server-startup
 * bootstrap. Run ONCE at server boot (before the WebSocket upgrade
 * handler starts accepting connections): re-instantiates a
 * `ServerMatchHost` for every `active` match found in the durable
 * store so a process restart never loses a live game.
 *
 * Idempotent — a second call is a no-op, so it is safe to invoke from
 * a lazily-initialized server module.
 */
export async function bootstrapMultiplayerServer(): Promise<{
  readonly recovered: number;
  readonly failed: number;
}> {
  if (_recoveryRan) {
    return { recovered: 0, failed: 0 };
  }
  _recoveryRan = true;
  const result = await getMatchHostRegistry().recoverActiveMatches();
  if (result.recovered > 0 || result.failed > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[mp-boot] recovered ${result.recovered} active match(es)` +
        (result.failed > 0 ? `, ${result.failed} failed` : ''),
    );
  }
  return result;
}

/** Test-only: reset the singleton so tests don't bleed state. */
export function _resetMatchHostRegistry(): void {
  if (_singleton) _singleton._reset();
  _singleton = null;
  _recoveryRan = false;
}
