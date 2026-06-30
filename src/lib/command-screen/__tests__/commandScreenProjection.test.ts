import type {
  ICommandCommitResult,
  ICommandPreview,
  ICommandReason,
  ICommandStateSummary,
  ICommandSubjectRef,
} from '@/types/command-screen';

import {
  buildCommitDiagnosticMetadata,
  buildPreviewDiagnosticMetadata,
  canCommitPreview,
  previewHasBlockingReasons,
  projectCommandResultForPlayer,
} from '../commandScreenProjection';

const subject: ICommandSubjectRef = {
  id: 'unit-atlas-1',
  type: 'unit',
  label: 'Atlas AS7-D',
};

const summary = (label: string): ICommandStateSummary => ({
  label,
  entityRefs: [subject],
  fields: {
    heat: 0,
    location: '0505',
  },
});

const reason = (
  code: string,
  kind: ICommandReason['kind'],
  severity: ICommandReason['severity'] = 'error',
): ICommandReason => ({
  code,
  kind,
  severity,
  message: code,
  affectedRefs: [subject],
});

const makePreview = (
  overrides: Partial<ICommandPreview> = {},
): ICommandPreview => ({
  previewId: 'preview-1',
  commandId: 'movement.walk',
  domain: 'combat',
  authority: 'player',
  subjectRefs: [subject],
  status: 'ready',
  isLegal: true,
  reasons: [reason('path-legal', 'legal', 'info')],
  before: summary('before'),
  after: summary('after'),
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
    publicSummary: 'Atlas walks to 0505.',
  },
  createdAt: '2026-06-30T00:00:00.000Z',
  ...overrides,
});

const makeCommit = (
  overrides: Partial<
    ICommandCommitResult<{ summary: string }, { gmNote: string }>
  > = {},
): ICommandCommitResult<{ summary: string }, { gmNote: string }> => ({
  commandId: 'gm.set-damage',
  previewId: 'preview-gm-1',
  domain: 'combat',
  status: 'committed',
  authority: 'host-gm',
  subjectRefs: [subject],
  publicEffect: {
    summary: 'Atlas damage corrected.',
  },
  privateMetadata: {
    gmNote: 'Correcting a missed crit from the previous turn.',
  },
  resultingState: summary('after gm correction'),
  ledgerRef: 'ledger-1',
  diagnosticEvent: 'command_gm_intervention_committed',
  committedAt: '2026-06-30T00:01:00.000Z',
  ...overrides,
});

describe('command screen projection helpers', () => {
  it('allows a legal ready preview to commit', () => {
    const preview = makePreview();

    expect(previewHasBlockingReasons(preview)).toBe(false);
    expect(canCommitPreview(preview)).toBe(true);
    expect(buildPreviewDiagnosticMetadata(preview)).toMatchObject({
      domain: 'combat',
      commandId: 'movement.walk',
      previewId: 'preview-1',
      status: 'ready',
      authority: 'player',
      subjectRefIds: ['unit-atlas-1'],
      reasonCodes: ['path-legal'],
      userVisibleStateChanged: false,
    });
  });

  it('blocks an illegal preview before commit', () => {
    const preview = makePreview({
      isLegal: false,
      status: 'blocked',
      reasons: [reason('destination-occupied', 'blocked')],
    });

    expect(previewHasBlockingReasons(preview)).toBe(true);
    expect(canCommitPreview(preview)).toBe(false);
  });

  it('treats stale previews as drift-risk rejections', () => {
    const preview = makePreview({
      isLegal: true,
      status: 'stale',
      reasons: [reason('preview-state-stale', 'stale')],
    });
    const commit = makeCommit({
      status: 'drift',
      rejectionReason: reason('preview-state-stale', 'stale'),
      diagnosticEvent: 'command_commit_drift_detected',
    });

    expect(canCommitPreview(preview)).toBe(false);
    expect(buildCommitDiagnosticMetadata(commit)).toMatchObject({
      status: 'drift',
      reasonCodes: ['preview-state-stale'],
      userVisibleStateChanged: false,
    });
  });

  it('projects GM-private command results to player-safe records', () => {
    const result = makeCommit();
    const playerResult = projectCommandResultForPlayer(result);

    expect(playerResult).toEqual({
      commandId: 'gm.set-damage',
      previewId: 'preview-gm-1',
      domain: 'combat',
      status: 'committed',
      subjectRefs: [subject],
      publicEffect: {
        summary: 'Atlas damage corrected.',
      },
      rejectionReason: undefined,
      resultingState: summary('after gm correction'),
      ledgerRef: 'ledger-1',
      diagnosticEvent: 'command_gm_intervention_committed',
      committedAt: '2026-06-30T00:01:00.000Z',
    });
    expect('privateMetadata' in playerResult).toBe(false);
    expect(buildCommitDiagnosticMetadata(result)).toMatchObject({
      userVisibleStateChanged: true,
    });
  });
});
