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
  it('projects hull-down cover metadata and to-hit modifiers from combat state', () => {
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
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
            hullDown: true,
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-target-hull-down', 'true');
    expect(targetHex).toHaveAttribute('data-combat-hull-down-modifier', '2');
    expect(targetHex).toHaveAttribute(
      'data-combat-hull-down-reason',
      'Target in hull-down position: +2',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Hull-Down:2'),
    );
    const coverOverlay = screen.getByTestId('cover-overlay-hex-2-0');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-target-hull-down',
      'true',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-hull-down-modifier',
      '2',
    );

    fireEvent.mouseEnter(targetHex);
    const coverRows = screen.getByTestId('hex-combat-tooltip-cover');
    expect(coverRows).toHaveAttribute('data-combat-target-hull-down', 'true');
    expect(coverRows).toHaveAttribute('data-combat-hull-down-modifier', '2');
    expect(coverRows).toHaveTextContent('Target in hull-down position: +2');
  });

  it('does not project adjacent horizontal cover for vehicle targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
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
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
  });

  it('does not project partial-water cover for vehicle targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
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
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
  });

  it('projects active target water cover on the map when multiple targets share a hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const mechTarget = makeToken({
      unitId: 'mech-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Mech,
    });
    const vehicleTarget = makeToken({
      unitId: 'vehicle-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, mechTarget, vehicleTarget]}
        selectedHex={null}
        targetUnitId="vehicle-target"
        unitWeapons={{ selected: [makeWeapon()] }}
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          'mech-target': {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
          'vehicle-target': {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'mech-target,vehicle-target',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      'vehicle-target',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
  });
});
