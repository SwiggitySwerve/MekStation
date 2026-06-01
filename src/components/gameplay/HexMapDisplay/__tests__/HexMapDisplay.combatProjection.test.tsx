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
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '@/utils/gameplay/c3Network';

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
      readonly hullDown?: boolean;
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
          hullDown: unit.hullDown,
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

function makeC3CombatState(): IGameState {
  const baseState = makeCombatState({
    selected: { side: GameSide.Player, position: { q: 0, r: 0 } },
    spotter: { side: GameSide.Player, position: { q: 5, r: -1 } },
    enemy: { side: GameSide.Opponent, position: { q: 6, r: 0 } },
  });
  const network = createC3MasterSlaveNetwork('map-c3-network', [
    createC3Unit({
      entityId: 'selected',
      teamId: GameSide.Player,
      role: 'master',
      position: { q: 0, r: 0 },
    }),
    createC3Unit({
      entityId: 'spotter',
      teamId: GameSide.Player,
      role: 'slave',
      position: { q: 5, r: -1 },
    }),
  ]);

  if (!network) {
    throw new Error('Expected valid C3 network fixture');
  }

  return {
    ...baseState,
    c3State: addC3Network(createEmptyC3State(), network),
  };
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

  it('limits firing-arc overlay to represented multi-arc weapon mounts', () => {
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
              id: 'left-sponson-laser',
              mountingArcs: [FiringArc.Front, FiringArc.Left],
            }),
          ],
        }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toHaveAttribute(
      'data-arc',
      'front',
    );
    expect(screen.getByTestId('firing-arc-hex--1,1')).toHaveAttribute(
      'data-arc',
      'left-side',
    );
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();
  });

  it('uses selected weapon ids to constrain range, target, and arc projection', () => {
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
        radius={2}
        tokens={[selected, enemy]}
        selectedHex={null}
        selectedWeaponIds={['rear-short']}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'rear-short',
              mountingArc: FiringArc.Rear,
              ranges: { short: 1, medium: 1, long: 1 },
            }),
            makeWeapon({
              id: 'front-long',
              mountingArc: FiringArc.Front,
              ranges: { short: 2, medium: 4, long: 6 },
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

    const targetHex = screen.getByTestId('hex-0--2');
    expect(targetHex).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'false');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', '');
    expect(targetHex).toHaveAttribute('data-weapons-available', '');
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-ranges',
      'rear-short:out_of_range',
    );
    expect(targetHex).toHaveAttribute(
      'data-combat-weapon-option-arc-states',
      'rear-short:out-of-arc',
    );
    expect(
      targetHex.getAttribute('data-combat-weapon-option-ranges'),
    ).not.toContain('front-long');
  });

  it('extends firing-arc shading through represented selected weapon extreme range', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 0, r: -7 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={7}
        tokens={[selected, enemy]}
        selectedHex={null}
        selectedWeaponIds={['extreme-lrm']}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'extreme-lrm',
              mountingArc: FiringArc.Front,
              ranges: { short: 2, medium: 4, long: 6, extreme: 8 },
            }),
          ],
        }}
      />,
    );

    const arcHex = screen.getByTestId('firing-arc-hex-0,-7');
    expect(arcHex).toHaveAttribute('data-arc', 'front');
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-firing-arc',
      'front',
    );
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-range-bracket',
      'extreme',
    );
    expect(arcHex).toHaveAttribute('data-combat-projection-in-range', 'true');
    expect(arcHex).toHaveAttribute('data-combat-projection-in-arc', 'true');
    expect(arcHex).toHaveAttribute('data-combat-projection-attackable', 'true');
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-target-ids',
      'enemy',
    );
    expect(arcHex).toHaveAttribute(
      'data-combat-projection-weapons-available',
      'extreme-lrm',
    );

    const targetHex = screen.getByTestId('hex-0--7');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'extreme');
    expect(targetHex).toHaveAttribute('data-combat-distance', '7');
    expect(targetHex).toHaveAttribute('data-combat-valid-target', 'true');
    expect(targetHex).toHaveAttribute('data-weapons-in-range', 'extreme-lrm');
    expect(targetHex).toHaveAttribute('data-weapons-available', 'extreme-lrm');
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

    const weaponOptions = screen.getByTestId(
      'hex-combat-tooltip-weapon-options',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(weaponOptions).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-options-option-front-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(weaponOptions).toHaveTextContent(
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
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal combat'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 2,0; intent combat'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('weapon heat +4'),
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
    expect(
      screen.getByTestId('hex-combat-tooltip-projection-explanation'),
    ).toHaveTextContent('weapon heat +4');
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser, ac-5',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact'),
    ).toHaveTextContent(
      'Impact: +4 heat; ammo AC/5 -1 (11 left); damage 10 listed',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveTextContent(
      'Weapon impact detail: Medium Laser: +3 heat, 5 damage; AC/5: +1 heat, 5 damage, ammo -1 (11 left)',
    );
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ids', 'medium-laser|ac-5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-names', 'Medium Laser|AC/5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-heats', '3|1');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-damages', '5|5');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-consumed', '0|1');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '|11');
    expect(
      screen.getByTestId('hex-combat-tooltip-weapon-impact-detail'),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-impact-detail-impact-medium-laser-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-combat-tooltip-weapon-impact-detail-impact-ac-5-1',
      ),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '11');
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
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveTextContent(
      'Weapon impact detail: AC/5: +1 heat, 5 damage, ammo -1 (7 left)',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ids', 'ac-5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-names', 'AC/5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-heats', '1');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-damages', '5');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-consumed', '1');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute('data-combat-weapon-impact-ammo-remaining-after', '7');
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-impact-detail'),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId(
        'hex-tactical-tooltip-combat-weapon-impact-detail-impact-ac-5-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-impact-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-options'),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId(
        'hex-tactical-tooltip-combat-weapon-options-option-ac-5-0',
      ),
    ).toHaveAttribute(
      'data-combat-weapon-option-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-combat-weapon-options'),
    ).toHaveTextContent(
      'Weapon options: ac-5: short range, in arc; TN 5; expected 4.2 damage; available',
    );
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
    expect(toHitRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const targetTerrainModifier = getToHitModifierRow(
      toHitRows,
      'Target Terrain',
    );
    expect(targetTerrainModifier).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    expect(targetTerrainModifier).toHaveTextContent('Target Terrain +1');
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

  it('surfaces C3 range benefit context in combat hover explanations', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const spotter = makeToken({
      unitId: 'spotter',
      side: GameSide.Player,
      position: { q: 5, r: -1 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 6, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={6}
        tokens={[selected, spotter, enemy]}
        selectedHex={null}
        combatState={makeC3CombatState()}
        unitWeapons={{
          selected: [
            makeWeapon({
              id: 'c3-laser',
              ranges: { short: 2, medium: 4, long: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-6-0');
    expect(targetHex).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(targetHex).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(targetHex).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(targetHex).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('C3 spotter spotter range 2 effective short'),
    );
    expect(targetHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'C3: spotter spotter at 2 hexes improves to short range',
      ),
    );

    fireEvent.mouseEnter(targetHex);

    const c3Context = screen.getByTestId('hex-combat-tooltip-c3-context');
    expect(c3Context).toHaveTextContent(
      'C3: spotter spotter at 2 hexes improves to short range',
    );
    expect(c3Context).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-effective-range',
      'short',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );

    const toHitRows = screen.getByTestId('hex-combat-tooltip-to-hit-modifiers');
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-names',
      expect.stringContaining('C3 Network'),
    );
    expect(toHitRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(toHitRows).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const c3Modifier = getToHitModifierRow(toHitRows, 'C3 Network');
    expect(c3Modifier).toHaveAttribute(
      'data-combat-to-hit-modifier-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(c3Modifier).toHaveTextContent('C3 Network +0');
  });

  it('surfaces C3 range benefit context in combined tactical hover explanations', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const spotter = makeToken({
      unitId: 'spotter',
      side: GameSide.Player,
      position: { q: 5, r: -1 },
    });
    const enemy = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      position: { q: 6, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="combat-map"
        radius={6}
        tokens={[selected, spotter, enemy]}
        selectedHex={null}
        combatState={makeC3CombatState()}
        movementRange={[
          {
            hex: { q: 6, r: 0 },
            mpCost: 6,
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
              id: 'c3-laser',
              ranges: { short: 2, medium: 4, long: 6 },
            }),
          ],
        }}
      />,
    );

    const targetHex = screen.getByTestId('hex-6-0');
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );

    fireEvent.mouseEnter(targetHex);

    const c3Context = screen.getByTestId(
      'hex-tactical-tooltip-combat-c3-context',
    );
    expect(c3Context).toHaveTextContent(
      'C3: spotter spotter at 2 hexes improves to short range',
    );
    expect(c3Context).toHaveAttribute('data-combat-c3-benefit', 'true');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter', 'spotter');
    expect(c3Context).toHaveAttribute('data-combat-c3-spotter-range', '2');
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-effective-range',
      'short',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Context).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(c3Context).toHaveAttribute(
      'data-combat-c3-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    const c3Range = screen.getByTestId('hex-tactical-tooltip-combat-range');
    expect(c3Range).toHaveTextContent('Range: short at 6 hexes');
    expect(c3Range).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(c3Range).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(c3Range).toHaveAttribute('data-combat-range-bracket', 'short');
    expect(c3Range).toHaveAttribute('data-combat-distance', '6');
    expect(c3Range).toHaveAttribute(
      'data-combat-targeting-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
  });

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
    const movementSceneHex = screen.getByTestId('isometric-scene-hex-1-0');
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-map-position',
      '1,0',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-elevation',
      '1',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-terrain-primary',
      'rough',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-intent',
      'movement-combat',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-status',
      'legal',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-movement-status',
      'legal',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-combat-status',
      'range-only',
    );
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-sources'),
    ).toContain('movement:megamek');
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-sources'),
    ).toContain('combat:megamek');
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-rule-refs'),
    ).toContain(
      'movement:megamek:MegaMek common/moves/MoveStep.java:3135-3156 elevation change legality',
    );
    expect(
      movementSceneHex.getAttribute('data-isometric-hex-rule-refs'),
    ).toContain(
      'combat:megamek:MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
    );
    expect(movementSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(movementSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal movement-combat'),
    );
    expect(movementSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(movementSceneHex.querySelector('title')).toHaveTextContent(
      'Walk reachable 3 MP',
    );

    const targetSceneHex = screen.getByTestId('isometric-scene-hex-2-0');
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-map-position',
      '2,0',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-intent',
      'combat',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-status',
      'legal',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-movement-status',
      'none',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-combat-status',
      'attackable',
    );
    expect(targetSceneHex).toHaveAttribute(
      'data-isometric-hex-projection-explanation',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal combat'),
    );
    expect(targetSceneHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat short 2 hexes LOS clear'),
    );
    expect(targetSceneHex.querySelector('title')).toHaveTextContent(
      'combat short 2 hexes LOS clear',
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
    const emptyRange = screen.getByTestId('hex-combat-tooltip-range');
    expect(emptyRange).toHaveTextContent('short at 1 hexes');
    expect(emptyRange).toHaveAttribute('data-combat-has-target', 'false');
    expect(emptyRange).toHaveAttribute('data-combat-in-range', 'true');
    expect(emptyRange).toHaveAttribute('data-combat-target-ids', '');
    expect(emptyRange).toHaveAttribute(
      'data-combat-targeting-source-refs',
      expect.stringContaining('combat:megamek:MegaMek weapon range projection'),
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
    expect(targetHex).toHaveAttribute('data-combat-in-arc', 'false');
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
    const blockedOverlay = screen.getByTestId('hex-overlay-0-1');
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'combat-blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-status',
      'blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-combat-status',
      'blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-blocked-reasons',
      'No selected weapons can fire into the rear arc|No weapons cover rear arc|OutOfArc',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-sources',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-explanation',
      expect.stringContaining('weapons none available'),
    );
    expect(blockedOverlay).toHaveAccessibleName(
      expect.stringContaining('Hex 0,1 combat-blocked highlight'),
    );
    expect(blockedOverlay).toHaveAccessibleName(
      expect.stringContaining(
        'blocked No selected weapons can fire into the rear arc; No weapons cover rear arc; OutOfArc',
      ),
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

    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));

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
    const coverOverlay = screen.getByTestId('cover-overlay-hex-2-0');
    expect(coverOverlay).toHaveAttribute('data-cover-level', 'partial');
    expect(coverOverlay).toHaveAttribute('data-terrain-cover-level', 'none');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-level',
      'partial',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-partial-cover',
      'true',
    );
    expect(coverOverlay).toHaveAttribute('data-cover-projection-modifier', '1');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-target-ids',
      'enemy',
    );
    expect(coverOverlay).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Projected combat cover: partial +1; target partial cover true',
      ),
    );

    fireEvent.mouseEnter(targetHex);
    const coverRows = screen.getByTestId('hex-combat-tooltip-cover');
    expect(coverRows).toHaveTextContent(
      'Cover: partial +1 - Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(coverRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(coverRows).toHaveAttribute('data-tactical-rules-surface', 'combat');
    expect(coverRows).toHaveAttribute('data-combat-cover-level', 'partial');
    expect(coverRows).toHaveAttribute('data-combat-cover-modifier', '1');
    expect(coverRows).toHaveAttribute('data-combat-cover-partial', 'true');
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-reason',
      'Target behind building partial cover at (1, 0) (+1)',
    );
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(coverRows).toHaveAttribute(
      'data-combat-cover-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
  });

  it('projects hull-down cover metadata and to-hit modifiers from combat state', () => {
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
            hullDown: true,
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

    fireEvent.click(screen.getByTestId('overlay-toggle-cover'));

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-target-hull-down', 'true');
    expect(targetHex).toHaveAttribute('data-combat-hull-down-modifier', '2');
    expect(targetHex).toHaveAttribute(
      'data-combat-hull-down-reason',
      'Target in hull-down position with cover: +2',
    );
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '7');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Hull Down:2'),
    );
    const coverOverlay = screen.getByTestId('cover-overlay-hex-2-0');
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-target-hull-down',
      'true',
    );
    expect(coverOverlay).toHaveAttribute(
      'data-cover-projection-hull-down-modifier',
      '2',
    );

    fireEvent.mouseEnter(targetHex);
    const coverRows = screen.getByTestId('hex-combat-tooltip-cover');
    expect(coverRows).toHaveAttribute('data-combat-target-hull-down', 'true');
    expect(coverRows).toHaveAttribute('data-combat-hull-down-modifier', '2');
    expect(coverRows).toHaveTextContent(
      'Target in hull-down position with cover: +2',
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
      'combat',
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
      'data-combat-los-context-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
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

  it('surfaces LOS blocker context in combined tactical hover explanations', () => {
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
            mpCost: 2,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
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
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'blocked',
    );

    fireEvent.mouseEnter(targetHex);

    const losContext = screen.getByTestId(
      'hex-tactical-tooltip-combat-los-context',
    );
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
      'combat',
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
      'data-combat-los-context-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    const tacticalLosReason = screen.getByTestId(
      'hex-tactical-tooltip-combat-reason',
    );
    expect(tacticalLosReason).toHaveTextContent('Blocked by building');
    expect(tacticalLosReason).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-los-blocker-reason',
      'Blocked by building at (1, 0)',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-target-ids',
      'enemy',
    );
    expect(tacticalLosReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
  });

  it('keeps destroyed unit markers from creating LOS blocker highlights', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const wreck = makeToken({
      unitId: 'wreck',
      name: 'Wreck',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
      isDestroyed: true,
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
        tokens={[selected, wreck, enemy]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    const targetHex = screen.getByTestId('hex-2-0');
    expect(targetHex).toHaveAttribute('data-combat-los-state', 'clear');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-reason');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-hex');
    expect(targetHex).not.toHaveAttribute('data-combat-los-blocker-kind');
    expect(targetHex).not.toHaveAttribute('data-combat-invalid-reason');
    expect(
      screen.queryByTestId('hex-combat-los-blocker-badge-1-0'),
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(targetHex);

    expect(
      screen.queryByTestId('hex-combat-tooltip-los-context'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS clear; front arc',
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
    const indirectFireRows = screen.getByTestId(
      'hex-combat-tooltip-indirect-fire',
    );
    expect(indirectFireRows).toHaveTextContent(
      'Indirect fire via spotter spotter (+1)',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'combat',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-fire',
      'true',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-spotter',
      'spotter',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-basis',
      'los',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-reason',
      'Indirect fire via spotter spotter (+1)',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(screen.getByTestId('hex-combat-tooltip-geometry')).toHaveTextContent(
      'LOS blocked; front arc',
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: lrm-15-1',
    );
  });

  it('surfaces indirect-fire context in combined tactical hover explanations', () => {
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
        movementRange={[
          {
            hex: { q: 5, r: 0 },
            mpCost: 5,
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
    expect(targetHex).toHaveAttribute(
      'data-tactical-projection-intent',
      'movement-combat',
    );

    fireEvent.mouseEnter(targetHex);

    const indirectFireRows = screen.getByTestId(
      'hex-tactical-tooltip-combat-indirect-fire',
    );
    expect(indirectFireRows).toHaveTextContent(
      'Indirect fire via spotter spotter (+1)',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-spotter',
      'spotter',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-basis',
      'los',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-penalty',
      '1',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(indirectFireRows).toHaveAttribute(
      'data-combat-indirect-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
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
    const attackRange = screen.getByTestId('hex-combat-tooltip-range');
    expect(attackRange).toHaveTextContent('short at 2 hexes');
    expect(attackRange).toHaveAttribute('data-combat-attackable', 'true');
    expect(attackRange).toHaveAttribute(
      'data-combat-valid-target-ids',
      'enemy',
    );
    expect(attackRange).toHaveAttribute(
      'data-combat-weapons-available',
      'medium-laser',
    );
    const attackGeometry = screen.getByTestId('hex-combat-tooltip-geometry');
    expect(attackGeometry).toHaveTextContent('LOS clear; front arc');
    expect(attackGeometry).toHaveAttribute('data-combat-los-state', 'clear');
    expect(attackGeometry).toHaveAttribute('data-combat-firing-arc', 'front');
    const combatTerrainContext = screen.getByTestId(
      'hex-combat-tooltip-terrain-context',
    );
    expect(combatTerrainContext).toHaveTextContent('Terrain: light woods');
    expect(combatTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'light_woods',
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1 elevation 0',
      ),
    );
    expect(combatTerrainContext).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const combatElevationContext = screen.getByTestId(
      'hex-combat-tooltip-elevation-context',
    );
    expect(combatElevationContext).toHaveTextContent('Elevation: 0');
    expect(combatElevationContext).toHaveAttribute('data-elevation', '0');
    const combatReason = screen.getByTestId('hex-combat-tooltip-reason');
    expect(combatReason).toHaveTextContent('To-hit 5');
    expect(combatReason).toHaveTextContent('Target Terrain +1');
    expect(combatReason).toHaveAttribute('data-combat-attackable', 'true');
    expect(combatReason).toHaveAttribute(
      'data-combat-to-hit-reason',
      expect.stringContaining('Target Terrain +1'),
    );
    expect(combatReason).toHaveAttribute(
      'data-combat-reason-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(combatReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
    expect(screen.getByTestId('hex-combat-tooltip-weapons')).toHaveTextContent(
      'Weapons: medium-laser',
    );
    const visibilityRows = screen.getByTestId('hex-combat-tooltip-visibility');
    expect(visibilityRows).toHaveTextContent(
      'Visibility: visible (visible enemy)',
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
      'data-tactical-rules-surface',
      'combat',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-state',
      'visible',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-visible-target-ids',
      'enemy',
    );
    expect(visibilityRows).toHaveAttribute(
      'data-combat-visibility-obscured-target-ids',
      '',
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
    const minimumRangeRows = screen.getByTestId(
      'hex-combat-tooltip-minimum-range',
    );
    expect(minimumRangeRows).toHaveTextContent(
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'combat',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-penalty',
      '4',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-weapon-ids',
      'lrm-15-1',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-reason',
      'Minimum range penalty +4 (lrm-15-1)',
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-source-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(minimumRangeRows).toHaveAttribute(
      'data-combat-minimum-range-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek Compute.java'),
    );
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
    expect(targetHex).toHaveAttribute('data-combat-to-hit-number', '5');
    expect(targetHex).toHaveAttribute(
      'data-combat-to-hit-modifiers',
      expect.stringContaining('Ground-to-air altitude:1'),
    );
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
    expect(screen.getByTestId('hex-combat-tooltip-reason')).toHaveTextContent(
      'Ground-to-air altitude +1',
    );
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
      projectionBadge.getAttribute('data-projection-status-badge-sources'),
    ).toContain('combat:megamek:MegaMek combat target projection');
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-rule-refs'),
    ).toContain(
      'combat:megamek:MegaMek LosEffects.java:797-911 LOS blocking and terrain modifiers',
    );
    expect(
      projectionBadge.getAttribute('data-projection-status-badge-explanation'),
    ).toContain('Walk reachable 3 MP');
    expect(projectionBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat: MegaMek combat target projection'),
    );
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
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-sources',
      expect.stringContaining(
        'combat:megamek:MegaMek combat target projection',
      ),
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-rule-refs',
      expect.stringContaining(
        'combat:megamek:MegaMek Compute.java:1313-1517 weapon range/to-hit modifiers',
      ),
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('movement status legal'),
    );
    expect(tacticalTooltip).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('combat status blocked'),
    );
    expect(screen.getByTestId('hex-tactical-tooltip-status')).toHaveTextContent(
      'Mixed - movement-combat',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-channel-status'),
    ).toHaveTextContent('Movement channel: legal; combat channel: blocked');
    const tacticalTerrainContext = screen.getByTestId(
      'hex-tactical-tooltip-terrain-context',
    );
    expect(tacticalTerrainContext).toHaveTextContent('Terrain: clear');
    expect(tacticalTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(tacticalTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:clear elevation 0',
      ),
    );
    expect(tacticalTerrainContext).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const tacticalElevationContext = screen.getByTestId(
      'hex-tactical-tooltip-elevation-context',
    );
    expect(tacticalElevationContext).toHaveTextContent('Elevation: 0');
    expect(tacticalElevationContext).toHaveAttribute('data-elevation', '0');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement'),
    ).toHaveTextContent('Movement: reachable - walk; 3 MP');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveTextContent('Careful stand: +2 MP');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveAttribute('data-movement-context-kind', 'stand-up');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveAttribute('data-movement-stand-up-mode', 'careful');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveAttribute('data-movement-stand-up-cost', '2');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveAttribute(
      'data-movement-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek stand-up movement rules projection',
      ),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up'),
    ).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/GetUpStep.java',
      ),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveTextContent('Careful stand TN 4 (-2)');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveAttribute('data-movement-context-kind', 'stand-up-psr');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-required', 'true');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-reason', 'Careful stand');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-target-number', '4');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-modifier', '-2');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-modifiers'),
    ).toHaveTextContent('Modifiers: Careful stand -2');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-modifiers'),
    ).toHaveAttribute('data-movement-context-kind', 'stand-up-psr-modifiers');
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-modifiers'),
    ).toHaveAttribute(
      'data-movement-stand-up-psr-modifier-details',
      'Careful stand -2',
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-movement-stand-up-modifiers'),
    ).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek server/totalWarfare/MovePathHandler.java',
      ),
    );
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
    const tacticalRange = screen.getByTestId(
      'hex-tactical-tooltip-combat-range',
    );
    expect(tacticalRange).toHaveTextContent('Range: out of range at 3 hexes');
    expect(tacticalRange).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalRange).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(tacticalRange).toHaveAttribute('data-combat-distance', '3');
    expect(tacticalRange).toHaveAttribute('data-combat-in-range', 'false');
    expect(tacticalRange).toHaveAttribute('data-combat-target-ids', 'enemy');
    const tacticalGeometry = screen.getByTestId(
      'hex-tactical-tooltip-combat-geometry',
    );
    expect(tacticalGeometry).toHaveTextContent('LOS clear; front arc');
    expect(tacticalGeometry).toHaveAttribute('data-combat-los-state', 'clear');
    expect(tacticalGeometry).toHaveAttribute('data-combat-firing-arc', 'front');
    const tacticalVisibilityRows = screen.getByTestId(
      'hex-tactical-tooltip-combat-visibility',
    );
    expect(tacticalVisibilityRows).toHaveTextContent(
      'Visibility: visible (visible enemy)',
    );
    expect(tacticalVisibilityRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalVisibilityRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'combat',
    );
    expect(tacticalVisibilityRows).toHaveAttribute(
      'data-combat-visibility-state',
      'visible',
    );
    expect(tacticalVisibilityRows).toHaveAttribute(
      'data-combat-visibility-visible-target-ids',
      'enemy',
    );
    expect(tacticalVisibilityRows).toHaveAttribute(
      'data-combat-visibility-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek LosEffects.java'),
    );
    const tacticalOutOfRangeReason = screen.getByTestId(
      'hex-tactical-tooltip-combat-reason',
    );
    expect(tacticalOutOfRangeReason).toHaveTextContent(
      "Target at 3 hexes is outside the selected weapons' range",
    );
    expect(tacticalOutOfRangeReason).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(tacticalOutOfRangeReason).toHaveAttribute(
      'data-combat-blocked-reason',
      'Out of weapon range',
    );
    expect(tacticalOutOfRangeReason).toHaveAttribute(
      'data-combat-range-bracket',
      'out_of_range',
    );
    expect(tacticalOutOfRangeReason).toHaveAttribute(
      'data-combat-distance',
      '3',
    );
    expect(tacticalOutOfRangeReason).toHaveAttribute(
      'data-combat-reason-rule-refs',
      expect.stringContaining('combat:megamek:MegaMek RangeType.java'),
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-projection-reasons'),
    ).toHaveTextContent(
      "Target at 3 hexes is outside the selected weapons' range",
    );
    expect(
      screen.getByTestId('hex-tactical-tooltip-projection-explanation'),
    ).toHaveTextContent('movement status legal');
    expect(
      screen.getByTestId('hex-tactical-tooltip-projection-explanation'),
    ).toHaveTextContent('combat status blocked');
    expect(
      screen.getByTestId('hex-tactical-tooltip-projection-sources'),
    ).toHaveTextContent('combat: MegaMek combat target projection');
    expect(screen.getByTestId('hex-overlay-3-0')).toHaveAttribute(
      'data-hex-overlay-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MovePath.java:1214-1218 MP-used accounting',
      ),
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
    expect(
      screen.getByTestId('hex-combat-invalid-badge-2-0'),
    ).toHaveTextContent('AMMO');

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
