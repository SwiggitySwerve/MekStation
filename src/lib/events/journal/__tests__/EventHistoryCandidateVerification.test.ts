import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createReplayCheckpointMetadata,
  digestReplayCheckpointState,
} from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { SQLiteService } from '@/services/persistence/SQLiteService';

import type { EventHistoryBranchErrorCode } from '../EventHistoryBranchContract';
import type {
  IBranchSegmentReader,
  IResolvedBranchPath,
} from '../EventHistoryBranchResolver';
import type {
  ICandidateCheckpointOffer,
  IVerifiedCandidatePath,
} from '../EventHistoryCandidateVerification';

import { EventHistoryBranchError } from '../EventHistoryBranchContract';
import {
  journalBranchSegmentReader,
  materializeBranchPath,
  resolveBranchPath,
} from '../EventHistoryBranchResolver';
import {
  digestBranchPath,
  verifyCandidatePath,
} from '../EventHistoryCandidateVerification';
import { SQLiteEventHistoryBranchStore } from '../SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '../SQLiteEventJournal';

const STREAM = { streamType: 'match', streamId: 'stream-1' } as const;
const AT = '2026-09-02T00:00:00.000Z';
const FINGERPRINT = 'pipeline-fingerprint-v1';

interface IProbeState {
  readonly damage: number;
  readonly seen: number;
}

type ProbePayload = { readonly amount: number };

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
    projectorId: 'candidate.verification.probe',
    projectorVersion: 1,
    initialState: () => ({ damage: 0, seen: 0 }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => ({
            damage: state.damage + (event.payload as ProbePayload).amount,
            seen: state.seen + 1,
          }),
        },
      },
    ],
  });

function codeOf(run: () => unknown): EventHistoryBranchErrorCode | 'no-throw' {
  try {
    run();
  } catch (error) {
    if (error instanceof EventHistoryBranchError) return error.code;
    throw error;
  }
  return 'no-throw';
}

async function codeOfAsync(
  run: () => Promise<unknown>,
): Promise<EventHistoryBranchErrorCode | 'no-throw'> {
  try {
    await run();
  } catch (error) {
    if (error instanceof EventHistoryBranchError) return error.code;
    throw error;
  }
  return 'no-throw';
}

describe('verifyCandidatePath', () => {
  let dir: string;
  let service: SQLiteService;
  let db: Database.Database;
  let head: IResolvedBranchPath;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'candidate-verification-'));
    service = new SQLiteService({ path: path.join(dir, 'verify.db') });
    service.initialize();
    db = service.getDatabase();
    await seedStream();
  });

  afterEach(async () => {
    service.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function journal(): SQLiteEventJournal<ProbePayload> {
    return new SQLiteEventJournal<ProbePayload>(db, () => AT);
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
    head = resolveBranchPath(branches(), STREAM, 'root', 4);
  }

  function reader(): ReturnType<
    typeof journalBranchSegmentReader<ProbePayload>
  > {
    return journalBranchSegmentReader(journal());
  }

  async function verify(
    checkpoint?: ICandidateCheckpointOffer,
  ): Promise<IVerifiedCandidatePath<IProbeState>> {
    return verifyCandidatePath(reader(), head, {
      registry,
      projector: projector(),
      ...(checkpoint === undefined ? {} : { checkpoint }),
    });
  }

  it('verifies the candidate path and folds it to a state and digest', async () => {
    const verified = await verify();

    expect(verified.events.map((event) => event.eventId)).toEqual([
      'event-1',
      'event-2',
      'event-3',
      'event-4',
    ]);
    // 1 + 2 + 3 + 4, so the projector genuinely ran over every event.
    expect(verified.state).toEqual({ damage: 10, seen: 4 });
    expect(verified.stateDigest).toBe(
      digestReplayCheckpointState(verified.state),
    );
    expect(verified.pathDigest).toBe(digestBranchPath(verified.events));
    expect(verified.checkpoint).toEqual({ kind: 'absent' });
  });

  it('digests the chain, not just the identities, so a relinked history differs', async () => {
    // Two histories with the SAME event ids, revisions and versions, whose
    // digest chain differs. If the path digest covered only identities
    // these would compare equal, and a candidate whose chain was relinked
    // underneath it would pass the determinism check unnoticed. Without
    // this row the digest-drops-the-chain mutant survives - every other
    // row varies the ids or the count as well.
    const base = await materializeBranchPath(reader(), head);
    const relinked = base.map((event) => ({
      ...event,
      eventDigest: `f${event.eventDigest.slice(1)}`,
      previousStreamEventDigest:
        event.previousStreamEventDigest === null
          ? null
          : `f${event.previousStreamEventDigest.slice(1)}`,
    }));

    expect(relinked.map((event) => event.eventId)).toEqual(
      base.map((event) => event.eventId),
    );
    expect(relinked.map((event) => event.streamRevision)).toEqual(
      base.map((event) => event.streamRevision),
    );
    expect(digestBranchPath(relinked)).not.toBe(digestBranchPath(base));
  });

  it('is deterministic: the same head verified twice is byte-identical', async () => {
    const first = await verify();
    const second = await verify();

    expect(second.pathDigest).toBe(first.pathDigest);
    expect(second.stateDigest).toBe(first.stateDigest);
    expect(second.events).toEqual(first.events);
    expect(second.state).toEqual(first.state);
  });

  it('refuses a reader that answers the same head differently twice', async () => {
    // Verification materialises TWICE and compares. A reader whose second
    // answer differs is not a slow reader, it is a reader that cannot be
    // replayed from - and a candidate built on it would activate history
    // nobody can reproduce.
    let call = 0;
    const flapping: IBranchSegmentReader<
      Awaited<ReturnType<ReturnType<typeof reader>['read']>>[number]
    > = {
      read: async (stream, segment) => {
        const events = await reader().read(stream, segment);
        call += 1;
        return call === 1 ? events : events.slice(0, -1);
      },
    };
    expect(
      await codeOfAsync(() =>
        verifyCandidatePath(flapping, head, {
          registry,
          projector: projector(),
        }),
      ),
    ).toBe('branch-integrity');
  });

  it('returns the same identities and digests widened as narrow', async () => {
    // The widening is a TYPE change: the runtime materialisation, and every
    // check it performs, must be untouched. Read the same head through the
    // narrow view and through the widened one and compare what the
    // resolver actually verifies.
    const widened = await materializeBranchPath(reader(), head);
    const narrow = await materializeBranchPath(
      {
        read: async (stream, segment) =>
          (await reader().read(stream, segment)).map((event) => ({
            eventId: event.eventId,
            branchId: event.branchId,
            streamRevision: event.streamRevision,
            eventVersion: event.eventVersion,
            previousStreamEventDigest: event.previousStreamEventDigest,
            eventDigest: event.eventDigest,
            entityRefs: event.entityRefs,
          })),
      },
      head,
    );

    expect(widened.map((event) => event.eventId)).toEqual(
      narrow.map((event) => event.eventId),
    );
    expect(widened.map((event) => event.eventDigest)).toEqual(
      narrow.map((event) => event.eventDigest),
    );
    expect(digestBranchPath(widened)).toBe(digestBranchPath(narrow));
    // And the widening is worth having: the narrow view carries no
    // eventType or payload, which is exactly what a projector needs.
    expect(widened[0].eventType).toBe('probe_damage');
    expect((narrow[0] as { eventType?: unknown }).eventType).toBeUndefined();
  });

  it('uses a compatible checkpoint and lands on the same state as full replay', async () => {
    const full = await verify();
    const prefixState: IProbeState = { damage: 3, seen: 2 };
    const offer = checkpointAt(2, prefixState);

    const recovered = await verify(offer);
    expect(recovered.checkpoint).toEqual({ kind: 'used' });
    // The equivalence that makes a checkpoint safe to trust at all.
    expect(recovered.state).toEqual(full.state);
    expect(recovered.stateDigest).toBe(full.stateDigest);
  });

  it('refuses an incompatible checkpoint, names why, and rebuilds by full replay', async () => {
    const full = await verify();
    const prefixState: IProbeState = { damage: 3, seen: 2 };

    for (const [label, offer] of [
      [
        'projectorVersion',
        mutateOffer(checkpointAt(2, prefixState), { projectorVersion: 2 }),
      ],
      [
        'schemaPipelineFingerprint',
        mutateOffer(checkpointAt(2, prefixState), {
          schemaPipelineFingerprint: 'other-pipeline',
        }),
      ],
      [
        'stateDigest',
        mutateOffer(checkpointAt(2, prefixState), {
          stateDigest: digestReplayCheckpointState({ damage: 999, seen: 9 }),
        }),
      ],
    ] as const) {
      const verified = await verify(offer);
      expect(verified.checkpoint.kind).toBe('refused');
      expect(
        (verified.checkpoint as { readonly reasons: readonly string[] })
          .reasons,
      ).toContain(label);
      // No state ever derives from a rejected cache: the result is the
      // full replay, identical to the one with no checkpoint at all.
      expect(verified.state).toEqual(full.state);
      expect(verified.stateDigest).toBe(full.stateDigest);
    }
  });

  it('refuses an identity-only offer outright rather than silently downgrading', async () => {
    // A caller that omits either digest expectation is asking for
    // identity-only compatibility, which the checkpoint contract says is
    // NOT verification. Accepting it and reporting `used` would be the
    // silent downgrade; falling back quietly would hide that the caller
    // asked for something unsafe. It is refused by name.
    const offer = checkpointAt(2, { damage: 3, seen: 2 });
    for (const field of ['sourceTailDigest', 'stateDigest'] as const) {
      const expected = { ...offer.expected } as Record<string, unknown>;
      delete expected[field];
      expect(
        await codeOfAsync(() =>
          verifyCandidatePath(reader(), head, {
            registry,
            projector: projector(),
            checkpoint: {
              ...offer,
              expected:
                expected as unknown as ICandidateCheckpointOffer['expected'],
            },
          }),
        ),
      ).toBe('branch-integrity');
    }
  });

  /** A checkpoint over the first `revision` events, with honest digests. */
  function checkpointAt(
    revision: number,
    state: IProbeState,
  ): ICandidateCheckpointOffer {
    const sourceTailDigest = `tail-${revision}`;
    const stateDigest = digestReplayCheckpointState(state);
    const metadata = createReplayCheckpointMetadata({
      streamId: STREAM.streamId,
      branchId: 'root',
      revision,
      schemaPipelineFingerprint: FINGERPRINT,
      projectorId: 'candidate.verification.probe',
      projectorVersion: 1,
      sourceTailDigest,
      stateDigest,
    });
    return {
      metadata,
      stateJson: JSON.stringify(state),
      expected: {
        streamId: STREAM.streamId,
        branchId: 'root',
        schemaPipelineFingerprint: FINGERPRINT,
        projectorId: 'candidate.verification.probe',
        projectorVersion: 1,
        sourceTailDigest,
        stateDigest,
      },
    };
  }

  /** Bend what the CURRENT pipeline expects, leaving the stored one alone. */
  function mutateOffer(
    offer: ICandidateCheckpointOffer,
    overrides: Partial<ICandidateCheckpointOffer['expected']>,
  ): ICandidateCheckpointOffer {
    return { ...offer, expected: { ...offer.expected, ...overrides } };
  }
});
