import type {
  IInterventionLedgerCommand,
  IInterventionLedgerImplementer,
  IInterventionLedgerPreview,
  IInterventionLedgerRecord,
  IGmAuthorityContext,
  IGmPrivateMetadata,
  IGmPublicEffect,
} from '@/types/interventions';

import { logger } from '@/utils/logger';

import {
  buildGmInterventionRedactionEnvelope,
  previewGmInterventionWithAuthority,
  projectInterventionRecordForGm,
  projectInterventionRecordForPlayer,
} from '../GmInterventionAuthority';
import { InterventionLedger } from '../InterventionLedger';

interface TestState {
  readonly units: readonly string[];
}

interface TestCommandPayload {
  readonly correction: string;
  readonly privateMetadata?: IGmPrivateMetadata;
}

const gmAuthority: IGmAuthorityContext = {
  actorId: 'gm-1',
  role: 'gm',
  gameId: 'game-1',
  campaignId: 'campaign-1',
  ownedStateRefs: ['game:game-1'],
};

const makeCommand = (
  overrides: Partial<IInterventionLedgerCommand<TestCommandPayload>> = {},
): IInterventionLedgerCommand<TestCommandPayload> => ({
  domain: 'combat',
  kind: 'fix',
  actorId: 'gm-1',
  targetRefs: ['game:game-1', 'unit:atlas-1'],
  payload: {
    correction: 'armor correction',
  },
  ...overrides,
});

const makeRecord = (
  overrides: Partial<
    IInterventionLedgerRecord<IGmPrivateMetadata, IGmPublicEffect>
  > = {},
): IInterventionLedgerRecord<IGmPrivateMetadata, IGmPublicEffect> => ({
  id: 'gm-int-1',
  domain: 'combat',
  kind: 'fix',
  status: 'approved',
  actorId: 'gm-1',
  targetRefs: ['unit:atlas-1'],
  privateMetadata: {
    reason: 'Secret scenario correction.',
    defaultOutcome: 'The unit would have been destroyed.',
    hiddenNotes: 'Hidden reinforcements stay unrevealed.',
    manualTakeoverNotes: 'GM manually chose the least disruptive repair.',
  },
  publicEffect: {
    summary: 'Atlas armor state corrected.',
    changedStateRefs: ['unit:atlas-1'],
  },
  createdAt: '2026-06-20T00:00:00.000Z',
  approvedAt: '2026-06-20T00:01:00.000Z',
  ...overrides,
});

function makeLedger(preview: jest.Mock): InterventionLedger<TestState> {
  const implementer: IInterventionLedgerImplementer<
    IInterventionLedgerCommand<TestCommandPayload>,
    TestState,
    IGmPrivateMetadata,
    IGmPublicEffect
  > = {
    domain: 'combat',
    preview(
      command,
    ): IInterventionLedgerPreview<IGmPrivateMetadata, IGmPublicEffect> {
      preview(command);
      return {
        domain: command.domain,
        kind: command.kind,
        status: 'ready',
        actorId: command.actorId,
        targetRefs: command.targetRefs,
        privateMetadata: {
          reason: 'GM-only preview reason.',
        },
        publicEffect: {
          summary: 'Public correction preview.',
          changedStateRefs: command.targetRefs,
        },
        conflicts: [],
      };
    },
    apply(_record, state): TestState {
      return state;
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

describe('GM intervention authority and redaction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows the owning GM to generate an intervention preview', () => {
    const preview = jest.fn();
    const ledger = makeLedger(preview);

    const result = previewGmInterventionWithAuthority({
      ledger,
      command: makeCommand(),
      state: { units: ['unit:atlas-1'] },
      authority: gmAuthority,
    });

    expect(result.status).toBe('ready');
    expect(preview).toHaveBeenCalledTimes(1);
    expect(ledger.getRecords()).toEqual([]);
  });

  it('rejects a non-owner player before preview generation and appends no records', () => {
    const preview = jest.fn();
    const warnSpy = jest
      .spyOn(logger, 'warn')
      .mockImplementation(() => undefined);
    const ledger = makeLedger(preview);

    const result = previewGmInterventionWithAuthority({
      ledger,
      command: makeCommand({
        actorId: 'player-1',
        payload: {
          correction: 'secret correction',
          privateMetadata: {
            reason: 'Do not show this reason.',
            hiddenNotes: 'Hidden ambush remains unknown.',
          },
        },
      }),
      state: { units: ['unit:atlas-1'] },
      authority: {
        actorId: 'player-1',
        role: 'player',
        gameId: 'game-1',
        ownedStateRefs: [],
      },
    });

    expect(result).toMatchObject({
      status: 'rejected',
      code: 'gm-role-required',
      domain: 'combat',
      actorId: 'player-1',
    });
    expect(preview).not.toHaveBeenCalled();
    expect(ledger.getRecords()).toEqual([]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toBe(
      '[gm-intervention:authorization-rejected]',
    );
    expect(warnSpy.mock.calls[0]?.[1]).toMatchObject({
      level: 'warn',
      service: 'gm-intervention',
      event: 'authorization-rejected',
      actorId: 'player-1',
      gameId: 'game-1',
    });
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(
      'Do not show this reason',
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(
      'Hidden ambush remains unknown',
    );
  });

  it('splits private metadata from player-public net effect', () => {
    const envelope = buildGmInterventionRedactionEnvelope(
      {
        reason: 'GM-only correction.',
        defaultOutcome: 'Target would otherwise be destroyed.',
        hiddenNotes: 'Scenario objective stays hidden.',
        manualTakeoverNotes: 'GM selected a manual outcome.',
      },
      {
        summary: 'Target damage corrected.',
        changedStateRefs: ['unit:atlas-1'],
      },
    );

    expect(envelope.publicEffect).toEqual({
      summary: 'Target damage corrected.',
      changedStateRefs: ['unit:atlas-1'],
    });
    expect(envelope.privateMetadata.hiddenNotes).toBe(
      'Scenario objective stays hidden.',
    );
  });

  it('keeps private reason, hidden notes, default outcome, and manual notes out of player logs', () => {
    const record = makeRecord();
    const playerProjection = projectInterventionRecordForPlayer(record);
    const gmProjection = projectInterventionRecordForGm(record);

    expect(playerProjection).toEqual({
      id: 'gm-int-1',
      domain: 'combat',
      kind: 'fix',
      status: 'approved',
      actorId: 'gm-1',
      targetRefs: ['unit:atlas-1'],
      publicEffect: {
        summary: 'Atlas armor state corrected.',
        changedStateRefs: ['unit:atlas-1'],
      },
      createdAt: '2026-06-20T00:00:00.000Z',
      approvedAt: '2026-06-20T00:01:00.000Z',
    });

    const playerJson = JSON.stringify(playerProjection);
    expect(playerJson).not.toContain('privateMetadata');
    expect(playerJson).not.toContain('Secret scenario correction');
    expect(playerJson).not.toContain('unit would have been destroyed');
    expect(playerJson).not.toContain('Hidden reinforcements');
    expect(playerJson).not.toContain('manual');

    expect(gmProjection.privateMetadata).toMatchObject({
      reason: 'Secret scenario correction.',
      defaultOutcome: 'The unit would have been destroyed.',
      hiddenNotes: 'Hidden reinforcements stay unrevealed.',
      manualTakeoverNotes: 'GM manually chose the least disruptive repair.',
    });
  });
});
