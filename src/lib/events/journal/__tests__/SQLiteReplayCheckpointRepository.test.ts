/**
 * SQLite replay checkpoint repository contract (replay-safety PR 15B),
 * against REAL SQLite files.
 *
 * Pins: record verifies state bytes hash to the claimed digest BEFORE
 * writing and inserts atomically (plain INSERT, never REPLACE); slot
 * collisions fail typed and re-record is explicit discard + record;
 * selection requires the caller's journal-derived source-tail digest
 * (never defaulted from a row's own claim) and admits only fully
 * written, digest-true, compatible rows newest-first (corrupt, torn,
 * digest-mismatched, non-canonicalizable, and wrong-pipeline rows are
 * skipped and reported by id, never returned or repaired); records
 * survive a file reopen; discard of a missing id is a no-op; and
 * selection is SELECT-only - journal authority rows, the store
 * high-water, and the full-replay fallback are byte-identical before
 * and after.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  ReplayCheckpointError,
  digestReplayCheckpointState,
} from '../../replay/ReplayCheckpointCompatibility';
import { SQLiteReplayCheckpointRepository } from '../SQLiteReplayCheckpointRepository';

const FINGERPRINT = 'f'.repeat(64);
const TAIL_DIGEST = '1'.repeat(64);
const RECORDED_AT = '2026-08-21T00:00:00.000Z';
/** JSON text whose parse yields a lone surrogate (canonicalizer throws). */
const LONE_SURROGATE_JSON = '"' + '\\ud800' + '"';

const stateAt = (revision: number) => {
  const state = { applied: revision };
  return {
    state,
    stateJson: JSON.stringify(state),
    stateDigest: digestReplayCheckpointState(state),
  };
};

const metadataAt = (
  revision: number,
  overrides: Record<string, unknown> = {},
) => {
  const { stateDigest } = stateAt(revision);
  return {
    streamId: 'campaign-alpha',
    branchId: 'root',
    revision,
    schemaPipelineFingerprint: FINGERPRINT,
    projectorId: 'campaign.projector',
    projectorVersion: 1,
    sourceTailDigest: TAIL_DIGEST,
    stateDigest,
    ...overrides,
  };
};

const expectation = (overrides: Record<string, unknown> = {}) => ({
  streamId: 'campaign-alpha',
  branchId: 'root',
  schemaPipelineFingerprint: FINGERPRINT,
  projectorId: 'campaign.projector',
  projectorVersion: 1,
  // The caller's journal-derived tail digest is REQUIRED - selection
  // never defaults it from a row's own claim.
  sourceTailDigest: TAIL_DIGEST,
  ...overrides,
});

const PLANT_INSERT = `
  INSERT INTO replay_checkpoints (
    checkpoint_id, stream_id, branch_id, revision,
    schema_pipeline_fingerprint, projector_id, projector_version,
    source_tail_digest, state_digest, state_json, recorded_at
  ) VALUES (?, 'campaign-alpha', 'root', ?, ?, 'campaign.projector', 1, ?, ?, ?, ?)`;

describe('SQLite replay checkpoint repository', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'replay-checkpoint-repo-'));
    dbPath = path.join(dir, 'checkpoints.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  function repository(db: Database.Database) {
    return new SQLiteReplayCheckpointRepository(db);
  }

  it('records and selects the newest compatible checkpoint', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-20', metadataAt(20), stateAt(20).stateJson, RECORDED_AT);
    repo.record('ckpt-41', metadataAt(41), stateAt(41).stateJson, RECORDED_AT);

    const base = repo.selectRecoveryBase(expectation());
    expect(base.kind).toBe('checkpoint');
    if (base.kind === 'checkpoint') {
      expect(base.checkpoint.checkpointId).toBe('ckpt-41');
      expect(base.checkpoint.metadata.revision).toBe(41);
      expect(JSON.parse(base.checkpoint.stateJson)).toEqual({ applied: 41 });
      expect(base.skippedCheckpointIds).toEqual([]);
    }
  });

  it('refuses to record state bytes that do not hash to the claimed digest', () => {
    const db = database();
    const repo = repository(db);
    let error: ReplayCheckpointError | null = null;
    try {
      repo.record(
        'ckpt-lie',
        metadataAt(41),
        JSON.stringify({ applied: 999 }),
        RECORDED_AT,
      );
    } catch (caught) {
      if (caught instanceof ReplayCheckpointError) error = caught;
      else throw caught;
    }
    expect(error?.code).toBe('state-digest-mismatch');
    const count = (
      db.prepare('SELECT COUNT(*) AS c FROM replay_checkpoints').get() as {
        c: number;
      }
    ).c;
    expect(count).toBe(0);
  });

  it('slot collisions fail typed; re-record is explicit discard + record', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-41', metadataAt(41), stateAt(41).stateJson, RECORDED_AT);
    let error: ReplayCheckpointError | null = null;
    try {
      repo.record(
        'ckpt-41-again',
        metadataAt(41),
        stateAt(41).stateJson,
        RECORDED_AT,
      );
    } catch (caught) {
      if (caught instanceof ReplayCheckpointError) error = caught;
      else throw caught;
    }
    expect(error?.code).toBe('duplicate-checkpoint');

    repo.discard('ckpt-41');
    expect(() =>
      repo.record(
        'ckpt-41-fresh',
        metadataAt(41),
        stateAt(41).stateJson,
        RECORDED_AT,
      ),
    ).not.toThrow();
  });

  it('skips corrupt and torn rows, admitting an earlier valid base', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-20', metadataAt(20), stateAt(20).stateJson, RECORDED_AT);
    // Digest-mismatched row (bytes do not hash to the stored digest) and
    // a torn row (invalid JSON), both planted around the repository.
    db.prepare(PLANT_INSERT).run(
      'ckpt-corrupt',
      60,
      FINGERPRINT,
      TAIL_DIGEST,
      stateAt(60).stateDigest,
      '{"applied":999}',
      RECORDED_AT,
    );
    db.prepare(PLANT_INSERT).run(
      'ckpt-torn',
      50,
      FINGERPRINT,
      TAIL_DIGEST,
      stateAt(50).stateDigest,
      '{"applied":',
      RECORDED_AT,
    );

    const base = repo.selectRecoveryBase(expectation());
    expect(base.kind).toBe('checkpoint');
    if (base.kind === 'checkpoint') {
      expect(base.checkpoint.checkpointId).toBe('ckpt-20');
      expect(base.skippedCheckpointIds).toEqual(['ckpt-corrupt', 'ckpt-torn']);
    }
  });

  it('a non-canonicalizable state row is skipped, not fatal', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-20', metadataAt(20), stateAt(20).stateJson, RECORDED_AT);
    // JSON.parse accepts a lone surrogate; the canonicalizing digest
    // throws on it - the row must classify as corrupt, not abort.
    db.prepare(PLANT_INSERT).run(
      'ckpt-surrogate',
      70,
      FINGERPRINT,
      TAIL_DIGEST,
      stateAt(70).stateDigest,
      LONE_SURROGATE_JSON,
      RECORDED_AT,
    );
    const base = repo.selectRecoveryBase(expectation());
    expect(base.kind).toBe('checkpoint');
    if (base.kind === 'checkpoint') {
      expect(base.checkpoint.checkpointId).toBe('ckpt-20');
      expect(base.skippedCheckpointIds).toEqual(['ckpt-surrogate']);
    }
  });

  it('record rejects non-JSON state and blank ids; discard of a missing id is a no-op', () => {
    const db = database();
    const repo = repository(db);
    let error: ReplayCheckpointError | null = null;
    try {
      repo.record('ckpt-bad', metadataAt(41), '{"applied":', RECORDED_AT);
    } catch (caught) {
      if (caught instanceof ReplayCheckpointError) error = caught;
      else throw caught;
    }
    expect(error?.code).toBe('invalid-checkpoint-metadata');
    expect(() =>
      repo.record('  ', metadataAt(41), stateAt(41).stateJson, RECORDED_AT),
    ).toThrow(ReplayCheckpointError);
    expect(() => repo.discard('no-such-checkpoint')).not.toThrow();
    const count = (
      db.prepare('SELECT COUNT(*) AS c FROM replay_checkpoints').get() as {
        c: number;
      }
    ).c;
    expect(count).toBe(0);
  });

  it('falls back to full replay when every row is corrupt or absent', () => {
    const db = database();
    const repo = repository(db);
    expect(repo.selectRecoveryBase(expectation())).toEqual({
      kind: 'full-replay',
      skippedCheckpointIds: [],
    });

    db.prepare(PLANT_INSERT).run(
      'ckpt-corrupt',
      60,
      FINGERPRINT,
      TAIL_DIGEST,
      stateAt(60).stateDigest,
      '{"applied":999}',
      RECORDED_AT,
    );
    const base = repo.selectRecoveryBase(expectation());
    expect(base).toEqual({
      kind: 'full-replay',
      skippedCheckpointIds: ['ckpt-corrupt'],
    });
  });

  it('a stale pipeline fingerprint or mismatched tail digest never selects', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-41', metadataAt(41), stateAt(41).stateJson, RECORDED_AT);

    const staleFingerprint = repo.selectRecoveryBase(
      expectation({ schemaPipelineFingerprint: 'e'.repeat(64) }),
    );
    expect(staleFingerprint.kind).toBe('full-replay');

    const wrongTail = repo.selectRecoveryBase(
      expectation({ sourceTailDigest: '2'.repeat(64) }),
    );
    expect(wrongTail).toEqual({
      kind: 'full-replay',
      skippedCheckpointIds: ['ckpt-41'],
    });
  });

  it('honors the throughRevision head cap', () => {
    const db = database();
    const repo = repository(db);
    repo.record('ckpt-20', metadataAt(20), stateAt(20).stateJson, RECORDED_AT);
    repo.record('ckpt-90', metadataAt(90), stateAt(90).stateJson, RECORDED_AT);
    const base = repo.selectRecoveryBase(expectation(), 50);
    expect(base.kind).toBe('checkpoint');
    if (base.kind === 'checkpoint')
      expect(base.checkpoint.checkpointId).toBe('ckpt-20');
  });

  it('records survive a database reopen', () => {
    const db = database();
    repository(db).record(
      'ckpt-41',
      metadataAt(41),
      stateAt(41).stateJson,
      RECORDED_AT,
    );
    resetSQLiteService();
    const reopened = database();
    const base = repository(reopened).selectRecoveryBase(expectation());
    expect(base.kind).toBe('checkpoint');
    if (base.kind === 'checkpoint')
      expect(base.checkpoint.checkpointId).toBe('ckpt-41');
  });

  it('selection never changes journal rows, high-water, or the full-replay fallback', () => {
    const db = database();
    const repo = repository(db);
    // Seed journal authority rows directly (same idiom as the 15A test).
    db.prepare(
      `INSERT INTO event_journal_batches (
        command_id, command_digest, canonicalizer_version,
        stream_type, stream_id, branch_id, event_count,
        first_stream_revision, last_stream_revision,
        first_commit_position, last_commit_position, recorded_at
      ) VALUES ('cmd-1', ?, 1, 'campaign', 'campaign-alpha', 'root', 1, 1, 1, 1, 1, ?)`,
    ).run('a'.repeat(64), RECORDED_AT);
    db.prepare(
      `INSERT INTO event_journal_events (
        event_id, command_id, stream_type, stream_id, branch_id,
        stream_revision, commit_position, command_index,
        event_type, event_version, correlation_id,
        actor_kind, actor_id, authority_type, authority_id,
        occurred_at, recorded_at, canonicalizer_version,
        previous_stream_event_digest, event_digest, payload_json
      ) VALUES ('evt-1', 'cmd-1', 'campaign', 'campaign-alpha', 'root',
        1, 1, 0, 'probe_event', 1, 'corr-1', 'system', 'repo-test',
        'campaign', 'campaign-alpha', ?, ?, 1, NULL, ?, '{"value":"probe"}')`,
    ).run(RECORDED_AT, RECORDED_AT, 'b'.repeat(64));
    db.prepare(
      `UPDATE event_journal_store_state SET last_commit_position = 1 WHERE singleton_id = 1`,
    ).run();

    repo.record('ckpt-41', metadataAt(41), stateAt(41).stateJson, RECORDED_AT);
    const snapshot = () => ({
      events: db.prepare('SELECT * FROM event_journal_events').all(),
      batches: db.prepare('SELECT * FROM event_journal_batches').all(),
      storeState: db.prepare('SELECT * FROM event_journal_store_state').all(),
      checkpoints: db
        .prepare('SELECT * FROM replay_checkpoints ORDER BY checkpoint_id')
        .all(),
    });
    const before = snapshot();

    repo.selectRecoveryBase(expectation());
    repo.selectRecoveryBase(
      expectation({ schemaPipelineFingerprint: 'e'.repeat(64) }),
    );
    repo.selectRecoveryBase(expectation(), 10);

    expect(snapshot()).toEqual(before);

    // The full-replay fallback verdict itself is unaffected by selection
    // runs or by corrupt rows lying around.
    const fallback = repo.selectRecoveryBase(
      expectation({ schemaPipelineFingerprint: 'e'.repeat(64) }),
    );
    expect(fallback.kind).toBe('full-replay');
  });
});
