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
  it('shows projected weapon heat and ammo impact in combined tactical hover explanations', () => {
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
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 2, r: 0 },
            mpCost: 2,
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
              id: 'ac-5',
              name: 'AC/5',
              heat: 1,
              ammoRemaining: 8,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );

    fireEvent.mouseEnter(targetHex);

    expect(screen.getByTestId('hex-tactical-tooltip-combat')).toHaveTextContent(
      'Combat: Attack available',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact'),
    ).toHaveTextContent(
      'Impact: +1 heat; ammo AC/5 -1 (7 left); damage 5 listed',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveTextContent(
      'Weapon impact detail: AC/5: +1 heat, 5 damage, ammo -1 (7 left)',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ids', 'ac-5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-names', 'AC/5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-heats', '1');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-damages', '5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-consumed', '1');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '7');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId(
        'hex-tactical-tooltip-combat-weapon-impact-detail-impact-ac-5-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-options'),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-tactical-tooltip-combat-weapon-options-option-ac-5-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-options'),
    ).toHaveTextContent(
      'Weapon options: ac-5: short range, in arc; TN 5; expected 4.2 damage; available',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact'),
    ).toHaveTextContent('expected');
    const toHitRows = screen.getByTestId(
      'hex-tactical-tooltip-combat-to-hit-modifiers',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      expect.stringContaining('Target Terrain'),
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      expect.stringContaining('1'),
    );
    expect(toHitRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const targetTerrainModifier = getToHitModifierRow(
      toHitRows,
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(targetTerrainModifier).toHaveTextContent('Target Terrain +1');
    expect(screen.queryByTestId('hex-combat-tooltip')).toBeNull();
  });

  it('uses represented weapon extreme range instead of marking engine-legal attacks out of range', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 8, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={8}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'extreme-ac',
              ranges: { short: 2, medium: 4, long: 6, extreme: 9 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-8-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'extreme');
    expect(targetHex).toHaveAttribute('data-combat-distance', '8');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'extreme-ac');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'extreme-ac');
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveTextContent('X8');
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveAttribute(
      'aria-label',
      'extreme range at 8 hexes; attack available; weapons available extreme-ac',
    );
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveAttribute(
      'data-combat-badge-label',
      'X8',
    );
  });
});
