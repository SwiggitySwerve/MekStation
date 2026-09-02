import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { EventHistoryArtifactManifestErrorCode } from '../EventHistoryArtifactManifest';
import type { EventHistoryBranchErrorCode } from '../EventHistoryBranchContract';
import type { IProjectableBranchEvent } from '../EventHistoryCandidateVerification';
import type {
  IDerivedCandidateImpact,
  IViewerProjectionProbe,
} from '../EventHistoryImpactDerivation';

import { EventHistoryArtifactManifestError } from '../EventHistoryArtifactManifest';
import { SQLiteEventHistoryArtifactManifestStore } from '../EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '../EventHistoryBranchContract';
import { journalBranchSegmentReader } from '../EventHistoryBranchResolver';
import { deriveAndSealCandidateImpact } from '../EventHistoryImpactDerivation';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '../SQLiteEventJournal';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const AT = '2026-09-02T00:00:00.000Z';
const CANDIDATE = 'candidate-1';
const BASE_REVISION = 2;
const HEAD_REVISION = 4;
const DIGEST_B = 'b'.repeat(64);
const HEX = 'c'.repeat(64);

type ProbePayload = { readonly amount: number };
interface IProbeState {
  readonly damage: number;
}

const registry = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_damage',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.damage.v1',
          parse: (payload: unknown) => payload,
        },
      ],
      transitions: [],
    },
  ],
});

const projector = (): ReplayProjector<IProbeState> =>
  new ReplayProjector<IProbeState>({
    projectorId: 'impact.probe',
    projectorVersion: 1,
    initialState: () => ({ damage: 0 }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => ({
            damage: state.damage + (event.payload as ProbePayload).amount,
          }),
        },
      },
    ],
  });

/**
 * A viewer sees the events whose revision its allowance covers. GM sees
 * everything; `player-1` only ever saw the first two, so a rewind to
 * revision 2 cannot change what it sees.
 */
const VIEWER_CEILING: Readonly<Record<string, number>> = {
  gm: Number.MAX_SAFE_INTEGER,
  'player-1': 2,
  'player-2': Number.MAX_SAFE_INTEGER,
};

function visibilityProbe(): IViewerProjectionProbe {
  return {
    digest: (viewerId, events) =>
      events
        .filter((event) => event.streamRevision <= VIEWER_CEILING[viewerId])
        .map((event) => `${event.eventId}:${event.eventDigest}`)
        .join('|'),
  };
}

async function codeOfAsync(
  run: () => Promise<unknown>,
): Promise<
  | EventHistoryBranchErrorCode
  | EventHistoryArtifactManifestErrorCode
  | 'no-throw'
> {
  try {
    await run();
  } catch (error) {
    if (
      error instanceof EventHistoryBranchError ||
      error instanceof EventHistoryArtifactManifestError
    ) {
      return error.code;
    }
    throw error;
  }
  return 'no-throw';
}

describe('deriveAndSealCandidateImpact', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'impact-derivation-'));
    service = new SQLiteService({ path: path.join(dir, 'impact.db') });
    service.initialize();
    db = service.getDatabase();
    await seedStream();
    seedCandidate();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function manifests(): SQLiteEventHistoryArtifactManifestStore {
    return new SQLiteEventHistoryArtifactManifestStore(db);
  }

  function journal(): SQLiteEventJournal<ProbePayload> {
    return new SQLiteEventJournal<ProbePayload>(db, () => AT);
  }

  function reader(): ReturnType<
    typeof journalBranchSegmentReader<ProbePayload>
  > {
    return journalBranchSegmentReader(journal());
  }

  /** Four real events through the shipped writer, plus the genesis branch. */
  async function seedStream(): Promise<void> {
    const result = await journal().append({
      ...STREAM,
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'command-1',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [1, 2, 3, 4].map((index) => ({
        eventId: `event-${index}`,
        eventType: 'probe_damage',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: [],
        occurredAt: AT,
        payload: { amount: index },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-a', role: 'subject' },
        ],
      })),
    });
    expect(result.kind).toBe('committed');
    expect(branches().backfillGenesisBranches()).toBe(1);
  }

  /**
   * A rewind candidate anchored BELOW the head.
   *
   * Seeded as a row rather than built through the authorized path, because
   * that path anchors a candidate at the lease's expected head - the
   * current one. A candidate anchored at a PRIOR revision is what a rewind
   * produces, and minting one is PR 3's work; this is the row it will write.
   */
  function seedCandidate(branchId = CANDIDATE, digest?: string): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', ?, 'root', 1, ?, ?, ?, 'building',
               'host-1', 'correction-rebuild:lease:1:rewind to turn 2', ?)`,
    ).run(
      branchId,
      BASE_REVISION,
      `event-${BASE_REVISION}`,
      digest ?? baseDigest(),
      AT,
    );
  }

  /** The digest the journal actually stored at the candidate's base. */
  function baseDigest(): string {
    return (
      db
        .prepare(
          `SELECT event_digest AS digest FROM event_journal_events
           WHERE stream_id = 'stream-1' AND stream_revision = ?`,
        )
        .get(BASE_REVISION) as { readonly digest: string }
    ).digest;
  }

  function seedCheckpoint(checkpointId: string, revision: number): void {
    db.prepare(
      `INSERT INTO replay_checkpoints
         (checkpoint_id, stream_id, branch_id, revision,
          schema_pipeline_fingerprint, projector_id, projector_version,
          source_tail_digest, state_digest, state_json, recorded_at)
       VALUES (?, 'stream-1', 'root', ?, ?, 'impact.probe', 1, ?, ?, '{}', ?)`,
    ).run(checkpointId, revision, HEX, DIGEST_B, HEX, AT);
  }

  async function derive(
    overrides: {
      readonly probe?: IViewerProjectionProbe;
      readonly candidateBranchId?: string;
      readonly viewerIds?: readonly string[];
    } = {},
  ): Promise<IDerivedCandidateImpact> {
    return deriveAndSealCandidateImpact(db, branches(), reader(), {
      stream: STREAM,
      candidateBranchId: overrides.candidateBranchId ?? CANDIDATE,
      priorHeadRevision: HEAD_REVISION,
      viewerIds: overrides.viewerIds ?? ['gm', 'player-1', 'player-2'],
      probe: overrides.probe ?? visibilityProbe(),
      derivedAt: AT,
      verification: { registry, projector: projector() },
    });
  }

  function entryIds(
    kind: string,
    entries: readonly { artifactKind: string; artifactId: string }[],
  ): string[] {
    return entries
      .filter((entry) => entry.artifactKind === kind)
      .map((entry) => entry.artifactId)
      .sort();
  }

  it('lists exactly the viewers whose projection changes, and no others', async () => {
    const derived = await derive();

    // gm and player-2 saw events 3 and 4, which the rewind drops.
    // player-1 never saw past revision 2, so nothing it can see moved.
    expect(entryIds('projection', derived.entries)).toEqual(['gm', 'player-2']);
    expect(
      derived.entries.every(
        (entry) =>
          entry.artifactKind !== 'projection' ||
          entry.sourceRevision === BASE_REVISION,
      ),
    ).toBe(true);
    expect(derived.header.entryCount).toBe(derived.entries.length);
  });

  it('derives the candidate side rather than reusing the prior head answer', async () => {
    // The prior-head digests are IDENTICAL for every viewer here, and only
    // the candidate side differs. A derivation that reused the prior answer
    // for the candidate would report nothing changed - and no other row
    // catches that, because every other row varies both sides.
    const priorOnly: IViewerProjectionProbe = {
      digest: (_viewerId, events) =>
        events.length === HEAD_REVISION ? 'same-for-everyone' : 'candidate',
    };
    const derived = await derive({ probe: priorOnly });
    expect(entryIds('projection', derived.entries)).toEqual([
      'gm',
      'player-1',
      'player-2',
    ]);
  });

  it('refuses a probe that answers the same head differently twice', async () => {
    // Each head is probed TWICE per viewer and the answers compared. A
    // probe that will not reproduce cannot be sealed against: the manifest
    // would record an impact nobody can re-derive.
    let call = 0;
    const flapping: IViewerProjectionProbe = {
      digest: () => {
        call += 1;
        return `answer-${call}`;
      },
    };
    expect(await codeOfAsync(() => derive({ probe: flapping }))).toBe(
      'branch-integrity',
    );
    expect(manifests().readArtifactManifest(STREAM, CANDIDATE)).toBeNull();
  });

  it('lists checkpoints above the base revision and leaves the base itself alone', async () => {
    // A checkpoint AT the base revision describes history the candidate
    // keeps; only what sits above it is staled by the replacement.
    seedCheckpoint('ckpt-at-base', BASE_REVISION);
    seedCheckpoint('ckpt-above', BASE_REVISION + 1);
    seedCheckpoint('ckpt-head', HEAD_REVISION);
    seedCheckpoint('ckpt-below', BASE_REVISION - 1);

    const derived = await derive();
    expect(entryIds('checkpoint', derived.entries)).toEqual([
      'ckpt-above',
      'ckpt-head',
    ]);
    const above = derived.entries.find(
      (entry) => entry.artifactId === 'ckpt-above',
    );
    expect(above?.sourceRevision).toBe(BASE_REVISION + 1);
  });

  it('seals nothing when the candidate fails verification', async () => {
    // The seal is unreachable unless verification returned. This candidate
    // claims a base digest its parent does not hold, so materialisation
    // refuses before anything is derived. (The journal itself cannot be
    // corrupted to force this - its events are immutable by trigger, which
    // is why the failure is staged on the branch record instead.)
    seedCandidate('candidate-bad', 'e'.repeat(64));

    expect(
      await codeOfAsync(() => derive({ candidateBranchId: 'candidate-bad' })),
    ).toBe('branch-integrity');
    expect(
      manifests().readArtifactManifest(STREAM, 'candidate-bad'),
    ).toBeNull();
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM event_history_artifact_manifest_entries`,
        )
        .get(),
    ).toEqual({ n: 0 });
  });

  it('derives the same sealed digest twice for the same candidate', async () => {
    seedCheckpoint('ckpt-above', BASE_REVISION + 1);
    const first = await derive();

    // 3a refuses a re-seal, so a second derivation compares against the
    // sealed header instead of writing a second one. Determinism is the
    // claim: same candidate, same impact, same digest.
    expect(await codeOfAsync(() => derive())).toBe('manifest-already-sealed');
    const stored = manifests().verifyArtifactManifest(STREAM, CANDIDATE);
    expect(stored.manifestDigest).toBe(first.header.manifestDigest);
    expect(stored.entryCount).toBe(first.header.entryCount);
  });

  it('refuses a candidate this stream does not hold', async () => {
    expect(
      await codeOfAsync(() => derive({ candidateBranchId: 'ghost' })),
    ).toBe('unknown-branch');
  });

  it('seals an empty manifest when nothing a viewer sees moved', async () => {
    // A rewind that changes nothing visible is a real answer and must be
    // recorded: "no manifest" and "a manifest listing nothing" mean
    // different things at activation.
    const derived = await derive({ viewerIds: ['player-1'] });
    expect(derived.entries).toEqual([]);
    expect(derived.header.entryCount).toBe(0);
    expect(
      manifests().verifyArtifactManifest(STREAM, CANDIDATE).entryCount,
    ).toBe(0);
  });
});
