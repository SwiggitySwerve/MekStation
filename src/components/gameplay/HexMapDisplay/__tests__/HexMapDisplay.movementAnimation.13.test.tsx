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

  it('renders elevation-blocked movement reasons as visible map badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 1,
            elevationDelta: 3,
            elevationCost: 0,
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason:
              'Elevation change of 3 exceeds ground movement limit',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails:
              'Elevation change of 3 exceeds ground movement limit',
          },
        ]}
      />,
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('ELEV');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Elevation change of 3 exceeds ground movement limit',
    );

    act(() => {
      unmount();
    });
  });

  it('renders bridge-clearance movement reasons as visible map badges', () => {
    const reason = 'Naval movement lacks bridge clearance';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            reachable: false,
            movementMode: 'naval',
            movementType: MovementType.Walk,
            blockedReason: reason,
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: reason,
          },
        ]}
      />,
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('BRDG');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-reason', reason);
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );

    act(() => {
      unmount();
    });
  });

  it('renders airborne altitude-control movement context without relying on color', () => {
    const reason =
      'Airborne WiGE movement uses altitude controls and is not available in the ground movement projection';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 0,
            elevationDelta: 4,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: reason,
            movementInvalidReason: 'InvalidDestination',
            movementInvalidDetails: reason,
            altitudeControlRequired: true,
            altitudeControlMode: 'wige',
            altitudeControlAltitude: 2,
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-required',
      'true',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-mode',
      'wige',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-altitude',
      '2',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('wige altitude controls at altitude 2'),
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('ALT');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-reason', reason);

    fireEvent.mouseEnter(blocked);
    const reasonRows = screen.getByTestId('hex-movement-tooltip-reason');
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-required',
      'true',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-mode',
      'wige',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-altitude',
      '2',
    );
    expect(reasonRows).toHaveTextContent(reason);

    act(() => {
      unmount();
    });
  });

  it('renders terrain and elevation step costs directly on reachable movement hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 2,
            elevationCost: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    expect(movementHex).toHaveAttribute('data-terrain-cost', '1');
    expect(movementHex).toHaveAttribute('data-elevation-delta', '2');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '2');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/TRK 3MP',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'T+1 E+2 UP2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: terrain +1; elevation cost +2; elevation delta +2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection: walk via tracked reachable 3 MP terrain +1 elevation delta +2 cost +2',
      ),
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-projection-explanation',
      expect.stringContaining(
        'Walk reachable 3 MP; mode tracked; terrain cost +1; elevation delta +2 cost +2',
      ),
    );

    act(() => {
      unmount();
    });
  });
});
