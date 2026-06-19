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
  it('explains Forward Observer cancellation on LOS-blocked indirect-fire targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const spotter = makeToken({
      unitId: 'spotter',
      position: { q: 5, r: 1 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 5, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={5}
        tokens={[selected, spotter, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'lrm-15-1',
              name: 'LRM-15',
              ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
            }),
          ],
        }}
        combatState={makeCombatState({
          selected: { side: GameSide.Player, position: { q: 0, r: 0 } },
          spotter: {
            side: GameSide.Player,
            position: { q: 5, r: 1 },
            movementThisTurn: MovementType.Walk,
            pilotSpas: ['forward_observer'],
          },
          enemy: { side: GameSide.Opponent, position: { q: 5, r: 0 } },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.HeavyWoods, level: 1 }],
          },
          {
            coordinate: { q: 3, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-5-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-indirect-fire', 'true');
    expect(targetHex).toHaveAttribute('data-combat-indirect-penalty', '1');
    expect(targetHex).toHaveAttribute(
      'data-combat-indirect-forward-observer',
      'true',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-indirect-penalty-cancelled',
      '1',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter spotter (+1); Forward Observer cancels walked spotter penalty',
    );
    expect(screen.getByTestId('hex-indirect-fire-badge-5-0')).toHaveAttribute(
      'data-combat-indirect-badge-forward-observer',
      'true',
    );

    fireEvent.mouseEnter(targetHex);
    const indirectFireRows = screen.getByTestId(
      'hex-combat-tooltip-indirect-fire',
    );
    expect(indirectFireRows).toHaveTextContent(
      'Indirect fire via spotter spotter (+1); Forward Observer cancels walked spotter penalty',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-forward-observer',
      'true',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-penalty-cancelled',
      '1',
    );
  });
});
