/**
 * The GM control plane's preview / approve / manual-takeover state (K11): one
 * discriminated union, one transition map, and a token per preview so a stale
 * or duplicate control action is refused (the reducer returns the same state).
 */

import type { GmLedgerPreview } from '../GmCampaignInterventionControlPlane.helpers';

import {
  GM_CONTROL_TRANSITIONS,
  INITIAL_GM_CONTROL_PLANE_STATE,
  reduceGmControlPlane,
  viewGmControl,
  type GmControlAction,
  type IGmControlPlaneState,
} from '../gmControlPlaneState';

function previewOf(
  status: GmLedgerPreview['status'] = 'ready',
  interventionId = 'gm-preview',
): GmLedgerPreview {
  return {
    interventionId,
    status,
    domain: 'economy',
    kind: 'undo',
    actorId: 'gm',
    targetRefs: [],
    affectedStateRefs: [],
    projectedEvents: [],
    conflicts:
      status === 'requires-manual-takeover'
        ? [
            {
              code: 'conflict',
              message: 'Needs a GM.',
              affectedRefs: [],
              requiresManualTakeover: true,
            },
          ]
        : [],
  };
}

function run(...actions: readonly GmControlAction[]): IGmControlPlaneState {
  return actions.reduce(reduceGmControlPlane, INITIAL_GM_CONTROL_PLANE_STATE);
}

const generated = (preview = previewOf()): GmControlAction => ({
  type: 'preview-generated',
  preview,
});

describe('gmControlPlaneState', () => {
  it('mints a new token for every generated preview', () => {
    const first = run(generated());
    const second = reduceGmControlPlane(first, generated());

    expect(first.control).toMatchObject({ kind: 'previewed', token: 1 });
    expect(second.control).toMatchObject({ kind: 'previewed', token: 2 });
  });

  it('walks previewed -> approving -> applied under the preview token', () => {
    const applied = run(
      generated(),
      { type: 'approve-started', token: 1 },
      { type: 'approve-applied', token: 1 },
    );

    expect(applied.control.kind).toBe('applied');
    expect(viewGmControl(applied.control)).toMatchObject({
      status: 'Approved and applied to campaign state.',
      canApprove: false,
      canGenerate: true,
      approvedApplied: true,
    });
  });

  it('refuses a duplicate approve while one is in flight', () => {
    const approving = run(generated(), { type: 'approve-started', token: 1 });

    expect(
      reduceGmControlPlane(approving, { type: 'approve-started', token: 1 }),
    ).toBe(approving);
    expect(viewGmControl(approving.control)).toMatchObject({
      canApprove: false,
      canGenerate: false,
      canTakeManualControl: false,
    });
  });

  it('refuses a new preview while an approve is in flight', () => {
    const approving = run(generated(), { type: 'approve-started', token: 1 });

    expect(reduceGmControlPlane(approving, generated(previewOf()))).toBe(
      approving,
    );
  });

  it('refuses every action carrying a stale token', () => {
    const second = run(generated(), generated());

    for (const action of [
      { type: 'approve-started', token: 1 },
      { type: 'approve-blocked', token: 1, reason: 'stale' },
      { type: 'manual-recorded', token: 1, conflicts: [] },
    ] as const) {
      expect(reduceGmControlPlane(second, action)).toBe(second);
    }

    const approving = reduceGmControlPlane(second, {
      type: 'approve-started',
      token: 2,
    });
    for (const action of [
      { type: 'approve-applied', token: 1 },
      { type: 'approve-refused', token: 1, reason: 'stale' },
      { type: 'approve-failed', token: 1, reason: 'stale' },
    ] as const) {
      expect(reduceGmControlPlane(approving, action)).toBe(approving);
    }
  });

  it('lets a refused approval be retried under the same token', () => {
    const refused = run(
      generated(),
      { type: 'approve-started', token: 1 },
      { type: 'approve-refused', token: 1, reason: 'insufficient-funds' },
    );

    expect(viewGmControl(refused.control)).toMatchObject({
      status: 'Not applied to campaign state.',
      reason: 'insufficient-funds',
      canApprove: true,
    });
    expect(
      reduceGmControlPlane(refused, { type: 'approve-started', token: 1 })
        .control.kind,
    ).toBe('approving');
  });

  it('keeps a failed apply terminal for its preview', () => {
    const failed = run(
      generated(),
      { type: 'approve-started', token: 1 },
      { type: 'approve-failed', token: 1, reason: 'disk full' },
    );

    expect(
      reduceGmControlPlane(failed, { type: 'approve-started', token: 1 }),
    ).toBe(failed);
    expect(viewGmControl(failed.control)).toMatchObject({
      status: 'Apply failed.',
      canApprove: false,
      canGenerate: true,
    });
    expect(viewGmControl(failed.control).reason).toContain('disk full');
  });

  it('only approves a ready preview and only takes over a conflicted one', () => {
    const conflicted = run(generated(previewOf('requires-manual-takeover')));
    const ready = run(generated());

    expect(
      reduceGmControlPlane(conflicted, { type: 'approve-started', token: 1 }),
    ).toBe(conflicted);
    expect(
      reduceGmControlPlane(ready, {
        type: 'manual-recorded',
        token: 1,
        conflicts: [],
      }),
    ).toBe(ready);
    expect(viewGmControl(conflicted.control)).toMatchObject({
      canApprove: false,
      canTakeManualControl: true,
    });
  });

  it('records a manual takeover once per preview', () => {
    const manual = run(generated(previewOf('requires-manual-takeover')), {
      type: 'manual-recorded',
      token: 1,
      conflicts: ['Needs a GM.'],
    });

    expect(
      reduceGmControlPlane(manual, {
        type: 'manual-recorded',
        token: 1,
        conflicts: ['Needs a GM.'],
      }),
    ).toBe(manual);
    expect(viewGmControl(manual.control)).toMatchObject({
      status: 'Manual takeover recorded.',
      canTakeManualControl: false,
      manualTakeover: {
        reason: 'Manual takeover selected; no campaign state changed.',
        conflicts: ['Needs a GM.'],
      },
    });
  });

  it('allows only the mapped transitions from each phase', () => {
    expect(GM_CONTROL_TRANSITIONS).toEqual({
      idle: ['preview-generated'],
      previewed: [
        'preview-generated',
        'approve-started',
        'approve-blocked',
        'manual-recorded',
      ],
      approving: ['approve-applied', 'approve-refused', 'approve-failed'],
      applied: ['preview-generated'],
      refused: ['preview-generated', 'approve-started', 'approve-blocked'],
      blocked: ['preview-generated'],
      failed: ['preview-generated'],
      manual: ['preview-generated'],
    });
    expect(
      reduceGmControlPlane(INITIAL_GM_CONTROL_PLANE_STATE, {
        type: 'approve-applied',
        token: 0,
      }),
    ).toBe(INITIAL_GM_CONTROL_PLANE_STATE);
  });
});
