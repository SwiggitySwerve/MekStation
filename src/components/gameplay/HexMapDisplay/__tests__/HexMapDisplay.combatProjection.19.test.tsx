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
  it('projects target-hex woods as terrain to-hit metadata, not partial cover', () => {
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
        unitWeapons={{ selected: [makeWeapon()] }}
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
            gunnery: 4,
            heat: 0,
            movementThisTurn: MovementType.Stationary,
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
            movementThisTurn: MovementType.Stationary,
            hexesMovedThisTurn: 0,
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-target-cover-level', 'none');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Gunnery Skill:4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Terrain:1'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('To-hit 5'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Terrain +1'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('To-hit 5'),
    );
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN5');
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '5',
    );

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN5',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'enemy',
    );
    const attackRange = screen.getByTestId('hex-combat-tooltip-range');
    expect(attackRange).toHaveTextContent('short at 2 hexes');
    expect(attackRange).toHaveAttribute('data-combat-attackable', 'true');
    expect(attackRange).toHaveAttribute(
      'data-combat-valid-target-ids',
      'enemy',
    );
    expect(attackRange).toHaveAttribute(
      'data-combat-weapons-available',
      'medium-laser',
    );
    const attackGeometry = screen.getByTestId('hex-combat-tooltip-geometry');
    expect(attackGeometry).toHaveTextContent('LOS clear; front arc');
    expect(attackGeometry).toHaveAttribute('data-combat-los-state', 'clear');
    expect(attackGeometry).toHaveAttribute('data-combat-firing-arc', 'front');
    const combatTerrainContext = screen.getByTestId(
      'hex-combat-tooltip-terrain-context',
    );
    expect(combatTerrainContext).toHaveTextContent('Terrain: light woods');
    expect(combatTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'light_woods',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1 elevation 0',
      ),
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const combatElevationContext = screen.getByTestId(
      'hex-combat-tooltip-elevation-context',
    );
    expect(combatElevationContext).toHaveTextContent('Elevation: 0');
    expect(combatElevationContext).toHaveAttribute('data-elevation', '0');
    const combatReason = screen.getByTestId('hex-combat-tooltip-reason');
    expect(combatReason).toHaveTextContent('To-hit 5');
    expect(combatReason).toHaveTextContent('Target Terrain +1');
    expect(combatReason).toHaveAttribute('data-combat-attackable', 'true');
    expect(combatReason).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Terrain +1'),
    );
    expect(combatReason).toHaveAttribute(
      'data-combat-reason-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(combatReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser',
    );
    const visibilityRows = screen.getByTestId('hex-combat-tooltip-visibility');
    expect(visibilityRows).toHaveTextContent(
      'Visibility: visible (visible enemy)',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'combat',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-state',
      'visible',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-visible-target-ids',
      'enemy',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-obscured-target-ids',
      '',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(
      screen.queryByTestId('hex-combat-tooltip-cover'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Terrain +1');
    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-modifier-count', '6');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      'Gunnery Skill|Range (short)|Attacker Movement|Target Movement (TMM)|Heat|Target Terrain',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      '4|0|0|0|0|1',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-sources',
      expect.stringContaining('terrain'),
    );
    expect(getToHitModifierRow(toHitRows, 'Gunnery Skill')).toHaveTextContent(
      'Gunnery Skill +4',
    );
    const targetTerrainModifier = getToHitModifierRow(
      toHitRows,
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveAttribute(
      'data-combat-to-hit-modifier-name',
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveTextContent('Target Terrain +1');
  });
});
