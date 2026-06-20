import type {
  IGmAuthorityContext,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
} from '@/types/interventions';

import {
  approveGmCascadePreview,
  cancelGmCascadePreview,
  createGmCascadePreview,
} from '../GmCascadePreviewPipeline';
import { InterventionLedger } from '../InterventionLedger';

interface TestEvent {
  readonly id: string;
  readonly type: string;
  readonly delta?: number;
}

interface TestState {
  readonly value: number;
  readonly events: readonly TestEvent[];
}

interface TestPayload {
  readonly delta: number;
  readonly conflict?: boolean;
}

interface TestDomainPayload {
  readonly delta: number;
  readonly projectedEvents: readonly TestEvent[];
}

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  ownedStateRefs: ['game:game-1'],
};

const makeState = (): TestState => ({
  value: 10,
  events: [
    { id: 'player-move-1', type: 'player-move' },
    { id: 'player-attack-1', type: 'player-attack' },
  ],
});

const makeCommand = (
  overrides: Partial<IInterventionLedgerCommand<TestPayload>> = {},
): IInterventionLedgerCommand<TestPayload> => ({
  domain: 'combat',
  kind: 'fix',
  actorId: 'gm-1',
  targetRefs: ['unit:atlas-1'],
  payload: { delta: 3 },
  causedBy: ['player-attack-1'],
  ...overrides,
});

function makeLedger(): InterventionLedger<TestState> {
  const implementer: IInterventionLedgerImplementer<
    IInterventionLedgerCommand<TestPayload>,
    TestState,
    IGmPrivateMetadata,
    IGmPublicEffect,
    TestDomainPayload
  > = {
    domain: 'combat',
    preview(
      command,
    ): IInterventionLedgerPreview<
      IGmPrivateMetadata,
      IGmPublicEffect,
      TestDomainPayload
    > {
      const delta = command.payload?.delta ?? 0;
      const projectedEvents = [
        {
          id: 'projected-gm-adjustment',
          type: 'gm-value-adjusted',
          delta,
        },
      ];

      return {
        domain: command.domain,
        kind: command.kind,
        status: command.payload?.conflict
          ? 'requires-manual-takeover'
          : 'ready',
        actorId: command.actorId,
        targetRefs: command.targetRefs,
        causedBy: command.causedBy,
        supersedes: command.supersedes,
        privateMetadata: {
          reason: 'GM-only cascade reason.',
          defaultOutcome: 'The original event would stand.',
        },
        publicEffect: {
          summary: 'Value corrected.',
          changedStateRefs: ['state:value', ...command.targetRefs],
        },
        domainPayload: {
          delta,
          projectedEvents,
        },
        projectedEvents,
        conflicts: command.payload?.conflict
          ? [
              {
                code: 'manual-review',
                message: 'GM must choose conflict handling.',
                affectedRefs: command.targetRefs,
                requiresManualTakeover: true,
              },
            ]
          : [],
      };
    },
    apply(record, state): TestState {
      const delta = record.domainPayload?.delta ?? 0;
      return {
        value: state.value + delta,
        events: [
          ...state.events,
          {
            id: record.id,
            type: `gm-${record.kind}`,
            delta,
          },
        ],
      };
    },
    projectPublic(record): IGmPublicEffect {
      return record.publicEffect;
    },
    projectPrivate(record): IGmPrivateMetadata {
      return record.privateMetadata;
    },
  };

  return new InterventionLedger<TestState>().register(implementer);
}

describe('GM cascade preview pipeline', () => {
  it('generates a pure preview without mutating state or appending records', () => {
    const ledger = makeLedger();
    const state = makeState();
    const originalState = {
      ...state,
      events: [...state.events],
    };

    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-preview',
    });

    expect(preview).toMatchObject({
      interventionId: 'gm-int-preview',
      status: 'ready',
      domain: 'combat',
      affectedStateRefs: ['unit:atlas-1', 'state:value'],
      publicEffect: {
        summary: 'Value corrected.',
      },
      privateMetadata: {
        reason: 'GM-only cascade reason.',
      },
      projectedEvents: [
        {
          id: 'projected-gm-adjustment',
          type: 'gm-value-adjusted',
          delta: 3,
        },
      ],
    });
    expect(state).toEqual(originalState);
    expect(ledger.getRecords()).toEqual([]);
  });

  it('approves a ready preview by appending a record and deriving state through the implementer', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-approved',
    });

    const result = approveGmCascadePreview({
      ledger,
      preview,
      state,
      createdAt: '2026-06-20T00:00:00.000Z',
      approvedAt: '2026-06-20T00:01:00.000Z',
    });

    expect(result.status).toBe('approved');
    expect(result.appended).toBe(true);
    expect(result.state).toEqual({
      value: 13,
      events: [
        ...state.events,
        {
          id: 'gm-int-approved',
          type: 'gm-fix',
          delta: 3,
        },
      ],
    });
    expect(ledger.getRecords()).toHaveLength(1);
    expect(ledger.getRecords()[0]).toMatchObject({
      id: 'gm-int-approved',
      status: 'approved',
      causedBy: ['player-attack-1'],
    });
  });

  it('cancels a preview without appending or changing derived state', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand(),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-cancelled',
    });

    const result = cancelGmCascadePreview(preview, state);

    expect(result).toEqual({
      status: 'cancelled',
      state,
      appended: false,
    });
    expect(ledger.getRecords()).toEqual([]);
  });

  it('requires manual takeover for unresolved conflicts and blocks approval', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand({ payload: { delta: 3, conflict: true } }),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-conflict',
    });

    const result = approveGmCascadePreview({
      ledger,
      preview,
      state,
    });

    expect(preview.status).toBe('requires-manual-takeover');
    expect(preview.conflicts[0]).toMatchObject({
      code: 'manual-review',
      requiresManualTakeover: true,
    });
    expect(result).toMatchObject({
      status: 'blocked',
      state,
      appended: false,
    });
    expect(ledger.getRecords()).toEqual([]);
  });

  it('returns deferred previews for unsupported first-slice campaign domains without mutation', () => {
    const ledger = makeLedger();
    const state = makeState();

    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand({
        domain: 'economy',
        kind: 'undo',
        targetRefs: ['merchant-tx:1'],
      }),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-deferred',
    });

    expect(preview).toMatchObject({
      interventionId: 'gm-int-deferred',
      status: 'deferred',
      domain: 'economy',
      targetRefs: ['merchant-tx:1'],
      affectedStateRefs: ['merchant-tx:1'],
      projectedEvents: [],
      conflicts: [],
    });
    expect(preview.reason).toContain('economy');
    expect(state).toEqual(makeState());
    expect(ledger.getRecords()).toEqual([]);
  });

  it('keeps GM undo additive instead of truncating normal player event history', () => {
    const ledger = makeLedger();
    const state = makeState();
    const preview = createGmCascadePreview({
      ledger,
      command: makeCommand({
        kind: 'undo',
        payload: { delta: -2 },
        supersedes: ['player-attack-1'],
      }),
      state,
      authority: gmAuthority,
      interventionId: 'gm-int-undo',
    });

    const result = approveGmCascadePreview({
      ledger,
      preview,
      state,
    });

    expect(result.status).toBe('approved');
    expect(result.state.events).toEqual([
      { id: 'player-move-1', type: 'player-move' },
      { id: 'player-attack-1', type: 'player-attack' },
      { id: 'gm-int-undo', type: 'gm-undo', delta: -2 },
    ]);
    expect(ledger.getRecords()[0]).toMatchObject({
      kind: 'undo',
      supersedes: ['player-attack-1'],
    });
  });
});
