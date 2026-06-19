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

function assertMixedProjectionStatusBadge() {
  const projectionBadge = screen.getByTestId('hex-projection-status-badge-3-0');
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
  expect(screen.getByTestId('hex-combat-invalid-badge-3-0')).toHaveTextContent(
    'OUT',
  );
}

function assertMixedMovementCombatTooltip() {
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
    expect.stringContaining('combat:megamek:MegaMek combat target projection'),
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
  expect(screen.getByTestId('hex-tactical-tooltip-movement')).toHaveTextContent(
    'Movement: reachable - walk; 3 MP',
  );
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
  const tacticalRange = screen.getByTestId('hex-tactical-tooltip-combat-range');
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
  expect(tacticalOutOfRangeReason).toHaveAttribute('data-combat-distance', '3');
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
}

export {
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
  assertMixedProjectionStatusBadge,
  assertMixedMovementCombatTooltip,
  render,
  screen,
};

export type { IGameState, IUnitToken, IWeaponStatus };
