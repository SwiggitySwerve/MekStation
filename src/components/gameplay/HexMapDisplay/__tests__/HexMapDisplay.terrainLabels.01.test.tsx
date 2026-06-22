import * as H from './HexMapDisplay.terrainLabels.test-helpers';

const {
  FOCUS_BUMP_ZOOM,
  Facing,
  GameSide,
  HexMapDisplay,
  MovementType,
  TERRAIN_BADGE_BY_TYPE,
  TERRAIN_COORDS,
  TerrainType,
  TokenUnitType,
  ZOOM_MAX,
  ZOOM_MIN,
  act,
  assertTerrainAndElevationBadges,
  assertTerrainElevationProjectionMetadata,
  buildTerrainMatrix,
  fireEvent,
  formatElevationLabel,
  formatTerrainFeatureReferenceLabel,
  formatTerrainLabel,
  makeToken,
  makeWeapon,
  render,
  screen,
  terrainFeatureLevel,
  terrainFeatureLevelsAttribute,
  useAnimationQueue,
} = H;

type IHexCoordinate = H.IHexCoordinate;
type IHexTerrain = H.IHexTerrain;
type IMovementRangeHex = H.IMovementRangeHex;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
type MapInteractionState = H.MapInteractionState;
type MapProjectionMode = H.MapProjectionMode;
describe('HexMapDisplay terrain and elevation labels', () => {
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

  it('renders the full terrain vocabulary with readable top-down elevation badges and isometric stacks', () => {
    const terrainMatrix = buildTerrainMatrix();
    const tallHex = terrainMatrix.find((terrain) => terrain.elevation > 0);

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-labels"
        radius={3}
        tokens={[]}
        selectedHex={null}
        hexTerrain={terrainMatrix}
      />,
    );

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    assertTerrainAndElevationBadges(terrainMatrix);

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    assertTerrainAndElevationBadges(terrainMatrix, 'isometric2d');
    expect(tallHex).toBeDefined();
    expect(
      screen.getByTestId(
        `hex-elevation-stack-${tallHex?.coordinate.q}-${tallHex?.coordinate.r}`,
      ),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('exposes terrain feature levels for layered terrain in both map projections', () => {
    const layeredTerrain: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Smoke, level: 2 },
        { type: TerrainType.Building, level: 3 },
      ],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="layered-terrain-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[layeredTerrain]}
      />,
    );

    const assertLayeredReference = (
      projectionMode: MapProjectionMode,
    ): void => {
      const hex = screen.getByTestId('hex-1-0');
      const terrainBadge = screen.getByTestId('hex-terrain-label-1-0');
      const elevationBadge = screen.queryByTestId('hex-elevation-label-1-0');

      expect(hex).toHaveAttribute(
        'aria-label',
        expect.stringContaining(
          'terrain smoke L2, building L3, water L2; primary smoke; elevation +2',
        ),
      );
      expect(hex).toHaveAttribute(
        'data-terrain-feature-levels',
        'smoke:2|building:3|water:2',
      );
      expect(terrainBadge).toHaveTextContent('SMK2/BLDG3+1');
      expect(terrainBadge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Terrain smoke L2, building L3, water L2'),
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-badge',
        'SMK2/BLDG3+1',
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-features',
        'smoke,building,water',
      );
      expect(terrainBadge).toHaveAttribute(
        'data-terrain-feature-levels',
        'smoke:2|building:3|water:2',
      );
      expect(terrainBadge).toHaveAttribute('data-terrain-feature-count', '3');
      expect(terrainBadge).toHaveAttribute(
        'data-projection-mode',
        projectionMode,
      );
      const projectionBadges =
        projectionMode === 'topDown'
          ? [terrainBadge, elevationBadge]
          : [terrainBadge];
      for (const badge of projectionBadges) {
        expect(badge).not.toBeNull();
        if (!badge) throw new Error('Expected terrain projection badge');
        assertTerrainElevationProjectionMetadata(badge, layeredTerrain);
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('water depth 2'),
        );
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('smoke intensity 2'),
        );
        expect(badge).toHaveAttribute(
          'data-tactical-projection-sources',
          expect.stringContaining('building level 3'),
        );
      }
      if (projectionMode === 'isometric2d') {
        expect(elevationBadge).toBeNull();
      }
    };

    assertLayeredReference('topDown');

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    assertLayeredReference('isometric2d');

    act(() => {
      unmount();
    });
  });

  it('surfaces represented cliff exits in hex labels and terrain hover context', () => {
    const cliffTerrain: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [
        {
          type: TerrainType.Rough,
          level: 1,
          cliffTopExits: [Facing.North, Facing.Southeast],
        },
      ],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="cliff-exit-terrain-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[cliffTerrain]}
      />,
    );

    const cliffHex = screen.getByTestId('hex-1-0');
    expect(cliffHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('terrain rough L1 cliff edges N,SE'),
    );
    expect(cliffHex).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(cliffHex).toHaveAttribute('data-terrain-cliff-exit-labels', 'N,SE');
    expect(cliffHex).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:rough level 1 cliff edges N/SE elevation 2',
      ),
    );

    const terrainBadge = screen.getByTestId('hex-terrain-label-1-0');
    expect(terrainBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Terrain rough L1 cliff edges N,SE'),
    );
    expect(terrainBadge).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(terrainBadge).toHaveAttribute(
      'data-terrain-cliff-exit-labels',
      'N,SE',
    );

    fireEvent.mouseEnter(cliffHex);

    const cliffContext = screen.getByTestId('hex-terrain-tooltip-cliff-exits');
    expect(cliffContext).toHaveTextContent('Cliff edges: North, Southeast');
    expect(cliffContext).toHaveAttribute('data-terrain-cliff-exits', '0,2');
    expect(cliffContext).toHaveAttribute(
      'data-terrain-cliff-exit-labels',
      'N,SE',
    );
    expect(cliffContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining('rough level 1 cliff edges N/SE elevation 2'),
    );

    act(() => {
      unmount();
    });
  });

  it('renders represented building levels as isometric stack layers on flat terrain', () => {
    const flatBuilding: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Building, level: 3 }],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="building-stack-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[flatBuilding]}
      />,
    );

    expect(screen.queryByTestId('hex-elevation-stack-1-0')).toBeNull();
    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'BLDG3',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation',
      '0',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-layers',
      '3',
    );
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toBeInTheDocument();
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-3'),
    ).toHaveAttribute('aria-label', 'Elevation layer +3 of hex 1,0');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-3'),
    ).toHaveTextContent('+3');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-1'),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });
});
