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
  it('shows projected weapon heat and ammo impact in combat hover explanations', () => {
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
        combatState={makeCombatState({
          selected: { side: GameSide.Player, position: { q: 0, r: 0 } },
          enemy: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
        })}
        unitWeapons={{
          selected: [
            makeWeapon({ id: 'medium-laser', name: 'Medium Laser', heat: 3 }),
            makeWeapon({
              id: 'ac-5',
              name: 'AC/5',
              heat: 1,
              ammoRemaining: 12,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser,ac-5',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('weapon heat +4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('ammo AC/5 -1 11 left'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('damage 10 listed'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('expected damage'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'weapon heat +4, ammo AC/5 -1 11 left, damage 10',
      ),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal combat'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 2,0; intent combat'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('weapon heat +4'),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveTextContent(
      'H+4 D10',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveTextContent(
      'A1',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected attack impact: +4 heat; damage 10 listed',
      ),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('ammo AC/5 -1 11 left'),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-heat',
      '4',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-damage',
      '10',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-expected-damage',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-ammo-consumed',
      '1',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-ammo-summary',
      'AC/5 -1 11 left',
    );

    fireEvent.mouseEnter(targetHex);

    const projectionContext = screen.getByTestId(
      'hex-combat-tooltip-projection-context',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'combat',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'attackable',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('weapon heat +4'),
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Legal - combat');
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: attackable');
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-explanation'),
    ).toHaveTextContent('weapon heat +4');
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser, ac-5',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact'),
    ).toHaveTextContent(
      'Impact: +4 heat; ammo AC/5 -1 (11 left); damage 10 listed',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveTextContent(
      'Weapon impact detail: Medium Laser: +3 heat, 5 damage; AC/5: +1 heat, 5 damage, ammo -1 (11 left)',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ids', 'medium-laser|ac-5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-names', 'Medium Laser|AC/5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-heats', '3|1');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-damages', '5|5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-consumed', '0|1');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '|11');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-impact-detail-impact-medium-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-impact-detail-impact-ac-5-1',
      ),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '11');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact'),
    ).toHaveTextContent('expected');
  });
});
