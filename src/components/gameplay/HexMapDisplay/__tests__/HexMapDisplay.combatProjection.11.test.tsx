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
  it('uses the range bracket from weapons that are both in range and in arc', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 3 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={3}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'front-close',
              name: 'Front Close Weapon',
              mountingArc: FiringArc.Front,
              ranges: { short: 3, medium: 5, long: 7 },
            }),
            makeWeapon({
              id: 'rear-lrm',
              name: 'Rear LRM',
              mountingArc: FiringArc.Rear,
              ranges: { short: 2, medium: 4, long: 8 },
            }),
          ],
        }}
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 0, r: 3 },
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-3');
    expect(targetHex).toHaveAttribute('data-combat-firing-arc', 'rear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'medium');
    expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'front-close,rear-lrm',
    );
    expect(targetHex).toHaveAttribute('data-weapons-in-arc', 'rear-lrm');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'rear-lrm');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Range (medium):2'),
    );
    expect(screen.getByTestId('hex-combat-badge-0-3')).toHaveTextContent('M3');
    expect(screen.getByTestId('hex-to-hit-badge-0-3')).toHaveTextContent('TN6');
  });

  it('keeps level-1 intervening buildings clear under MegaMek normal LOS', () => {
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
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-reason');
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
  });

  it('projects adjacent equal-height buildings as target partial cover', () => {
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
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-cover-level',
      'partial',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'true',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '1');
    expect(targetHex).toHaveAttribute(
      'data-combat-cover-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Partial Cover:1'),
    );
    const coverBadge = screen.getByTestId('hex-cover-badge-2-0');
    expect(coverBadge).toHaveTextContent('P+1');
    expect(coverBadge).toHaveAttribute('data-combat-cover-badge-label', 'P+1');
    const coverOverlay = screen.getByTestId('cover-overlay-hex-2-0');
    expect(coverOverlay).toHaveAttribute('data-cover-level', 'partial');
    expect(coverOverlay).toHaveAttribute('data-terrain-cover-level', 'none');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-level',
      'partial',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-partial-cover',
      'true',
    );
    expect(coverOverlay).toHaveAttribute('data-cover-projection-modifier', '1');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-target-ids',
      'enemy',
    );
    expect(coverOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected combat cover: partial +1; target partial cover true',
      ),
    );

    fireEvent.mouseEnter(targetHex);
    const coverRows = screen.getByTestId('hex-combat-tooltip-cover');
    expect(coverRows).toHaveTextContent(
      'Cover: partial +1 - Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(coverRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(coverRows).toHaveAttribute('data-tactical-rules-surface', 'combat');
    expect(coverRows).toHaveAttribute('data-combat-cover-level', 'partial');
    expect(coverRows).toHaveAttribute('data-combat-cover-modifier', '1');
    expect(coverRows).toHaveAttribute('data-combat-cover-partial', 'true');
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
  });
});
