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
  it('shows elevation blocker reasons without relying on terrain type fallback', () => {
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
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by elevation +2 at (1, 0)',
    );
    expect(targetHex).toHaveAttribute('data-combat-los-blocker-hex', '1,0');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'elevation',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by elevation +2 at (1, 0)',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Blocked by elevation +2 at (1, 0)',
    );
    const invalidBadge = screen.getByTestId('hex-combat-invalid-badge-2-0');
    expect(invalidBadge).toHaveTextContent('ELEV');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by elevation +2 at (1, 0)',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      expect.stringContaining(
        'los-blocker:megamek:MegaMek LOS blocker projection',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      expect.stringContaining('Blocked by elevation +2 at (1, 0)'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      expect.stringContaining('los-blocker:megamek:MegaMek LosEffects.java'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('combat status blocked'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('Blocked by elevation +2 at (1, 0)'),
    );
    const blockerBadge = screen.getByTestId('hex-combat-los-blocker-badge-1-0');
    expect(blockerBadge).toHaveTextContent('LOS ELEV');
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'elevation',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by elevation +2 at (1, 0)',
    );

    fireEvent.mouseEnter(targetHex);

    const losContext = screen.getByTestId('hex-combat-tooltip-los-context');
    expect(losContext).toHaveTextContent(
      'LOS context: blocked via elevation at 1,0 - Blocked by elevation +2 at (1, 0)',
    );
    expect(losContext).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(losContext).toHaveAttribute('data-combat-los-blocker-hex', '1,0');
    expect(losContext).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'elevation',
    );
    expect(losContext).not.toHaveAttribute('data-combat-los-blocker-terrain');
    expect(losContext).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by elevation +2 at (1, 0)',
    );
  });

  it('surfaces intervening smoke as LOS terrain and to-hit metadata', () => {
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
            features: [{ type: TerrainType.Smoke, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'partial');
    expect(targetHex).toHaveAttribute('data-combat-los-blocker-hex', '1,0');
    expect(targetHex).toHaveAttribute('data-combat-los-blocker-kind', 'cover');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      TerrainType.Smoke,
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Partial cover through smoke at (1, 0)',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Intervening Terrain:1'),
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'P-LOS',
    );
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN5');
    const blockerBadge = screen.getByTestId('hex-combat-los-blocker-badge-1-0');
    expect(blockerBadge).toHaveTextContent('LOS COV');
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'partial',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'cover',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      TerrainType.Smoke,
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Partial cover through smoke at (1, 0)',
    );
    const blockerHex = screen.getByTestId('hex-1-0');
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'los-blocker',
    );
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-status',
      'mixed',
    );
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'mixed',
    );
    expect(
      blockerHex.getAttribute('data-tactical-projection-blocked-reasons'),
    ).toContain('Partial cover through smoke at (1, 0)');
    expect(
      screen.getByTestId('hex-projection-status-badge-1-0'),
    ).toHaveTextContent('MIX');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS partial; front arc',
    );
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Intervening Terrain +1',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Intervening Terrain +1');
  });
});
