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
  it('surfaces represented underwater weapon restrictions in combat hover explanations', () => {
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
            coordinate: { q: 0, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 2 }],
          },
        ]}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'medium-laser',
              name: 'Medium Laser',
            }),
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
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'attackable',
    );
    expect(targetHex).toHaveAttribute('data-weapons-available', 'lrt-15');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-environment-states',
      'medium-laser:blocked|lrt-15:legal',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'medium-laser:Target underwater, but not weapon.',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'medium-laser short range in arc environment blocked blocked: Target underwater, but not weapon.',
      ),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'combat:megamek:MegaMek water weapon environment projection',
      ),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-rule-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek client/ui/clientGUI/boardview/spriteHandler/FiringArcSpriteHandler.java:570-575 water-only ranges display as underwater weapons',
      ),
    );
    const combatBadge = screen.getByTestId('hex-combat-badge-2-0');
    expect(combatBadge).toHaveAttribute('data-combat-badge-attackable', 'true');
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapons-available',
      'lrt-15',
    );
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-environment-states',
      'medium-laser:blocked|lrt-15:legal',
    );
    const weaponCountBadge = screen.getByTestId(
      'hex-combat-weapon-count-badge-2-0',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-available',
      '1',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-total',
      '2',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked',
      '1',
    );

    fireEvent.mouseEnter(targetHex);

    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-options'),
    ).toHaveTextContent(
      'medium-laser: short range, in arc; environment blocked; blocked - Target underwater, but not weapon.',
    );
    const environmentContext = screen.getByTestId(
      'hex-combat-tooltip-environment-context',
    );
    expect(environmentContext).toHaveTextContent(
      'Environment restrictions: medium-laser: Target underwater, but not weapon.',
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-weapon-ids',
      'medium-laser',
    );
    expect(environmentContext).toHaveAttribute(
      'data-combat-environment-blocked-reasons',
      'Target underwater, but not weapon.',
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
        'combat:megamek:MegaMek common/actions/compute/ComputeTerrainMods.java:167-188 target water and partial-underwater handling',
      ),
    );
  });
});
