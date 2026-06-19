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

  it('renders readable elevation labels and movement cost metadata on hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 0, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
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
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
            standUpRequired: true,
            standUpCost: 2,
            standUpPsrRequired: true,
            standUpPsrReason: 'Standing up',
            standUpPsrTargetNumber: 5,
            standUpPsrModifier: 0,
            movementMode: 'tracked',
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
            ],
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-elevation-label-0-0')).toHaveTextContent(
      '+2',
    );
    expect(screen.getByTestId('hex-elevation-label-1-0')).toHaveTextContent(
      '+1',
    );
    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'BLDG2/LWD',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/TRK 3MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'aria-label',
      'walk via tracked reachable: 3 MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'tracked',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveTextContent(
      'STAND 2MP PSR5',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Must stand before moving: stand-up cost 2 MP; PSR required TN 5',
    );

    const reachable = screen.getByTestId('hex-1-0');
    expect(reachable).toHaveAttribute(
      'data-terrain-features',
      'light_woods,building',
    );
    expect(reachable).toHaveAttribute(
      'data-terrain-building-ids',
      'warehouse-a',
    );
    expect(reachable).toHaveAttribute('data-terrain-building-levels', '2');
    expect(reachable).toHaveAttribute(
      'data-terrain-construction-factors',
      '30',
    );
    expect(reachable).toHaveAttribute('data-terrain-primary', 'building');
    expect(reachable).toHaveAttribute('data-mp-cost', '3');
    expect(reachable).toHaveAttribute('data-terrain-cost', '1');
    expect(reachable).toHaveAttribute('data-heat-generated', '0');
    expect(screen.queryByTestId('hex-heat-badge-1-0')).toBeNull();
    expect(reachable).toHaveAttribute('data-elevation-delta', '1');
    expect(reachable).toHaveAttribute('data-elevation-cost', '1');
    expect(reachable).toHaveAttribute('data-movement-mode', 'tracked');
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection',
      ),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('mode tracked'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('terrain cost +1'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('elevation delta +1 cost +1'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('heat +0'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('path 1 step'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('stand-up normal +2 MP'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('stand-up PSR Standing up TN 5'),
    );
    expect(reachable).toHaveAttribute('data-stand-up-required', 'true');
    expect(reachable).toHaveAttribute('data-stand-up-cost', '2');
    expect(reachable).toHaveAttribute('data-stand-up-psr-required', 'true');
    expect(reachable).toHaveAttribute('data-stand-up-psr-target', '5');
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('terrain building L2, light woods L1'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('primary building'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('building warehouse-a'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('level 2 CF 30'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('walk via tracked reachable'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal movement'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent movement'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    const reachableOverlay = screen.getByTestId('hex-overlay-1-0');
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-status',
      'legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-movement-status',
      'legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-combat-status',
      'none',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(reachableOverlay).toHaveAccessibleName(
      expect.stringContaining('Hex 1,0 movement-legal highlight'),
    );
    expect(reachableOverlay).toHaveAccessibleName(
      expect.stringContaining('movement legal'),
    );

    fireEvent.mouseEnter(reachable);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Reachable - walk via tracked',
    );
    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: 3',
    );
    const movementTerrainContext = screen.getByTestId(
      'hex-movement-tooltip-terrain-context',
    );
    expect(movementTerrainContext).toHaveTextContent(
      'Terrain: light woods, building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-features',
      'light_woods,building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-feature-levels',
      'building:2|light_woods:1',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const movementElevationContext = screen.getByTestId(
      'hex-movement-tooltip-elevation-context',
    );
    expect(movementElevationContext).toHaveTextContent('Elevation: +1');
    expect(movementElevationContext).toHaveAttribute('data-elevation', '1');
    expect(movementElevationContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining('elevation 1'),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveTextContent('Building: warehouse-a (level 2, CF 30)');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-building-ids', 'warehouse-a');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-building-levels', '2');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-construction-factors', '30');
    const projectionContext = screen.getByTestId(
      'hex-movement-tooltip-projection-context',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'movement',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection',
      ),
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Legal - movement');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: legal; combat channel: none');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-explanation'),
    ).toHaveTextContent('Walk reachable 3 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-sources'),
    ).toHaveTextContent('movement: MegaMek movement rules projection');
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +1, cost +1');
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveTextContent(
      'Heat: +0',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up'),
    ).toHaveTextContent('Stand up: +2 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveTextContent('Standing up TN 5');

    act(() => {
      unmount();
    });
  });
});
