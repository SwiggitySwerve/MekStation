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

  it('renders downhill elevation step costs as paid cost with down direction', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 0, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 0,
            elevationDelta: -2,
            elevationCost: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    expect(screen.getByTestId('hex-elevation-label-0-0')).toHaveTextContent(
      '+2',
    );
    expect(screen.queryByTestId('hex-elevation-label-1-0')).toBeNull();
    expect(movementHex).toHaveAttribute('data-elevation-delta', '-2');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '2');
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'E+2 DN2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +2; elevation delta -2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '-2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '2',
    );

    act(() => {
      unmount();
    });
  });

  it('renders movement preview path sequence metadata and visible step badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={{ q: 0, r: 0 }}
        highlightPath={[
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 1, r: -1 },
        ]}
      />,
    );

    const startHex = screen.getByTestId('hex-0-0');
    const firstStepHex = screen.getByTestId('hex-1-0');
    const secondStepHex = screen.getByTestId('hex-1--1');

    expect(startHex).toHaveAttribute('data-path-index', '0');
    expect(startHex).toHaveAttribute('data-path-step', 'start');
    expect(firstStepHex).toHaveAttribute('data-path-index', '1');
    expect(firstStepHex).toHaveAttribute('data-path-step', '1');
    expect(secondStepHex).toHaveAttribute('data-path-index', '2');
    expect(secondStepHex).toHaveAttribute('data-path-step', '2');
    expect(secondStepHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('path step 2'),
    );

    expect(screen.getByTestId('hex-path-step-badge-0-0')).toHaveTextContent(
      'S',
    );
    expect(screen.getByTestId('hex-path-step-badge-1-0')).toHaveTextContent(
      '#1',
    );
    expect(screen.getByTestId('hex-path-step-badge-1--1')).toHaveTextContent(
      '#2',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));
    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(screen.getByTestId('hex-1--1')).toHaveAttribute(
      'data-path-step',
      '2',
    );
    expect(screen.getByTestId('hex-path-step-badge-1--1')).toHaveTextContent(
      '#2',
    );

    act(() => {
      unmount();
    });
  });
});
