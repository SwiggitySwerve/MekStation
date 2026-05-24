import { fireEvent, render, screen } from '@testing-library/react';

import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { HEX_COLORS } from '@/constants/hexMap';
import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';

import { HexMapDisplay } from '../HexMapDisplay';

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

function getToHitModifierRow(
  container: HTMLElement,
  name: string,
): HTMLElement {
  const row = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-combat-to-hit-modifier-name]',
    ),
  ).find(
    (element) =>
      element.getAttribute('data-combat-to-hit-modifier-name') === name,
  );
  if (!row) {
    throw new Error(`Missing to-hit modifier row: ${name}`);
  }
  return row;
}

function makeCombatState(
  units: Record<
    string,
    {
      readonly side: GameSide;
      readonly position: { readonly q: number; readonly r: number };
      readonly gunnery?: number;
      readonly heat?: number;
      readonly movementThisTurn?: MovementType;
      readonly hexesMovedThisTurn?: number;
      readonly pilotSpas?: readonly string[];
      readonly prone?: boolean;
      readonly shutdown?: boolean;
      readonly combatState?: IGameState['units'][string]['combatState'];
    }
  >,
): IGameState {
  return {
    gameId: 'game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    turnEvents: [],
    units: Object.fromEntries(
      Object.entries(units).map(([unitId, unit]) => [
        unitId,
        {
          id: unitId,
          side: unit.side,
          position: unit.position,
          facing: Facing.North,
          heat: unit.heat ?? 0,
          movementThisTurn: unit.movementThisTurn ?? MovementType.Stationary,
          hexesMovedThisTurn: unit.hexesMovedThisTurn ?? 0,
          prone: unit.prone,
          destroyed: false,
          shutdown: unit.shutdown ?? false,
          hasRetreated: false,
          gunnery: unit.gunnery ?? 4,
          pilotSpas: unit.pilotSpas,
          combatState: unit.combatState,
        },
      ]),
    ) as IGameState['units'],
  };
}

function makeAerospaceCombatState(altitude: number) {
  return createAerospaceCombatState({
    maxSI: 10,
    armorByArc: { nose: 10, leftWing: 8, rightWing: 8, aft: 6 },
    heatSinks: 10,
    fuelPoints: 20,
    safeThrust: 6,
    maxThrust: 9,
    altitude,
  });
}

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
    expect(
      legacyAttackHex.querySelector(`path[fill="${HEX_COLORS.attackRange}"]`),
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

  it('keeps all firing arcs visible when any selected weapon is omni-mounted', () => {
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
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toHaveAttribute(
      'data-arc',
      'front',
    );
    expect(screen.getByTestId('firing-arc-hex-0,1')).toHaveAttribute(
      'data-arc',
      'rear',
    );
  });

  it('hides firing-arc shading when no selected weapon is operational', () => {
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
        unitWeapons={{ selected: [makeWeapon({ destroyed: true })] }}
      />,
    );

    expect(screen.queryByTestId('firing-arc-hex-0,-1')).toBeNull();
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();
  });

  it('marks enemy target hexes with weapon bracket, LOS, arc, and valid-target metadata', () => {
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
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-distance', '2');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'medium-laser');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'medium-laser');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'medium-laser:short',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'medium-laser:in-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-environment-states',
      'medium-laser:legal',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'medium-laser:available',
    );
    expect(targetHex).toHaveAttribute('data-combat-target-ids', 'enemy');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('arc front'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('targets enemy'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('visibility visible'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('weapons medium-laser'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'weapon options medium-laser short range in arc available',
      ),
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveTextContent('S2');
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-label',
      'S2',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'aria-label',
      'short range at 2 hexes; attack available; weapons available medium-laser',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-attackable',
      'true',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'medium-laser:short',
    );
    expect(screen.getByTestId('hex-combat-badge-2-0')).toHaveAttribute(
      'data-combat-badge-weapon-option-availability',
      'medium-laser:available',
    );
    expect(
      screen.queryByTestId('hex-combat-weapon-count-badge-2-0'),
    ).toBeNull();
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveAttribute(
      'data-combat-los-badge-state',
      'clear',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-2-0')).toHaveTextContent(
      'FRONT',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-2-0')).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'true',
    );
    expect(screen.queryByTestId('hex-combat-visibility-badge-2-0')).toBeNull();
  });

  it('renders mixed per-weapon range and arc option metadata', () => {
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
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={3}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'front-laser',
              mountingArc: FiringArc.Front,
            }),
            makeWeapon({
              id: 'rear-laser',
              mountingArc: FiringArc.Rear,
            }),
            makeWeapon({
              id: 'small-laser',
              ranges: { short: 1, medium: 1, long: 1 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0--2');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'front-laser');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'front-laser:short|rear-laser:short|small-laser:out_of_range',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'front-laser:in-arc|rear-laser:out-of-arc|small-laser:in-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'front-laser:available|rear-laser:blocked|small-laser:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'weapon options front-laser short range in arc available, rear-laser short range out of arc blocked: out of front arc, small-laser out_of_range range in arc blocked: out of range',
      ),
    );

    const combatBadge = screen.getByTestId('hex-combat-badge-0--2');
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-ranges',
      'front-laser:short|rear-laser:short|small-laser:out_of_range',
    );
    expect(combatBadge).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );
    const weaponCountBadge = screen.getByTestId(
      'hex-combat-weapon-count-badge-0--2',
    );
    expect(weaponCountBadge).toHaveTextContent('1/3 WPN');
    expect(weaponCountBadge).toHaveAttribute(
      'aria-label',
      'Weapons available 1 of 3; blocked 2; blocked rear-laser: out of front arc, small-laser: out of range',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-available',
      '1',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-total',
      '3',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked',
      '2',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-weapons-available',
      'front-laser',
    );
    expect(weaponCountBadge).toHaveAttribute(
      'data-combat-weapon-count-badge-blocked-reasons',
      'rear-laser:out of front arc|small-laser:out of range',
    );

    fireEvent.mouseEnter(targetHex);

    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-options'),
    ).toHaveTextContent(
      'Weapon options: front-laser: short range, in arc; available; rear-laser: short range, out of arc; blocked - out of front arc; small-laser: out of range, in arc; blocked - out of range',
    );
  });

  it('shows projected weapon heat and ammo impact in combat hover explanations', () => {
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
        combatState={makeCombatState({
          selected: { side: GameSide.Player, position: { q: 0, r: 0 } },
          enemy: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
        })}
        unitWeapons={{
          selected: [
            makeWeapon({ id: 'medium-laser', name: 'Medium Laser', heat: 3 }),
            makeWeapon({
              id: 'ac-5',
              name: 'AC/5',
              heat: 1,
              ammoRemaining: 12,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-weapons-available',
      'medium-laser,ac-5',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('weapon heat +4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('ammo AC/5 -1 11 left'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('damage 10 listed'),
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('expected damage'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'weapon heat +4, ammo AC/5 -1 11 left, damage 10',
      ),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveTextContent(
      'H+4 D10',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveTextContent(
      'A1',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected attack impact: +4 heat; damage 10 listed',
      ),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('ammo AC/5 -1 11 left'),
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-heat',
      '4',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-damage',
      '10',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-expected-damage',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-ammo-consumed',
      '1',
    );
    expect(screen.getByTestId('hex-combat-impact-badge-2-0')).toHaveAttribute(
      'data-combat-impact-badge-ammo-summary',
      'AC/5 -1 11 left',
    );

    fireEvent.mouseEnter(targetHex);

    const projectionContext = screen.getByTestId(
      'hex-combat-tooltip-projection-context',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'combat',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'attackable',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('weapon heat +4'),
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Legal - combat');
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: attackable');
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser, ac-5',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact'),
    ).toHaveTextContent(
      'Impact: +4 heat; ammo AC/5 -1 (11 left); damage 10 listed',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact'),
    ).toHaveTextContent('expected');
  });

  it('shows projected weapon heat and ammo impact in combined tactical hover explanations', () => {
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
        combatState={makeCombatState({
          selected: { side: GameSide.Player, position: { q: 0, r: 0 } },
          enemy: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
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
              id: 'ac-5',
              name: 'AC/5',
              heat: 1,
              ammoRemaining: 8,
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

    fireEvent.mouseEnter(targetHex);

    expect(screen.getByTestId('hex-tactical-tooltip-combat')).toHaveTextContent(
      'Combat: Attack available',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact'),
    ).toHaveTextContent(
      'Impact: +1 heat; ammo AC/5 -1 (7 left); damage 5 listed',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-options'),
    ).toHaveTextContent('Weapon options: ac-5: short range, in arc; available');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact'),
    ).toHaveTextContent('expected');
    const toHitRows = screen.getByTestId(
      'hex-tactical-tooltip-combat-to-hit-modifiers',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      expect.stringContaining('Target Terrain'),
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      expect.stringContaining('1'),
    );
    expect(getToHitModifierRow(toHitRows, 'Target Terrain')).toHaveTextContent(
      'Target Terrain +1',
    );
    expect(screen.queryByTestId('hex-combat-tooltip')).toBeNull();
  });

  it('uses represented weapon extreme range instead of marking engine-legal attacks out of range', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 8, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={8}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'extreme-ac',
              ranges: { short: 2, medium: 4, long: 6, extreme: 9 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-8-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'extreme');
    expect(targetHex).toHaveAttribute('data-combat-distance', '8');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'extreme-ac');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'extreme-ac');
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveTextContent('X8');
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveAttribute(
      'aria-label',
      'extreme range at 8 hexes; attack available; weapons available extreme-ac',
    );
    expect(screen.getByTestId('hex-combat-badge-8-0')).toHaveAttribute(
      'data-combat-badge-label',
      'X8',
    );
  });

  it('preserves rules projection metadata when switching from top-down to isometric', () => {
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
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [{ type: TerrainType.Rough, level: 1 }],
          },
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 1,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    const targetHex = screen.getByTestId('hex-2-0');

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'topDown',
    );
    expect(movementHex).toHaveAttribute('data-mp-cost', '3');
    expect(movementHex).toHaveAttribute('data-terrain-cost', '1');
    expect(movementHex).toHaveAttribute('data-elevation-delta', '1');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '1');
    expect(movementHex).toHaveAttribute('data-heat-generated', '1');
    expect(movementHex).toHaveAttribute('data-terrain-primary', 'rough');
    expect(movementHex).toHaveAttribute('data-elevation', '1');
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(movementHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'medium-laser');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute('data-mp-cost', '3');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-delta',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation-cost',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-heat-generated',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-terrain-primary',
      'rough',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-elevation',
      '1',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-los-state',
      'clear',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-valid-target',
      'true',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-weapons-available',
      'medium-laser',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-tactical-projection-intent',
      'combat',
    );
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
  });

  it('explains empty weapon-range hexes without calling them blocked targets', () => {
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
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const emptyInRangeHex = screen.getByTestId('hex-1-0');
    expect(emptyInRangeHex).toHaveAttribute(
      'data-combat-range-bracket',
      'short',
    );
    expect(emptyInRangeHex).not.toHaveAttribute('data-combat-valid-target');
    expect(screen.getByTestId('hex-combat-badge-1-0')).toHaveTextContent('S1');
    expect(screen.queryByTestId('hex-combat-los-badge-1-0')).toBeNull();
    expect(screen.queryByTestId('hex-combat-arc-badge-1-0')).toBeNull();

    fireEvent.mouseEnter(emptyInRangeHex);

    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'In range',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'No target',
    );
    expect(screen.getByTestId('hex-combat-tooltip-range')).toHaveTextContent(
      'short at 1 hexes',
    );
    expect(screen.queryByTestId('hex-combat-tooltip-weapon-impact')).toBeNull();
    expect(screen.queryByTestId('hex-combat-tooltip-reason')).toBeNull();
  });

  it('marks same-hex enemy contacts with the engine SameHex invalid reason', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-combat-invalid-reason', 'SameHex');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'Attacker and target occupy the same hex',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Attacker and target occupy the same hex',
    );
  });

  it('marks target hexes invalid when no selected weapon is operational', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={1}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon({ destroyed: true })] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-1-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'InvalidTarget',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No operational weapons',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No operational weapons',
    );
  });

  it('marks a target blocked when selected weapons cannot cover its firing arc', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 1 },
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
              id: 'front-laser',
              mountingArc: FiringArc.Front,
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-1');
    expect(targetHex).toHaveAttribute('data-combat-firing-arc', 'rear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-combat-invalid-reason', 'OutOfArc');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      'No selected weapons can fire into the rear arc',
    );
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'front-laser');
    expect(targetHex).toHaveAttribute('data-weapons-in-arc', '');
    expect(targetHex).toHaveAttribute('data-weapons-available', '');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'front-laser:short',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'front-laser:out-of-arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-availability',
      'front-laser:blocked',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-blocked-reasons',
      'front-laser:out of rear arc',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'No weapons cover rear arc',
    );
    expect(screen.getByTestId('hex-combat-badge-0-1')).toHaveAttribute(
      'data-combat-badge-weapon-option-blocked-reasons',
      'front-laser:out of rear arc',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-0-1'),
    ).toHaveTextContent('ARC');
    expect(screen.getByTestId('hex-combat-los-badge-0-1')).toHaveTextContent(
      'LOS',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveTextContent(
      'REAR',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveAttribute(
      'aria-label',
      'rear arc not covered',
    );
    expect(screen.getByTestId('hex-combat-arc-badge-0-1')).toHaveAttribute(
      'data-combat-arc-badge-in-arc',
      'false',
    );
  });

  it('uses the range bracket from weapons that are both in range and in arc', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: 3 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={3}
        tokens={[selected, enemy]}
        selectedHex={null}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'front-close',
              name: 'Front Close Weapon',
              mountingArc: FiringArc.Front,
              ranges: { short: 3, medium: 5, long: 7 },
            }),
            makeWeapon({
              id: 'rear-lrm',
              name: 'Rear LRM',
              mountingArc: FiringArc.Rear,
              ranges: { short: 2, medium: 4, long: 8 },
            }),
          ],
        }}
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 0, r: 3 },
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-0-3');
    expect(targetHex).toHaveAttribute('data-combat-firing-arc', 'rear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'medium');
    expect(targetHex).toHaveAttribute(
      'data-weapons-in-range',
      'front-close,rear-lrm',
    );
    expect(targetHex).toHaveAttribute('data-weapons-in-arc', 'rear-lrm');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'rear-lrm');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Range (medium):2'),
    );
    expect(screen.getByTestId('hex-combat-badge-0-3')).toHaveTextContent('M3');
    expect(screen.getByTestId('hex-to-hit-badge-0-3')).toHaveTextContent('TN6');
  });

  it('keeps level-1 intervening buildings clear under MegaMek normal LOS', () => {
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
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-reason');
    expect(screen.getByTestId('hex-combat-los-badge-2-0')).toHaveTextContent(
      'LOS',
    );
  });

  it('projects adjacent equal-height buildings as target partial cover', () => {
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
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-cover-level',
      'partial',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'true',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '1');
    expect(targetHex).toHaveAttribute(
      'data-combat-cover-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Partial Cover:1'),
    );
    const coverBadge = screen.getByTestId('hex-cover-badge-2-0');
    expect(coverBadge).toHaveTextContent('P+1');
    expect(coverBadge).toHaveAttribute('data-combat-cover-badge-label', 'P+1');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-cover')).toHaveTextContent(
      'Cover: partial +1 - Target behind building partial cover at (1, 0) (+1)',
    );
  });

  it('does not project adjacent horizontal cover for vehicle targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
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
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
  });

  it('does not project partial-water cover for vehicle targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
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
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
  });

  it('projects active target water cover on the map when multiple targets share a hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const mechTarget = makeToken({
      unitId: 'mech-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Mech,
    });
    const vehicleTarget = makeToken({
      unitId: 'vehicle-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      unitType: TokenUnitType.Vehicle,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, mechTarget, vehicleTarget]}
        selectedHex={null}
        targetUnitId="vehicle-target"
        unitWeapons={{ selected: [makeWeapon()] }}
        combatState={makeCombatState({
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          'mech-target': {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
          'vehicle-target': {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Water, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'mech-target,vehicle-target',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      'vehicle-target',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(
      targetHex.getAttribute('data-combat-to-hit-modifiers'),
    ).not.toContain('Partial Cover:1');
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
  });

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

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Blocked',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'enemy',
    );
    expect(screen.getByTestId('hex-combat-tooltip-range')).toHaveTextContent(
      'short at 2 hexes',
    );
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS blocked; front arc',
    );
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Blocked by building',
    );
  });

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

  it('stacks smoke and woods in one intervening hex for combat to-hit metadata', () => {
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
            features: [
              { type: TerrainType.Smoke, level: 1 },
              { type: TerrainType.LightWoods, level: 1 },
            ],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'partial');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Partial cover through smoke and light woods at (1, 0)',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Intervening Terrain:2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Intervening Terrain +2'),
    );

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Intervening Terrain +2');
    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-number', '6');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      expect.stringContaining('2'),
    );
    expect(
      getToHitModifierRow(toHitRows, 'Intervening Terrain'),
    ).toHaveTextContent('Intervening Terrain +2');
  });

  it('preserves multi-feature terrain blockers when deriving combat LOS from map terrain', () => {
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
            features: [
              { type: TerrainType.LightWoods, level: 1 },
              { type: TerrainType.Building, level: 2 },
            ],
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
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      expect.stringContaining('Blocked by building'),
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('BLDG');
  });

  it('marks LOS-blocked LRM targets attackable when a friendly spotter has LOS', () => {
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
          spotter: { side: GameSide.Player, position: { q: 5, r: 1 } },
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
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'blocked');
    expect(targetHex).toHaveAttribute(
      'data-combat-los-blocker-reason',
      expect.stringContaining('Blocked by light woods'),
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).toHaveAttribute('data-combat-indirect-fire', 'true');
    expect(targetHex).toHaveAttribute(
      'data-combat-indirect-spotter',
      'spotter',
    );
    expect(targetHex).toHaveAttribute('data-combat-indirect-basis', 'los');
    expect(targetHex).toHaveAttribute('data-combat-indirect-penalty', '1');
    expect(targetHex).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter spotter (+1)',
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Indirect fire via spotter spotter (+1)'),
    );
    expect(screen.getByTestId('hex-indirect-fire-badge-5-0')).toHaveTextContent(
      'IND',
    );
    expect(screen.getByTestId('hex-indirect-fire-badge-5-0')).toHaveAttribute(
      'aria-label',
      'Indirect fire via spotter spotter (+1)',
    );
    expect(screen.getByTestId('hex-indirect-fire-badge-5-0')).toHaveAttribute(
      'data-combat-indirect-badge-basis',
      'los',
    );

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.getByTestId('hex-combat-tooltip-indirect-fire'),
    ).toHaveTextContent('Indirect fire via spotter spotter (+1)');
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS blocked; front arc',
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: lrm-15-1',
    );
  });

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
    expect(
      screen.getByTestId('hex-combat-tooltip-indirect-fire'),
    ).toHaveTextContent(
      'Indirect fire via spotter spotter (+1); Forward Observer cancels walked spotter penalty',
    );
  });

  it('projects target-hex woods as terrain to-hit metadata, not partial cover', () => {
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
            gunnery: 4,
            heat: 0,
            movementThisTurn: MovementType.Stationary,
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
            movementThisTurn: MovementType.Stationary,
            hexesMovedThisTurn: 0,
          },
        })}
        hexTerrain={[
          {
            coordinate: { q: 2, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
        ]}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-target-cover-level', 'none');
    expect(targetHex).toHaveAttribute(
      'data-combat-target-partial-cover',
      'false',
    );
    expect(targetHex).toHaveAttribute('data-combat-cover-modifier', '0');
    expect(targetHex).not.toHaveAttribute('data-combat-cover-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Gunnery Skill:4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Terrain:1'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('To-hit 5'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Terrain +1'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('To-hit 5'),
    );
    expect(screen.queryByTestId('hex-cover-badge-2-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN5');
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveAttribute(
      'data-combat-to-hit-badge-number',
      '5',
    );

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN5',
    );
    expect(screen.getByTestId('hex-combat-tooltip-target')).toHaveTextContent(
      'enemy',
    );
    expect(screen.getByTestId('hex-combat-tooltip-range')).toHaveTextContent(
      'short at 2 hexes',
    );
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS clear; front arc',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-terrain-context'),
    ).toHaveTextContent('Terrain: light woods');
    expect(
      screen.getByTestId('hex-combat-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: 0');
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'To-hit 5',
    );
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Target Terrain +1',
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-visibility'),
    ).toHaveTextContent('Visibility: visible (visible enemy)');
    expect(
      screen.queryByTestId('hex-combat-tooltip-cover'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Terrain +1');
    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(toHitRows).toHaveAttribute('data-combat-to-hit-modifier-count', '6');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      'Gunnery Skill|Range (short)|Attacker Movement|Target Movement (TMM)|Heat|Target Terrain',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-values',
      '4|0|0|0|0|1',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-sources',
      expect.stringContaining('terrain'),
    );
    expect(getToHitModifierRow(toHitRows, 'Gunnery Skill')).toHaveTextContent(
      'Gunnery Skill +4',
    );
    const targetTerrainModifier = getToHitModifierRow(
      toHitRows,
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveAttribute(
      'data-combat-to-hit-modifier-name',
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveTextContent('Target Terrain +1');
  });

  it('surfaces minimum-range penalties on otherwise valid attack targets', () => {
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
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'lrm-15-1',
              name: 'LRM-15',
              ranges: { short: 7, medium: 14, long: 21, minimum: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-minimum-range-penalty', '4');
    expect(targetHex).toHaveAttribute(
      'data-combat-minimum-range-weapons',
      'lrm-15-1',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-minimum-range-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Minimum range penalty +4 (lrm-15-1)'),
    );
    expect(screen.getByTestId('hex-minimum-range-badge-3-0')).toHaveTextContent(
      'MIN+4',
    );
    expect(screen.getByTestId('hex-minimum-range-badge-3-0')).toHaveAttribute(
      'data-combat-minimum-range-badge-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.getByTestId('hex-combat-tooltip-minimum-range'),
    ).toHaveTextContent('Minimum range penalty +4 (lrm-15-1)');
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: lrm-15-1',
    );
  });

  it('surfaces prone attacker and target modifiers in combat map metadata', () => {
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
            prone: true,
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 2, r: 0 },
            prone: true,
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Attacker Prone:2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Prone:1'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Attacker Prone +2'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Prone +1'),
    );
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN7');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN7',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Attacker Prone +2');
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Prone +1');
  });

  it('surfaces shutdown target immobile modifiers in combat map metadata', () => {
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
            shutdown: true,
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '0');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Target Immobile:-4'),
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Immobile -4'),
    );
    expect(screen.getByTestId('hex-to-hit-badge-2-0')).toHaveTextContent('TN0');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-status')).toHaveTextContent(
      'Attack available - TN0',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-modifiers'),
    ).toHaveTextContent('Target Immobile -4');
  });

  it('suppresses minimum-range penalties against airborne aerospace targets', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
      unitType: TokenUnitType.Aerospace,
      altitude: 3,
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={3}
        tokens={[selected, enemy]}
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
          selected: {
            side: GameSide.Player,
            position: { q: 0, r: 0 },
          },
          enemy: {
            side: GameSide.Opponent,
            position: { q: 3, r: 0 },
            combatState: {
              kind: 'aero',
              state: makeAerospaceCombatState(3),
            },
          },
        })}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-minimum-range-penalty');
    expect(targetHex).not.toHaveAttribute('data-combat-minimum-range-reason');
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '4');
    expect(targetHex.getAttribute('aria-label')).not.toContain('Minimum range');
    expect(
      screen.queryByTestId('hex-minimum-range-badge-3-0'),
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(targetHex);
    expect(
      screen.queryByTestId('hex-combat-tooltip-minimum-range'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('hex-combat-tooltip-reason'),
    ).not.toHaveTextContent('Minimum Range');
  });

  it('keeps out-of-range targets visibly explainable instead of silently omitting them', () => {
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
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 2 } })],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-3-0');
    expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'OutOfRange',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-invalid-details',
      "Target at 3 hexes is outside the selected weapons' range",
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-blocked-reason',
      'Out of weapon range',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-status',
      'blocked',
    );
    expect(screen.getByTestId('hex-combat-badge-3-0')).toHaveTextContent(
      'OUT3',
    );
    expect(screen.getByTestId('hex-combat-badge-3-0')).toHaveAttribute(
      'data-combat-badge-label',
      'OUT3',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-3-0'),
    ).toHaveTextContent('OUT');
    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-3-0',
    );
    expect(projectionBadge).toHaveTextContent('BLK');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-status',
      'blocked',
    );
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-reasons'),
    ).toContain("Target at 3 hexes is outside the selected weapons' range");
  });

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

    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-3-0',
    );
    expect(projectionBadge).toHaveTextContent('MIX');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-status',
      'mixed',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-intent',
      'movement-combat',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-status',
      'legal',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-combat-status',
      'blocked',
    );
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-reasons'),
    ).toContain("Target at 3 hexes is outside the selected weapons' range");
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-explanation'),
    ).toContain('Walk reachable 3 MP');
    expect(screen.getByTestId('hex-movement-badge-3-0')).toHaveTextContent(
      'W3/R4 MP',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-3-0'),
    ).toHaveTextContent('OUT');

    fireEvent.mouseEnter(targetHex);

    const tacticalTooltip = screen.getByTestId('hex-tactical-tooltip');
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-status',
      'mixed',
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'movement-combat',
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'legal',
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'blocked',
    );
    expect(screen.getByTestId('hex-tactical-tooltip-status')).toHaveTextContent(
      'Mixed - movement-combat',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-channel-status'),
    ).toHaveTextContent('Movement channel: legal; combat channel: blocked');
    expect(
      screen.getByTestId('hex-tactical-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: 0');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement'),
    ).toHaveTextContent('Movement: reachable - walk; 3 MP');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveTextContent('Careful stand: +2 MP');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveTextContent('Careful stand TN 4 (-2)');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-modifiers'),
    ).toHaveTextContent('Modifiers: Careful stand -2');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-path'),
    ).toHaveTextContent('Path: 3 steps');
    const movementOptions = screen.getByTestId(
      'hex-tactical-tooltip-movement-options',
    );
    expect(movementOptions).toHaveAttribute('data-movement-option-count', '2');
    expect(movementOptions).toHaveAttribute(
      'data-movement-option-types',
      'walk,run',
    );
    expect(movementOptions).toHaveAttribute(
      'data-movement-option-costs',
      'walk:3|run:4',
    );
    expect(
      screen.getByTestId(
        'hex-tactical-tooltip-movement-options-option-run-tracked-1',
      ),
    ).toHaveTextContent(
      'run via tracked reachable 4 MP, terrain +2, elevation delta +0 cost +0, heat +2',
    );
    expect(screen.getByTestId('hex-tactical-tooltip-combat')).toHaveTextContent(
      'Combat: Blocked',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-target'),
    ).toHaveTextContent('Target: enemy');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-range'),
    ).toHaveTextContent('Range: out of range at 3 hexes');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-geometry'),
    ).toHaveTextContent('LOS clear; front arc');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-reason'),
    ).toHaveTextContent('Out of weapon range');
    expect(
      screen.getByTestId('hex-tactical-tooltip-projection-reasons'),
    ).toHaveTextContent(
      "Target at 3 hexes is outside the selected weapons' range",
    );
    expect(screen.queryByTestId('hex-movement-tooltip')).toBeNull();
    expect(screen.queryByTestId('hex-combat-tooltip')).toBeNull();
  });

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
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('AMMO');

    fireEvent.mouseEnter(targetHex);
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: no ammunition',
    );
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'No matching non-empty ammo bin for "AC/5"',
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
    expect(
      screen.getByTestId('hex-combat-tooltip-visibility'),
    ).toHaveTextContent('Visibility: last known (obscured enemy-last-known)');
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Last known contact is not currently visible',
    );
  });

  it('marks hidden-only fog contacts as non-attackable map information', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const hiddenEnemy = makeToken({
      unitId: 'enemy-hidden',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'hidden',
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, hiddenEnemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const hiddenHex = screen.getByTestId('hex-2-0');
    expect(hiddenHex).toHaveAttribute(
      'data-combat-target-visibility',
      'hidden',
    );
    expect(hiddenHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(hiddenHex).toHaveAttribute('data-combat-target-ids', 'enemy-hidden');
    expect(hiddenHex).toHaveAttribute('data-combat-visible-target-ids', '');
    expect(hiddenHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'enemy-hidden',
    );
    expect(hiddenHex).toHaveAttribute(
      'data-combat-visibility-blocked-reason',
      'Hidden contact is not currently visible',
    );
    expect(hiddenHex).toHaveAttribute(
      'data-combat-invalid-reason',
      'TargetNotVisible',
    );
    expect(
      screen.getByTestId('hex-combat-visibility-badge-2-0'),
    ).toHaveTextContent('HID');
    expect(
      screen.getByTestId('hex-combat-visibility-badge-2-0'),
    ).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Hidden contact is not currently visible',
    );
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('HIDDEN');
  });

  it('keeps visible targets attackable on a mixed visible and fog-contact hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const visibleEnemy = makeToken({
      unitId: 'enemy-visible',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });
    const hiddenContact = makeToken({
      unitId: 'enemy-hidden',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
      fogStatus: 'hidden',
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={2}
        tokens={[selected, visibleEnemy, hiddenContact]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(targetHex).toHaveAttribute('data-combat-target-visibility', 'mixed');
    expect(targetHex).toHaveAttribute(
      'data-combat-visible-target-ids',
      'enemy-visible',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-obscured-target-ids',
      'enemy-hidden',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-target-ids',
      'enemy-visible,enemy-hidden',
    );
    const mixedVisibilityBadge = screen.getByTestId(
      'hex-combat-visibility-badge-2-0',
    );
    expect(mixedVisibilityBadge).toHaveTextContent('MIX');
    expect(mixedVisibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-state',
      'mixed',
    );
    expect(mixedVisibilityBadge).toHaveAttribute(
      'data-combat-visibility-badge-reason',
      'Target visibility mixed',
    );
  });
});
