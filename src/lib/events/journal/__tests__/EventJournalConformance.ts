import type * as Journal from '../EventJournalContract';

import { canonicalizeEventDigestV1 } from '../EventJournalCanonicalizer';

type Payload = Readonly<{ value: string }>;

export interface IEventJournalConformanceHarness {
  current(): Journal.IEventJournal<Payload>;
  /** Close the current adapter and open a new instance on the same state. */
  restart(): Promise<void>;
  /** Fail after writes are staged or positions reserved, before commit. */
  failNextCommitAfterWrites(): void;
  /** Prove no orphan event, index, receipt, or head state is present. */
  assertStorageConsistent(): Promise<void>;
  dispose(): Promise<void>;
}

const principal = {
  actorKind: 'human',
  actorId: 'player-1',
  authorityType: 'test-host',
  authorityId: 'host-1',
} as const;

export function defineEventJournalConformance(
  adapterName: string,
  createHarness: () =>
    | IEventJournalConformanceHarness
    | Promise<IEventJournalConformanceHarness>,
): void {
  describe(`${adapterName} event journal conformance`, () => {
    let harness: IEventJournalConformanceHarness;
    let identity: number;

    beforeEach(async () => {
      harness = await createHarness();
      identity = 1;
    });
    afterEach(async () => harness.dispose());

    function command(
      streamId: string,
      expectedRevision: number,
      count = 1,
    ): Journal.IAppendEventBatch<Payload> {
      const commandId = `command-${identity++}`;
      return {
        streamType: 'test',
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
          causationEventIds: ['origin-event'],
          occurredAt: '2026-08-01T00:00:00.000Z',
          payload: { value: `${streamId}-${index}` },
          entityRefs: [
            { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
          ],
        })),
      };
    }

    async function committed(input: Journal.IAppendEventBatch<Payload>) {
      const result = await harness.current().append(input);
      if (result.kind !== 'committed') {
        throw new Error(`Expected committed, received ${result.kind}`);
      }
      return result;
    }

    function range(throughCommitPosition: number) {
      return { afterCommitPosition: 0, throughCommitPosition, limit: 20 };
    }

    async function expectOnlyAlpha(
      expected: readonly Journal.IStoredEvent<Payload>[],
    ): Promise<void> {
      const highWater = await harness.current().captureHighWater();
      const bounds = range(highWater.commitPosition);
      expect((await harness.current().readCommitted(bounds)).events).toEqual(
        expected,
      );
      expect(
        await harness.current().readStream({
          streamType: 'test',
          streamId: 'alpha',
          branchId: 'root',
          afterRevision: 0,
          limit: 20,
        }),
      ).toEqual(expected);
      expect(
        await harness.current().readEntityHistory({
          ...bounds,
          entityType: 'unit',
          entityId: 'unit-1',
        }),
      ).toEqual(expected);
      expect(
        await harness.current().readEventHistory({
          ...bounds,
          selector: { kind: 'causation', id: 'origin-event' },
        }),
      ).toEqual(expected);
      await harness.assertStorageConsistent();
    }

    it('recovers ordered chains, indexes, receipts, and a bounded high-water view', async () => {
      const alphaInput = command('alpha', 0, 2);
      const alpha = await committed(alphaInput);
      const beta = await committed(command('beta', 0));
      const expected = [...alpha.events, ...beta.events];
      const highWater = await harness.current().captureHighWater();
      const before = await harness
        .current()
        .readCommitted(range(highWater.commitPosition));
      expect(before.events).toEqual(expected);
      expected
        .slice(1)
        .forEach((event, index) =>
          expect(event.commitPosition).toBeGreaterThan(
            expected[index].commitPosition,
          ),
        );
      expect(Number.isSafeInteger(highWater.commitPosition)).toBe(true);
      expect(highWater.commitPosition).toBeGreaterThanOrEqual(0);
      const previousInstance = harness.current();
      await harness.restart();

      expect(harness.current()).not.toBe(previousInstance);
      expect(await harness.current().captureHighWater()).toEqual(highWater);
      expect(alpha.events.map((event) => event.streamRevision)).toEqual([1, 2]);
      expect(alpha.events[0].previousStreamEventDigest).toBeNull();
      expect(alpha.events[1].previousStreamEventDigest).toBe(
        alpha.events[0].eventDigest,
      );
      expect(beta.events[0].streamRevision).toBe(1);
      expect(beta.events[0].previousStreamEventDigest).toBeNull();
      expect(
        await harness.current().readStream({
          streamType: 'test',
          streamId: 'alpha',
          branchId: 'root',
          afterRevision: 0,
          limit: 10,
        }),
      ).toEqual(alpha.events);
      expect(
        await harness.current().readEntityHistory({
          ...range(highWater.commitPosition),
          entityType: 'unit',
          entityId: 'unit-1',
        }),
      ).toEqual(before.events);
      expect(
        await harness.current().readEventHistory({
          ...range(highWater.commitPosition),
          selector: { kind: 'causation', id: 'origin-event' },
        }),
      ).toEqual(before.events);
      expect(
        await harness.current().getCommandReceipt(alpha.receipt.commandId),
      ).toEqual(alpha.receipt);
      const retry = JSON.parse(JSON.stringify(alphaInput)) as typeof alphaInput;
      expect(await harness.current().append(retry)).toEqual(alpha);
      const changedRetry = {
        ...retry,
        events: [{ ...retry.events[0], payload: { value: 'changed' } }],
      };
      expect((await harness.current().append(changedRetry)).kind).toBe(
        'command-identity-conflict',
      );
      expect(await harness.current().captureHighWater()).toEqual(highWater);
      for (const event of expected) {
        expect(canonicalizeEventDigestV1(event).digest).toBe(event.eventDigest);
      }

      const suffix = await committed(command('alpha', 2));
      expect(suffix.events[0].streamRevision).toBe(3);
      expect(suffix.events[0].previousStreamEventDigest).toBe(
        alpha.events[1].eventDigest,
      );
      expect(canonicalizeEventDigestV1(suffix.events[0]).digest).toBe(
        suffix.events[0].eventDigest,
      );
      const first = await harness.current().readCommitted({
        ...range(highWater.commitPosition),
        limit: 2,
      });
      const final = await harness.current().readCommitted({
        ...range(highWater.commitPosition),
        afterCommitPosition: first.nextAfterCommitPosition,
      });
      expect(first.exhausted).toBe(false);
      expect([...first.events, ...final.events]).toEqual(expected);
      expect(final.nextAfterCommitPosition).toBe(highWater.commitPosition);
      expect(final.exhausted).toBe(true);
    });

    it('preserves exact retries while rejecting command and event identity collisions', async () => {
      const input = command('alpha', 0);
      const first = await committed(input);
      expect(await harness.current().append(input)).toEqual(first);
      const changed = {
        ...input,
        events: [{ ...input.events[0], payload: { value: 'changed' } }],
      };
      expect((await harness.current().append(changed)).kind).toBe(
        'command-identity-conflict',
      );
      await expectOnlyAlpha(first.events);

      const stale = command('alpha', 0);
      expect(await harness.current().append(stale)).toEqual({
        kind: 'revision-conflict',
        expectedRevision: 0,
        actualRevision: 1,
      });
      expect(
        await harness.current().getCommandReceipt(stale.commandId),
      ).toBeNull();
      await expectOnlyAlpha(first.events);

      const duplicate = command('alpha', 1);
      const duplicateEvent = {
        ...duplicate,
        events: [{ ...duplicate.events[0], eventId: first.events[0].eventId }],
      };
      await expect(harness.current().append(duplicateEvent)).rejects.toThrow();
      expect(
        await harness.current().getCommandReceipt(duplicate.commandId),
      ).toBeNull();
      await expectOnlyAlpha(first.events);

      const repeated = command('alpha', 1, 2);
      const repeatedEventId = repeated.events[0].eventId;
      const duplicateWithinBatch = {
        ...repeated,
        events: [
          repeated.events[0],
          { ...repeated.events[1], eventId: repeatedEventId },
        ],
      };
      await expect(
        harness.current().append(duplicateWithinBatch),
      ).rejects.toThrow();
      expect(
        await harness.current().getCommandReceipt(repeated.commandId),
      ).toBeNull();
      await expectOnlyAlpha(first.events);

      const suffix = await committed(command('alpha', 1));
      expect(suffix.events[0].streamRevision).toBe(2);
      expect(suffix.events[0].previousStreamEventDigest).toBe(
        first.events[0].eventDigest,
      );
    });

    it('rolls back failed commits and rejects invalid high-water bounds', async () => {
      const first = await committed(command('alpha', 0));
      harness.failNextCommitAfterWrites();
      const failed = command('alpha', 1, 2);
      await expect(harness.current().append(failed)).rejects.toThrow();
      expect(
        await harness.current().getCommandReceipt(failed.commandId),
      ).toBeNull();
      await expectOnlyAlpha(first.events);

      const recovered = await committed(command('alpha', 1));
      expect(recovered.events[0].streamRevision).toBe(2);
      expect(recovered.events[0].previousStreamEventDigest).toBe(
        first.events[0].eventDigest,
      );
      expect(recovered.events[0].commitPosition).toBeGreaterThan(
        first.events[0].commitPosition,
      );
      const highWater = await harness.current().captureHighWater();
      const valid = {
        afterCommitPosition: 0,
        throughCommitPosition: highWater.commitPosition,
        limit: 1,
      };
      const invalid = [
        { ...valid, afterCommitPosition: -1 },
        { ...valid, afterCommitPosition: 0.5 },
        {
          ...valid,
          afterCommitPosition: Number.MAX_SAFE_INTEGER + 1,
        },
        { ...valid, throughCommitPosition: -1 },
        { ...valid, throughCommitPosition: 0.5 },
        {
          ...valid,
          throughCommitPosition: Number.MAX_SAFE_INTEGER + 1,
        },
        { ...valid, limit: 0 },
        { ...valid, limit: 501 },
        { ...valid, limit: 1.5 },
        { ...valid, limit: Number.MAX_SAFE_INTEGER + 1 },
        {
          afterCommitPosition: 2,
          throughCommitPosition: 1,
          limit: 1,
        },
      ];
      for (const query of invalid) {
        await expect(harness.current().readCommitted(query)).rejects.toThrow();
      }
    });
  });
}
