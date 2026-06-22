import type {
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
} from '@/types/interventions';

import { InterventionLedger } from '../InterventionLedger';

interface CounterState {
  readonly value: number;
}

interface TestPrivateMetadata {
  readonly reason: string;
  readonly hiddenNotes: string;
}

interface TestPublicEffect {
  readonly summary: string;
  readonly changedStateRefs: readonly string[];
}

interface TestDomainPayload {
  readonly delta: number;
}

const makeRecord = (
  overrides: Partial<
    IInterventionLedgerRecord<
      TestPrivateMetadata,
      TestPublicEffect,
      TestDomainPayload
    >
  > = {},
): IInterventionLedgerRecord<
  TestPrivateMetadata,
  TestPublicEffect,
  TestDomainPayload
> => ({
  id: 'gm-int-1',
  domain: 'combat',
  kind: 'fix',
  status: 'approved',
  actorId: 'gm-1',
  targetRefs: ['unit-1'],
  causedBy: ['event-prior'],
  supersedes: ['event-old-damage'],
  privateMetadata: {
    reason: 'Correct missed armor damage.',
    hiddenNotes: 'NPC ambush remains hidden.',
  },
  publicEffect: {
    summary: 'Unit armor corrected.',
    changedStateRefs: ['unit-1'],
  },
  domainPayload: {
    delta: 2,
  },
  createdAt: '2026-06-20T00:00:00.000Z',
  approvedAt: '2026-06-20T00:01:00.000Z',
  ...overrides,
});

const combatImplementer: IInterventionLedgerImplementer<
  IInterventionLedgerCommand<TestDomainPayload>,
  CounterState,
  TestPrivateMetadata,
  TestPublicEffect,
  TestDomainPayload
> = {
  domain: 'combat',
  preview(
    command,
  ): IInterventionLedgerPreview<
    TestPrivateMetadata,
    TestPublicEffect,
    TestDomainPayload
  > {
    return {
      domain: command.domain,
      kind: command.kind,
      status: 'ready',
      actorId: command.actorId,
      targetRefs: command.targetRefs,
      causedBy: command.causedBy,
      supersedes: command.supersedes,
      privateMetadata: {
        reason: 'GM preview reason',
        hiddenNotes: 'GM-only note',
      },
      publicEffect: {
        summary: 'Public preview summary',
        changedStateRefs: command.targetRefs,
      },
      domainPayload: command.payload,
      projectedEvents: [],
      conflicts: [],
    };
  },
  apply(record, state): CounterState {
    return {
      value: state.value + (record.domainPayload?.delta ?? 0),
    };
  },
  projectPublic(record): TestPublicEffect {
    return {
      summary: record.publicEffect.summary,
      changedStateRefs: record.publicEffect.changedStateRefs,
    };
  },
  projectPrivate(record): TestPrivateMetadata {
    return record.privateMetadata;
  },
};

describe('InterventionLedger', () => {
  it('routes registered domains through their implementer', () => {
    const ledger = new InterventionLedger<CounterState>().register(
      combatImplementer,
    );

    const command: IInterventionLedgerCommand<TestDomainPayload> = {
      domain: 'combat',
      kind: 'fix',
      actorId: 'gm-1',
      targetRefs: ['unit-1'],
      payload: { delta: 3 },
      causedBy: ['event-prior'],
      supersedes: ['event-old-damage'],
    };

    const preview = ledger.preview(command, { value: 1 });
    expect(preview.status).toBe('ready');
    expect(preview.domain).toBe('combat');
    expect(preview.publicEffect).toEqual({
      summary: 'Public preview summary',
      changedStateRefs: ['unit-1'],
    });

    const record = makeRecord({ domainPayload: { delta: 3 } });
    const result = ledger.apply(record, { value: 1 });

    expect(result.status).toBe('applied');
    if (result.status === 'applied') {
      expect(result.state).toEqual({ value: 4 });
    }
  });

  it('returns explicit unsupported results for unregistered domains without mutating state', () => {
    const ledger = new InterventionLedger<CounterState>();
    const state = { value: 7 };

    const preview = ledger.preview(
      {
        domain: 'economy',
        kind: 'undo',
        actorId: 'gm-1',
        targetRefs: ['merchant-tx-1'],
      },
      state,
    );

    expect(preview).toMatchObject({
      domain: 'economy',
      kind: 'undo',
      status: 'unsupported',
      actorId: 'gm-1',
      targetRefs: ['merchant-tx-1'],
    });
    expect(preview.reason).toContain('economy');

    const result = ledger.apply(makeRecord({ domain: 'economy' }), state);

    expect(result).toMatchObject({
      status: 'unsupported',
      domain: 'economy',
      state,
    });
    expect(result.state).toBe(state);
  });

  it('appends approved records without truncating prior causality references', () => {
    const ledger = new InterventionLedger<CounterState>();
    const record = makeRecord();

    ledger.appendApprovedRecord(record);
    const records = ledger.getRecords();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 'gm-int-1',
      causedBy: ['event-prior'],
      supersedes: ['event-old-damage'],
    });
    expect(records[0]).toBe(record);
  });

  it('rejects non-approved records from the append-only approved ledger path', () => {
    const ledger = new InterventionLedger<CounterState>();
    const record = makeRecord({ status: 'previewed' });

    expect(() => ledger.appendApprovedRecord(record)).toThrow(
      /Cannot append intervention record/,
    );
    expect(ledger.getRecords()).toEqual([]);
  });

  it('projects the same record differently for public and private viewers', () => {
    const ledger = new InterventionLedger<CounterState>().register(
      combatImplementer,
    );
    const record = makeRecord();

    expect(ledger.project<TestPublicEffect>(record, 'public')).toEqual({
      summary: 'Unit armor corrected.',
      changedStateRefs: ['unit-1'],
    });
    expect(ledger.project<TestPrivateMetadata>(record, 'private')).toEqual({
      reason: 'Correct missed armor damage.',
      hiddenNotes: 'NPC ambush remains hidden.',
    });
  });
});
