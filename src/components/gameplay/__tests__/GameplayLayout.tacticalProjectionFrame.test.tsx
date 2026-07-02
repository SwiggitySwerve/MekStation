import '@testing-library/jest-dom';
import { MovementType } from '@/types/gameplay';

import {
  GamePhase,
  createDemoSession,
  fireEvent,
  renderLayout,
  screen,
} from './addInteractiveCombatCoreUI.smoke.test-helpers';

describe('GameplayLayout shared tactical projection frame', () => {
  it('drives map overlays and dock movement previews from the same projection frame', () => {
    const blockedReason = 'Shared frame blocks the destination';
    const session = createDemoSession();
    const movementSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.Movement,
        units: {
          ...session.currentState.units,
          'unit-player-1': {
            ...session.currentState.units['unit-player-1'],
            position: { q: 0, r: 0 },
          },
        },
      },
    };

    renderLayout({
      session: movementSession,
      selectedUnitId: 'unit-player-1',
      hoveredHex: { q: 1, r: 0 },
      movementRange: [
        {
          hex: { q: 1, r: 0 },
          mpCost: 6,
          terrainCost: 2,
          elevationDelta: 1,
          elevationCost: 1,
          heatGenerated: 2,
          reachable: false,
          movementType: MovementType.Walk,
          movementMode: 'walk',
          blockedReason,
          movementInvalidReason: 'TerrainBlocked',
          movementInvalidDetails: blockedReason,
        },
      ],
    });

    expect(screen.getByTestId('hex-map-container')).toHaveAttribute(
      'data-tactical-projection-frame-source',
      'shared-engine-projection',
    );
    expect(screen.getByTestId('hex-map-container')).toHaveAttribute(
      'data-tactical-projection-coverage-status',
      'complete',
    );
    expect(screen.getByTestId('map-panel')).toHaveAttribute(
      'data-map-panel-width',
      '74',
    );

    const blockedHex = screen.getByTestId('hex-1-0');
    expect(blockedHex).toHaveAttribute('data-reachable', 'false');
    expect(blockedHex).toHaveAttribute(
      'data-tactical-projection-movement-status',
      'blocked',
    );
    expect(blockedHex).toHaveAttribute(
      'data-tactical-projection-blocked-reasons',
      expect.stringContaining(blockedReason),
    );

    const blockedOverlay = screen.getByTestId('hex-overlay-1-0');
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-movement-non-color-encoding',
      'blocked-cross-hatch',
    );
    expect(screen.getByTestId('blocked-movement-glyph-1-0')).toHaveTextContent(
      '!',
    );

    const preview = screen.getByTestId('command-preview-movement');
    expect(preview).toHaveAttribute('data-command-preview-unreachable', 'true');
    expect(preview).toHaveAttribute('data-command-preview-mp-cost', '6');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      blockedReason,
    );

    // tactical-movement-intent-composer: the dock no longer renders a Walk
    // verb button — the shared blocked reason surfaces through the movement
    // preview panel above (Single Movement Authority; the composer owns
    // movement composition).
    expect(screen.queryByTestId('command-btn-movement.walk')).toBeNull();
  });
});
