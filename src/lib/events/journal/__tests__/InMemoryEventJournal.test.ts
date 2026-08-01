import type * as Journal from '../EventJournalContract';

import { canonicalizeEventDigestV1 } from '../EventJournalCanonicalizer';
import { InMemoryEventJournal } from '../InMemoryEventJournal';

interface Payload {
  readonly value: string;
}
type MutableSnapshot = {
  highWaterCommitPosition: number;
  events: Array<Record<string, unknown>>;
  receipts: Array<Record<string, unknown>>;
  heads: Array<Record<string, unknown>>;
};
const principal = {
  actorKind: 'human',
  actorId: 'player-1',
  authorityType: 'test-host',
  authorityId: 'host-1',
} as const;
const recordedAt = '2026-08-01T12:34:56.000Z';
function committed(
  result: Journal.EventJournalAppendResult<Payload>,
): Journal.ICommittedEventBatch<Payload> {
  if (result.kind !== 'committed') throw new Error(`Expected ${result.kind}`);
  return result;
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing snapshot fixture value');
  return value;
}
function change(
  values: Array<Record<string, unknown>>,
  index: number,
  fields: Record<string, unknown>,
): void {
  Object.assign(required(values[index]), fields);
}
describe('InMemoryEventJournal', () => {
  let journal: InMemoryEventJournal<Payload>;
  let identity: number;
  beforeEach(() => {
    journal = new InMemoryEventJournal(() => recordedAt);
    identity = 1;
  });
  function command(
    streamId: string,
    expectedRevision: number,
    count = 1,
    streamType = 'test',
  ): Journal.IAppendEventBatch<Payload> {
    const commandId = `command-${identity++}`;
    return {
      streamType,
      streamId,
      expectedBranchId: 'root',
      expectedRevision,
      commandId,
      principal,
      events: Array.from({ length: count }, (_unused, index) => ({
        eventId: `${commandId}-event-${index}`,
        eventType: 'TestEvent',
        eventVersion: 1,
        correlationId: `correlation-${streamId}`,
        causationEventIds: [],
        occurredAt: '2026-08-01T00:00:00.000Z',
        payload: { value: `${streamId}-${index}` },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
        ],
      })),
    };
  }
  async function append(streamId: string, revision: number, count = 1) {
    return committed(await journal.append(command(streamId, revision, count)));
  }

  function readPage(after: number, through: number, limit: number) {
    return journal.readCommitted({
      afterCommitPosition: after,
      throughCommitPosition: through,
      limit,
    });
  }

  function withEvent(
    input: Journal.IAppendEventBatch<Payload>,
    changes: Partial<Journal.IEventToAppend<Payload>>,
  ) {
    return { ...input, events: [{ ...input.events[0], ...changes }] };
  }

  it('commits canonical ordered chains with independent expected heads', async () => {
    const first = await append('alpha', 0, 2);
    expect(first.events.map((event) => event.streamRevision)).toEqual([1, 2]);
    expect(first.receipt.recordedAt).toBe(recordedAt);
    expect(first.events[0].previousStreamEventDigest).toBeNull();
    const head = first.events[1];
    expect(head.previousStreamEventDigest).toBe(first.events[0].eventDigest);
    for (const event of first.events) {
      expect(canonicalizeEventDigestV1(event).digest).toBe(event.eventDigest);
    }
    const next = (await append('alpha', 2)).events[0];
    expect(next.streamRevision).toBe(3);
    expect(next.previousStreamEventDigest).toBe(head.eventDigest);
    const stale = await journal.append(command('alpha', 0));
    expect(stale.kind).toBe('revision-conflict');
    expect((await append('beta', 0)).events[0].streamRevision).toBe(1);
  });

  it('normalizes retries, copies values, and queries linked history', async () => {
    const base = command('alpha', 0);
    const refs = [
      { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
      { entityType: 'unit', entityId: 'unit-1', role: 'target' },
    ];
    const input = withEvent(base, {
      causationEventIds: ['cause-b', 'cause-a'],
      entityRefs: refs,
    });
    const original = committed(await journal.append(input));
    expect(original.events[0].causationEventIds).toEqual([
      'cause-a',
      'cause-b',
    ]);
    expect(original.events[0].entityRefs).toEqual(refs);
    const reordered = withEvent(input, {
      causationEventIds: ['cause-a', 'cause-b'],
      entityRefs: [...refs].reverse(),
    });
    expect(await journal.append(input)).toEqual(original);
    expect(await journal.append(reordered)).toEqual(original);
    const changed = withEvent(input, {
      payload: { value: 'changed' },
    });
    const conflict = await journal.append(changed);
    expect(conflict.kind).toBe('command-identity-conflict');
    (original.events[0].payload as { value: string }).value = 'tampered';
    const stored = (await readPage(0, 1, 1)).events[0];
    expect(stored.payload.value).toBe('alpha-0');

    const range = {
      afterCommitPosition: 0,
      throughCommitPosition: 1,
      limit: 10,
    };
    expect(
      await journal.readEntityHistory({
        ...range,
        entityType: 'unit',
        entityId: 'unit-1',
      }),
    ).toEqual([stored]);
    const selectors: Journal.EventHistorySelector[] = [
      { kind: 'authority', authorityType: 'test-host', authorityId: 'host-1' },
      { kind: 'correlation', id: 'correlation-alpha' },
      { kind: 'causation', id: 'cause-a' },
    ];
    for (const selector of selectors) {
      const history = await journal.readEventHistory({ ...range, selector });
      expect(history).toEqual([stored]);
    }
  });

  it('rejects duplicate event identities without partial publication', async () => {
    const first = await append('alpha', 0);
    const duplicate = command('alpha', 1);
    const collision = withEvent(duplicate, {
      eventId: first.events[0].eventId,
    });
    await expect(journal.append(collision)).rejects.toThrow();
    expect(await journal.getCommandReceipt(duplicate.commandId)).toBeNull();
    expect((await readPage(0, 10, 10)).events).toEqual(first.events);
  });

  it('rolls back a failed batch while retaining its position gap', async () => {
    const committed = await append('alpha', 0);
    journal.failNextCommit();
    const failed = command('alpha', 1, 2);
    await expect(journal.append(failed)).rejects.toThrow();
    expect(await journal.getCommandReceipt(failed.commandId)).toBeNull();
    const through = (await journal.captureHighWater()).commitPosition;
    const page = await readPage(0, through, 10);
    expect(page.events).toEqual(committed.events);
    expect(page.nextAfterCommitPosition).toBe(3);
    expect(page.exhausted).toBe(true);
    const recovered = (await append('alpha', 1)).events[0];
    expect(recovered.streamRevision).toBe(2);
    expect(recovered.commitPosition).toBe(4);
  });

  it('validates advancing pages and captures a safe high-water barrier', async () => {
    await append('alpha', 0, 3);
    await expect(readPage(2, 1, 1)).rejects.toThrow();
    const through = (await journal.captureHighWater()).commitPosition;
    const first = await readPage(0, through, 2);
    expect(first.nextAfterCommitPosition).toBe(2);
    expect(first.exhausted).toBe(false);

    const gate = journal.holdNextCommit();
    const lower = journal.append(command('alpha', 3));
    await gate.entered;
    let captured = false;
    const capture = journal.captureHighWater().then((value) => {
      captured = true;
      return value;
    });
    await Promise.resolve();
    expect(captured).toBe(false);
    gate.release();
    await lower;
    const boundary = (await capture).commitPosition;
    await append('alpha', 4);
    expect((await readPage(0, boundary, 10)).events).toHaveLength(4);
  });

  it('restores validated history and appends from the recovered head', async () => {
    const alpha = await append('alpha', 0, 2);
    await append('beta', 0);
    journal.failNextCommit();
    await expect(journal.append(command('alpha', 2, 2))).rejects.toThrow();
    const highWater = await journal.captureHighWater();
    const before = await readPage(0, highWater.commitPosition, 10);
    journal = InMemoryEventJournal.fromSnapshotForTesting(
      await journal.exportSnapshotForTesting(),
      () => recordedAt,
    );

    expect(
      await journal.readStream({
        streamType: 'test',
        streamId: 'alpha',
        branchId: 'root',
        afterRevision: 0,
        limit: 10,
      }),
    ).toEqual(alpha.events);
    expect(
      await journal.readEntityHistory({
        afterCommitPosition: 0,
        throughCommitPosition: highWater.commitPosition,
        limit: 10,
        entityType: 'unit',
        entityId: 'unit-1',
      }),
    ).toEqual(before.events);
    expect(
      await journal.readEventHistory({
        afterCommitPosition: 0,
        throughCommitPosition: highWater.commitPosition,
        limit: 10,
        selector: { kind: 'correlation', id: 'correlation-alpha' },
      }),
    ).toEqual(alpha.events);
    expect(await journal.getCommandReceipt(alpha.receipt.commandId)).toEqual(
      alpha.receipt,
    );

    const suffix = await append('alpha', 2);
    expect(suffix.events[0].streamRevision).toBe(3);
    expect(suffix.events[0].commitPosition).toBe(6);
    expect(suffix.events[0].previousStreamEventDigest).toBe(
      alpha.events[1].eventDigest,
    );
  });

  it('rejects corrupted restart state before returning an adapter', async () => {
    const initial = command('alpha', 0, 2, 'test\u0000suffix');
    committed(
      await journal.append({
        ...initial,
        events: initial.events.map((event) => ({
          ...event,
          causationEventIds: ['cause-b', 'cause-a'],
          entityRefs: [
            { entityType: 'unit', entityId: 'unit-2', role: 'target' },
            { entityType: 'pilot', entityId: 'pilot-1', role: 'subject' },
          ],
        })),
      }),
    );
    await append('beta', 0);
    const serialized = await journal.exportSnapshotForTesting();
    expect(() => InMemoryEventJournal.fromSnapshotForTesting('{')).toThrow();
    const legacy = JSON.parse(serialized) as { version: number };
    legacy.version = 1;
    expect(() =>
      InMemoryEventJournal.fromSnapshotForTesting(JSON.stringify(legacy)),
    ).toThrow();
    const corruptions: Array<(snapshot: MutableSnapshot) => void> = [
      (snapshot) => change(snapshot.events, 0, { eventDigest: '0'.repeat(64) }),
      (snapshot) =>
        change(snapshot.events, 1, { previousStreamEventDigest: null }),
      (snapshot) => change(snapshot.events, 1, { streamRevision: 4 }),
      (snapshot) =>
        change(snapshot.events, 1, {
          eventId: required(snapshot.events[0]).eventId,
        }),
      (snapshot) =>
        change(snapshot.events, 1, {
          commitPosition: required(snapshot.events[0]).commitPosition,
        }),
      (snapshot) =>
        change(snapshot.events, 0, {
          causationEventIds: [
            ...(required(snapshot.events[0]).causationEventIds as string[]),
          ].reverse(),
        }),
      (snapshot) =>
        change(snapshot.events, 0, {
          entityRefs: [
            ...(required(snapshot.events[0]).entityRefs as Record<
              string,
              unknown
            >[]),
          ].reverse(),
        }),
      (snapshot) => snapshot.events.pop(),
      (snapshot) =>
        change(snapshot.receipts, 0, { commandDigest: 'f'.repeat(64) }),
      (snapshot) => change(snapshot.heads, 0, { revision: 99 }),
      (snapshot) =>
        change(snapshot.heads, 0, {
          streamType: 'test',
          streamId: 'suffix\u0000alpha',
        }),
      (snapshot) => Object.assign(snapshot, { highWaterCommitPosition: 0 }),
      (snapshot) =>
        snapshot.receipts.push(
          JSON.parse(JSON.stringify(required(snapshot.receipts[0]))) as Record<
            string,
            unknown
          >,
        ),
    ];
    for (const corrupt of corruptions) {
      const snapshot = JSON.parse(serialized) as MutableSnapshot;
      corrupt(snapshot);
      expect(() =>
        InMemoryEventJournal.fromSnapshotForTesting(JSON.stringify(snapshot)),
      ).toThrow();
    }
  });
});
