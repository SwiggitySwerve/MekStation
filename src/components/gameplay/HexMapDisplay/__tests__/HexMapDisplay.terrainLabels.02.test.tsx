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

  it('exposes capped isometric stack metadata for very tall terrain', () => {
    const tallBuilding: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 4,
      features: [{ type: TerrainType.Building, level: 8 }],
    };

    const { unmount } = render(
      <HexMapDisplay
        mapId="capped-building-stack-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[tallBuilding]}
      />,
    );

    expect(screen.queryByTestId('hex-elevation-stack-1-0')).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const hex = screen.getByTestId('hex-1-0');
    const stack = screen.getByTestId('hex-elevation-stack-1-0');
    const cap = screen.getByTestId('hex-elevation-stack-cap-1-0');

    expect(hex).toHaveAttribute('data-elevation', '4');
    expect(hex).toHaveAttribute('data-elevation-layers', '8');
    expect(hex).toHaveAttribute('data-elevation-effective-height', '12');
    expect(hex).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(hex).toHaveAttribute('data-elevation-stack-capped', 'true');
    expect(hex).toHaveAttribute('data-elevation-stack-overflow', '4');

    expect(stack).toHaveAttribute('data-elevation-effective-height', '12');
    expect(stack).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(stack).toHaveAttribute('data-elevation-stack-capped', 'true');
    expect(stack).toHaveAttribute('data-elevation-stack-overflow', '4');
    expect(stack).toHaveAttribute(
      'aria-label',
      'Elevation stack 1,0 shows 8 of 12 effective levels (4 levels above rendered cap)',
    );
    expect(stack.querySelector('title')).toHaveTextContent(
      'Elevation stack 1,0 shows 8 of 12 effective levels (4 levels above rendered cap)',
    );
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-8'),
    ).toHaveTextContent('+8');
    expect(screen.queryByTestId('hex-elevation-stack-layer-1-0-9')).toBeNull();

    expect(cap).toHaveAttribute('data-elevation-effective-height', '12');
    expect(cap).toHaveAttribute('data-elevation-rendered-layers', '8');
    expect(cap).toHaveAttribute('data-elevation-stack-overflow', '4');
    expect(cap).toHaveAttribute(
      'aria-label',
      'Effective stack height +12; 8 of 12 levels rendered',
    );
    expect(cap).toHaveTextContent('+12');

    act(() => {
      unmount();
    });
  });

  it('keeps top-down terrain and elevation badges exposed across playable zoom levels', () => {
    const roughRise: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 2,
      features: [{ type: TerrainType.Rough, level: 1 }],
    };
    let interaction: MapInteractionState | null = null;

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-zoom-labels"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[roughRise]}
        onInteractionReady={(nextInteraction) => {
          interaction = nextInteraction;
        }}
      />,
    );

    const requireInteraction = (): MapInteractionState => {
      if (!interaction) {
        throw new Error('Expected HexMapDisplay to expose map interaction');
      }
      return interaction;
    };

    const assertTopDownLabels = (): void => {
      expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
        'data-projection-mode',
        'topDown',
      );
      assertTerrainAndElevationBadges([roughRise]);
    };

    assertTopDownLabels();

    for (const zoom of [ZOOM_MIN, FOCUS_BUMP_ZOOM, ZOOM_MAX]) {
      act(() => {
        requireInteraction().setZoom(zoom);
      });
      expect(requireInteraction().zoom).toBe(zoom);
      assertTopDownLabels();
    }

    act(() => {
      unmount();
    });
  });
});
