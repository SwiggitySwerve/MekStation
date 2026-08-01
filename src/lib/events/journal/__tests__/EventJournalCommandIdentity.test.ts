import type * as Journal from '../EventJournalContract';

import { EventJournalCanonicalizationError } from '../EventJournalCanonicalizer';
import { canonicalizeCommandIdentityV1 } from '../EventJournalCommandIdentity';

const command: Journal.IAppendEventBatch<{
  readonly path: readonly string[];
  readonly heat: number;
}> = {
  streamType: 'combat',
  streamId: 'session-7',
  expectedBranchId: 'root',
  expectedRevision: 2,
  commandId: 'command-7',
  principal: {
    actorKind: 'human',
    actorId: 'player-1',
    authorityType: 'game-host',
    authorityId: 'host-1',
  },
  events: [
    {
      eventId: 'event-7',
      eventType: 'UnitMoved',
      eventVersion: 1,
      correlationId: 'correlation-7',
      causationEventIds: ['cause-z', 'cause-a'],
      occurredAt: '2026-08-01T00:00:00.000Z',
      payload: { path: ['hex-b', 'hex-a'], heat: 3 },
      entityRefs: [
        { entityType: 'unit', entityId: 'b', role: 'target' },
        { entityType: 'pilot', entityId: 'z', role: 'subject' },
        { entityType: 'unit', entityId: 'a', role: 'subject' },
      ],
    },
  ],
};

describe('EventJournalCommandIdentity', () => {
  it('publishes fixed v1 bytes and digest with normalized sets', () => {
    const identity = canonicalizeCommandIdentityV1(command);

    expect(new TextDecoder().decode(identity.bytes)).toBe(
      '{"commandId":"command-7","events":[{"causationEventIds":["cause-a","cause-z"],"correlationId":"correlation-7","entityRefs":[{"entityId":"z","entityType":"pilot","role":"subject"},{"entityId":"a","entityType":"unit","role":"subject"},{"entityId":"b","entityType":"unit","role":"target"}],"eventId":"event-7","eventType":"UnitMoved","eventVersion":1,"occurredAt":"2026-08-01T00:00:00.000Z","payload":{"heat":3,"path":["hex-b","hex-a"]}}],"expectedBranchId":"root","expectedRevision":2,"principal":{"actorId":"player-1","actorKind":"human","authorityId":"host-1","authorityType":"game-host"},"streamId":"session-7","streamType":"combat"}',
    );
    expect(identity.digest).toBe(
      'f769f2537b81570d6d7e93bd779f7d554a766c7eb0ad0e75dab74477311998a3',
    );
    expect(identity.command.events[0].causationEventIds).toEqual([
      'cause-a',
      'cause-z',
    ]);
    expect(identity.command.events[0].entityRefs).toEqual([
      { entityType: 'pilot', entityId: 'z', role: 'subject' },
      { entityType: 'unit', entityId: 'a', role: 'subject' },
      { entityType: 'unit', entityId: 'b', role: 'target' },
    ]);
    expect(identity.command.events[0].payload.path).toEqual(['hex-b', 'hex-a']);
    expect(command.events[0].causationEventIds).toEqual(['cause-z', 'cause-a']);
  });

  it('stabilizes reordered sets but preserves ordered payload identity', () => {
    const reversedSets = {
      ...command,
      events: [
        {
          ...command.events[0],
          causationEventIds: [...command.events[0].causationEventIds].reverse(),
          entityRefs: [...command.events[0].entityRefs].reverse(),
        },
      ],
    };
    const reversedPath = {
      ...command,
      events: [
        {
          ...command.events[0],
          payload: {
            ...command.events[0].payload,
            path: [...command.events[0].payload.path].reverse(),
          },
        },
      ],
    };

    expect(canonicalizeCommandIdentityV1(reversedSets).digest).toBe(
      canonicalizeCommandIdentityV1(command).digest,
    );
    expect(canonicalizeCommandIdentityV1(reversedPath).digest).not.toBe(
      canonicalizeCommandIdentityV1(command).digest,
    );
  });

  it('isolates and freezes the normalized command behind its digest', () => {
    const mutable = JSON.parse(JSON.stringify(command)) as {
      events: Array<{ payload: { path: string[] } }>;
    } & Journal.IAppendEventBatch<{ path: string[]; heat: number }>;
    const identity = canonicalizeCommandIdentityV1(mutable);

    mutable.events[0].payload.path.push('caller-mutation');
    expect(identity.command.events[0].payload.path).toEqual(['hex-b', 'hex-a']);
    expect(Object.isFrozen(identity.command.events[0].payload.path)).toBe(true);
    expect(() =>
      identity.command.events[0].payload.path.push('result-mutation'),
    ).toThrow(TypeError);
    expect(identity.digest).toBe(
      'f769f2537b81570d6d7e93bd779f7d554a766c7eb0ad0e75dab74477311998a3',
    );
  });

  it.each([
    { causationEventIds: ['cause-a', 'cause-a'] },
    {
      entityRefs: [
        command.events[0].entityRefs[0],
        command.events[0].entityRefs[0],
      ],
    },
  ])(
    'rejects duplicate set entries before producing identity',
    (eventFields) => {
      expect(() =>
        canonicalizeCommandIdentityV1({
          ...command,
          events: [{ ...command.events[0], ...eventFields }],
        }),
      ).toThrow(EventJournalCanonicalizationError);
    },
  );
});
