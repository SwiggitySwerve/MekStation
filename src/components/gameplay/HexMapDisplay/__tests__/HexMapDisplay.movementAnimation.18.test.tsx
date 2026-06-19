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

  it('preserves aerospace altitude and velocity on isometric scene tokens', () => {
    const aerospace = makeToken({
      unitId: 'aero',
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Aerospace,
      altitude: 4,
      velocity: 7,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[aerospace]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-aero');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Aerospace,
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-aerospace-altitude',
      '4',
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-aerospace-velocity',
      '7',
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Unit'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 4'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('velocity 7'),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent('altitude 4');
    expect(sceneToken.querySelector('title')).toHaveTextContent('velocity 7');

    const nestedToken = screen.getByTestId('unit-token-aero');
    expect(nestedToken).toHaveAttribute('data-aerospace-altitude', '4');
    expect(nestedToken).toHaveAttribute('data-aerospace-velocity', '7');

    act(() => {
      unmount();
    });
  });

  it('preserves WiGE altitude on isometric scene vehicle tokens', () => {
    const wige = makeToken({
      unitId: 'wige',
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.WiGE,
      altitude: 2,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[wige]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-wige');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Vehicle,
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-vehicle-motion-type',
      VehicleMotionType.WiGE,
    );
    expect(sceneToken).toHaveAttribute('data-isometric-vehicle-altitude', '2');
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('motion wige'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 2'),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent('altitude 2');

    const nestedToken = screen.getByTestId('unit-token-wige');
    expect(nestedToken).toHaveAttribute('data-vehicle-altitude', '2');
    expect(screen.getByTestId('vehicle-altitude-badge')).toHaveTextContent(
      'ALT2',
    );

    act(() => {
      unmount();
    });
  });
});
