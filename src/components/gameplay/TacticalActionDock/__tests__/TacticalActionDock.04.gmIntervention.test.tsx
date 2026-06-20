import { within } from '@testing-library/react';

import type {
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IPlayerVisibleInterventionRecord,
} from '@/types/interventions';

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

    fireEvent.click(screen.getByTestId('command-btn-gm.set-damage'));

    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ commandId: 'gm.set-damage' }),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog', {
      name: 'Set Damage (GM)',
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

    fireEvent.click(screen.getByTestId('command-btn-gm.set-damage'));

    const dialog = screen.getByRole('dialog', {
      name: 'Set Damage (GM)',
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
