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

  it('summarizes projected path length in the movement hover tooltip', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[]}
        selectedHex={{ q: 0, r: 0 }}
        movementRange={[
          {
            hex: { q: 1, r: -1 },
            mpCost: 4,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
            conversionStepCount: 2,
            conversionMpCost: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
              { q: 1, r: -1 },
            ],
          },
        ]}
      />,
    );

    const hex = screen.getByTestId('hex-1--1');
    expect(hex).toHaveAttribute('data-movement-conversion-step-count', '2');
    expect(hex).toHaveAttribute('data-movement-conversion-mp-cost', '0');
    const badge = screen.getByTestId('hex-movement-badge-1--1');
    expect(badge).toHaveAttribute(
      'data-movement-badge-conversion-step-count',
      '2',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-conversion-mp-cost',
      '0',
    );
    expect(badge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('conversion 2 steps 0 MP'),
    );

    fireEvent.mouseEnter(hex);

    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: 4',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-context-kind',
      'terrain-cost',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +1, cost +1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-context-kind', 'elevation-cost');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-elevation-delta', '1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-elevation-cost', '1');
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveTextContent(
      'Heat: +0',
    );
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveAttribute(
      'data-movement-context-kind',
      'heat',
    );
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveAttribute(
      'data-movement-heat-generated',
      '0',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveTextContent('Conversion: 2 steps, 0 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-context-kind', 'conversion');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-conversion-step-count', '2');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-conversion-mp-cost', '0');
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveTextContent(
      'Path: 2 steps',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-context-kind',
      'path',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-path-step-count',
      '2',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-path-coordinates',
      '0,0|1,0|1,-1',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MovePath.java',
      ),
    );

    act(() => {
      unmount();
    });
  });

  it('renders VTOL elevation changes without inventing ground elevation MP costs', () => {
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
            elevationDelta: 4,
            elevationCost: 0,
            movementMode: 'vtol',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const vtolHex = screen.getByTestId('hex-1-0');
    expect(vtolHex).toHaveAttribute('data-movement-mode', 'vtol');
    expect(vtolHex).toHaveAttribute('data-elevation-delta', '4');
    expect(vtolHex).toHaveAttribute('data-elevation-cost', '0');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/VTOL 1MP',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'E+0 UP4',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +0; elevation delta +4',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );

    act(() => {
      unmount();
    });
  });
});
