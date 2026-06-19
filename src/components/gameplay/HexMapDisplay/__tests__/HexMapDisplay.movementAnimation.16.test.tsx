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

  it('surfaces automatic WiGE landing consequences on reachable movement hexes', () => {
    const reason =
      'MegaMek automatic WiGE landing: unit moved below the minimum airborne distance';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 2,
            elevationCost: 0,
            movementMode: 'wige',
            reachable: true,
            movementType: MovementType.Walk,
            automaticLandingRequired: true,
            automaticLandingMode: 'wige',
            automaticLandingDistance: 1,
            automaticLandingMinimumDistance: 5,
            automaticLandingReason: reason,
          },
        ]}
      />,
    );

    const wigeHex = screen.getByTestId('hex-1-0');
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-required',
      'true',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-mode',
      'wige',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-distance',
      '1',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-minimum-distance',
      '5',
    );
    expect(wigeHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('automatic WiGE landing 1/5 hexes'),
    );

    const movementBadge = screen.getByTestId('hex-movement-badge-1-0');
    expect(movementBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('automatic WiGE landing 1/5 hexes'),
    );
    expect(movementBadge).toHaveAttribute(
      'data-movement-badge-automatic-landing-required',
      'true',
    );
    expect(
      screen.getByTestId('hex-automatic-landing-badge-1-0'),
    ).toHaveAccessibleName(`Automatic WiGE landing after 1/5 hexes: ${reason}`);
    expect(
      screen.getByTestId('hex-automatic-landing-badge-1-0'),
    ).toHaveTextContent('LAND');

    fireEvent.mouseEnter(wigeHex);
    expect(
      screen.getByTestId('hex-movement-tooltip-automatic-landing'),
    ).toHaveTextContent('Automatic WiGE landing: 1/5 hexes');
    expect(
      screen.getByTestId('hex-movement-tooltip-automatic-landing'),
    ).toHaveAttribute('data-movement-context-kind', 'automatic-landing');

    act(() => {
      unmount();
    });
  });

  it('renders jump heat impact as map metadata and a visible badge', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 1,
            reachable: true,
            movementType: MovementType.Jump,
          },
        ]}
      />,
    );

    const jumpHex = screen.getByTestId('hex-1-0');
    expect(jumpHex).toHaveAttribute('data-heat-generated', '1');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'J 1MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'jump',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveTextContent('+1H');
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Heat generated +1',
    );

    act(() => {
      unmount();
    });
  });

  it('renders too-high jump landings as elevation-blocked map hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 3,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 3,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'jump',
            reachable: false,
            movementType: MovementType.Jump,
            blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails:
              'Jump elevation rise of 3 exceeds jump MP 2',
          },
        ]}
      />,
    );

    const jumpHex = screen.getByTestId('hex-1-0');
    expect(jumpHex).toHaveAttribute('data-reachable', 'false');
    expect(jumpHex).toHaveAttribute('data-elevation', '3');
    expect(jumpHex).toHaveAttribute('data-elevation-delta', '3');
    expect(jumpHex).toHaveAttribute('data-elevation-cost', '0');
    expect(jumpHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(jumpHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Jump elevation rise of 3 exceeds jump MP 2',
    );
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('ELEV');
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveAttribute(
      'data-invalid-badge-reason',
      'Jump elevation rise of 3 exceeds jump MP 2',
    );

    fireEvent.mouseEnter(jumpHex);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - jump',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: +3');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +3, cost +0');
    expect(screen.getByTestId('hex-movement-tooltip-reason')).toHaveTextContent(
      'Jump elevation rise of 3 exceeds jump MP 2',
    );

    act(() => {
      unmount();
    });
  });
});
