/**
 * MatchHostRegistry — singleton-ish lookup for active `ServerMatchHost`
 * instances. The WebSocket upgrade handler asks for `getOrCreate(matchId)`;
 * if the match is quarantined or the meta is unknown, it returns null
 * and the handler closes with `MATCH_QUARANTINED` or `UNKNOWN_MATCH`.
 *
 * Wave 1 keeps the registry process-local. Production (multi-replica
 * server) needs sticky routing or a shared registry — out of scope here.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import { ReplayQuarantineRegistry } from '@/lib/events/replay/ReplayQuarantineRegistry';

import type { IMatchStore } from './IMatchStore';
import type { IMatchRecoveryBlock } from './MatchRecovery';

import { getDefaultMatchStore } from './getDefaultMatchStore';
import { recoverActiveMatches } from './MatchRecovery';
import { buildMatchHostBootstrapFromMeta } from './matchUnitBootstrap';
import { ServerMatchHost } from './ServerMatchHost';

/**
 * WHAT: the ReplayQuarantineRegistry scope for one combat match.
 * WHY: recoverActiveMatches and getOrCreate must name the same key
 * {authorityType: match, authorityId} or a refused session would look
 * healthy to the attach path.
 */
function matchAuthorityScope(matchId: string): {
  readonly authorityType: 'match';
  readonly authorityId: string;
} {
  return { authorityType: 'match', authorityId: matchId };
}

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
  /**
   * Instance-owned, not a module singleton: each registry (including
   * test instances with an injected store) keeps its own ledger, and
   * `_reset` / a new `MatchHostRegistry()` starts empty so an absent
   * signal stays byte-identical to today. The process singleton from
   * `getMatchHostRegistry()` still owns exactly one ledger for the
   * life of that instance.
   */
  private quarantine: ReplayQuarantineRegistry;
  private blocked: readonly IMatchRecoveryBlock[] = [];

  constructor(deps: IRegistryDeps = {}) {
    this.store = deps.store ?? getDefaultMatchStore();
    this.quarantine = new ReplayQuarantineRegistry();
  }

  /**
   * WHAT: whether recovery quarantined this match id.
   * WHY: 19.x posture and the socket attach path need a read without
   * reaching into the private ReplayQuarantineRegistry.
   */
  isQuarantined = (matchId: string): boolean => {
    return this.quarantine.isQuarantined(matchAuthorityScope(matchId));
  };

  /**
   * WHAT: match ids recorded on the owned quarantine ledger at recovery.
   * WHY: 19.x can show posture from this list; this layer does not render.
   */
  quarantinedMatchIds = (): readonly string[] => {
    return Object.freeze(
      this.blocked
        .filter((entry) => this.isQuarantined(entry.matchId))
        .map((entry) => entry.matchId),
    );
  };

  /**
   * WHAT: typed blocked verdicts from the last recovery sweep.
   * WHY: the previous caller discarded `result.blocked`; the list must
   * stay visible after boot.
   */
  blockedMatches = (): readonly IMatchRecoveryBlock[] => {
    return this.blocked;
  };

  /**
   * Get or create a host for `matchId`. Returns null if the match is
   * quarantined (recovery refused its authority) or if the match meta
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
   * (production).
   *
   * THIS LAYER DOES NOT ENFORCE THAT. The refusal lives in `server.js`
   * (`readDebugDiceSeed`), which drops the param in production before
   * it ever reaches here - the seed is client-supplied on the upgrade
   * URL, so honouring it would let the caller pick the server's dice.
   * Anything else that learns to pass `diceSeed` must gate it itself;
   * this signature will accept whatever it is given.
   */
  getOrCreate = async (
    matchId: string,
    options: { diceSeed?: number } = {},
  ): Promise<ServerMatchHost | null> => {
    const existing = this.hosts.get(matchId);
    if (existing && !existing.isClosed()) return existing;

    // Refused recovery must not fall through to a fresh empty host.
    if (this.isQuarantined(matchId)) return null;

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
   * stub). Passes the owned quarantine ledger so a blocked match is
   * recorded, not discarded. Returns recovered, failed, and blocked.
   *
   * Idempotent: a match already tracked in the registry is left as-is
   * — recovery never clobbers a live host.
   */
  recoverActiveMatches = async (): Promise<{
    readonly recovered: number;
    readonly failed: number;
    readonly blocked: readonly IMatchRecoveryBlock[];
  }> => {
    const result = await recoverActiveMatches(this.store, this.quarantine);
    this.blocked = Array.from(result.blocked);
    for (const [matchId, host] of Array.from(result.hosts.entries())) {
      if (!this.hosts.has(matchId)) {
        this.hosts.set(matchId, host);
      }
    }
    return {
      recovered: result.hosts.size,
      failed: result.failed.length,
      blocked: this.blocked,
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
    this.blocked = [];
    this.quarantine = new ReplayQuarantineRegistry();
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
  return { recovered: result.recovered, failed: result.failed };
}

/** Test-only: reset the singleton so tests don't bleed state. */
export function _resetMatchHostRegistry(): void {
  if (_singleton) _singleton._reset();
  _singleton = null;
  _recoveryRan = false;
}
