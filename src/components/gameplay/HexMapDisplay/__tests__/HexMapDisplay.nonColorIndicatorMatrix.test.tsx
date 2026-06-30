import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import { MovementType, RangeBracket, TerrainType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

import { withSameHexMovementOptions } from '../HexCell.movementOptionSummaries';
import { generateHexesInRadius } from '../renderHelpers';
import * as H from './HexMapDisplay.movementAnimation.test-helpers';

const { HexMapDisplay, render, screen } = H;

function terrain(
  hex: IHexCoordinate,
  type: TerrainType = TerrainType.Clear,
): IHexTerrain {
  return {
    coordinate: hex,
    elevation: 0,
    features: [{ type, level: type === TerrainType.Mines ? 1 : 0 }],
  };
}

function movement(
  hex: IHexCoordinate,
  overrides: Partial<IMovementRangeHex>,
): IMovementRangeHex {
  return {
    hex,
    mpCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
    movementMode: 'walk',
    ...overrides,
  };
}

function rangeOnlyCombat(hex: IHexCoordinate): ICombatRangeHex {
  return {
    hex,
    distance: 2,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: 'none',
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: false,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: [],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: ['medium-laser'],
    weaponRangeOptions: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
        rangeBracket: RangeBracket.Short,
        inRange: true,
        inArc: true,
        environmentLegal: true,
        available: true,
      },
    ],
    availableWeaponImpacts: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
      },
    ],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    expectedDamage: 2.5,
    targetUnitIds: [],
    validTargetUnitIds: [],
  } as ICombatRangeHex;
}

function matrixFrame(): ITacticalMapProjectionFrame {
  const legal = movement({ q: -1, r: 0 }, {});
  const blocked = movement(
    { q: 1, r: 0 },
    {
      mpCost: 99,
      reachable: false,
      blockedReason: 'Destination occupied',
      movementInvalidReason: 'DestinationOccupied',
      movementInvalidDetails: 'Destination occupied by hostile unit',
    },
  );
  const costly = movement(
    { q: 0, r: 1 },
    {
      mpCost: 5,
      terrainCost: 2,
      elevationDelta: 1,
      elevationCost: 1,
      heatGenerated: 2,
      movementType: MovementType.Run,
      movementMode: 'run',
    },
  );
  const hazard = movement({ q: 0, r: -1 }, { mpCost: 2 });
  const mixedHex = { q: -1, r: 1 };
  const mixed = withSameHexMovementOptions([
    movement(mixedHex, { mpCost: 2 }),
    movement(mixedHex, {
      mpCost: 3,
      reachable: false,
      movementType: MovementType.Jump,
      movementMode: 'jump',
      blockedReason: 'Jump MP too low',
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: 'Jump MP too low for elevation rise',
    }),
  ]);
  const combatHex = { q: 1, r: -1 };

  return {
    source: 'shared-engine-projection',
    sourceId: 'non-color-indicator-matrix',
    label: 'Non-color indicator matrix',
    lookup: buildTacticalMapHexProjectionLookup({
      hexes: generateHexesInRadius(2),
      terrainLookup: new Map([
        [coordToKey(hazard.hex), terrain(hazard.hex, TerrainType.Mines)],
      ]),
      movementRangeLookup: new Map([
        [coordToKey(legal.hex), legal],
        [coordToKey(blocked.hex), blocked],
        [coordToKey(costly.hex), costly],
        [coordToKey(hazard.hex), hazard],
        [coordToKey(mixedHex), mixed],
      ]),
      combatRangeLookup: new Map([
        [coordToKey(combatHex), rangeOnlyCombat(combatHex)],
      ]),
    }),
  };
}

describe('HexMapDisplay non-color tactical indicator matrix', () => {
  it('distinguishes legal, blocked, costly, hazard, mixed, and combat-relevant hexes without color alone', () => {
    render(
      <HexMapDisplay
        mapId="non-color-indicator-matrix"
        radius={2}
        tokens={[]}
        selectedHex={null}
        tacticalProjectionFrame={matrixFrame()}
      />,
    );

    expect(screen.getByTestId('hex-map-container')).toHaveAttribute(
      'data-tactical-projection-frame-source',
      'shared-engine-projection',
    );

    expect(screen.getByTestId('hex--1-0')).toHaveAttribute(
      'data-tactical-projection-status',
      'legal',
    );
    expect(screen.getByTestId('hex-movement-badge--1-0')).toHaveTextContent(
      'W 1MP',
    );

    expect(screen.getByTestId('hex-overlay-1-0')).toHaveAttribute(
      'data-movement-non-color-encoding',
      'blocked-cross-hatch',
    );
    expect(screen.getByTestId('blocked-movement-glyph-1-0')).toHaveTextContent(
      '!',
    );
    expect(
      screen.getByTestId('hex-projection-status-badge-1-0'),
    ).toHaveTextContent('BLK');

    expect(
      screen.getByTestId('hex-projection-status-badge-0-1'),
    ).toHaveTextContent('CST');
    expect(screen.getByTestId('hex-movement-cost-badge-0-1')).toHaveAttribute(
      'data-movement-step-terrain-cost',
      '2',
    );
    expect(screen.getByTestId('run-range-outline-0-1')).toHaveAttribute(
      'stroke-dasharray',
      '5 3',
    );

    expect(
      screen.getByTestId('hex-projection-status-badge-0--1'),
    ).toHaveTextContent('HAZ');
    expect(screen.getByTestId('hex-0--1')).toHaveAttribute(
      'data-tactical-projection-movement-hazard-status',
      'represented-minefield',
    );

    expect(
      screen.getByTestId('hex-projection-status-badge--1-1'),
    ).toHaveTextContent('MIX');
    expect(
      screen.getByTestId('hex-movement-blocked-options-badge--1-1'),
    ).toHaveTextContent('J BLK');

    expect(screen.getByTestId('hex-overlay-1--1')).toHaveAttribute(
      'data-hex-overlay-combat-status',
      'range-only',
    );
    expect(screen.getByTestId('hex-combat-badge-1--1')).toHaveAttribute(
      'data-combat-badge-range',
      RangeBracket.Short,
    );
  });
});
