/**
 * SQLite private-record repository contract (authority-audit PR 5),
 * against REAL SQLite files.
 *
 * Pins: opaque refs are content-free; lookups recheck the human-action
 * gate and require role gm; denials are identical for absent vs wrong
 * scope and never leak payload; default export omits payload; erase and
 * redact preserve player-safe facts; restart and retention survive.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type Database from 'better-sqlite3';

import { sha256 } from 'js-sha256';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  AuthorizedViewerResolver,
  type IMembershipRecord,
  type IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { GmPrivatePreviewRecordWriter } from '@/lib/multiplayer/server/history/GmPrivatePreviewRecordWriter';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  PRIVATE_RECORD_ACCESS_DENIED_CODE,
  PRIVATE_RECORD_ACCESS_DENIED_MESSAGE,
  PrivateRecordError,
  type IPrivateRecordCreate,
  type IPrivateRecordGateInput,
} from '../IPrivateRecordRepository';
import { OPAQUE_REF_PATTERN } from '../privateRecordGuards';
import { SQLitePrivateRecordRepository } from '../SQLitePrivateRecordRepository';

const CREATED_AT = '2026-08-21T21:00:00.000Z';
const OCCURRED_AT = '2026-08-21T21:01:00.000Z';
const SECRET = 'GM-PRIVATE-REASON-BODY-ALPHA';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const ABSENT_REF = 'd'.repeat(32);

const GM_ROW: IMembershipRecord = {
  principalId: 'user-gm',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: 'session-1',
  matchId: 'match-9',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
  membershipRevision: 3,
  active: true,
};

const PLAYER_ROW: IMembershipRecord = {
  ...GM_ROW,
  principalId: 'user-player',
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
};

class FakeMembershipSource implements IMembershipSource {
  public rows = new Map<string, IMembershipRecord>();
  public revisions = new Map<string, number>();

  /** Records a membership row and its session epoch. */
  public set(row: IMembershipRecord): void {
    this.rows.set(
      JSON.stringify([row.principalId, row.campaignSessionId]),
      row,
    );
    this.revisions.set(row.campaignSessionId, row.membershipRevision);
  }

  /** Returns the row for the principal/session pair, or null. */
  async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  /** Returns the session epoch, or 0 when the session is unknown. */
  async currentMembershipRevision(campaignSessionId: string): Promise<number> {
    return this.revisions.get(campaignSessionId) ?? 0;
  }
}

/** Minimal present-record create used by the repository proofs. */
function createInput(
  overrides: Partial<IPrivateRecordCreate> = {},
): IPrivateRecordCreate {
  return {
    campaignSessionId: 'session-1',
    commandId: 'cmd-private',
    recordKind: 'gm-reason',
    payload: SECRET,
    retentionClass: 'session',
    createdAt: CREATED_AT,
    ...overrides,
  };
}

describe('SQLite private record repository', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'private-record-repo-'));
    dbPath = path.join(dir, 'private-record.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens the file-backed service and returns the live handle. */
  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  /** Resolver with GM and player seated in session-1. */
  function resolver(): AuthorizedViewerResolver {
    const source = new FakeMembershipSource();
    source.set(GM_ROW);
    source.set(PLAYER_ROW);
    return new AuthorizedViewerResolver(source);
  }

  /** Gate params for a principal operating in session-1. */
  function gate(
    viewResolver: AuthorizedViewerResolver,
    principalId: string,
  ): IPrivateRecordGateInput {
    return {
      resolver: viewResolver,
      principalId,
      matchId: 'session-1',
      occurredAt: OCCURRED_AT,
    };
  }

  /** Captures a PrivateRecordError or fails the test. */
  async function catchPrivate(
    run: () => Promise<unknown>,
  ): Promise<PrivateRecordError> {
    try {
      await run();
    } catch (error) {
      if (error instanceof PrivateRecordError) return error;
      throw error;
    }
    throw new Error('expected PrivateRecordError');
  }

  /** Serializes an error plus audit rows for payload-leak scans. */
  function leakBlob(error: PrivateRecordError, audit: unknown): string {
    return `${error.code}${error.message}${JSON.stringify(error)}${JSON.stringify(audit)}`;
  }

  it('mints non-guessable content-free opaque refs for identical payloads', () => {
    const repo = new SQLitePrivateRecordRepository(database());
    const first = repo.createPrivateRecord(createInput());
    const second = repo.createPrivateRecord(createInput());
    expect(first.opaqueRef).not.toBe(second.opaqueRef);
    expect(first.opaqueRef).toMatch(OPAQUE_REF_PATTERN);
    expect(second.opaqueRef).toMatch(OPAQUE_REF_PATTERN);
    const digest = sha256(SECRET);
    for (const ref of [first.opaqueRef, second.opaqueRef]) {
      expect(ref).not.toContain(SECRET);
      expect(ref).not.toContain(digest);
    }
  });

  it('creates a GM-only private record and records its authorized write', async () => {
    const db = database();
    const repo = new SQLitePrivateRecordRepository(db);
    const viewResolver = resolver();
    const created = await repo.createAuthorizedPrivateRecord({
      ...createInput({ recordKind: 'gm-draft' }),
      ...gate(viewResolver, GM_ROW.principalId),
    });

    expect(created.payloadState).toBe('present');
    expect(created.payload).toBe(SECRET);
    expect(repo.listAccessAudit(created.opaqueRef)).toEqual([
      expect.objectContaining({
        actorPrincipalId: GM_ROW.principalId,
        actorRole: 'gm',
        purpose: 'write',
        result: 'granted',
        safeReasonCode: null,
      }),
    ]);

    const countBeforePlayerWrite = (
      db.prepare('SELECT COUNT(*) AS count FROM private_record').get() as {
        count: number;
      }
    ).count;
    const playerError = await catchPrivate(() =>
      repo.createAuthorizedPrivateRecord({
        ...createInput({ commandId: 'cmd-player-write' }),
        ...gate(viewResolver, PLAYER_ROW.principalId),
      }),
    );

    expect(playerError.code).toBe(PRIVATE_RECORD_ACCESS_DENIED_CODE);
    expect(playerError.message).toBe(PRIVATE_RECORD_ACCESS_DENIED_MESSAGE);
    expect(
      (
        db.prepare('SELECT COUNT(*) AS count FROM private_record').get() as {
          count: number;
        }
      ).count,
    ).toBe(countBeforePlayerWrite);
    expect(
      db
        .prepare(
          `SELECT actor_principal_id, actor_role, purpose, result, safe_reason_code
           FROM private_access_audit WHERE purpose = 'write' ORDER BY id`,
        )
        .all(),
    ).toEqual([
      {
        actor_principal_id: GM_ROW.principalId,
        actor_role: 'gm',
        purpose: 'write',
        result: 'granted',
        safe_reason_code: null,
      },
      {
        actor_principal_id: PLAYER_ROW.principalId,
        actor_role: 'player',
        purpose: 'write',
        result: 'denied',
        safe_reason_code: 'role-denied',
      },
    ]);
  });

  it('stores a GM preview summary and private reason as distinct server-only records', async () => {
    const repo = new SQLitePrivateRecordRepository(database());
    const viewResolver = resolver();
    const writer = new GmPrivatePreviewRecordWriter(repo);

    const stored = await writer.store({
      resolver: viewResolver,
      principalId: GM_ROW.principalId,
      campaignSessionId: 'session-1',
      commandId: 'cmd-preview-1',
      createdAt: CREATED_AT,
      preview: { correction: 'adjust damage', unitId: 'unit-secret' },
      derivedSummary: 'GM preview: damage correction',
      privateReason: SECRET,
    });

    expect(Object.keys(stored).sort()).toEqual(['preview', 'reason']);
    expect(stored.preview).toBeDefined();
    if (stored.preview === undefined) {
      throw new Error('expected GM preview record');
    }
    expect(stored.preview.opaqueRef).not.toBe(stored.reason?.opaqueRef);
    const preview = await repo.lookupPrivate({
      ...gate(viewResolver, GM_ROW.principalId),
      opaqueRef: stored.preview.opaqueRef,
    });
    expect(preview.payloadState).toBe('present');
    if (preview.payloadState !== 'present') {
      throw new Error('expected present preview payload');
    }
    expect(JSON.parse(preview.payload)).toEqual({
      derivedSummary: 'GM preview: damage correction',
      preview: { correction: 'adjust damage', unitId: 'unit-secret' },
    });

    const reason = await repo.lookupPrivate({
      ...gate(viewResolver, GM_ROW.principalId),
      opaqueRef: stored.reason?.opaqueRef ?? '',
    });
    expect(reason.payloadState).toBe('present');
    if (reason.payloadState !== 'present') {
      throw new Error('expected present reason payload');
    }
    expect(reason.payload).toBe(SECRET);
    for (const record of [stored.preview, stored.reason]) {
      expect(record).toBeDefined();
      if (record === undefined) continue;
      expect(repo.listAccessAudit(record.opaqueRef)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ purpose: 'write', result: 'granted' }),
        ]),
      );
    }
  });

  it('gates lookup: gm granted with server actor; player/unknown/absent/wrong-scope denied identically without leaking payload', async () => {
    const db = database();
    const repo = new SQLitePrivateRecordRepository(db);
    const viewResolver = resolver();
    const created = repo.createPrivateRecord(createInput());
    const foreign = repo.createPrivateRecord(
      createInput({ campaignSessionId: 'session-2', commandId: 'cmd-foreign' }),
    );

    const granted = await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: created.opaqueRef,
    });
    expect(granted.payloadState).toBe('present');
    if (granted.payloadState !== 'present') {
      throw new Error('expected present payload');
    }
    expect(granted.payload).toBe(SECRET);
    const grantedAudit = repo.listAccessAudit(created.opaqueRef);
    expect(grantedAudit).toEqual([
      expect.objectContaining({
        actorPrincipalId: 'user-gm',
        actorRole: 'gm',
        purpose: 'lookup',
        result: 'granted',
        safeReasonCode: null,
      }),
    ]);

    const playerError = await catchPrivate(() =>
      repo.lookupPrivate({
        ...gate(viewResolver, 'user-player'),
        opaqueRef: created.opaqueRef,
      }),
    );
    const unknownError = await catchPrivate(() =>
      repo.lookupPrivate({
        ...gate(viewResolver, 'user-stranger'),
        opaqueRef: created.opaqueRef,
      }),
    );
    const absentError = await catchPrivate(() =>
      repo.lookupPrivate({
        ...gate(viewResolver, 'user-gm'),
        opaqueRef: ABSENT_REF,
      }),
    );
    const wrongScopeError = await catchPrivate(() =>
      repo.lookupPrivate({
        ...gate(viewResolver, 'user-gm'),
        opaqueRef: foreign.opaqueRef,
      }),
    );

    expect(absentError.code).toBe(wrongScopeError.code);
    expect(absentError.message).toBe(wrongScopeError.message);
    expect(absentError.code).toBe(PRIVATE_RECORD_ACCESS_DENIED_CODE);
    expect(absentError.message).toBe(PRIVATE_RECORD_ACCESS_DENIED_MESSAGE);
    expect(playerError.code).toBe(absentError.code);
    expect(playerError.message).toBe(absentError.message);
    expect(unknownError.code).toBe(absentError.code);

    const playerAudit = repo.listAccessAudit(created.opaqueRef);
    expect(playerAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorPrincipalId: 'user-player',
          actorRole: 'player',
          purpose: 'lookup',
          result: 'denied',
          safeReasonCode: 'role-denied',
        }),
        expect.objectContaining({
          actorPrincipalId: 'user-stranger',
          actorRole: null,
          purpose: 'lookup',
          result: 'denied',
          safeReasonCode: 'no-viewer',
        }),
      ]),
    );
    const absentAudit = repo.listAccessAudit(ABSENT_REF);
    expect(absentAudit).toEqual([
      expect.objectContaining({
        result: 'denied',
        purpose: 'lookup',
        safeReasonCode: 'not-found',
      }),
    ]);
    const foreignAudit = repo.listAccessAudit(foreign.opaqueRef);
    expect(foreignAudit).toEqual([
      expect.objectContaining({
        result: 'denied',
        purpose: 'lookup',
        safeReasonCode: 'wrong-session',
      }),
    ]);

    for (const error of [
      playerError,
      unknownError,
      absentError,
      wrongScopeError,
    ]) {
      expect(
        leakBlob(error, repo.listAccessAudit(created.opaqueRef)),
      ).not.toContain(SECRET);
      expect(leakBlob(error, foreignAudit)).not.toContain(SECRET);
      expect(leakBlob(error, absentAudit)).not.toContain(SECRET);
    }
  });

  it('default export omits the payload key; includePrivate is gm-gated and audited', async () => {
    const repo = new SQLitePrivateRecordRepository(database());
    const viewResolver = resolver();
    const created = repo.createPrivateRecord(createInput());
    const exported = await repo.exportView({ opaqueRef: created.opaqueRef });
    if (exported === null) {
      throw new Error('expected a default export view');
    }
    expect(Object.keys(exported)).toEqual([
      'opaqueRef',
      'payloadState',
      'recordKind',
    ]);
    expect(exported).toEqual({
      opaqueRef: created.opaqueRef,
      payloadState: 'present',
      recordKind: 'gm-reason',
    });

    const included = await repo.exportView({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: created.opaqueRef,
      includePrivate: true,
    });
    expect(included).toEqual({
      opaqueRef: created.opaqueRef,
      payloadState: 'present',
      recordKind: 'gm-reason',
      payload: SECRET,
    });
    expect(repo.listAccessAudit(created.opaqueRef)).toEqual([
      expect.objectContaining({
        purpose: 'export-attempt',
        result: 'granted',
        actorRole: 'gm',
      }),
    ]);
  });

  it('erases and redacts once, keeps the unavailable marker, and leaves player-safe tables byte-identical', async () => {
    const db = database();
    const repo = new SQLitePrivateRecordRepository(db);
    const viewResolver = resolver();
    db.prepare(
      `INSERT INTO event_journal_batches (
         command_id, command_digest, canonicalizer_version,
         stream_type, stream_id, branch_id, event_count,
         first_stream_revision, last_stream_revision,
         first_commit_position, last_commit_position, recorded_at
       ) VALUES (?, ?, 1, 'campaign', 'campaign-alpha', 'root', 1, 1, 1, 1, 1, ?)`,
    ).run('cmd-gameplay', DIGEST_A, CREATED_AT);
    db.prepare(
      `INSERT INTO event_journal_events (
         event_id, command_id, stream_type, stream_id, branch_id,
         stream_revision, commit_position, command_index,
         event_type, event_version, correlation_id,
         actor_kind, actor_id, authority_type, authority_id,
         occurred_at, recorded_at, canonicalizer_version,
         previous_stream_event_digest, event_digest, payload_json
       ) VALUES (?, ?, 'campaign', 'campaign-alpha', 'root', 1, 1, 0,
         'probe_event', 1, 'corr-1', 'system', 'probe', 'campaign', 'campaign-alpha',
         ?, ?, 1, NULL, ?, '{"value":"probe"}')`,
    ).run('evt-1', 'cmd-gameplay', CREATED_AT, CREATED_AT, DIGEST_B);
    db.prepare(
      `INSERT INTO action_audit (
         command_id, campaign_session_id, match_id, stream_type, stream_id,
         command_digest, actor_principal_id, actor_participant_id, actor_role,
         lifecycle_state, safe_reason_code, correlation_id, created_at, updated_at,
         published_receipt_id, committed_first_revision, committed_last_revision,
         committed_event_count
       ) VALUES (?, 'session-1', 'match-1', 'campaign', 'campaign-alpha', ?,
         'principal-1', 'participant-1', 'player', 'rejected', 'command-rejected',
         'corr-1', ?, ?, NULL, NULL, NULL, NULL)`,
    ).run('cmd-private', DIGEST_A, CREATED_AT, CREATED_AT);

    const snapshot = () => ({
      auditCount: (
        db.prepare('SELECT COUNT(*) AS c FROM action_audit').get() as {
          c: number;
        }
      ).c,
      audit: db.prepare('SELECT * FROM action_audit ORDER BY command_id').all(),
      events: db
        .prepare(
          'SELECT event_id, event_digest, payload_json FROM event_journal_events ORDER BY commit_position',
        )
        .all(),
      batches: db
        .prepare(
          'SELECT command_id, command_digest FROM event_journal_batches ORDER BY command_id',
        )
        .all(),
    });
    const before = snapshot();

    const toErase = repo.createPrivateRecord(createInput());
    const toRedact = repo.createPrivateRecord(
      createInput({ commandId: 'cmd-redact' }),
    );
    const erased = await repo.erase({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: toErase.opaqueRef,
    });
    expect(erased.payloadState).toBe('erased');
    expect(Object.keys(erased)).not.toContain('payload');
    expect(erased.opaqueRef).toBe(toErase.opaqueRef);
    expect(erased.recordKind).toBe('gm-reason');
    expect(erased.campaignSessionId).toBe('session-1');

    const looked = await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: toErase.opaqueRef,
    });
    expect(looked.payloadState).toBe('erased');
    expect(Object.keys(looked)).not.toContain('payload');
    expect(JSON.stringify(looked)).not.toContain(SECRET);

    const redacted = await repo.redact({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: toRedact.opaqueRef,
      replacement: 'REDACTED-MARKER',
    });
    expect(redacted.payloadState).toBe('redacted');
    expect(redacted.payload).toBe('REDACTED-MARKER');

    expect(snapshot()).toEqual(before);

    const doubleErase = await catchPrivate(() =>
      repo.erase({
        ...gate(viewResolver, 'user-gm'),
        opaqueRef: toErase.opaqueRef,
      }),
    );
    expect(doubleErase.code).toBe('already-terminal');
    expect(() =>
      db
        .prepare('DELETE FROM private_record WHERE opaque_ref = ?')
        .run(toErase.opaqueRef),
    ).toThrow(/may not be deleted/);
  });

  it('records, access-audit rows, and retention config survive reopen', async () => {
    const db = database();
    const repo = new SQLitePrivateRecordRepository(db);
    const viewResolver = resolver();
    const created = repo.createPrivateRecord(createInput());
    await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: created.opaqueRef,
    });
    repo.configureRetention({
      retentionClass: 'session',
      policy: 'erase-on-expiry',
      configuredAt: OCCURRED_AT,
    });
    const beforeRecord = repo.listAccessAudit(created.opaqueRef);
    resetSQLiteService();
    const reopened = new SQLitePrivateRecordRepository(database());
    const looked = await reopened.lookupPrivate({
      ...gate(resolver(), 'user-gm'),
      opaqueRef: created.opaqueRef,
    });
    expect(looked.payloadState).toBe('present');
    if (looked.payloadState !== 'present') {
      throw new Error('expected present payload');
    }
    expect(looked.payload).toBe(SECRET);
    expect(reopened.listAccessAudit(created.opaqueRef).length).toBe(
      beforeRecord.length + 1,
    );
    const policy = database()
      .prepare(
        'SELECT policy FROM private_retention_state WHERE retention_class = ?',
      )
      .get('session') as { policy: string };
    expect(policy.policy).toBe('erase-on-expiry');
  });

  it('runRetention erases only expired session-class rows under erase-on-expiry', async () => {
    const db = database();
    const repo = new SQLitePrivateRecordRepository(db);
    const viewResolver = resolver();
    repo.configureRetention({
      retentionClass: 'session',
      policy: 'erase-on-expiry',
      configuredAt: OCCURRED_AT,
    });
    const expired = repo.createPrivateRecord(
      createInput({ createdAt: '2026-01-01T00:00:00.000Z' }),
    );
    const keptSession = repo.createPrivateRecord(
      createInput({
        createdAt: '2026-08-01T00:00:00.000Z',
        commandId: 'cmd-kept',
      }),
    );
    const keptCampaign = repo.createPrivateRecord(
      createInput({
        createdAt: '2026-01-01T00:00:00.000Z',
        retentionClass: 'campaign',
        commandId: 'cmd-campaign',
      }),
    );
    const erasedRefs = repo.runRetention({
      cutoffAt: '2026-06-01T00:00:00.000Z',
      occurredAt: OCCURRED_AT,
      actorPrincipalId: 'retention-job',
    });
    expect(erasedRefs).toEqual([expired.opaqueRef]);
    const expiredView = await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: expired.opaqueRef,
    });
    expect(expiredView.payloadState).toBe('erased');
    expect(Object.keys(expiredView)).not.toContain('payload');
    const kept = await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: keptSession.opaqueRef,
    });
    expect(kept.payloadState).toBe('present');
    const campaign = await repo.lookupPrivate({
      ...gate(viewResolver, 'user-gm'),
      opaqueRef: keptCampaign.opaqueRef,
    });
    expect(campaign.payloadState).toBe('present');
    expect(repo.listAccessAudit(expired.opaqueRef)[0]).toEqual(
      expect.objectContaining({
        purpose: 'retention-action',
        result: 'granted',
        actorPrincipalId: 'retention-job',
        actorRole: null,
      }),
    );
  });
});
