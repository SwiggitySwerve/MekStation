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
  it('surfaces LOS blocker context in combined tactical hover explanations', () => {
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
        movementRange={[
          {
            hex: { q: 2, r: 0 },
            mpCost: 2,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
        unitWeapons={{ selected: [makeWeapon()] }}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 2 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );

    fireEvent.mouseEnter(targetHex);

    const losContext = screen.getByTestId(
      'hex-tactical-tooltip-combat-los-context',
    );
    expect(losContext).toHaveTextContent(
      'LOS context: blocked via terrain at 1,0, terrain building - Blocked by building at (1, 0)',
    );
    expect(losContext).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(losContext).toHaveAttribute('data-combat-los-blocker-hex', '1,0');
    expect(losContext).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      TerrainType.Building,
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(losContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(losContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat|los-blocker',
    );
    expect(losContext).toHaveAttribute(
      'data-tactical-rules-surface',
      'line-of-sight',
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-context-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-context-source-refs',
      expect.stringContaining(
        'los-blocker:megamek:MegaMek LOS blocker projection',
      ),
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-context-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(losContext).toHaveAttribute(
      'data-combat-los-context-rule-refs',
      expect.stringContaining('los-blocker:megamek:MegaMek LosEffects.java'),
    );
    const tacticalLosReason = screen.getByTestId(
      'hex-tactical-tooltip-combat-reason',
    );
    expect(tacticalLosReason).toHaveTextContent('Blocked by building');
    expect(tacticalLosReason).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-target-ids',
      'enemy',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
  });

  it('keeps destroyed unit markers from creating LOS blocker highlights', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const wreck = makeToken({
      unitId: 'wreck',
      name: 'Wreck',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
      isDestroyed: true,
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
        tokens={[selected, wreck, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-reason');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-hex');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-kind');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(
      screen.queryByTestId('hex-combat-los-blocker-badge-1-0'),
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(targetHex);

    expect(
      screen.queryByTestId('hex-combat-tooltip-los-context'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS clear; front arc',
    );
  });
});
