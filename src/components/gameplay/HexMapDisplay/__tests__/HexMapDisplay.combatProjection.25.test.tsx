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
  it('marks hidden-only fog contacts as non-attackable map information', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const hiddenEnemy = makeToken({
      unitId: 'enemy-hidden',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'hidden',
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, hiddenEnemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const hiddenHex = screen.getByTestId('hex-2-0');
    expect(hiddenHex).toHaveAttribute(
      'data-combat-target-visibility',
      'hidden',
    );
    expect(hiddenHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(hiddenHex).toHaveAttribute('data-combat-target-ids', 'enemy-hidden');
    expect(hiddenHex).toHaveAttribute('data-combat-visible-target-ids', '');
    expect(hiddenHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'enemy-hidden',
    );
    expect(hiddenHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Hidden contact is not currently visible',
    );
    expect(hiddenHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    expect(
      screen.getByTestId('hex-combat-visibility-badge-2-0'),
    ).toHaveTextContent('HID');
    expect(
      screen.getByTestId('hex-combat-visibility-badge-2-0'),
    ).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Hidden contact is not currently visible',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('HIDDEN');
  });

  it('keeps visible targets attackable on a mixed visible and fog-contact hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const visibleEnemy = makeToken({
      unitId: 'enemy-visible',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });
    const hiddenContact = makeToken({
      unitId: 'enemy-hidden',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'hidden',
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, visibleEnemy, hiddenContact]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).toHaveAttribute('data-combat-target-visibility', 'mixed');
    expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      'enemy-visible',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'enemy-hidden',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'enemy-visible,enemy-hidden',
    );
    const mixedVisibilityBadge = screen.getByTestId(
      'hex-combat-visibility-badge-2-0',
    );
    expect(mixedVisibilityBadge).toHaveTextContent('MIX');
    expect(mixedVisibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-state',
      'mixed',
    );
    expect(mixedVisibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Target visibility mixed',
    );
  });
});
