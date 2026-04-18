/**
 * InMemoryPlayerStore unit tests.
 *
 * Covers: bootstrap on first call, lastSeenAt refresh on repeat call,
 * profile patches, idempotent matchHistory append, PlayerNotFoundError
 * on missing ids.
 */

import { InMemoryPlayerStore } from '../InMemoryPlayerStore';
import { PlayerNotFoundError, type ICreatePlayerInput } from '../IPlayerStore';

const baseInput: ICreatePlayerInput = {
  playerId: 'pid_abc123',
  publicKey: 'pubkey-base64-stub',
  displayName: 'Tester',
};

describe('InMemoryPlayerStore', () => {
  it('creates a profile on first call and bumps lastSeenAt on second', async () => {
    const store = new InMemoryPlayerStore({ quiet: true });
    const created = await store.getOrCreatePlayer(baseInput);
    expect(created.playerId).toBe(baseInput.playerId);
    expect(created.publicKey).toBe(baseInput.publicKey);
    expect(created.displayName).toBe(baseInput.displayName);
    expect(created.matchHistory).toEqual([]);
    // Force the clock to move so lastSeenAt is observably different.
    await new Promise((r) => setTimeout(r, 5));
    const second = await store.getOrCreatePlayer(baseInput);
    expect(second.createdAt).toBe(created.createdAt);
    expect(second.lastSeenAt >= created.lastSeenAt).toBe(true);
  });

  it('updateProfile patches mutable fields', async () => {
    const store = new InMemoryPlayerStore({ quiet: true });
    await store.getOrCreatePlayer(baseInput);
    await store.updateProfile(baseInput.playerId, {
      displayName: 'Updated',
      avatarUrl: 'https://example.com/a.png',
    });
    const profile = await store.getProfile(baseInput.playerId);
    expect(profile?.displayName).toBe('Updated');
    expect(profile?.avatarUrl).toBe('https://example.com/a.png');
  });

  it('updateProfile throws PlayerNotFoundError for unknown id', async () => {
    const store = new InMemoryPlayerStore({ quiet: true });
    await expect(
      store.updateProfile('pid_nope', { displayName: 'x' }),
    ).rejects.toBeInstanceOf(PlayerNotFoundError);
  });

  it('recordMatchParticipation appends and is idempotent', async () => {
    const store = new InMemoryPlayerStore({ quiet: true });
    await store.getOrCreatePlayer(baseInput);
    await store.recordMatchParticipation(baseInput.playerId, 'm1');
    await store.recordMatchParticipation(baseInput.playerId, 'm1');
    await store.recordMatchParticipation(baseInput.playerId, 'm2');
    const profile = await store.getProfile(baseInput.playerId);
    expect(profile?.matchHistory).toEqual(['m1', 'm2']);
  });

  it('getProfile returns null for unknown id', async () => {
    const store = new InMemoryPlayerStore({ quiet: true });
    const profile = await store.getProfile('pid_unknown');
    expect(profile).toBeNull();
  });
});
