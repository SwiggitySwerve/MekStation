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

  it('keeps movement type visible on hovered path cost badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverMpCost={4}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 4,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
            movementMode: 'hover',
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
            ],
            reachable: true,
            movementType: MovementType.Run,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'R/HOV 4MP',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('hex-movement-badge-1-0')).toBeNull();
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveTextContent(
      'R/HOV 4MP',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'aria-label',
      'run via hover path preview: 4 MP; terrain +1; elevation delta +1 cost +1; heat +2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-hover-mp-cost',
      '4',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'hover',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-elevation-delta',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-elevation-cost',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-source-refs'),
    ).toContain(
      'movement:megamek:MegaMek movement rules projection:run/hover projection: run via hover reachable 4 MP terrain +1 elevation delta +1 cost +1 heat +2',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-rule-refs'),
    ).toContain('movement:megamek:MegaMek common/moves/MoveStep.java');

    act(() => {
      unmount();
    });
  });

  it('keeps hovered path cost badges tied to the primary movement option', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverMpCost={5}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 5,
            terrainCost: 2,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Run,
            movementModeOptions: [
              {
                movementMode: 'tracked',
                movementType: MovementType.Run,
                reachable: true,
                mpCost: 5,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 2,
              },
              {
                movementMode: 'tracked',
                movementType: MovementType.Walk,
                reachable: true,
                mpCost: 3,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 1,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'R5/W3 MP',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('hex-movement-badge-1-0')).toBeNull();
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveTextContent(
      'R/TRK 5MP',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'aria-label',
      'run via tracked path preview: 5 MP; terrain +2; elevation delta +1 cost +1; heat +2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-hover-mp-cost',
      '5',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'tracked',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-source-refs'),
    ).toContain(
      'run/tracked,walk/tracked projection: run via tracked reachable 5 MP terrain +2 elevation delta +1 cost +1 heat +2, walk via tracked reachable 3 MP terrain +2 elevation delta +1 cost +1 heat +1',
    );

    act(() => {
      unmount();
    });
  });
});
