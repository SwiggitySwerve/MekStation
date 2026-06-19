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
describe('HexMapDisplay movement animation ordering', () => {
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

  it('renders moving tokens after static tokens so they appear on top', () => {
    const moving = makeToken({
      unitId: 'moving',
      position: { q: 1, r: 0 },
    });
    const staticToken = makeToken({
      unitId: 'static',
      position: { q: 0, r: 0 },
    });
    useAnimationQueue.getState().enqueue({
      id: 'move-top',
      mapId: 'map-1',
      unitId: moving.unitId,
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      mode: MovementType.Walk,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[moving, staticToken]}
        selectedHex={null}
      />,
    );

    const tokenOrder = screen
      .getAllByTestId(/^unit-token-/)
      .map((node) => node.getAttribute('data-testid'));
    expect(tokenOrder).toEqual(['unit-token-static', 'unit-token-moving']);

    act(() => {
      unmount();
    });
  });
});
