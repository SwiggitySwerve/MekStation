/**
 * IPlayerStore — pluggable persistence contract for player profiles.
 *
 * Wave 2 ships only `InMemoryPlayerStore`; future changes can swap in
 * SQLite / Postgres without touching call sites. Every method is async
 * so a network-backed implementation never has to break the contract.
 *
 * Lifecycle:
 *   - `getOrCreatePlayer` is called on first authentication for a
 *     `playerId`. Subsequent connections call it again to refresh
 *     `lastSeenAt` (the implementation decides whether to upsert).
 *   - `updateProfile` patches mutable fields (`displayName`,
 *     `avatarUrl`, `lastSeenAt`). `playerId`, `publicKey`, and
 *     `createdAt` are immutable post-create.
 *   - `recordMatchParticipation` is called once per player per match,
 *     when lobby-ready transitions to launch. Idempotent (calling it
 *     twice with the same `matchId` is a no-op).
 *
 * @spec openspec/changes/add-player-identity-and-auth/specs/player-identity/spec.md
 */

import type { IPlayerProfile } from '@/types/multiplayer/Player';

/**
 * Bootstrap shape used to create a fresh profile. The store fills in
 * `createdAt`, `lastSeenAt`, and the empty `matchHistory`.
 */
export interface ICreatePlayerInput {
  readonly playerId: string;
  readonly publicKey: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
}

/**
 * Patch shape for `updateProfile`. Only mutable fields are exposed.
 */
export type IPlayerProfilePatch = Partial<
  Pick<IPlayerProfile, 'displayName' | 'avatarUrl' | 'lastSeenAt'>
>;

export class PlayerNotFoundError extends Error {
  constructor(public readonly playerId: string) {
    super(`Player not found: ${playerId}`);
    this.name = 'PlayerNotFoundError';
  }
}

export interface IPlayerStore {
  /**
   * Load the profile for `input.playerId`, or create one if none
   * exists. The returned profile always has `lastSeenAt` updated to the
   * current timestamp so callers can use it as a single source of
   * "player just connected".
   */
  getOrCreatePlayer(input: ICreatePlayerInput): Promise<IPlayerProfile>;

  /**
   * Apply a partial patch to an existing profile. Throws
   * `PlayerNotFoundError` for unknown ids.
   */
  updateProfile(playerId: string, patch: IPlayerProfilePatch): Promise<void>;

  /**
   * Record participation in a match. Idempotent — appending the same
   * `matchId` twice MUST NOT duplicate the entry. Throws
   * `PlayerNotFoundError` for unknown ids.
   */
  recordMatchParticipation(playerId: string, matchId: string): Promise<void>;

  /**
   * Read-only profile lookup. Returns null for unknown ids (we don't
   * throw because the typical caller is "log this if we know them").
   */
  getProfile(playerId: string): Promise<IPlayerProfile | null>;
}

/**
 * Factory shape so production wiring can swap the implementation.
 */
export type PlayerStoreFactory = () => IPlayerStore;
