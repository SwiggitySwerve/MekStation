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

  it('shows terrain and elevation inspection when no action hover is active', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [
              { type: TerrainType.LightWoods, level: 1 },
              {
                type: TerrainType.Building,
                level: 2,
                buildingId: 'warehouse-a',
                constructionFactor: 30,
              },
            ],
          },
        ]}
      />,
    );

    const inspected = screen.getByTestId('hex-1-0');
    fireEvent.mouseEnter(inspected);

    expect(inspected).toHaveAttribute(
      'data-terrain-building-ids',
      'warehouse-a',
    );
    expect(inspected).toHaveAttribute('data-terrain-building-levels', '2');
    expect(inspected).toHaveAttribute(
      'data-terrain-construction-factors',
      '30',
    );
    expect(inspected).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    const terrainTooltipTitle = screen.getByTestId('hex-terrain-tooltip-title');
    expect(terrainTooltipTitle).toHaveTextContent(
      'Terrain: light woods, building',
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const terrainTooltipElevation = screen.getByTestId(
      'hex-terrain-tooltip-elevation',
    );
    expect(terrainTooltipElevation).toHaveTextContent('Elevation: +1');
    expect(terrainTooltipElevation).toHaveAttribute('data-elevation', '1');
    expect(terrainTooltipElevation).toHaveAttribute(
      'data-terrain-primary',
      'building',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveTextContent('Building: warehouse-a (level 2, CF 30)');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-building-ids', 'warehouse-a');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-building-levels', '2');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-construction-factors', '30');
    expect(screen.getByTestId('hex-terrain-tooltip-cover')).toHaveTextContent(
      'Cover: partial',
    );
    expect(screen.getByTestId('hex-terrain-tooltip-los')).toHaveTextContent(
      'LOS: blocks',
    );
    const terrainProjectionContext = screen.getByTestId(
      'hex-terrain-tooltip-projection-context',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'neutral',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'terrain',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('elevation 1'),
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Neutral - terrain');
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: none');
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-explanation'),
    ).toHaveTextContent('elevation 1');
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection neutral terrain'),
    );
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent terrain'),
    );
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('elevation 1'),
    );
    expect(screen.queryByTestId('hex-movement-tooltip')).toBeNull();
    expect(screen.queryByTestId('hex-combat-tooltip')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('keeps terrain and elevation context visible on generic unreachable hovers', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.HeavyWoods, level: 1 }],
          },
        ]}
      />,
    );

    const unreachable = screen.getByTestId('hex-1-0');
    fireEvent.mouseEnter(unreachable);

    expect(screen.getByTestId('hex-unreachable-tooltip')).toHaveTextContent(
      'Unreachable',
    );
    const unreachableTerrainContext = screen.getByTestId(
      'hex-unreachable-tooltip-terrain-context',
    );
    expect(unreachableTerrainContext).toHaveTextContent('Terrain: heavy woods');
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'heavy_woods',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-feature-levels',
      'heavy_woods:1',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:heavy_woods level 1 elevation 2',
      ),
    );
    const unreachableElevationContext = screen.getByTestId(
      'hex-unreachable-tooltip-elevation-context',
    );
    expect(unreachableElevationContext).toHaveTextContent('Elevation: +2');
    expect(unreachableElevationContext).toHaveAttribute('data-elevation', '2');
    const unreachableProjectionContext = screen.getByTestId(
      'hex-unreachable-tooltip-projection-context',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'neutral',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'terrain',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('elevation 2'),
    );
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Neutral - terrain');
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: none');
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-explanation'),
    ).toHaveTextContent('elevation 2');
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection neutral terrain'),
    );
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent terrain'),
    );
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('elevation 2'),
    );

    act(() => {
      unmount();
    });
  });
});
