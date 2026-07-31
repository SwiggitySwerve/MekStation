import { describe, expect, it } from '@jest/globals';

import {
  ROOT_EVENT_BRANCH_ID,
  type IAppendEventBatch,
  type IAppendEventCommand,
  type IEventToAppend,
} from '../EventJournalContract';
import {
  AppendEventBatchSchema,
  AppendEventCommandSchema,
  ReadCommittedQuerySchema,
  ReadEntityHistoryQuerySchema,
  ReadEventHistoryQuerySchema,
  ReadStreamQuerySchema,
  StoredEventSchema,
} from '../EventJournalSchemas';

const digest = 'a'.repeat(64);
const prohibitedClientFields = [
  'principal',
  'actorKind',
  'actorId',
  'authorityType',
  'authorityId',
  'branchId',
  'streamRevision',
  'commitPosition',
  'commandIndex',
  'recordedAt',
  'canonicalizerVersion',
  'previousStreamEventDigest',
  'eventDigest',
  'receipt',
  'commandDigest',
  'eventCount',
  'firstStreamRevision',
  'lastStreamRevision',
  'firstCommitPosition',
  'lastCommitPosition',
] as const;
const event: IEventToAppend<{ readonly unitId: string }> = {
  eventId: 'event-1',
  eventType: 'unit.customized',
  eventVersion: 1,
  correlationId: 'correlation-1',
  causationEventIds: [],
  occurredAt: '2026-07-31T12:00:00.000Z',
  payload: { unitId: 'unit-1' },
  entityRefs: [{ entityType: 'unit', entityId: 'unit-1', role: 'subject' }],
};
const command: IAppendEventCommand = {
  streamType: 'unit',
  streamId: 'unit-1',
  expectedBranchId: ROOT_EVENT_BRANCH_ID,
  expectedRevision: 0,
  commandId: 'command-1',
  events: [event],
};
const batch: IAppendEventBatch = {
  ...command,
  principal: {
    actorKind: 'human',
    actorId: 'player-1',
    authorityType: 'campaign-host',
    authorityId: 'campaign-1',
  },
};
describe('event journal command boundaries', () => {
  it('accepts an untrusted command without server-owned fields', () => {
    expect(AppendEventCommandSchema.parse(command)).toEqual(command);
    expect(AppendEventBatchSchema.parse(batch)).toEqual(batch);
  });
  it.each(prohibitedClientFields)('rejects caller-assigned %s', (field) => {
    expect(
      AppendEventCommandSchema.safeParse({ ...command, [field]: 'caller' })
        .success,
    ).toBe(false);
    expect(
      AppendEventCommandSchema.safeParse({
        ...command,
        events: [{ ...event, [field]: 'caller' }],
      }).success,
    ).toBe(false);
  });
  it.each([
    [{ ...command, streamId: '' }],
    [{ ...command, expectedBranchId: 'fork-1' }],
    [{ ...command, expectedRevision: -1 }],
    [{ ...command, events: [{ ...event, eventVersion: 0 }] }],
  ])('rejects an invalid command identity or version', (candidate) => {
    expect(AppendEventCommandSchema.safeParse(candidate).success).toBe(false);
  });
  it.each([
    [{ ...batch, principal: { ...batch.principal, actorId: '' } }],
    [{ ...batch, principal: { ...batch.principal, authorityType: '' } }],
    [{ ...batch, principal: { ...batch.principal, actorKind: 'service' } }],
    [{ ...command, principal: { actorKind: 'human', actorId: 'player-1' } }],
  ])('rejects ambiguous or incomplete stored provenance', (candidate) => {
    expect(AppendEventBatchSchema.safeParse(candidate).success).toBe(false);
  });
});
describe('event journal stored and read boundaries', () => {
  it('accepts a complete stored event envelope', () => {
    expect(
      StoredEventSchema.safeParse({
        ...event,
        ...batch.principal,
        streamType: 'unit',
        streamId: 'unit-1',
        branchId: ROOT_EVENT_BRANCH_ID,
        streamRevision: 1,
        commitPosition: 1,
        commandId: 'command-1',
        commandIndex: 0,
        recordedAt: '2026-07-31T12:00:01.000Z',
        canonicalizerVersion: 1,
        previousStreamEventDigest: null,
        eventDigest: digest,
      }).success,
    ).toBe(true);
  });
  it.each([
    [{ afterCommitPosition: -1, throughCommitPosition: 2, limit: 10 }],
    [{ afterCommitPosition: 3, throughCommitPosition: 2, limit: 10 }],
    [
      {
        afterCommitPosition: Number.MAX_SAFE_INTEGER + 1,
        throughCommitPosition: Number.MAX_SAFE_INTEGER + 1,
        limit: 10,
      },
    ],
    [{ afterCommitPosition: 0, throughCommitPosition: 2, limit: 0 }],
    [{ afterCommitPosition: 0, throughCommitPosition: 2, limit: 501 }],
    [{ afterCommitPosition: 0, throughCommitPosition: 2, limit: 1.5 }],
  ])('rejects invalid catch-up cursor bounds', (candidate) => {
    expect(ReadCommittedQuerySchema.safeParse(candidate).success).toBe(false);
  });
  it('validates bounded stream and entity-history queries', () => {
    const committedWindow = {
      afterCommitPosition: 0,
      throughCommitPosition: 8,
      limit: 50,
    };
    expect(
      ReadStreamQuerySchema.safeParse({
        streamType: 'unit',
        streamId: 'unit-1',
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision: 0,
        limit: 500,
      }).success,
    ).toBe(true);
    expect(
      ReadEntityHistoryQuerySchema.safeParse({
        entityType: 'unit',
        entityId: 'unit-1',
        ...committedWindow,
      }).success,
    ).toBe(true);
    for (const selector of [
      {
        kind: 'authority',
        authorityType: 'campaign-host',
        authorityId: 'campaign-1',
      },
      { kind: 'correlation', id: 'correlation-1' },
      { kind: 'causation', id: 'event-1' },
    ]) {
      expect(
        ReadEventHistoryQuerySchema.safeParse({
          selector,
          ...committedWindow,
        }).success,
      ).toBe(true);
    }
  });
});
type ClientStoredFields = Extract<
  keyof IAppendEventCommand | keyof IEventToAppend,
  (typeof prohibitedClientFields)[number]
>;
const clientStoredFieldsExcluded: ClientStoredFields extends never
  ? true
  : false = true;

void clientStoredFieldsExcluded;
