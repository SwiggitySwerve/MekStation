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
  it('surfaces torpedo path water-line failures in combined tactical hover explanations', () => {
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
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
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
              id: 'lrt-15',
              name: 'LR Torpedo 15',
              heat: 5,
              damage: 9,
              ranges: { short: 7, medium: 14, long: 21 },
              isTorpedo: true,
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
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Torpedo path leaves water.',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-environment-states',
      'lrt-15:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'lrt-15:Torpedo path leaves water.',
    );

    fireEvent.mouseEnter(targetHex);

    expect(screen.getByTestId('hex-tactical-tooltip-combat')).toHaveTextContent(
      'Combat: Blocked',
    );
    const environmentContext = screen.getByTestId(
      'hex-tactical-tooltip-combat-environment-context',
    );
    expect(environmentContext).toHaveTextContent(
      'Environment restrictions: lrt-15: Torpedo path leaves water.',
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-weapon-ids',
      'lrt-15',
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-reasons',
      'Torpedo path leaves water.',
    );
    expect(environmentContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(environmentContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek water weapon environment projection',
      ),
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-rule-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek common/actions/compute/ComputeToHitIsImpossible.java:543-555 torpedo LOS must stay in water',
      ),
    );
    const torpedoReason = screen.getByTestId(
      'hex-tactical-tooltip-combat-reason',
    );
    expect(torpedoReason).toHaveTextContent('Torpedo path leaves water.');
    expect(torpedoReason).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(torpedoReason).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(torpedoReason).toHaveAttribute('data-combat-attackable', 'false');
    expect(torpedoReason).toHaveAttribute(
      'data-combat-invalid-details',
      'Torpedo path leaves water.',
    );
    expect(torpedoReason).toHaveAttribute(
      'data-combat-reason-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(torpedoReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
  });
});
