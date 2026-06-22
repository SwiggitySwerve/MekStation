import { act, fireEvent, render, screen } from '@testing-library/react';

import type {
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
  MapProjectionMode,
} from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';

import {
  formatElevationLabel,
  formatTerrainFeatureReferenceLabel,
  formatTerrainLabel,
  terrainFeatureLevelsAttribute,
} from '../HexCell.labels';
import { HexMapDisplay } from '../HexMapDisplay';
import {
  FOCUS_BUMP_ZOOM,
  type MapInteractionState,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../useMapInteraction';

const TERRAIN_COORDS: readonly IHexCoordinate[] = [
  { q: 0, r: -2 },
  { q: 1, r: -2 },
  { q: 2, r: -2 },
  { q: -1, r: -1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 2, r: -1 },
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
  { q: 1, r: 2 },
];

const TERRAIN_BADGE_BY_TYPE = {
  [TerrainType.Clear]: 'CLR',
  [TerrainType.Pavement]: 'PAV',
  [TerrainType.Road]: 'RD',
  [TerrainType.LightWoods]: 'LWD',
  [TerrainType.HeavyWoods]: 'HWD',
  [TerrainType.Rough]: 'RGH',
  [TerrainType.Rubble]: 'RBL',
  [TerrainType.Water]: 'WTR',
  [TerrainType.Sand]: 'SND',
  [TerrainType.Mud]: 'MUD',
  [TerrainType.Snow]: 'SNW',
  [TerrainType.Ice]: 'ICE',
  [TerrainType.Swamp]: 'SWP',
  [TerrainType.HeavyIndustrial]: 'IND',
  [TerrainType.PlantedField]: 'PLT',
  [TerrainType.Building]: 'BLDG',
  [TerrainType.Bridge]: 'BRG',
  [TerrainType.Mines]: 'MIN',
  [TerrainType.Fire]: 'FIR',
  [TerrainType.Smoke]: 'SMK',
} satisfies Record<TerrainType, string>;

function terrainFeatureLevel(type: TerrainType): number {
  return type === TerrainType.Clear ? 0 : 1;
}

function buildTerrainMatrix(): readonly IHexTerrain[] {
  return Object.values(TerrainType).map((type, index) => ({
    coordinate: TERRAIN_COORDS[index],
    elevation: (index % 7) - 3,
    features: [{ type, level: terrainFeatureLevel(type) }],
  }));
}

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

function assertTerrainElevationProjectionMetadata(
  badge: HTMLElement,
  terrain: IHexTerrain,
): void {
  expect(badge).toHaveAttribute(
    'data-tactical-projection-source',
    'shared-tactical-map-projection',
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-channel',
    'terrain-elevation',
  );
  expect(badge).toHaveAttribute(
    'data-tactical-rules-surface',
    'terrain-elevation',
  );
  expect(badge).toHaveAttribute('data-tactical-projection-intent');
  expect(badge).toHaveAttribute('data-tactical-projection-status');
  expect(badge).toHaveAttribute(
    'data-tactical-projection-sources',
    expect.stringContaining(
      'terrain-elevation:mekstation:Rendered map terrain/elevation grid:',
    ),
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-sources',
    expect.stringContaining(`elevation ${terrain.elevation}`),
  );
  expect(badge).toHaveAttribute(
    'data-tactical-projection-rule-refs',
    expect.stringContaining(
      'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
    ),
  );
}

function assertTerrainAndElevationBadges(
  terrainMatrix: readonly IHexTerrain[],
  projectionMode: MapProjectionMode = 'topDown',
): void {
  for (const terrain of terrainMatrix) {
    const { q, r } = terrain.coordinate;
    const terrainType = terrain.features[0].type;
    const terrainLabel = formatTerrainLabel(terrainType);
    const terrainReferenceLabel = formatTerrainFeatureReferenceLabel(
      terrain.features,
    );
    const terrainFeatureLevels = terrainFeatureLevelsAttribute(
      terrain.features,
    );
    const elevationLabel = formatElevationLabel(terrain.elevation);
    const elevationSign =
      terrain.elevation > 0
        ? 'positive'
        : terrain.elevation < 0
          ? 'negative'
          : 'zero';

    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `terrain ${terrainReferenceLabel}; primary ${terrainLabel}; elevation ${elevationLabel}`,
      ),
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-terrain-primary',
      terrainType,
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-elevation',
      `${terrain.elevation}`,
    );
    expect(screen.getByTestId(`hex-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-levels',
      terrainFeatureLevels,
    );

    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveTextContent(
      TERRAIN_BADGE_BY_TYPE[terrainType],
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`Terrain ${terrainReferenceLabel}`),
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-badge',
      TERRAIN_BADGE_BY_TYPE[terrainType],
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-count',
      `${terrain.features.length}`,
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-terrain-feature-levels',
      terrainFeatureLevels,
    );
    expect(screen.getByTestId(`hex-terrain-label-${q}-${r}`)).toHaveAttribute(
      'data-projection-mode',
      projectionMode,
    );
    assertTerrainElevationProjectionMetadata(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`),
      terrain,
    );
    expect(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`).querySelector('rect'),
    ).toHaveAttribute('height', '11');
    expect(
      screen.getByTestId(`hex-terrain-label-${q}-${r}`).querySelector('text'),
    ).toHaveAttribute('font-size', '7');

    const elevationBadgeTestId = `hex-elevation-label-${q}-${r}`;
    const shouldRenderElevationBadge =
      projectionMode === 'topDown' && terrain.elevation !== 0;

    if (!shouldRenderElevationBadge) {
      expect(screen.queryByTestId(elevationBadgeTestId)).toBeNull();
      continue;
    }

    const elevationBadge = screen.getByTestId(elevationBadgeTestId);
    expect(elevationBadge).toHaveTextContent(elevationLabel);
    expect(elevationBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `Elevation ${elevationLabel} (level ${terrain.elevation})`,
      ),
    );
    expect(elevationBadge).toHaveAttribute(
      'data-elevation-value',
      `${terrain.elevation}`,
    );
    expect(elevationBadge).toHaveAttribute(
      'data-elevation-sign',
      elevationSign,
    );
    expect(elevationBadge).toHaveAttribute(
      'data-projection-mode',
      projectionMode,
    );
    assertTerrainElevationProjectionMetadata(elevationBadge, terrain);
    expect(elevationBadge.querySelector('rect')).toHaveAttribute(
      'height',
      '14',
    );
    expect(elevationBadge.querySelector('text')).toHaveAttribute(
      'font-size',
      '10',
    );
  }
}

export {
  FOCUS_BUMP_ZOOM,
  Facing,
  GameSide,
  HexMapDisplay,
  MovementType,
  TERRAIN_BADGE_BY_TYPE,
  TERRAIN_COORDS,
  TerrainType,
  TokenUnitType,
  ZOOM_MAX,
  ZOOM_MIN,
  act,
  assertTerrainAndElevationBadges,
  assertTerrainElevationProjectionMetadata,
  buildTerrainMatrix,
  fireEvent,
  formatElevationLabel,
  formatTerrainFeatureReferenceLabel,
  formatTerrainLabel,
  makeToken,
  makeWeapon,
  render,
  screen,
  terrainFeatureLevel,
  terrainFeatureLevelsAttribute,
  useAnimationQueue,
};

export type {
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
  MapInteractionState,
  MapProjectionMode,
};
