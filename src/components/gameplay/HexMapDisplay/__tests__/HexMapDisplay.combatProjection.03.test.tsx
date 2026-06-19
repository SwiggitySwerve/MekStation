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
  it('marks enemy target hexes with weapon bracket, LOS, arc, and valid-target metadata', () => {
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
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'medium-laser');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'medium-laser');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'medium-laser:short',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'medium-laser:in-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-environment-states',
      'medium-laser:legal',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'medium-laser:available',
    );
    expect(targetHex).toHaveAttribute('data-combat-target-ids', 'enemy');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('arc front'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('targets enemy'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('visibility visible'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('weapons medium-laser'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'weapon options medium-laser short range in arc available',
      ),
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveTextContent('S2');
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-label',
      'S2',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'aria-label',
      'short range at 2 hexes; attack available; weapons available medium-laser',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-attackable',
      'true',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'medium-laser:short',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'medium-laser:available',
    );
    expect(
      screen.queryByTestId('hex-combat-weapon-count-badge-2-0'),
    ).toBeNull();
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveAttribute(
      'data-combat-los-badge-state',
      'clear',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-2-0')).toHaveTextContent(
      'FRONT',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-2-0')).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'true',
    );
    expect(screen.queryByTestId('hex-combat-visibility-badge-2-0')).toBeNull();
  });

  it('renders mixed per-weapon range and arc option metadata', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: -2 },
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
              id: 'front-laser',
              mountingArc: FiringArc.Front,
            }),
            makeWeapon({
              id: 'rear-laser',
              mountingArc: FiringArc.Rear,
            }),
            makeWeapon({
              id: 'small-laser',
              ranges: { short: 1, medium: 1, long: 1 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0--2');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'front-laser');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'front-laser:short|rear-laser:short|small-laser:out_of_range',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'front-laser:in-arc|rear-laser:out-of-arc|small-laser:in-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'front-laser:available|rear-laser:blocked|small-laser:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'weapon options front-laser short range in arc available, rear-laser short range out of arc blocked: out of front arc, small-laser out_of_range range in arc blocked: out of range',
      ),
    );

    const combatBadge = screen.getByTestId('hex-combat-badge-0--2');
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'front-laser:short|rear-laser:short|small-laser:out_of_range',
    );
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );
    const weaponCountBadge = screen.getByTestId(
      'hex-combat-weapon-count-badge-0--2',
    );
    expect(weaponCountBadge).toHaveTextContent('1/3 WPN');
    expect(weaponCountBadge).toHaveAttribute(
      'aria-label',
      'Weapons available 1 of 3; blocked 2; blocked rear-laser: out of front arc, small-laser: out of range',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-available',
      '1',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-total',
      '3',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked',
      '2',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-weapons-available',
      'front-laser',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );

    fireEvent.mouseEnter(targetHex);

    const weaponOptions = screen.getByTestId(
      'hex-combat-tooltip-weapon-options',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-options-option-front-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(weaponOptions).toHaveTextContent(
      'Weapon options: front-laser: short range, in arc; available; rear-laser: short range, out of arc; blocked - out of front arc; small-laser: out of range, in arc; blocked - out of range',
    );
  });
});
