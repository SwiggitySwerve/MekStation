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

  it('renders intact quad stand-up no-PSR context without relying only on color', () => {
    const automaticSuccessReason =
      'Quad Mek has all four legs and does not need a stand-up PSR';
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
            heatGenerated: 1,
            standUpRequired: true,
            standUpCost: 2,
            standUpPsrRequired: false,
            standUpPsrReason: automaticSuccessReason,
            standUpPsrModifier: 0,
            standUpPsrModifierDetails: [],
            standUpPsrAutomaticSuccessReason: automaticSuccessReason,
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveTextContent(
      'STAND 2MP',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'data-stand-up-psr-required',
      'false',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'data-stand-up-psr-automatic-success-reason',
      automaticSuccessReason,
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'aria-label',
      `Must stand before moving: stand-up cost 2 MP; ${automaticSuccessReason}; no PSR`,
    );

    const reachable = screen.getByTestId('hex-1-0');
    expect(reachable).toHaveAttribute(
      'data-stand-up-psr-automatic-success-reason',
      automaticSuccessReason,
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(`stand-up no PSR ${automaticSuccessReason}`),
    );

    fireEvent.mouseEnter(reachable);
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveTextContent(`${automaticSuccessReason}: no PSR`);
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-required', 'false');

    act(() => {
      unmount();
    });
  });
});
