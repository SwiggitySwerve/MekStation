import { act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IPlayerVisibleInterventionRecord,
} from '@/types/interventions';

import {
  capturePreviewFreshness,
  validateGmCascadePreviewFreshness,
} from '@/lib/interventions/GmCascadePreviewFreshness';

import * as H from './TacticalActionDock.test-helpers';

const { GamePhase, TacticalActionDock, fireEvent, makeCtx, render, screen } = H;

type GmPreview = IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>;

function makePreview(overrides: Partial<GmPreview> = {}): GmPreview {
  return {
    interventionId: 'gm-preview-1',
    status: 'ready',
    domain: 'combat',
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs: ['unit:atlas-1'],
    affectedStateRefs: ['unit:atlas-1', 'unit:atlas-1:damage'],
    privateMetadata: {
      reason: 'Secret GM correction reason.',
      defaultOutcome: 'The original hit would stand.',
      hiddenNotes: 'Hidden ambush branch.',
      manualTakeoverNotes: 'Use manual takeover if armor mapping changed.',
    },
    publicEffect: {
      summary: 'Atlas damage corrected by the GM.',
      changedStateRefs: ['unit:atlas-1:damage'],
    },
    projectedEvents: [],
    conflicts: [],
    ...overrides,
  };
}

function makePlayerLogRecord(
  overrides: Partial<IPlayerVisibleInterventionRecord<IGmPublicEffect>> = {},
): IPlayerVisibleInterventionRecord<IGmPublicEffect> {
  return {
    id: 'record-1',
    domain: 'combat',
    kind: 'fix',
    status: 'approved',
    actorId: 'gm-1',
    targetRefs: ['unit:atlas-1'],
    publicEffect: {
      summary: 'Atlas damage corrected by the GM.',
      changedStateRefs: ['unit:atlas-1:damage'],
    },
    createdAt: '2026-06-20T07:00:00.000Z',
    approvedAt: '2026-06-20T07:01:00.000Z',
    ...overrides,
  };
}

describe('TacticalActionDock GM intervention surface', () => {
  // @spec openspec/changes/disable-gm-non-event-corrections/specs/gm-tactical-command-surface/spec.md - Interim correction availability
  it.each([
    'gm.set-position-facing',
    'gm.set-damage',
    'gm.set-heat-ammo',
    'gm.set-initiative',
    'gm.set-lifecycle',
    'gm.set-objective',
  ])(
    'disables %s with a visible explanation and refuses mouse/keyboard activation',
    async (commandId) => {
      const user = userEvent.setup();
      const preview = jest.fn(() => makePreview());
      const onAction = jest.fn();
      render(
        <TacticalActionDock
          ctx={makeCtx()}
          shellMode="gm"
          onAction={onAction}
          gmIntervention={{ preview }}
        />,
      );
      const button = screen.getByTestId(`command-btn-${commandId}`);
      const reason =
        'Corrections are temporarily unavailable: the next game action would discard them until correction events are implemented.';
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(reason);
      expect(screen.getByText(reason, { selector: 'p' })).toBeVisible();
      await user.click(button);
      button.focus();
      expect(button).not.toHaveFocus();
      await user.keyboard('{Enter} ');
      expect(preview).not.toHaveBeenCalled();
      expect(onAction).not.toHaveBeenCalled();
      expect(screen.getByTestId('command-btn-gm.advance-phase')).toBeEnabled();
    },
  );

  it('cancels each pending preview before requesting its replacement in one batch', () => {
    const first = makePreview({ interventionId: 'first' });
    const second = makePreview({ interventionId: 'second' });
    const order: string[] = [];
    const preview = jest
      .fn()
      .mockImplementationOnce(() => {
        order.push('preview:first');
        return first;
      })
      .mockImplementationOnce(() => {
        order.push('preview:second');
        return second;
      });
    const cancel = jest.fn((value: GmPreview) => {
      order.push(`cancel:${value.interventionId}`);
    });
    const { unmount } = render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="gm"
        onAction={jest.fn()}
        gmIntervention={{ preview, cancel }}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
      fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
    });
    expect(order).toEqual(['preview:first', 'cancel:first', 'preview:second']);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(first);
    unmount();
    expect(cancel.mock.calls.map(([value]) => value)).toEqual([first, second]);
  });

  it('cancels on unmount through the service that created the preview', () => {
    const value = makePreview();
    const originalCancel = jest.fn();
    const replacementCancel = jest.fn();
    const preview = jest.fn(() => value);
    const ctx = makeCtx();
    const onAction = jest.fn();
    const { rerender, unmount } = render(
      <TacticalActionDock
        ctx={ctx}
        shellMode="gm"
        onAction={onAction}
        gmIntervention={{ preview, cancel: originalCancel }}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
    rerender(
      <TacticalActionDock
        ctx={ctx}
        shellMode="gm"
        onAction={onAction}
        gmIntervention={{ preview, cancel: replacementCancel }}
      />,
    );
    expect(originalCancel).not.toHaveBeenCalled();
    unmount();
    expect(originalCancel).toHaveBeenCalledTimes(1);
    expect(originalCancel).toHaveBeenCalledWith(value);
    expect(replacementCancel).not.toHaveBeenCalled();
  });

  it('keeps a D-6 stale preview pending until replacement without refreshing its fingerprint', () => {
    let state = { turn: 1, phase: GamePhase.Movement };
    const preview = jest.fn(() =>
      makePreview({ freshness: capturePreviewFreshness(state) }),
    );
    const cancel = jest.fn();
    const approve = jest.fn((value: GmPreview) => {
      const reason = validateGmCascadePreviewFreshness(value, state);
      return reason
        ? { status: 'blocked' as const, appended: false, reason }
        : { status: 'approved' as const, appended: true };
    });
    const { unmount } = render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="gm"
        onAction={jest.fn()}
        gmIntervention={{ preview, approve, cancel }}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
    const original = preview.mock.results[0].value;
    const fingerprint = original.freshness;
    state = { ...state, turn: 2 };
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(
      screen.getByRole('dialog', { name: 'Advance Phase (GM)' }),
    ).toBeVisible();
    expect(
      screen.getByTestId('gm-intervention-approval-issue'),
    ).toHaveTextContent('stale state fingerprint');
    expect(approve).toHaveBeenCalledWith(original);
    expect(original.freshness).toBe(fingerprint);
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(original);
    expect(
      screen.queryByTestId('gm-intervention-approval-issue'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it.each(['cancel', 'approve', 'manual takeover'] as const)(
    'releases ownership after %s without cancelling again on unmount',
    (action) => {
      const value = makePreview({
        status:
          action === 'manual takeover' ? 'requires-manual-takeover' : 'ready',
      });
      const cancel = jest.fn();
      const approve = jest.fn(() => ({
        status: 'approved' as const,
        appended: true,
      }));
      const manualTakeover = jest.fn();
      const { unmount } = render(
        <TacticalActionDock
          ctx={makeCtx()}
          shellMode="gm"
          onAction={jest.fn()}
          gmIntervention={{
            preview: () => value,
            cancel,
            approve,
            manualTakeover,
          }}
        />,
      );
      fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));
      const name =
        action === 'cancel'
          ? 'Cancel GM intervention preview'
          : action === 'approve'
            ? 'Approve'
            : 'Manual Takeover';
      fireEvent.click(screen.getByRole('button', { name }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      unmount();
      expect(cancel).toHaveBeenCalledTimes(action === 'cancel' ? 1 : 0);
    },
  );

  it('opens an accessible GM confirmation from the preview service', () => {
    const onAction = jest.fn();
    const approve = jest.fn();
    const preview = jest.fn(() => makePreview());
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Movement })}
        shellMode="gm"
        onAction={onAction}
        gmIntervention={{ preview, approve }}
      />,
    );

    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));

    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ commandId: 'gm.advance-phase' }),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog', {
      name: 'Advance Phase (GM)',
    });
    expect(dialog).toHaveAttribute('data-gm-preview-status', 'ready');
    expect(
      within(dialog).getByTestId('gm-intervention-private-detail'),
    ).toHaveTextContent('Secret GM correction reason.');
    expect(
      within(dialog).getByTestId('gm-intervention-public-effect'),
    ).toHaveTextContent('Atlas damage corrected by the GM.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(approve).toHaveBeenCalledWith(
      expect.objectContaining({
        interventionId: 'gm-preview-1',
      }),
    );

    confirmSpy.mockRestore();
  });

  it('shows service-level rejection and disables approval', () => {
    const rejected = makePreview({
      status: 'rejected',
      privateMetadata: undefined,
      publicEffect: undefined,
      conflicts: [],
      reason: 'Only the owning GM can request GM intervention previews.',
    });

    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="gm"
        onAction={jest.fn()}
        gmIntervention={{ preview: jest.fn(() => rejected) }}
      />,
    );

    fireEvent.click(screen.getByTestId('command-btn-gm.grant-resource'));

    const dialog = screen.getByRole('dialog', {
      name: 'Grant Resource (GM)',
    });
    expect(dialog).toHaveAttribute('data-gm-preview-status', 'rejected');
    expect(dialog).toHaveTextContent(
      'Only the owning GM can request GM intervention previews.',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Approve' }),
    ).toBeDisabled();
  });

  it('shows manual takeover state and routes the manual takeover control', () => {
    const manualTakeover = jest.fn();
    const manualPreview = makePreview({
      status: 'requires-manual-takeover',
      conflicts: [
        {
          code: 'reload-conflict',
          message: 'Armor mapping changed and needs GM resolution.',
          affectedRefs: ['unit:atlas-1:armor'],
          requiresManualTakeover: true,
        },
      ],
    });

    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="gm"
        onAction={jest.fn()}
        gmIntervention={{
          preview: jest.fn(() => manualPreview),
          manualTakeover,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));

    const dialog = screen.getByRole('dialog', {
      name: 'Advance Phase (GM)',
    });
    expect(dialog).toHaveAttribute(
      'data-gm-preview-status',
      'requires-manual-takeover',
    );
    expect(dialog).toHaveTextContent(
      'Armor mapping changed and needs GM resolution.',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Approve' }),
    ).toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Manual Takeover' }),
    );
    expect(manualTakeover).toHaveBeenCalledWith(manualPreview);
  });

  it('renders player-facing log entries without GM-private fields', () => {
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="gm"
        onAction={jest.fn()}
        gmIntervention={{
          preview: jest.fn(() => makePreview()),
          playerLog: [makePlayerLogRecord()],
        }}
      />,
    );

    const log = screen.getByTestId('gm-intervention-player-log');
    expect(log).toHaveTextContent('Atlas damage corrected by the GM.');
    expect(log).toHaveTextContent('unit:atlas-1:damage');
    expect(log).not.toHaveTextContent('Hidden ambush branch.');
    expect(log).not.toHaveTextContent('Secret GM correction reason.');
    expect(log).not.toHaveTextContent('The original hit would stand.');
  });
});
