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
  it('ignores legacy attackRange overlays once weapon-backed combat projection is active', () => {
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
        attackRange={[{ q: 2, r: 0 }]}
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 1 } })],
        }}
      />,
    );

    const staleAttackHex = screen.getByTestId('hex-2-0');
    expect(staleAttackHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(staleAttackHex).not.toHaveAttribute('data-combat-valid-target');
    expect(
      staleAttackHex.querySelector(`path[fill="${HEX_COLORS.attackRange}"]`),
    ).toBeNull();
    expect(screen.queryByTestId('hex-combat-badge-2-0')).toBeNull();
  });

  it('keeps legacy attackRange overlays for callers without weapon projection', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="legacy-combat-map"
        radius={2}
        tokens={[selected]}
        selectedHex={null}
        attackRange={[{ q: 2, r: 0 }]}
      />,
    );

    const legacyAttackHex = screen.getByTestId('hex-2-0');
    const legacyOverlay = screen.getByTestId('hex-overlay-2-0');
    expect(
      legacyAttackHex.querySelector(`path[fill="${HEX_COLORS.attackRange}"]`),
    ).toBeNull();
    expect(legacyOverlay).toHaveAttribute(
      'fill',
      HEX_COLORS.attackRangeFallback,
    );
    expect(legacyOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'legacy-range',
    );
    expect(legacyOverlay).toHaveAttribute(
      'data-hex-overlay-legacy-fallback',
      'true',
    );
    expect(screen.getByTestId('hex-legacy-range-outline-2-0')).toHaveAttribute(
      'stroke-dasharray',
      '4 3',
    );
    expect(legacyAttackHex).toHaveAttribute(
      'data-tactical-projection-status',
      'neutral',
    );
    expect(legacyAttackHex).toHaveAttribute(
      'data-hex-overlay-kind',
      'legacy-range',
    );
    expect(legacyAttackHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'range-only',
    );
    expect(
      legacyAttackHex.getAttribute('data-tactical-projection-sources'),
    ).toContain('legacy-attack-range:mekstation:Legacy attackRange fallback');
    expect(
      legacyAttackHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('legacy attackRange fallback only; not weapon-backed');
    const legacyRangeBadge = screen.getByTestId(
      'hex-projection-status-badge-2-0',
    );
    expect(legacyRangeBadge).toHaveTextContent('RNG');
    expect(legacyRangeBadge).toHaveAttribute(
      'data-projection-status-badge-status',
      'neutral',
    );
    expect(legacyRangeBadge).toHaveAttribute(
      'data-projection-status-badge-combat-status',
      'range-only',
    );
    expect(legacyRangeBadge).toHaveAttribute(
      'data-projection-status-badge-sources',
      expect.stringContaining('legacy-attack-range'),
    );
    expect(legacyRangeBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Range-only tactical projection'),
    );
  });

  it('projects token target rings from weapon-backed combat legality', () => {
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
      isValidTarget: false,
    });

    render(
      <HexMapDisplay
        mapId="combat-token-ring-map"
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const attackableHex = screen.getByTestId('hex-0--2');
    expect(attackableHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(attackableHex).toHaveAttribute(
      'data-hex-overlay-kind',
      'combat-attackable',
    );
    expect(screen.getByTestId('hex-overlay-0--2')).toHaveAttribute(
      'fill',
      HEX_COLORS.attackRange,
    );
    const enemyToken = screen.getByTestId('unit-token-enemy');
    expect(enemyToken).toHaveAttribute(
      'data-token-valid-target-source',
      'combat-projection',
    );
    expect(enemyToken).toHaveAttribute(
      'data-token-combat-projection-valid-target',
      'true',
    );
    expect(
      enemyToken.querySelector('[data-testid="unit-valid-target-ring"]'),
    ).not.toBeNull();
  });

  it('suppresses stale token target rings when combat projection rejects the target', () => {
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
      isValidTarget: true,
    });

    render(
      <HexMapDisplay
        mapId="combat-token-ring-rejected-map"
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 1 } })],
        }}
      />,
    );

    expect(screen.getByTestId('hex-0--2')).toHaveAttribute(
      'data-combat-valid-target',
      'false',
    );
    const enemyToken = screen.getByTestId('unit-token-enemy');
    expect(enemyToken).toHaveAttribute(
      'data-token-valid-target-source',
      'combat-projection',
    );
    expect(enemyToken).toHaveAttribute(
      'data-token-combat-projection-valid-target',
      'false',
    );
    expect(
      enemyToken.querySelector('[data-testid="unit-valid-target-ring"]'),
    ).toBeNull();
  });

  it('keeps legacy token target rings for callers without weapon projection', () => {
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: -1 },
      isValidTarget: true,
    });

    render(
      <HexMapDisplay
        mapId="legacy-token-ring-map"
        radius={1}
        tokens={[enemy]}
        selectedHex={null}
      />,
    );

    const enemyToken = screen.getByTestId('unit-token-enemy');
    expect(enemyToken).toHaveAttribute(
      'data-token-valid-target-source',
      'token',
    );
    expect(enemyToken).not.toHaveAttribute(
      'data-token-combat-projection-valid-target',
    );
    expect(
      enemyToken.querySelector('[data-testid="unit-valid-target-ring"]'),
    ).not.toBeNull();
  });

  it('limits firing-arc overlay to operational selected weapon mounting arcs', () => {
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
              id: 'rear-laser',
              mountingArc: FiringArc.Rear,
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
  });
});
