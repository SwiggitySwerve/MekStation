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
  it('shows blocked target reasons from the shared LOS classifier', () => {
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
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 2 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      expect.stringContaining('Blocked by building'),
    );
    expect(targetHex).toHaveAttribute('data-combat-los-blocker-hex', '1,0');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      TerrainType.Building,
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Blocked by building at (1, 0)',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      expect.stringContaining('Blocked by building'),
    );
    const invalidBadge = screen.getByTestId('hex-combat-invalid-badge-2-0');
    expect(invalidBadge).toHaveTextContent('BLDG');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-kind', 'combat');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'NoLineOfSight',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Blocked by building at (1, 0)',
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
      'data-invalid-badge-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      expect.stringContaining('los-blocker:megamek:MegaMek LosEffects.java'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('combat status blocked'),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('Blocked by building at (1, 0)'),
    );
    const invalidBadgeRect = invalidBadge.querySelector('rect');
    const losBadgeRect = screen
      .getByTestId('hex-combat-los-badge-2-0')
      .querySelector('rect');
    const arcBadgeRect = screen
      .getByTestId('hex-combat-arc-badge-2-0')
      .querySelector('rect');
    expect(invalidBadgeRect).not.toBeNull();
    expect(losBadgeRect).not.toBeNull();
    expect(arcBadgeRect).not.toBeNull();
    expect(Number(invalidBadgeRect?.getAttribute('y'))).toBeGreaterThan(
      Number(losBadgeRect?.getAttribute('y')),
    );
    expect(invalidBadgeRect).not.toHaveAttribute(
      'y',
      losBadgeRect?.getAttribute('y') ?? '',
    );
    expect(invalidBadgeRect).not.toHaveAttribute(
      'y',
      arcBadgeRect?.getAttribute('y') ?? '',
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'NO LOS',
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveAttribute(
      'aria-label',
      'LOS blocked: Blocked by building at (1, 0)',
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveAttribute(
      'data-combat-los-badge-reason',
      'Blocked by building at (1, 0)',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-2-0')).toHaveTextContent(
      'FRONT',
    );
    const blockerHex = screen.getByTestId('hex-1-0');
    expect(blockerHex).toHaveAttribute(
      'data-combat-los-blocker-for-target-hexes',
      '2,0',
    );
    expect(blockerHex).toHaveAttribute(
      'data-combat-los-blocker-for-reasons',
      'Blocked by building at (1, 0)',
    );
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'los-blocker',
    );
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-status',
      'blocked',
    );
    expect(blockerHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );
    expect(
      blockerHex.getAttribute('data-tactical-projection-blocked-reasons'),
    ).toContain('Blocked by building at (1, 0)');
    expect(
      blockerHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('LOS blocker for 2,0: Blocked by building at (1, 0)');
    const blockerProjectionBadge = screen.getByTestId(
      'hex-projection-status-badge-1-0',
    );
    expect(blockerProjectionBadge).toHaveTextContent('BLK');
    expect(blockerProjectionBadge).toHaveAttribute(
      'data-projection-status-badge-intent',
      'los-blocker',
    );
    const blockerBadge = screen.getByTestId('hex-combat-los-blocker-badge-1-0');
    expect(blockerBadge).toHaveTextContent('LOS BLDG');
    expect(blockerBadge).toHaveAttribute(
      'aria-label',
      'LOS blocked at blocker 1,0: Blocked by building at (1, 0); affects target hex 2,0',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-hexes',
      '2,0',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-target-ids',
      'enemy',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-state',
      'blocked',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-kind',
      'terrain',
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-terrain',
      TerrainType.Building,
    );
    expect(blockerBadge).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(targetHex);
    const losOverlay = screen.getByTestId('los-overlay');
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-los-state',
      'blocked',
    );
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-range-bracket',
      'short',
    );
    expect(losOverlay).toHaveAttribute('data-combat-projection-distance', '2');
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-target-ids',
      'enemy',
    );
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-los-blocker-hex',
      '1,0',
    );
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-los-blocker-kind',
      'terrain',
    );
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-los-blocker-terrain',
      TerrainType.Building,
    );
    expect(losOverlay).toHaveAttribute(
      'data-combat-projection-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(losOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Combat projection LOS blocked'),
    );
    expect(screen.getByTestId('los-line')).toHaveAttribute(
      'data-combat-projection-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );

    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Blocked',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'enemy',
    );
    const blockedRange = screen.getByTestId('hex-combat-tooltip-range');
    expect(blockedRange).toHaveTextContent('short at 2 hexes');
    expect(blockedRange).toHaveAttribute('data-combat-target-ids', 'enemy');
    expect(blockedRange).toHaveAttribute('data-combat-attackable', 'false');
    expect(blockedRange).toHaveAttribute(
      'data-combat-weapons-in-range',
      'medium-laser',
    );
    const blockedGeometry = screen.getByTestId('hex-combat-tooltip-geometry');
    expect(blockedGeometry).toHaveTextContent('LOS blocked; front arc');
    expect(blockedGeometry).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(blockedGeometry).toHaveAttribute('data-combat-firing-arc', 'front');
    expect(blockedGeometry).toHaveAttribute(
      'data-combat-targeting-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    const losContext = screen.getByTestId('hex-combat-tooltip-los-context');
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
    const losBlockedReason = screen.getByTestId('hex-combat-tooltip-reason');
    expect(losBlockedReason).toHaveTextContent('Blocked by building');
    expect(losBlockedReason).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(losBlockedReason).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(losBlockedReason).toHaveAttribute(
      'data-combat-los-state',
      'blocked',
    );
    expect(losBlockedReason).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(losBlockedReason).toHaveAttribute(
      'data-combat-reason-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(losBlockedReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
  });
});
