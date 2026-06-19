import * as H from './HexMapDisplay.movementAnimation.test-helpers';

const {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
  act,
  fireEvent,
  hexToPixel,
  makeEvent,
  makeToken,
  makeWeapon,
  render,
  screen,
  useAnimationQueue,
} = H;

type IGameEvent = H.IGameEvent;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
describe('HexMapDisplay tactical visual layers', () => {
  beforeEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  it('renders shutdown movement immobility as a blocked map reason', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Unit is shut down and cannot move',
            movementInvalidReason: 'UnitImmobile',
            movementInvalidDetails: 'Unit is shut down and cannot move',
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute('data-reachable', 'false');
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-reason',
      'UnitImmobile',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-details',
      'Unit is shut down and cannot move',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('invalid UnitImmobile'),
    );
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('SHUT');

    fireEvent.mouseEnter(blocked);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - walk',
    );
    expect(screen.getByTestId('hex-movement-tooltip-reason')).toHaveTextContent(
      'Unit is shut down and cannot move',
    );

    act(() => {
      unmount();
    });
  });

  it('renders blocked movement reason metadata for illegal destinations', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'tracked',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Water blocks ground movement',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: 'Water blocks ground movement',
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute('data-reachable', 'false');
    expect(blocked).toHaveAttribute('data-movement-mode', 'tracked');
    expect(blocked).toHaveAttribute(
      'data-movement-blocked-reason',
      'Water blocks ground movement',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-details',
      'Water blocks ground movement',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('invalid TerrainBlocked'),
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Water blocks ground movement'),
    );
    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('WTR');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-kind', 'movement');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Water blocks ground movement',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('Water blocks ground movement'),
    );

    fireEvent.mouseEnter(blocked);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - walk via tracked',
    );
    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: X',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain-context'),
    ).toHaveTextContent('Terrain: clear');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: 0');
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    const reasonRows = screen.getByTestId('hex-movement-tooltip-reason');
    expect(reasonRows).toHaveTextContent('Water blocks ground movement');
    expect(reasonRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(reasonRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(reasonRows).toHaveAttribute('data-movement-reachable', 'false');
    expect(reasonRows).toHaveAttribute('data-movement-type', 'walk');
    expect(reasonRows).toHaveAttribute('data-movement-mode', 'tracked');
    expect(reasonRows).toHaveAttribute(
      'data-movement-blocked-reason',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-invalid-details',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(screen.queryByTestId('hex-unreachable-tooltip')).toBeNull();

    act(() => {
      unmount();
    });
  });
});
