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
  it('surfaces C3 range benefit context in combat hover explanations', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const spotter = makeToken({
      unitId: 'spotter',
      side: GameSide.Player,
      position: { q: 5, r: -1 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 6, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={6}
        tokens={[selected, spotter, enemy]}
        selectedHex={null}
        combatState={makeC3CombatState()}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'c3-laser',
              ranges: { short: 2, medium: 4, long: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-6-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(targetHex).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(targetHex).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('C3 spotter spotter range 2 effective short'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'C3: spotter spotter at 2 hexes improves to short range',
      ),
    );

    fireEvent.mouseEnter(targetHex);

    const c3Context = screen.getByTestId('hex-combat-tooltip-c3-context');
    expect(c3Context).toHaveTextContent(
      'C3: spotter spotter at 2 hexes improves to short range',
    );
    expect(c3Context).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-effective-range',
      'short',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );

    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      expect.stringContaining('C3 Network'),
    );
    expect(toHitRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const c3Modifier = getToHitModifierRow(toHitRows, 'C3 Network');
    expect(c3Modifier).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(c3Modifier).toHaveTextContent('C3 Network +0');
  });

  it('surfaces C3 range benefit context in combined tactical hover explanations', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const spotter = makeToken({
      unitId: 'spotter',
      side: GameSide.Player,
      position: { q: 5, r: -1 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 6, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={6}
        tokens={[selected, spotter, enemy]}
        selectedHex={null}
        combatState={makeC3CombatState()}
        movementRange={[
          {
            hex: { q: 6, r: 0 },
            mpCost: 6,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'c3-laser',
              ranges: { short: 2, medium: 4, long: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-6-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );

    fireEvent.mouseEnter(targetHex);

    const c3Context = screen.getByTestId(
      'hex-tactical-tooltip-combat-c3-context',
    );
    expect(c3Context).toHaveTextContent(
      'C3: spotter spotter at 2 hexes improves to short range',
    );
    expect(c3Context).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-effective-range',
      'short',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const c3Range = screen.getByTestId('hex-tactical-tooltip-combat-range');
    expect(c3Range).toHaveTextContent('Range: short at 6 hexes');
    expect(c3Range).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Range).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Range).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(c3Range).toHaveAttribute('data-combat-distance', '6');
    expect(c3Range).toHaveAttribute(
      'data-combat-targeting-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
  });
});
