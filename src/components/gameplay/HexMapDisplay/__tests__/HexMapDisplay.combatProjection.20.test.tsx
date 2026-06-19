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
  it('surfaces minimum-range penalties on otherwise valid attack targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
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
              id: 'lrm-15-1',
              name: 'LRM-15',
              ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-minimum-range-penalty', '4');
    expect(targetHex).toHaveAttribute(
      'data-combat-minimum-range-weapons',
      'lrm-15-1',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-minimum-range-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Minimum range penalty +4 (lrm-15-1)'),
    );
    expect(screen.getByTestId('hex-minimum-range-badge-3-0')).toHaveTextContent(
      'MIN+4',
    );
    expect(screen.getByTestId('hex-minimum-range-badge-3-0')).toHaveAttribute(
      'data-combat-minimum-range-badge-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );

    fireEvent.mouseEnter(targetHex);
    const minimumRangeRows = screen.getByTestId(
      'hex-combat-tooltip-minimum-range',
    );
    expect(minimumRangeRows).toHaveTextContent(
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'combat',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-penalty',
      '4',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-weapon-ids',
      'lrm-15-1',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: lrm-15-1',
    );
  });

  it('surfaces prone attacker and target modifiers in combat map metadata', () => {
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
            prone: true,
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
            prone: true,
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Attacker Prone:2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Prone:1'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Attacker Prone +2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Prone +1'),
    );
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN7');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN7',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Attacker Prone +2');
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Prone +1');
  });

  it('surfaces shutdown target immobile modifiers in combat map metadata', () => {
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
            shutdown: true,
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '0');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Immobile:-4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Immobile -4'),
    );
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN0');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN0',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Immobile -4');
  });
});
