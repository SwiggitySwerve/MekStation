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
  it('limits firing-arc overlay to represented multi-arc weapon mounts', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'left-sponson-laser',
              mountingArcs: [FiringArc.Front, FiringArc.Left],
            }),
          ],
        }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toHaveAttribute(
      'data-arc',
      'front',
    );
    expect(screen.getByTestId('firing-arc-hex--1,1')).toHaveAttribute(
      'data-arc',
      'left-side',
    );
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();
  });

  it('uses selected weapon ids to constrain range, target, and arc projection', () => {
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
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        selectedWeaponIds={['rear-short']}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'rear-short',
              mountingArc: FiringArc.Rear,
              ranges: { short: 1, medium: 1, long: 1 },
            }),
            makeWeapon({
              id: 'front-long',
              mountingArc: FiringArc.Front,
              ranges: { short: 2, medium: 4, long: 6 },
            }),
          ],
        }}
      />,
    );

    expect(screen.queryByTestId('firing-arc-hex-0,-1')).toBeNull();
    expect(screen.getByTestId('firing-arc-hex-0,1')).toHaveAttribute(
      'data-arc',
      'rear',
    );

    const targetHex = screen.getByTestId('hex-0--2');
    expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', '');
    expect(targetHex).toHaveAttribute('data-weapons-available', '');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'rear-short:out_of_range',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'rear-short:out-of-arc',
    );
    expect(
      targetHex.getAttribute('data-combat-weapon-option-ranges'),
    ).not.toContain('front-long');
  });

  it('extends firing-arc shading through represented selected weapon extreme range', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: -7 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={7}
        tokens={[selected, enemy]}
        selectedHex={null}
        selectedWeaponIds={['extreme-lrm']}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'extreme-lrm',
              mountingArc: FiringArc.Front,
              ranges: { short: 2, medium: 4, long: 6, extreme: 8 },
            }),
          ],
        }}
      />,
    );

    const arcHex = screen.getByTestId('firing-arc-hex-0,-7');
    expect(arcHex).toHaveAttribute('data-arc', 'front');
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-firing-arc',
      'front',
    );
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-range-bracket',
      'extreme',
    );
    expect(arcHex).toHaveAttribute('data-combat-projection-in-range', 'true');
    expect(arcHex).toHaveAttribute('data-combat-projection-in-arc', 'true');
    expect(arcHex).toHaveAttribute('data-combat-projection-attackable', 'true');
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-target-ids',
      'enemy',
    );
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-weapons-available',
      'extreme-lrm',
    );

    const targetHex = screen.getByTestId('hex-0--7');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'extreme');
    expect(targetHex).toHaveAttribute('data-combat-distance', '7');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'extreme-lrm');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'extreme-lrm');
  });

  it('keeps all firing arcs visible when any selected weapon is omni-mounted', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toHaveAttribute(
      'data-arc',
      'front',
    );
    expect(screen.getByTestId('firing-arc-hex-0,1')).toHaveAttribute(
      'data-arc',
      'rear',
    );
  });

  it('hides firing-arc shading when no selected weapon is operational', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon({ destroyed: true })] }}
      />,
    );

    expect(screen.queryByTestId('firing-arc-hex-0,-1')).toBeNull();
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();
  });
});
