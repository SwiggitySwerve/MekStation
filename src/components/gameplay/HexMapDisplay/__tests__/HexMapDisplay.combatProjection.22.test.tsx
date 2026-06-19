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
  it('surfaces movement blocked reason context in combined tactical hover explanations', () => {
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
            mpCost: Infinity,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'tracked',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Water blocks ground movement',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: 'Water blocks ground movement',
          },
        ]}
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
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-movement-status',
      'blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'attackable',
    );

    fireEvent.mouseEnter(targetHex);

    const movementTerrainRow = screen.getByTestId(
      'hex-tactical-tooltip-movement-terrain',
    );
    expect(movementTerrainRow).toHaveTextContent('Terrain cost: +1');
    expect(movementTerrainRow).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementTerrainRow).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(movementTerrainRow).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(movementTerrainRow).toHaveAttribute(
      'data-movement-context-kind',
      'terrain-cost',
    );
    expect(movementTerrainRow).toHaveAttribute(
      'data-movement-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(movementTerrainRow).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );

    const movementElevationRow = screen.getByTestId(
      'hex-tactical-tooltip-movement-elevation',
    );
    expect(movementElevationRow).toHaveTextContent('Elevation: 0, cost +0');
    expect(movementElevationRow).toHaveAttribute(
      'data-movement-context-kind',
      'elevation-cost',
    );
    expect(movementElevationRow).toHaveAttribute(
      'data-movement-elevation-delta',
      '0',
    );
    expect(movementElevationRow).toHaveAttribute(
      'data-movement-elevation-cost',
      '0',
    );

    const movementHeatRow = screen.getByTestId(
      'hex-tactical-tooltip-movement-heat',
    );
    expect(movementHeatRow).toHaveTextContent('Heat: +0');
    expect(movementHeatRow).toHaveAttribute(
      'data-movement-context-kind',
      'heat',
    );
    expect(movementHeatRow).toHaveAttribute(
      'data-movement-heat-generated',
      '0',
    );

    const movementReasonRows = screen.getByTestId(
      'hex-tactical-tooltip-movement-reason',
    );
    expect(movementReasonRows).toHaveTextContent(
      'Water blocks ground movement',
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-movement-reachable',
      'false',
    );
    expect(movementReasonRows).toHaveAttribute('data-movement-type', 'walk');
    expect(movementReasonRows).toHaveAttribute('data-movement-mode', 'tracked');
    expect(movementReasonRows).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-movement-reason-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(movementReasonRows).toHaveAttribute(
      'data-movement-reason-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
  });
});
