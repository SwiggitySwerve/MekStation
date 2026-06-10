/**
 * SyncEngine conflict resolution — REAL repository path (audit
 * 2026-06-09, H cluster, W5.2).
 *
 * The audit found that `resolveAcceptRemote` / `resolveFork` marked the
 * conflict resolved BEFORE looking it up — but the lookup only scans
 * rows whose `resolution = 'pending'`, so after `resolveConflict()` the
 * conflict is invisible: accept-remote never applied the remote payload
 * and fork never materialized the forked item. The existing
 * `SyncEngine.test.ts` suite mocked `getPendingConflicts` to keep
 * returning the conflict after resolution — behavior the real
 * `ChangeLogRepository` contradicts — which is exactly how the bug
 * stayed hidden.
 *
 * These tests therefore run through the REAL `ChangeLogRepository`
 * against a real in-memory SQLite database. No repository mocks.
 */

import { randomUUID } from 'node:crypto';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { ChangeLogRepository } from '@/services/vault/ChangeLogRepository';
import { SyncEngine } from '@/services/vault/SyncEngine';

describe('SyncEngine conflict resolution (real ChangeLogRepository)', () => {
  beforeAll(() => {
    // jsdom does not reliably expose crypto.randomUUID; the repository
    // uses it for change/conflict ids. Polyfill from node:crypto.
    const g = globalThis as { crypto?: { randomUUID?: () => string } };
    if (!g.crypto || typeof g.crypto.randomUUID !== 'function') {
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID },
        configurable: true,
      });
    }
  });

  let repository: ChangeLogRepository;
  let engine: SyncEngine;

  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    repository = new ChangeLogRepository();
    engine = new SyncEngine(repository);
  });

  afterEach(() => {
    resetSQLiteService();
  });

  /** Seed one pending conflict through the real repository. */
  async function seedConflict(): Promise<string> {
    return repository.recordConflict({
      contentType: 'unit',
      itemId: 'unit-atlas-1',
      itemName: 'Atlas AS7-D',
      localVersion: 1,
      localHash: 'local-hash',
      remoteVersion: 2,
      remoteHash: 'remote-hash',
      remotePeerId: 'PEER-REMOTE',
    });
  }

  function conflictResolution(conflictId: string): string {
    const row = getSQLiteService()
      .getDatabase()
      .prepare('SELECT resolution FROM vault_sync_conflicts WHERE id = ?')
      .get(conflictId) as { resolution: string };
    return row.resolution;
  }

  it('resolveAcceptRemote applies the remote payload through the real repository', async () => {
    const conflictId = await seedConflict();
    const applyFn = jest.fn().mockResolvedValue(undefined);
    engine.setContentApplyFn(applyFn);

    const ok = await engine.resolveAcceptRemote(
      conflictId,
      '{"remote":"payload"}',
    );

    expect(ok).toBe(true);
    // The whole point of accept-remote: the remote payload MUST land in
    // local storage. With the resolve-before-lookup ordering this never
    // fired because the conflict had already left the pending set.
    expect(applyFn).toHaveBeenCalledWith(
      'unit-atlas-1',
      'unit',
      '{"remote":"payload"}',
    );
    expect(conflictResolution(conflictId)).toBe('remote');
    await expect(engine.getPendingConflicts()).resolves.toHaveLength(0);
  });

  it('resolveFork materializes the forked item through the real repository', async () => {
    const conflictId = await seedConflict();
    const applyFn = jest.fn().mockResolvedValue(undefined);
    engine.setContentApplyFn(applyFn);

    const result = await engine.resolveFork(conflictId, '{"remote":"payload"}');

    // With the resolve-before-lookup ordering this degraded to `true`
    // (bookkeeping only) — the forked item never existed.
    expect(typeof result).toBe('object');
    if (typeof result !== 'object') return;
    expect(result.forkedItemId).toMatch(/^unit-atlas-1-fork-\d+$/);
    expect(applyFn).toHaveBeenCalledWith(
      result.forkedItemId,
      'unit',
      '{"remote":"payload"}',
    );
    // The fork is recorded as a local create in the change log.
    const forkedEntry = await repository.getLatestForItem(
      result.forkedItemId,
      'unit',
    );
    expect(forkedEntry).not.toBeNull();
    expect(forkedEntry?.changeType).toBe('create');
    expect(forkedEntry?.data).toBe('{"remote":"payload"}');
    expect(conflictResolution(conflictId)).toBe('forked');
    await expect(engine.getPendingConflicts()).resolves.toHaveLength(0);
  });

  it('resolveAcceptRemote without remote data only books the resolution', async () => {
    const conflictId = await seedConflict();
    const applyFn = jest.fn();
    engine.setContentApplyFn(applyFn);

    const ok = await engine.resolveAcceptRemote(conflictId);

    expect(ok).toBe(true);
    expect(applyFn).not.toHaveBeenCalled();
    expect(conflictResolution(conflictId)).toBe('remote');
  });

  it('returns false for an unknown conflict id and applies nothing', async () => {
    const applyFn = jest.fn();
    engine.setContentApplyFn(applyFn);

    await expect(
      engine.resolveAcceptRemote('conflict-nope', '{"remote":"payload"}'),
    ).resolves.toBe(false);
    await expect(
      engine.resolveFork('conflict-nope', '{"remote":"payload"}'),
    ).resolves.toBe(false);
    expect(applyFn).not.toHaveBeenCalled();
  });
});
