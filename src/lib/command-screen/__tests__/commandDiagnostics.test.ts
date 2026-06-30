import type {
  ICommandCommitResult,
  ICommandPreview,
  ICommandReason,
  ICommandStateSummary,
  ICommandSubjectRef,
} from '@/types/command-screen';

import {
  disableDiagnosticCapture,
  enableDiagnosticCapture,
  getCapturedDiagnostics,
} from '@/utils/logger';

import {
  COMMAND_DIAGNOSTIC_SERVICE,
  logCommandCommitResult,
  logCommandPreviewCreated,
  logCommandPreviewRejected,
  logCommandReloadValidated,
  logInvalidCommandAction,
  logMalformedCommandPayload,
} from '../commandDiagnostics';

const subject: ICommandSubjectRef = {
  id: 'unit-atlas-1',
  type: 'unit',
  label: 'Atlas AS7-D',
};

const stateSummary = (label: string): ICommandStateSummary => ({
  label,
  entityRefs: [subject],
  fields: {
    heat: 8,
  },
});

const reason = (
  code: string,
  kind: ICommandReason['kind'],
): ICommandReason => ({
  code,
  kind,
  severity: 'error',
  message: code,
  affectedRefs: [subject],
});

const makePreview = (
  overrides: Partial<ICommandPreview> = {},
): ICommandPreview => ({
  previewId: 'preview-move-1',
  commandId: 'combat.move.walk',
  domain: 'combat',
  authority: 'player',
  subjectRefs: [subject],
  status: 'ready',
  isLegal: true,
  reasons: [],
  before: stateSummary('Atlas before move'),
  after: stateSummary('Atlas after move'),
  costs: [
    {
      category: 'movement',
      label: 'MP',
      amount: 3,
      unit: 'MP',
    },
  ],
  warnings: [],
  redaction: {
    visibility: 'public',
    publicSummary: 'Atlas walks.',
  },
  createdAt: '2026-06-30T00:00:00.000Z',
  ...overrides,
});

const makeCommitResult = (
  overrides: Partial<ICommandCommitResult<{ summary: string }>> = {},
): ICommandCommitResult<{ summary: string }> => ({
  commandId: 'combat.move.walk',
  previewId: 'preview-move-1',
  domain: 'combat',
  status: 'committed',
  authority: 'player',
  subjectRefs: [subject],
  publicEffect: {
    summary: 'Atlas moved to 0505.',
  },
  resultingState: stateSummary('Atlas at 0505'),
  ledgerRef: 'ledger-move-1',
  diagnosticEvent: 'command_commit_succeeded',
  committedAt: '2026-06-30T00:01:00.000Z',
  ...overrides,
});

describe('command diagnostics', () => {
  beforeEach(() => {
    enableDiagnosticCapture();
  });

  afterEach(() => {
    disableDiagnosticCapture(true);
  });

  it('logs preview creation and blocked preview rejection with shared metadata', () => {
    logCommandPreviewCreated(makePreview());
    logCommandPreviewRejected(
      makePreview({
        status: 'blocked',
        isLegal: false,
        reasons: [reason('destination-occupied', 'blocked')],
      }),
    );

    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: COMMAND_DIAGNOSTIC_SERVICE,
          event: 'command_preview_created',
          level: 'info',
          entityIds: expect.objectContaining({
            commandId: 'combat.move.walk',
            previewId: 'preview-move-1',
            subjectId: 'unit-atlas-1',
          }),
          metadata: expect.objectContaining({
            domain: 'combat',
            commandId: 'combat.move.walk',
            subjectRefIds: ['unit-atlas-1'],
            reasonCodes: [],
            userVisibleStateChanged: false,
            costCount: 1,
          }),
        }),
        expect.objectContaining({
          event: 'command_preview_rejected',
          level: 'warn',
          metadata: expect.objectContaining({
            status: 'blocked',
            reasonCodes: ['destination-occupied'],
            userVisibleStateChanged: false,
          }),
        }),
      ]),
    );
  });

  it('logs commits and reload validation with ledger and persistence refs', () => {
    logCommandCommitResult(makeCommitResult(), {
      persistenceRef: 'event-command-result-1',
    });
    logCommandReloadValidated({
      commandId: 'combat.move.walk',
      previewId: 'preview-move-1',
      domain: 'combat',
      status: 'committed',
      authority: 'player',
      subjectRefs: [subject],
      reasonCodes: [],
      userVisibleStateChanged: true,
      ledgerRef: 'ledger-move-1',
      persistenceRef: 'event-command-result-1',
      resultingStateSummary: 'Atlas at 0505',
      resultCount: 1,
    });

    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'command_commit_succeeded',
          metadata: expect.objectContaining({
            ledgerRef: 'ledger-move-1',
            persistenceRef: 'event-command-result-1',
            resultingStateSummary: 'Atlas at 0505',
            userVisibleStateChanged: true,
          }),
        }),
        expect.objectContaining({
          event: 'command_reload_validated',
          metadata: expect.objectContaining({
            resultCount: 1,
            persistenceRef: 'event-command-result-1',
          }),
        }),
      ]),
    );
  });

  it('logs malformed payload and invalid action rejection without mutation claims', () => {
    logMalformedCommandPayload({
      commandId: 'mission-readiness.launch.campaign-1.contract-1',
      domain: 'mission-readiness',
      payloadKind: 'mission-launch-roster',
      subjectRefs: [{ id: 'campaign-1', type: 'campaign' }],
      reasonCodes: ['empty-roster'],
    });
    logInvalidCommandAction({
      commandId: 'starmap.travel.luthien',
      domain: 'starmap',
      subjectRefIds: ['campaign-1'],
      reasonCodes: ['destination-current-system'],
    });

    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'command_malformed_payload_rejected',
          level: 'warn',
          metadata: expect.objectContaining({
            payloadKind: 'mission-launch-roster',
            reasonCodes: ['empty-roster'],
            userVisibleStateChanged: false,
          }),
        }),
        expect.objectContaining({
          event: 'command_invalid_action_rejected',
          level: 'warn',
          metadata: expect.objectContaining({
            reasonCodes: ['destination-current-system'],
            userVisibleStateChanged: false,
          }),
        }),
      ]),
    );
  });
});
