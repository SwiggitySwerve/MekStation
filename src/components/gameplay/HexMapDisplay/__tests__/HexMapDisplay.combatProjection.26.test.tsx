import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import { RangeBracket } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

import { generateHexesInRadius } from '../renderHelpers';
import * as H from './HexMapDisplay.combatProjection.test-helpers';

const {
  GameSide,
  HexMapDisplay,
  MovementType,
  TerrainType,
  fireEvent,
  makeToken,
  render,
  screen,
} = H;

function clearTerrain(hex: IHexCoordinate): IHexTerrain {
  return {
    coordinate: hex,
    elevation: hex.q === 1 && hex.r === 0 ? 2 : 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  };
}

function blockedSharedMovement(hex: IHexCoordinate): IMovementRangeHex {
  return {
    hex,
    mpCost: 99,
    terrainCost: 1,
    elevationDelta: 2,
    elevationCost: 2,
    reachable: false,
    movementType: MovementType.Walk,
    movementMode: 'walk',
    blockedReason: 'Shared engine projection rejected the destination',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Shared engine says cliff blocks path',
  };
}

function attackableSharedCombat(hex: IHexCoordinate): ICombatRangeHex {
  return {
    hex,
    distance: 1,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: 'none',
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy'],
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
    expectedDamage: 2.1,
    targetUnitIds: ['enemy'],
    validTargetUnitIds: ['enemy'],
  } as ICombatRangeHex;
}

function sharedFrame({
  radius = 1,
  includeAllHexes = true,
}: {
  readonly radius?: number;
  readonly includeAllHexes?: boolean;
} = {}): ITacticalMapProjectionFrame {
  const hexes = generateHexesInRadius(radius);
  const targetHex = { q: 1, r: 0 };
  const projectedHexes = includeAllHexes ? hexes : [targetHex];

  return {
    source: 'shared-engine-projection',
    sourceId: 'unit-test-shared-frame',
    label: 'Unit test shared tactical projection frame',
    lookup: buildTacticalMapHexProjectionLookup({
      hexes: projectedHexes,
      terrainLookup: new Map(
        projectedHexes.map((hex) => [coordToKey(hex), clearTerrain(hex)]),
      ),
      movementRangeLookup: new Map([
        [coordToKey(targetHex), blockedSharedMovement(targetHex)],
      ]),
      combatRangeLookup: new Map([
        [coordToKey(targetHex), attackableSharedCombat(targetHex)],
      ]),
      highlightPathIndexLookup: new Map([[coordToKey(targetHex), 1]]),
      legacyAttackRangeLookup: new Set(),
    }),
  };
}

describe('HexMapDisplay tactical projection frame contract', () => {
  it('uses supplied shared projection frames before conflicting legacy movement props', () => {
    render(
      <HexMapDisplay
        mapId="shared-frame-map"
        radius={1}
        tokens={[
          makeToken({
            unitId: 'selected',
            isSelected: true,
            position: { q: 0, r: 0 },
          }),
          makeToken({
            unitId: 'enemy',
            side: GameSide.Opponent,
            position: { q: 1, r: 0 },
          }),
        ]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 1,
            reachable: true,
            movementType: MovementType.Walk,
            movementMode: 'walk',
          },
        ]}
        tacticalProjectionFrame={sharedFrame()}
      />,
    );

    const container = screen.getByTestId('hex-map-container');
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-source',
      'shared-engine-projection',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-coverage-status',
      'complete',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-hex-count',
      '7',
    );

    const sharedHex = screen.getByTestId('hex-1-0');
    expect(sharedHex).toHaveAttribute('data-elevation', '2');
    expect(sharedHex).toHaveAttribute(
      'data-terrain-primary',
      TerrainType.Clear,
    );
    expect(sharedHex).toHaveAttribute('data-reachable', 'false');
    expect(sharedHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(sharedHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Shared engine says cliff blocks path',
    );
    expect(sharedHex).toHaveAttribute(
      'data-tactical-projection-status',
      'mixed',
    );
    expect(sharedHex).toHaveAttribute(
      'data-tactical-projection-combat-status',
      'attackable',
    );
    expect(
      sharedHex.getAttribute('data-tactical-projection-blocked-reasons'),
    ).toContain('Shared engine says cliff blocks path');

    fireEvent.mouseEnter(sharedHex);

    expect(screen.getByTestId('hex-tactical-tooltip')).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('Shared engine says cliff blocks path'),
    );
    expect(screen.getByTestId('unit-token-enemy')).toHaveAttribute(
      'data-token-valid-target-source',
      'combat-projection',
    );
  });

  it('marks locally derived projections as fallback frames', () => {
    render(
      <HexMapDisplay
        mapId="fallback-frame-map"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 2,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            reachable: true,
            movementType: MovementType.Walk,
            movementMode: 'walk',
          },
        ]}
      />,
    );

    const container = screen.getByTestId('hex-map-container');
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-source',
      'hex-map-derived-fallback',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-coverage-status',
      'complete',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-hex-count',
      '7',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-tactical-projection-movement-status',
      'legal',
    );
  });

  it('exposes missing shared-frame coverage without substituting fallback projection data', () => {
    render(
      <HexMapDisplay
        mapId="partial-shared-frame-map"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={generateHexesInRadius(1).map(clearTerrain)}
        movementRange={[
          {
            hex: { q: 0, r: 0 },
            mpCost: 1,
            terrainCost: 1,
            reachable: true,
            movementType: MovementType.Walk,
            movementMode: 'walk',
          },
        ]}
        tacticalProjectionFrame={sharedFrame({ includeAllHexes: false })}
      />,
    );

    const container = screen.getByTestId('hex-map-container');
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-source',
      'shared-engine-projection',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-coverage-status',
      'partial',
    );
    expect(container).toHaveAttribute(
      'data-tactical-projection-frame-hex-count',
      '1',
    );
    expect(
      container.getAttribute('data-tactical-projection-missing-hexes'),
    ).toContain('0,0');

    const missingHex = screen.getByTestId('hex-0-0');
    expect(missingHex).not.toHaveAttribute('data-reachable');
    expect(missingHex).not.toHaveAttribute(
      'data-tactical-projection-movement-status',
    );
  });
});
