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
  it('suppresses minimum-range penalties against airborne aerospace targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
      unitType: TokenUnitType.Aerospace,
      altitude: 3,
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
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 3, r: 0 },
            combatState: {
              kind: 'aero',
              state: makeAerospaceCombatState(3),
            },
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-minimum-range-penalty');
    expect(targetHex).not.toHaveAttribute('data-combat-minimum-range-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Ground-to-air altitude:1'),
    );
    expect(targetHex.getAttribute('aria-label')).not.toContain('Minimum range');
    expect(
      screen.queryByTestId('hex-minimum-range-badge-3-0'),
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.queryByTestId('hex-combat-tooltip-minimum-range'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hex-combat-tooltip-reason'),
    ).not.toHaveTextContent('Minimum Range');
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Ground-to-air altitude +1',
    );
  });

  it('keeps out-of-range targets visibly explainable instead of silently omitting them', () => {
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
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 2 } })],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfRange',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      "Target at 3 hexes is outside the selected weapons' range",
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Out of weapon range',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'blocked',
    );
    expect(screen.getByTestId('hex-combat-badge-3-0')).toHaveTextContent(
      'OUT3',
    );
    expect(screen.getByTestId('hex-combat-badge-3-0')).toHaveAttribute(
      'data-combat-badge-label',
      'OUT3',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-3-0'),
    ).toHaveTextContent('OUT');
    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-3-0',
    );
    expect(projectionBadge).toHaveTextContent('BLK');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-status',
      'blocked',
    );
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-reasons'),
    ).toContain("Target at 3 hexes is outside the selected weapons' range");
  });
});
