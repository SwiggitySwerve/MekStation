import * as H from './HexMapDisplay.combatProjection.test-helpers';

const {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  HEX_COLORS,
  HexMapDisplay,
  MovementType,
  TerrainType,
  TokenUnitType,
  addC3Network,
  createAerospaceCombatState,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
  fireEvent,
  getToHitModifierRow,
  makeAerospaceCombatState,
  makeC3CombatState,
  makeCombatState,
  makeToken,
  makeWeapon,
  render,
  screen,
} = H;

type IGameState = H.IGameState;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
describe('HexMapDisplay combat projection', () => {
  it('preserves rules projection metadata when switching from top-down to isometric', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [{ type: TerrainType.Rough, level: 1 }],
          },
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
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
        ]}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    const targetHex = screen.getByTestId('hex-2-0');

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    expect(movementHex).toHaveAttribute('data-mp-cost', '3');
    expect(movementHex).toHaveAttribute('data-terrain-cost', '1');
    expect(movementHex).toHaveAttribute('data-elevation-delta', '1');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '1');
    expect(movementHex).toHaveAttribute('data-heat-generated', '1');
    expect(movementHex).toHaveAttribute('data-terrain-primary', 'rough');
    expect(movementHex).toHaveAttribute('data-elevation', '1');
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'medium-laser');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute('data-mp-cost', '3');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-delta',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-cost',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-heat-generated',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-terrain-primary',
      'rough',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-los-state',
      'clear',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-valid-target',
      'true',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-tactical-projection-intent',
      'combat',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    const movementSceneHex = screen.getByTestId('isometric-scene-hex-1-0');
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-map-position',
      '1,0',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-elevation',
      '1',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-terrain-primary',
      'rough',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-intent',
      'movement-combat',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-status',
      'legal',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-movement-status',
      'legal',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-combat-status',
      'range-only',
    );
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-sources'),
    ).toContain('movement:megamek');
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-sources'),
    ).toContain('combat:megamek');
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-rule-refs'),
    ).toContain(
      'movement:megamek:MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
    );
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-rule-refs'),
    ).toContain(
      'combat:megamek:MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(movementSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal movement-combat'),
    );
    expect(movementSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(movementSceneHex.querySelector('title')).toHaveTextContent(
      'Walk reachable 3 MP',
    );

    const targetSceneHex = screen.getByTestId('isometric-scene-hex-2-0');
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-map-position',
      '2,0',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-intent',
      'combat',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-status',
      'legal',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-movement-status',
      'none',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-combat-status',
      'attackable',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal combat'),
    );
    expect(targetSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetSceneHex.querySelector('title')).toHaveTextContent(
      'combat short 2 hexes LOS clear',
    );
  });
});
