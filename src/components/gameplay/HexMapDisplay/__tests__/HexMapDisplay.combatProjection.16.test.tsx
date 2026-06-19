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
  it('stacks smoke and woods in one intervening hex for combat to-hit metadata', () => {
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
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [
              { type: TerrainType.Smoke, level: 1 },
              { type: TerrainType.LightWoods, level: 1 },
            ],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'partial');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Partial cover through smoke and light woods at (1, 0)',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Intervening Terrain:2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Intervening Terrain +2'),
    );

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Intervening Terrain +2');
    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      expect.stringContaining('2'),
    );
    expect(
      getToHitModifierRow(toHitRows, 'Intervening Terrain'),
    ).toHaveTextContent('Intervening Terrain +2');
  });

  it('preserves multi-feature terrain blockers when deriving combat LOS from map terrain', () => {
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
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [
              { type: TerrainType.LightWoods, level: 1 },
              { type: TerrainType.Building, level: 2 },
            ],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      expect.stringContaining('Blocked by building'),
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      expect.stringContaining('Blocked by building'),
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('BLDG');
  });
});
