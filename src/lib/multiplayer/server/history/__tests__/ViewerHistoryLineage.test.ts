/**
 * Red-first rows for viewer-projected branch lineage (seam 18.1).
 *
 * Seeds through the shipped branch store (test creation seam) and
 * activates via EventHistoryActivation so the projection reads the
 * same supersession / head / manifest rows production writes.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventHistoryBranch } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IViewerLineageTransition } from '../ViewerHistoryLineage';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { EVENT_HISTORY_GENESIS_DIGEST } from '@/lib/events/journal/EventHistoryBranchContract';
import { _branchCreationSeamForTests } from '@/lib/events/journal/EventHistoryBranchContract';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import {
  isGmLineageTransition,
  projectViewerHistoryLineage,
} from '../ViewerHistoryLineage';
import { SQLiteService } from '@/services/persistence/SQLiteService';

const STREAM = { streamType: 'match', streamId: 'stream-lineage' } as const;
const AT = '2026-09-02T00:00:00.000Z';
const DIGEST = 'a'.repeat(64);
const REASON = 'authorized rewind to turn 2';
const REASON_TWO = 'second authorized rewind';
const BASE_REVISION = 2;
const PLAYER_ID = 'player-1';
const INVALIDATIONS: readonly IAffectedArtifact[] = [
  { artifactKind: 'projection', artifactId: 'gm', sourceRevision: 2 },
  { artifactKind: 'checkpoint', artifactId: 'ckpt-3', sourceRevision: 3 },
  { artifactKind: 'projection', artifactId: PLAYER_ID, sourceRevision: 2 },
];

describe('ViewerHistoryLineage', () => {
  let dir: string;
  let service: SQLiteService;
  let now = 1_000_000;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'viewer-history-lineage-'));
    service = new SQLiteService({ path: path.join(dir, 'lineage.db') });
    service.initialize();
    now = 1_000_000;
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function db() {
    return service.getDatabase();
  }

  function stores() {
    return {
      branches: new SQLiteEventHistoryBranchStore(
        db(),
        _branchCreationSeamForTests(),
      ),
      manifests: new SQLiteEventHistoryArtifactManifestStore(db()),
    };
  }

  function leases() {
    return new SQLiteEventHistoryCorrectionLeaseStore(db(), stores().branches, {
      nowMs: () => now,
    });
  }

  function project(audience: 'gm' | 'player') {
    return projectViewerHistoryLineage(stores(), STREAM, {
      audience,
      viewerId: PLAYER_ID,
    });
  }

  function seedRoot(): void {
    db()
      .prepare(
        `INSERT INTO event_journal_stream_heads
           (stream_type, stream_id, branch_id, stream_revision, event_digest)
         VALUES (?, ?, 'root', 4, ?)`,
      )
      .run(STREAM.streamType, STREAM.streamId, DIGEST);
    expect(stores().branches.backfillGenesisBranches()).toBe(1);
  }

  function child(branchId: string, parent: string, depth: number): IEventHistoryBranch {
    return {
      ...STREAM,
      branchId,
      parentBranchId: parent,
      ancestorDepth: depth,
      baseRevision: BASE_REVISION + depth - 1,
      baseEventId: `event-${BASE_REVISION + depth - 1}`,
      baseDigest: 'b'.repeat(64),
      status: 'building',
      createdBy: 'host-1',
      reason: 'correction-rebuild',
      createdAt: AT,
    };
  }

  function activate(branchId: string, reason: string, expected: {
    readonly branchId: string;
    readonly revision: number;
    readonly digest: string;
    readonly generation: number;
  }): void {
    const { branches, manifests } = stores();
    branches.createBranch(
      child(branchId, expected.branchId, expected.generation),
    );
    manifests.sealArtifactManifest(STREAM, branchId, INVALIDATIONS, AT);
    const lease = leases().acquireCorrectionLease({
      ...STREAM,
      owner: `owner-${expected.generation}`,
      actor: 'gm-1',
      reason,
      ttlMs: 30_000,
      expectedBranchId: expected.branchId,
      expectedRevision: expected.revision,
      expectedDigest: expected.digest,
      expectedGeneration: expected.generation,
    });
    activateCandidateBranch(db(), branches, leases(), manifests, {
      stream: STREAM,
      candidateBranchId: branchId,
      held: {
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
      },
      reason,
      activatedAt: AT,
    });
  }

  it('root-only stream answers effectiveHead and zero transitions', () => {
    seedRoot();
    const gm = project('gm');
    expect(gm.effectiveHead).toEqual({
      branchId: 'root',
      revision: 0,
      generation: 1,
    });
    expect(gm.transitions).toEqual([]);
  });

  it('store answering null does not invent an effective head', () => {
    const empty = project('gm');
    expect(empty.effectiveHead).toBeNull();
    expect(empty.transitions).toEqual([]);
  });

  it('GM projection lists the activation reason and invalidated artifacts', () => {
    seedRoot();
    activate('candidate-1', REASON, {
      branchId: 'root',
      revision: 4,
      digest: DIGEST,
      generation: 1,
    });
    const gm = project('gm');
    expect(gm.effectiveHead).toEqual({
      branchId: 'candidate-1',
      revision: BASE_REVISION,
      generation: 2,
    });
    expect(gm.transitions).toHaveLength(1);
    const transition = gm.transitions[0];
    expect(transition).toMatchObject({
      fromBranchId: 'root',
      toBranchId: 'candidate-1',
      baseRevision: BASE_REVISION,
      actorRole: 'gm',
      supersededAt: AT,
      reason: REASON,
      createdBy: 'host-1',
    });
    expect(transition?.invalidatedArtifacts).toEqual([
      { artifactKind: 'checkpoint', artifactId: 'ckpt-3' },
      { artifactKind: 'projection', artifactId: 'gm' },
      { artifactKind: 'projection', artifactId: PLAYER_ID },
    ]);
    for (const artifact of transition?.invalidatedArtifacts ?? []) {
      expect(Object.keys(artifact)).toEqual(['artifactKind', 'artifactId']);
    }
  });

  it('PLAYER projection omits the reason key and GM-only artifact annotation', () => {
    seedRoot();
    activate('candidate-1', REASON, {
      branchId: 'root',
      revision: 4,
      digest: DIGEST,
      generation: 1,
    });
    const player = project('player');
    expect(player.transitions).toHaveLength(1);
    const transition = player.transitions[0] as IViewerLineageTransition;
    expect(transition.fromBranchId).toBe('root');
    expect(transition.toBranchId).toBe('candidate-1');
    expect(transition.baseRevision).toBe(BASE_REVISION);
    expect('reason' in transition).toBe(false);
    expect('createdBy' in transition).toBe(false);
    expect(transition.invalidatedArtifacts).toEqual([
      { artifactKind: 'checkpoint', artifactId: 'ckpt-3' },
      { artifactKind: 'projection', artifactId: PLAYER_ID },
    ]);
    for (const artifact of transition.invalidatedArtifacts) {
      expect('sourceRevision' in artifact).toBe(false);
    }
  });

  it('superseded-then-superseded chain lists two transitions in order', () => {
    seedRoot();
    activate('candidate-1', REASON, {
      branchId: 'root',
      revision: 4,
      digest: DIGEST,
      generation: 1,
    });
    now += 30_000;
    activate('candidate-2', REASON_TWO, {
      branchId: 'candidate-1',
      revision: 0,
      digest: EVENT_HISTORY_GENESIS_DIGEST,
      generation: 2,
    });
    const gm = project('gm');
    expect(gm.transitions.map((row) => row.toBranchId)).toEqual([
      'candidate-1',
      'candidate-2',
    ]);
    const first = gm.transitions[0];
    const second = gm.transitions[1];
    // reason is GM-only; the union base must not grow that key.
    if (
      first === undefined ||
      second === undefined ||
      !isGmLineageTransition(first) ||
      !isGmLineageTransition(second)
    ) {
      throw new Error('expected two GM lineage transitions');
    }
    expect(first.reason).toBe(REASON);
    expect(second.reason).toBe(REASON_TWO);
    expect(gm.effectiveHead?.branchId).toBe('candidate-2');
  });
});
