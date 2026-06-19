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

  it('boosts units hidden behind tall terrain from the isometric camera angle', () => {
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
        ]}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-halo-occluded'),
    ).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-occluded'),
    ).toBeInTheDocument();
    const occludedSceneToken = screen.getByTestId(
      'isometric-scene-token-occluded',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occluder-hex',
      '1,0',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('foreground readability boost'),
    );
    expect(occludedSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'terrain occlusion Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(occludedSceneToken.querySelector('title')).toHaveTextContent(
      'foreground readability boost',
    );
    expect(occludedSceneToken.querySelector('title')).toHaveTextContent(
      'terrain occlusion Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(
      screen.getByTestId('isometric-visibility-reason-occluded'),
    ).toHaveTextContent('ELEV');
    expect(
      screen.getByTestId('isometric-visibility-reason-occluded'),
    ).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    const occluderHighlight = screen.getByTestId(
      'hex-isometric-occluder-highlight-1-0',
    );
    expect(occluderHighlight).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(occluderHighlight).toHaveAttribute(
      'aria-label',
      'Tall elevation +5 may hide units occluded',
    );
    expect(occluderHighlight.querySelector('title')).toHaveTextContent(
      'Tall elevation +5 may hide units occluded',
    );
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '1,0',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-units'),
    ).toHaveTextContent('may hide occluded');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-rotation'),
    ).toHaveTextContent('Occluder elevation +5; camera 0 deg');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(
      screen.queryByTestId('isometric-visibility-halo-occluded'),
    ).toBeNull();
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).not.toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).not.toHaveAttribute('data-isometric-occlusion-reason');
    expect(screen.getByTestId('unit-token-occluded')).not.toHaveAttribute(
      'data-isometric-occlusion-reason',
    );
    expect(
      screen.queryByTestId('isometric-visibility-reason-occluded'),
    ).toBeNull();
    expect(screen.getByTestId('hex-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toBeNull();
    expect(screen.getByTestId('hex-elevation-stack-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.queryByTestId('hex-terrain-tooltip-isometric-occluder'),
    ).toBeNull();

    act(() => {
      unmount();
    });
  });
});
