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

  it('exposes movement mode legend state and disabled jump reason', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{ active: 'run', jumpAvailable: false }}
      />,
    );

    expect(screen.getByTestId('mp-legend')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-walk')).not.toHaveAttribute(
      'data-selectable',
    );
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-label',
      'Walk movement range; inactive',
    );
    expect(
      screen.getByTestId('mp-legend-walk').querySelector('span'),
    ).toHaveClass('bg-cyan-400');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByTestId('mp-legend-run').querySelector('span'),
    ).toHaveClass('bg-yellow-500');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-label',
      'Run movement range; active',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveClass(
      'pointer-events-auto',
    );
    expect(
      screen.getByTestId('mp-legend-jump').querySelector('span'),
    ).toHaveClass('bg-red-500');
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled-reason',
      'No jump capability',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'title',
      'No jump capability',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-label',
      'Jump movement range; inactive; disabled: No jump capability',
    );

    act(() => {
      unmount();
    });
  });

  it('lets selectable map legend movement modes seed movement projection', () => {
    const onMovementModeSelect = jest.fn();
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{ active: 'run', jumpAvailable: false }}
        onMovementModeSelect={onMovementModeSelect}
      />,
    );

    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'data-selectable',
      'true',
    );
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    fireEvent.click(screen.getByTestId('mp-legend-walk'));
    fireEvent.click(screen.getByTestId('mp-legend-run'));
    fireEvent.click(screen.getByTestId('mp-legend-jump'));

    expect(onMovementModeSelect).toHaveBeenCalledTimes(1);
    expect(onMovementModeSelect).toHaveBeenCalledWith('walk');

    act(() => {
      unmount();
    });
  });

  it('exposes selected movement motive and effective MP values in the legend', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{
          active: 'run',
          jumpAvailable: false,
          movementMode: 'vtol',
          walkMP: 3,
          runMP: 5,
          jumpMP: 0,
        }}
      />,
    );

    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'vtol',
    );
    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '3',
    );
    expect(screen.getByTestId('mp-legend')).toHaveAttribute('data-run-mp', '5');
    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-jump-mp',
      '0',
    );
    expect(screen.getByTestId('mp-legend-motive')).toHaveTextContent(
      'Motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-motive')).toHaveAttribute(
      'aria-label',
      'Movement motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveTextContent('Run 5MP');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute('data-mp', '5');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-label',
      'Run movement range; active; 5 MP; motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveTextContent('Jump 0MP');
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-label',
      'Jump movement range; inactive; 0 MP; motive VTOL; disabled: No jump capability',
    );

    act(() => {
      unmount();
    });
  });
});
