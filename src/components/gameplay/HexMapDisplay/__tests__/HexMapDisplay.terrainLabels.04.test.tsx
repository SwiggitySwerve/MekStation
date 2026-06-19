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

  it('surfaces represented minefield movement hazards with runner provenance', () => {
    const minefield: IHexTerrain = {
      coordinate: { q: 1, r: 0 },
      elevation: 0,
      features: [{ type: TerrainType.Mines, level: 1 }],
    };
    const movementRange: readonly IMovementRangeHex[] = [
      {
        hex: { q: 1, r: 0 },
        mpCost: 1,
        terrainCost: 0,
        elevationDelta: 0,
        elevationCost: 0,
        heatGenerated: 0,
        movementMode: 'walk',
        reachable: true,
        movementType: MovementType.Walk,
      },
    ];

    const { unmount } = render(
      <HexMapDisplay
        mapId="minefield-hazard-projection"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[minefield]}
        movementRange={movementRange}
      />,
    );

    const hex = screen.getByTestId('hex-1-0');
    const overlay = screen.getByTestId('hex-overlay-1-0');
    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-1-0',
    );

    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'MIN',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-hazard-status',
      'represented-minefield',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-hazard-reasons',
      expect.stringContaining(
        'reachable entry through represented mines can apply 10 damage to each leg',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'movement:mekstation:Represented minefield movement hazard projection:represented mines levels 1; reachable entry can apply 10 damage to each leg and queue PSRs',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-rule-refs',
      expect.stringContaining(
        'movement:mekstation:MekStation src/simulation/runner/phases/movementMines.ts: represented TerrainType.Mines entry applies BattleMech leg damage and queues PSRs',
      ),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('movement hazard status represented-minefield'),
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        '20+ mine damage in the movement phase can queue a damage-threshold PSR',
      ),
    );
    expect(overlay).toHaveAttribute(
      'data-hex-overlay-movement-hazard-status',
      'represented-minefield',
    );
    expect(projectionBadge).toHaveTextContent('HAZ');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-hazard-status',
      'represented-minefield',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-hazard-reasons',
      expect.stringContaining(
        'mine leg structure damage can queue a leg-damage PSR',
      ),
    );

    act(() => {
      unmount();
    });
  });
});
