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
  it('explains empty weapon-range hexes without calling them blocked targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const emptyInRangeHex = screen.getByTestId('hex-1-0');
    expect(emptyInRangeHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    expect(emptyInRangeHex).not.toHaveAttribute('data-combat-valid-target');
    expect(screen.getByTestId('hex-combat-badge-1-0')).toHaveTextContent('S1');
    expect(screen.queryByTestId('hex-combat-los-badge-1-0')).toBeNull();
    expect(screen.queryByTestId('hex-combat-arc-badge-1-0')).toBeNull();

    fireEvent.mouseEnter(emptyInRangeHex);

    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'In range',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'No target',
    );
    const emptyRange = screen.getByTestId('hex-combat-tooltip-range');
    expect(emptyRange).toHaveTextContent('short at 1 hexes');
    expect(emptyRange).toHaveAttribute('data-combat-has-target', 'false');
    expect(emptyRange).toHaveAttribute('data-combat-in-range', 'true');
    expect(emptyRange).toHaveAttribute('data-combat-target-ids', '');
    expect(emptyRange).toHaveAttribute(
      'data-combat-targeting-source-refs',
      expect.stringContaining('combat:megamek:MegaMek weapon range projection'),
    );
    expect(screen.queryByTestId('hex-combat-tooltip-weapon-impact')).toBeNull();
    expect(screen.queryByTestId('hex-combat-tooltip-reason')).toBeNull();
  });

  it('marks same-hex enemy contacts with the engine SameHex invalid reason', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-combat-invalid-reason', 'SameHex');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Attacker and target occupy the same hex',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Attacker and target occupy the same hex',
    );
  });

  it('marks target hexes invalid when no selected weapon is operational', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon({ destroyed: true })] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-1-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'InvalidTarget',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No operational weapons',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No operational weapons',
    );
  });

  it('marks a target blocked when selected weapons cannot cover its firing arc', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 1 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'front-laser',
              mountingArc: FiringArc.Front,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-1');
    expect(targetHex).toHaveAttribute('data-combat-firing-arc', 'rear');
    expect(targetHex).toHaveAttribute('data-combat-in-arc', 'false');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-combat-invalid-reason', 'OutOfArc');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No selected weapons can fire into the rear arc',
    );
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'front-laser');
    expect(targetHex).toHaveAttribute('data-weapons-in-arc', '');
    expect(targetHex).toHaveAttribute('data-weapons-available', '');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'front-laser:short',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'front-laser:out-of-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'front-laser:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'front-laser:out of rear arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No weapons cover rear arc',
    );
    const blockedOverlay = screen.getByTestId('hex-overlay-0-1');
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'combat-blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-status',
      'blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-combat-status',
      'blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-blocked-reasons',
      'No selected weapons can fire into the rear arc|No weapons cover rear arc|OutOfArc',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-sources',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-explanation',
      expect.stringContaining('weapons none available'),
    );
    expect(blockedOverlay).toHaveAccessibleName(
      expect.stringContaining('Hex 0,1 combat-blocked highlight'),
    );
    expect(blockedOverlay).toHaveAccessibleName(
      expect.stringContaining(
        'blocked No selected weapons can fire into the rear arc; No weapons cover rear arc; OutOfArc',
      ),
    );
    expect(screen.getByTestId('hex-combat-badge-0-1')).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'front-laser:out of rear arc',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-0-1'),
    ).toHaveTextContent('ARC');
    expect(screen.getByTestId('hex-combat-los-badge-0-1')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveTextContent(
      'REAR',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveAttribute(
      'aria-label',
      'rear arc not covered',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'false',
    );
  });
});
