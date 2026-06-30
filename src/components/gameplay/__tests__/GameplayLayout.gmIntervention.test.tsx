import { within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type {
  IGmCascadePreview,
  IGmPrivateMetadata,
  IGmPublicEffect,
  IPlayerVisibleInterventionRecord,
} from '@/types/interventions';

import * as H from './addInteractiveCombatCoreUI.smoke.test-helpers';

const { GamePhase, fireEvent, renderLayout, screen } = H;

type GmPreview = IGmCascadePreview<IGmPrivateMetadata, IGmPublicEffect>;

function makePreview(overrides: Partial<GmPreview> = {}): GmPreview {
  return {
    interventionId: 'gm-layout-preview-1',
    status: 'ready',
    domain: 'combat',
    kind: 'fix',
    actorId: 'gm-1',
    targetRefs: ['unit:unit-player-1'],
    affectedStateRefs: ['unit:unit-player-1:damage'],
    privateMetadata: {
      reason: 'Private correction because imported armor was stale.',
      defaultOutcome: 'The stale armor total would remain in combat.',
      hiddenNotes: 'Hidden GM-only table note.',
    },
    publicEffect: {
      summary: 'Atlas armor corrected by the GM.',
      changedStateRefs: ['unit:unit-player-1:armor'],
    },
    projectedEvents: [],
    conflicts: [],
    ...overrides,
  };
}

function makePlayerLogRecord(): IPlayerVisibleInterventionRecord<IGmPublicEffect> {
  return {
    id: 'gm-log-1',
    domain: 'combat',
    kind: 'fix',
    status: 'approved',
    actorId: 'gm-1',
    targetRefs: ['unit:unit-player-1'],
    publicEffect: {
      summary: 'Atlas armor corrected by the GM.',
      changedStateRefs: ['unit:unit-player-1:armor'],
    },
    createdAt: '2026-06-30T12:00:00.000Z',
    approvedAt: '2026-06-30T12:01:00.000Z',
  };
}

describe('GameplayLayout tactical GM intervention wiring', () => {
  it('routes GM previews, approval, and redacted player logs through the live action dock slot', () => {
    const session = H.createDemoSession();
    const movementSession: H.IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.Movement,
      },
    };
    const approve = jest.fn();
    const preview = jest.fn(() => makePreview());

    renderLayout({
      session: movementSession,
      selectedUnitId: 'unit-player-1',
      shellMode: 'gm',
      gmIntervention: {
        preview,
        approve,
        playerLog: [makePlayerLogRecord()],
      },
    });

    fireEvent.click(screen.getByTestId('command-btn-gm.set-damage'));

    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({
        commandId: 'gm.set-damage',
        ctx: expect.objectContaining({
          activeUnitId: 'unit-player-1',
          selectedUnitId: 'unit-player-1',
          phase: GamePhase.Movement,
        }),
      }),
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Set Damage (GM)',
    });
    expect(dialog).toHaveAttribute('data-gm-preview-status', 'ready');
    expect(
      within(dialog).getByTestId('gm-intervention-private-detail'),
    ).toHaveTextContent('Private correction because imported armor was stale.');
    expect(
      within(dialog).getByTestId('gm-intervention-public-effect'),
    ).toHaveTextContent('Atlas armor corrected by the GM.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(approve).toHaveBeenCalledWith(
      expect.objectContaining({
        interventionId: 'gm-layout-preview-1',
      }),
    );

    const playerLog = screen.getByTestId('gm-intervention-player-log');
    expect(playerLog).toHaveTextContent('Atlas armor corrected by the GM.');
    expect(playerLog).toHaveTextContent('unit:unit-player-1:armor');
    expect(playerLog).not.toHaveTextContent('Hidden GM-only table note.');
    expect(playerLog).not.toHaveTextContent(
      'Private correction because imported armor was stale.',
    );
    expect(playerLog).not.toHaveTextContent(
      'The stale armor total would remain in combat.',
    );
  });
});
