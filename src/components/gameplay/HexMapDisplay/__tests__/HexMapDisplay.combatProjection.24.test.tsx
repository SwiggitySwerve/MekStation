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
  it('marks ammo-empty weapons with the engine out-of-ammo rejection reason', () => {
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
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'dry-ac-5',
              name: 'AC/5',
              ammoRemaining: 0,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfAmmo',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No matching non-empty ammo bin for "AC/5"',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No matching non-empty ammo bin for "AC/5"',
    );
    expect(targetHex).toHaveAttribute('data-weapons-available', '');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'dry-ac-5:short',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'dry-ac-5:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'dry-ac-5:No matching non-empty ammo bin for "AC/5"',
    );
    const invalidBadge = screen.getByTestId('hex-combat-invalid-badge-2-0');
    expect(invalidBadge).toHaveTextContent('AMMO');
    expect(invalidBadge).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
      ),
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      expect.stringContaining('combat status blocked'),
    );

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: no ammunition',
    );
    const ammoReason = screen.getByTestId('hex-combat-tooltip-reason');
    expect(ammoReason).toHaveTextContent(
      'No matching non-empty ammo bin for "AC/5"',
    );
    expect(ammoReason).toHaveAttribute(
      'data-combat-invalid-details',
      'No matching non-empty ammo bin for "AC/5"',
    );
    expect(ammoReason).toHaveAttribute(
      'data-combat-reason-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
  });

  it('treats last-known fog contacts as information, not valid attack targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const lastKnownEnemy = makeToken({
      unitId: 'enemy-last-known',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 1, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, lastKnownEnemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const lastKnownHex = screen.getByTestId('hex-1-0');
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-target-visibility',
      'lastKnown',
    );
    expect(lastKnownHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-target-ids',
      'enemy-last-known',
    );
    expect(lastKnownHex).toHaveAttribute('data-combat-visible-target-ids', '');
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'enemy-last-known',
    );
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Last known contact is not currently visible',
    );
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    expect(lastKnownHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Last known contact is not currently visible',
    );
    expect(lastKnownHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Last known contact is not currently visible'),
    );
    const visibilityBadge = screen.getByTestId(
      'hex-combat-visibility-badge-1-0',
    );
    expect(visibilityBadge).toHaveTextContent('LAST');
    expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-state',
      'lastKnown',
    );
    expect(visibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Last known contact is not currently visible',
    );

    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-target-ids',
      '',
    );

    fireEvent.mouseEnter(lastKnownHex);
    const visibilityRows = screen.getByTestId('hex-combat-tooltip-visibility');
    expect(visibilityRows).toHaveTextContent(
      'Visibility: last known (obscured enemy-last-known)',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-state',
      'lastKnown',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-visible-target-ids',
      '',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-obscured-target-ids',
      'enemy-last-known',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    const fogReason = screen.getByTestId('hex-combat-tooltip-reason');
    expect(fogReason).toHaveTextContent(
      'Last known contact is not currently visible',
    );
    expect(fogReason).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Last known contact is not currently visible',
    );
    expect(fogReason).toHaveAttribute(
      'data-combat-target-ids',
      'enemy-last-known',
    );
  });
});
