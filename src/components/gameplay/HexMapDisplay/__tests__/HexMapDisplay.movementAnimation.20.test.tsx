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

  it('moves occluder highlights when rotation puts a different elevation in front', () => {
    const occluded = makeToken({
      unitId: 'occluded',
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[occluded]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
          {
            coordinate: { q: -1, r: 0 },
            elevation: 5,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '5');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex--1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '-1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '6');
    expect(screen.getByTestId('hex-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(screen.getByTestId('hex--1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toBeNull();
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight--1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');

    fireEvent.mouseEnter(screen.getByTestId('hex--1-0'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '-1,0',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '6',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-rotation'),
    ).toHaveTextContent('Occluder elevation +6; camera 180 deg');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +6 at (-1, 0) may hide unit at elevation +0',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '5');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex--1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight--1-0'),
    ).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('highlights multiple tall terrain layers that may hide the same unit', () => {
    const occluded = makeToken({
      unitId: 'occluded',
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[occluded]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
          {
            coordinate: { q: 0, r: 1 },
            elevation: 2,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-occluded');
    expect(sceneToken).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-hexes',
      '1,0|0,1',
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-elevations',
      '5|3',
    );
    expect(sceneToken).toHaveAttribute('data-isometric-occluder-count', '2');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      expect.stringContaining(
        'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      expect.stringContaining(
        'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
      ),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent(
      'terrain occlusions 2 blockers',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-isometric-occlusion-reason',
      expect.stringContaining(
        'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
      ),
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-0-1'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-elevation-stack-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-0-1'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '0,1',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '3',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
    );

    act(() => {
      unmount();
    });
  });
});
