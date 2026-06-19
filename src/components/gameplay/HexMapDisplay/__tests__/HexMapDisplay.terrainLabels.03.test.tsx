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

  it('keeps terrain and elevation readable while tactical overlays stack', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      isValidTarget: true,
    });
    const contact = makeToken({
      unitId: 'contact',
      side: GameSide.Opponent,
      position: { q: -1, r: 1 },
      lastKnownPosition: { q: -1, r: 1 },
      fogStatus: 'lastKnown',
    });
    const terrainMatrix: readonly IHexTerrain[] = [
      {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      },
      {
        coordinate: { q: 1, r: 0 },
        elevation: 1,
        features: [{ type: TerrainType.Rough, level: 1 }],
      },
      {
        coordinate: { q: 2, r: 0 },
        elevation: 2,
        features: [{ type: TerrainType.LightWoods, level: 1 }],
      },
      {
        coordinate: { q: -1, r: 1 },
        elevation: -1,
        features: [{ type: TerrainType.Water, level: 1 }],
      },
    ];
    const movementRange: readonly IMovementRangeHex[] = [
      {
        hex: { q: 1, r: 0 },
        mpCost: 3,
        terrainCost: 1,
        elevationDelta: 1,
        elevationCost: 1,
        heatGenerated: 1,
        movementMode: 'walk',
        reachable: true,
        movementType: MovementType.Walk,
      },
    ];

    const { unmount } = render(
      <HexMapDisplay
        mapId="terrain-overlay-stack"
        radius={2}
        tokens={[selected, target, contact]}
        selectedHex={selected.position}
        hexTerrain={terrainMatrix}
        movementRange={movementRange}
        highlightPath={[
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ]}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-movement'));
    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));
    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-2-0'));

    assertTerrainAndElevationBadges(terrainMatrix);
    expect(screen.getByTestId('movement-overlay')).toBeInTheDocument();
    const movementCostOverlay = screen.getByTestId(
      'movement-cost-overlay-hex-1-0',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Terrain movement cost'),
    );
    expect(movementCostOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected movement: walk reachable; 3 MP; terrain +1; elevation delta 1; elevation cost +1; heat +1',
      ),
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-type',
      MovementType.Walk,
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-mode',
      'walk',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-reachable',
      'true',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-mp-cost',
      '3',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-terrain-cost',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-elevation-delta',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-elevation-cost',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-movement-projection-heat-generated',
      '1',
    );
    expect(movementCostOverlay).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(screen.getByTestId('cover-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Partial cover; terrain light woods; elevation +2',
      ),
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-terrain-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-source-terrain',
      TerrainType.LightWoods,
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-terrain-features',
      TerrainType.LightWoods,
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-elevation',
      '2',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-level',
      'none',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-modifier',
      '0',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-partial-cover',
      'false',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-cover-projection-target-ids',
      'target',
    );
    expect(screen.getByTestId('cover-overlay-hex-2-0')).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-line')).toBeInTheDocument();
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent('W');
    expect(screen.getByTestId('hex-path-step-badge-1-0')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveTextContent('+1H');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'walk reachable: 3 MP, terrain +1, elevation delta +1 cost +1, heat +1',
      ),
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveTextContent('S2');
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('unit-token-selected')).toBeInTheDocument();
    expect(screen.getByTestId('unit-token-target')).toBeInTheDocument();
    expect(screen.getByTestId('fog-marker-contact')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });
});
