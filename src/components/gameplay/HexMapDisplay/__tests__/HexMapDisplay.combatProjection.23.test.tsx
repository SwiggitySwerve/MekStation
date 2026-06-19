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
  assertMixedProjectionStatusBadge,
  assertMixedMovementCombatTooltip,
} = H;

type IGameState = H.IGameState;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
describe('HexMapDisplay combat projection', () => {
  it('renders a projection status badge when movement is legal but combat is blocked on the same hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={3}
        tokens={[selected, enemy]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 3, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
            standUpRequired: true,
            standUpMode: 'careful',
            standUpCost: 2,
            standUpPsrRequired: true,
            standUpPsrReason: 'Careful stand',
            standUpPsrTargetNumber: 4,
            standUpPsrModifier: -2,
            standUpPsrModifierDetails: ['Careful stand -2'],
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
              { q: 2, r: 0 },
              { q: 3, r: 0 },
            ],
          },
          {
            hex: { q: 3, r: 0 },
            mpCost: 4,
            terrainCost: 2,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Run,
          },
        ]}
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 2 } })],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'mixed',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-movement-status',
      'legal',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );
    expect(targetHex).toHaveAttribute('data-reachable', 'true');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfRange',
    );
    expect(
      targetHex.getAttribute('data-tactical-projection-blocked-reasons'),
    ).toContain("Target at 3 hexes is outside the selected weapons' range");
    expect(
      targetHex.getAttribute('data-tactical-projection-sources'),
    ).toContain('movement:megamek:MegaMek movement rules projection');
    expect(
      targetHex.getAttribute('data-tactical-projection-sources'),
    ).toContain('combat:megamek:MegaMek combat target projection');
    expect(
      targetHex.getAttribute('data-tactical-projection-rule-refs'),
    ).toContain(
      'movement:megamek:MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
    );
    expect(
      targetHex.getAttribute('data-tactical-projection-rule-refs'),
    ).toContain(
      'combat:megamek:MegaMek RangeType.java:95-151 range bracket classification',
    );
    expect(
      targetHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('status mixed');
    expect(
      targetHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('movement status legal');
    expect(
      targetHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('combat status blocked');
    expect(
      targetHex.getAttribute('data-tactical-projection-explanation'),
    ).toContain('path 3 steps');

    assertMixedProjectionStatusBadge();
    fireEvent.mouseEnter(targetHex);
    assertMixedMovementCombatTooltip();
  });
});
