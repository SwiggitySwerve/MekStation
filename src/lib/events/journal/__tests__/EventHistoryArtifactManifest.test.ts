import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type {
  EventHistoryArtifactManifestErrorCode,
  IAffectedArtifact,
} from '../EventHistoryArtifactManifest';

import {
  EventHistoryArtifactManifestError,
  SQLiteEventHistoryArtifactManifestStore,
  digestAffectedArtifacts,
} from '../EventHistoryArtifactManifest';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const CANDIDATE = 'candidate-1';
const DERIVED_AT = '2026-09-02T00:00:00.000Z';

const ARTIFACTS: readonly IAffectedArtifact[] = [
  { artifactKind: 'replay', artifactId: 'replay-1', sourceRevision: 4 },
  { artifactKind: 'checkpoint', artifactId: 'ckpt-9', sourceRevision: 3 },
  { artifactKind: 'projection', artifactId: 'viewer-a', sourceRevision: 4 },
];

function codeOf(
  run: () => unknown,
): EventHistoryArtifactManifestErrorCode | 'no-throw' {
  try {
    run();
  } catch (error) {
    if (error instanceof EventHistoryArtifactManifestError) return error.code;
    throw error;
  }
  return 'no-throw';
}

describe('SQLiteEventHistoryArtifactManifestStore', () => {
  let dir: string;
  let dbPath: string;
  let service: SQLiteService;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'artifact-manifest-store-'));
    dbPath = path.join(dir, 'manifest.db');
    service = new SQLiteService({ path: dbPath });
    service.initialize();
    db = service.getDatabase();
    seedBranches();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function seedBranches(): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'root', NULL, 0, 0, NULL, ?, 'effective',
               'migration', 'genesis', ?)`,
    ).run(DIGEST_A, DERIVED_AT);
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', ?, 'root', 1, 4, 'event-4', ?, 'building',
               'host-1', 'correction-rebuild:x:1:rewind', ?)`,
    ).run(CANDIDATE, DIGEST_B, DERIVED_AT);
  }

  function store(): SQLiteEventHistoryArtifactManifestStore {
    return new SQLiteEventHistoryArtifactManifestStore(db);
  }

  it('seals a derived manifest and reads it back with its entries in canonical order', () => {
    const sealed = store().sealArtifactManifest(
      STREAM,
      CANDIDATE,
      ARTIFACTS,
      DERIVED_AT,
    );

    expect(sealed.entryCount).toBe(3);
    expect(sealed.manifestDigest).toBe(digestAffectedArtifacts(ARTIFACTS));
    expect(sealed.derivedAt).toBe(DERIVED_AT);

    const read = store().readArtifactManifest(STREAM, CANDIDATE);
    expect(read?.header).toEqual(sealed);
    // Canonical order, not insertion order: the digest must not depend on
    // the sequence the deriver happened to discover artifacts in.
    expect(read?.entries.map((entry) => entry.artifactId)).toEqual([
      'ckpt-9',
      'viewer-a',
      'replay-1',
    ]);
  });

  it('digests the same set identically whatever order it arrives in', () => {
    const shuffled = [ARTIFACTS[2], ARTIFACTS[0], ARTIFACTS[1]];
    expect(digestAffectedArtifacts(shuffled)).toBe(
      digestAffectedArtifacts(ARTIFACTS),
    );
    // A different set is a different manifest.
    expect(digestAffectedArtifacts(ARTIFACTS.slice(0, 2))).not.toBe(
      digestAffectedArtifacts(ARTIFACTS),
    );
    // The revision that stales an artifact is part of its identity here:
    // the same artifact invalidated from a different revision is a
    // different claim about what activation breaks.
    expect(
      digestAffectedArtifacts([
        { ...ARTIFACTS[0], sourceRevision: 5 },
        ARTIFACTS[1],
        ARTIFACTS[2],
      ]),
    ).not.toBe(digestAffectedArtifacts(ARTIFACTS));
  });

  it('seals an empty manifest rather than pretending none was derived', () => {
    // A correction that invalidates nothing is a real answer, and it has
    // to be recorded: "no manifest" and "a manifest listing nothing" mean
    // different things at activation.
    const sealed = store().sealArtifactManifest(
      STREAM,
      CANDIDATE,
      [],
      DERIVED_AT,
    );
    expect(sealed.entryCount).toBe(0);
    expect(sealed.manifestDigest).toBe(digestAffectedArtifacts([]));
    expect(store().readArtifactManifest(STREAM, CANDIDATE)?.entries).toEqual(
      [],
    );
  });

  it('refuses to seal a candidate twice', () => {
    store().sealArtifactManifest(STREAM, CANDIDATE, ARTIFACTS, DERIVED_AT);
    expect(
      codeOf(() =>
        store().sealArtifactManifest(STREAM, CANDIDATE, ARTIFACTS, DERIVED_AT),
      ),
    ).toBe('manifest-already-sealed');
    // A different entry set does not get a second chance either - that is
    // exactly the widening the seal exists to refuse.
    expect(
      codeOf(() =>
        store().sealArtifactManifest(STREAM, CANDIDATE, [], DERIVED_AT),
      ),
    ).toBe('manifest-already-sealed');
    expect(
      store().readArtifactManifest(STREAM, CANDIDATE)?.header.entryCount,
    ).toBe(3);
  });

  it('refuses a duplicated artifact with nothing written, sealed, or half-derived', () => {
    // Validation runs before the transaction opens, so this set never
    // reaches storage at all - the census below is what says so. The
    // transaction underneath is defence in depth for a racing sealer, not
    // what this row proves.
    const duplicated = [...ARTIFACTS, ARTIFACTS[0]];
    expect(
      codeOf(() =>
        store().sealArtifactManifest(STREAM, CANDIDATE, duplicated, DERIVED_AT),
      ),
    ).toBe('invalid-manifest-entry');
    expect(store().readArtifactManifest(STREAM, CANDIDATE)).toBeNull();
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM event_history_artifact_manifest_entries`,
        )
        .get(),
    ).toEqual({ n: 0 });
  });

  it('refuses a manifest for a branch this stream does not hold', () => {
    expect(
      codeOf(() =>
        store().sealArtifactManifest(STREAM, 'ghost', ARTIFACTS, DERIVED_AT),
      ),
    ).toBe('unknown-candidate-branch');
    expect(
      codeOf(() =>
        store().sealArtifactManifest(
          { streamType: 'match', streamId: 'stream-2' },
          CANDIDATE,
          ARTIFACTS,
          DERIVED_AT,
        ),
      ),
    ).toBe('unknown-candidate-branch');
  });

  it('refuses malformed artifacts before writing anything', () => {
    for (const bad of [
      { artifactKind: 'replay', artifactId: '  ', sourceRevision: 1 },
      { artifactKind: 'replay', artifactId: 'r', sourceRevision: -1 },
      { artifactKind: 'replay', artifactId: 'r', sourceRevision: 1.5 },
      { artifactKind: 'screenshot', artifactId: 'r', sourceRevision: 1 },
    ] as IAffectedArtifact[]) {
      expect(
        codeOf(() =>
          store().sealArtifactManifest(STREAM, CANDIDATE, [bad], DERIVED_AT),
        ),
      ).toBe('invalid-manifest-entry');
    }
    expect(store().readArtifactManifest(STREAM, CANDIDATE)).toBeNull();
  });

  it('verifies a sealed manifest against its own rows and catches a tampered header', () => {
    store().sealArtifactManifest(STREAM, CANDIDATE, ARTIFACTS, DERIVED_AT);
    expect(store().verifyArtifactManifest(STREAM, CANDIDATE).entryCount).toBe(
      3,
    );

    // The header cannot be edited through the store or through SQL - the
    // triggers refuse. So the way a digest can go wrong is a header written
    // against rows it does not cover; forge that state directly to prove
    // the verifier is the thing that catches it, not the trigger.
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'candidate-2', 'root', 1, 4, 'event-4', ?,
               'building', 'host-1', 'r', ?)`,
    ).run(DIGEST_B, DERIVED_AT);
    db.prepare(
      `INSERT INTO event_history_artifact_manifests
         (stream_type, stream_id, candidate_branch_id, manifest_digest,
          entry_count, derived_at)
       VALUES ('match', 'stream-1', 'candidate-2', ?, 1, ?)`,
    ).run(DIGEST_A, DERIVED_AT);

    expect(
      codeOf(() => store().verifyArtifactManifest(STREAM, 'candidate-2')),
    ).toBe('manifest-digest-mismatch');
  });

  it('refuses to verify a manifest that was never sealed', () => {
    expect(
      codeOf(() => store().verifyArtifactManifest(STREAM, CANDIDATE)),
    ).toBe('manifest-not-found');
    expect(store().readArtifactManifest(STREAM, CANDIDATE)).toBeNull();
  });

  it('survives a cold reopen with the manifest and its digest intact', () => {
    const sealed = store().sealArtifactManifest(
      STREAM,
      CANDIDATE,
      ARTIFACTS,
      DERIVED_AT,
    );

    service.close();
    service = new SQLiteService({ path: dbPath });
    service.initialize();
    db = service.getDatabase();

    expect(store().readArtifactManifest(STREAM, CANDIDATE)?.header).toEqual(
      sealed,
    );
    expect(store().verifyArtifactManifest(STREAM, CANDIDATE)).toEqual(sealed);
  });
});
