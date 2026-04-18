/**
 * InMemoryPlayerStore — dev-only `IPlayerStore` backed by a `Map`.
 *
 * Same pattern as `InMemoryMatchStore`: loud startup warning so it's
 * never mistaken for a production store; per-instance state so tests
 * can each construct their own store without bleed; module-level
 * singleton accessor so REST handlers + the WS upgrade share one store
 * within a Node process.
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

import type { IPlayerProfile } from '@/types/multiplayer/Player';

import {
  PlayerNotFoundError,
  type ICreatePlayerInput,
  type IPlayerProfilePatch,
  type IPlayerStore,
} from './IPlayerStore';

export class InMemoryPlayerStore implements IPlayerStore {
  private readonly profiles = new Map<string, IPlayerProfile>();

  constructor(options: { quiet?: boolean } = {}) {
    if (!options.quiet) {
      // eslint-disable-next-line no-console
      console.warn(
        '[InMemoryPlayerStore] dev-only store in use; configure a persistent store for production',
      );
    }
  }

  async getOrCreatePlayer(input: ICreatePlayerInput): Promise<IPlayerProfile> {
    const now = new Date().toISOString();
    const existing = this.profiles.get(input.playerId);
    if (existing) {
      // Repeat connection: bump lastSeenAt but preserve everything else
      // (display name + avatar are user-controlled, not derived from
      // each connect).
      const updated: IPlayerProfile = {
        ...existing,
        lastSeenAt: now,
      };
      this.profiles.set(input.playerId, updated);
      return updated;
    }
    const created: IPlayerProfile = {
      playerId: input.playerId,
      publicKey: input.publicKey,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      createdAt: now,
      lastSeenAt: now,
      matchHistory: [],
    };
    this.profiles.set(input.playerId, created);
    return created;
  }

  async updateProfile(
    playerId: string,
    patch: IPlayerProfilePatch,
  ): Promise<void> {
    const existing = this.profiles.get(playerId);
    if (!existing) throw new PlayerNotFoundError(playerId);
    const next: IPlayerProfile = {
      ...existing,
      ...patch,
    };
    this.profiles.set(playerId, next);
  }

  async recordMatchParticipation(
    playerId: string,
    matchId: string,
  ): Promise<void> {
    const existing = this.profiles.get(playerId);
    if (!existing) throw new PlayerNotFoundError(playerId);
    if (existing.matchHistory.includes(matchId)) return; // idempotent
    const next: IPlayerProfile = {
      ...existing,
      matchHistory: [...existing.matchHistory, matchId],
    };
    this.profiles.set(playerId, next);
  }

  async getProfile(playerId: string): Promise<IPlayerProfile | null> {
    return this.profiles.get(playerId) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Test/observability helpers — not part of the IPlayerStore contract.
  // ---------------------------------------------------------------------------

  size(): number {
    return this.profiles.size;
  }

  _reset(): void {
    this.profiles.clear();
  }
}

// =============================================================================
// Singleton accessor (mirrors InMemoryMatchStore)
// =============================================================================

let _singleton: InMemoryPlayerStore | null = null;

/**
 * Default factory used by REST handlers + the WS upgrade. One store per
 * Node process. Tests should construct their own `InMemoryPlayerStore`
 * directly to avoid leaking state.
 */
export function getDefaultPlayerStore(): InMemoryPlayerStore {
  if (!_singleton) {
    _singleton = new InMemoryPlayerStore();
  }
  return _singleton;
}

/** Test-only: reset the singleton so suites don't bleed into each other. */
export function _resetDefaultPlayerStore(): void {
  _singleton = null;
}
