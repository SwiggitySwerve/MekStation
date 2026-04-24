/**
 * Terrain Art Layer
 *
 * Renders the static terrain background for a single hex. Composes
 * (bottom -> top):
 *   1. Elevation shading rect
 *   2. Base terrain art (clear / pavement / water)
 *   3. Secondary terrain art (woods, buildings) — 75% opacity for woods
 *   4. Contour edges on elevation transitions
 *
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-rendering/spec.md
 * @spec openspec/changes/add-terrain-rendering/specs/tactical-map-interface/spec.md
 *
 * Design notes:
 * - D2: references shared `<symbol>` nodes via `<use>` for O(1) cost.
 * - D3: elevation shading is a full-hex neutral `hsl` fill at the
 *   bottom of the layer stack.
 * - D4: if a key is missing from the visual map, the layer falls back
 *   to the Phase 1 flat `TERRAIN_COLORS` fill and logs a warning.
 * - D7: every asset carries a `data-shape` signature readable without
 *   color.
 *
 * The layer does NOT render the hex polygon itself — that stays in
 * `HexCell` as the hit-test target.
 */

import React from 'react';

import type {
  IHexCoordinate,
  IHexTerrain,
  ITerrainFeature,
} from '@/types/gameplay';

import { TERRAIN_COLORS } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import { hexNeighbors } from '@/utils/gameplay/hexMath';
import {
  contourSegmentsFor,
  elevationLookup,
} from '@/utils/terrain/contourEdges';
import { shadingFor } from '@/utils/terrain/elevationShading';
import {
  TerrainVisualKey,
  symbolIdFor,
  visualKeyFor,
} from '@/utils/terrain/terrainVisualMap';

import { hexPath, hexToPixel } from '../HexMapDisplay/renderHelpers';

/**
 * One full square of terrain art. We use 80 to roughly match HEX_SIZE
 * (40 radius = 80 diameter) so the art maps across the hex polygon
 * cleanly. The `<use>` element positions art centered on the hex.
 */
const ART_SIZE = 80;
const ART_HALF = ART_SIZE / 2;

/**
 * Opacity for secondary terrain (woods and buildings) — 75% so the
 * base layer (clear / pavement) peeks through slightly. Per spec
 * "Clear + woods: render clear base, woods on top at 75% opacity".
 */
const SECONDARY_ART_OPACITY = 0.75;

/**
 * Categorize a visual key as "base" (ground layer) or "secondary"
 * (sits on top of base). Controls the stacking order within a hex so
 * pavement + building renders correctly (pavement base, building on
 * top) and clear + woods does the same.
 */
function isSecondaryKey(key: TerrainVisualKey): boolean {
  switch (key) {
    case 'light-woods':
    case 'heavy-woods':
    case 'light-building':
    case 'medium-building':
    case 'heavy-building':
    case 'hardened-building':
    case 'rubble':
      return true;
    default:
      return false;
  }
}

/**
 * Default base key to render beneath a secondary feature when the
 * terrain has no explicit base layer. Buildings sit on pavement;
 * everything else sits on clear.
 */
function defaultBaseFor(secondary: TerrainVisualKey): TerrainVisualKey {
  if (
    secondary === 'light-building' ||
    secondary === 'medium-building' ||
    secondary === 'heavy-building' ||
    secondary === 'hardened-building'
  ) {
    return 'pavement';
  }
  return 'clear';
}

/**
 * Pick a base + optional secondary visual key from a terrain feature
 * list. Respects spec stacking rules:
 * - Rubble overrides a destroyed building (handled by callers passing
 *   rubble features) — we check for rubble first and treat it as the
 *   secondary regardless of other features.
 * - Woods + clear: clear base, woods secondary.
 * - Building + pavement: pavement base, building secondary.
 * - Pure base terrain (clear, pavement, water, rough): base only.
 */
function resolveStack(features: readonly ITerrainFeature[]): {
  base: TerrainVisualKey | null;
  secondary: TerrainVisualKey | null;
} {
  let base: TerrainVisualKey | null = null;
  let secondary: TerrainVisualKey | null = null;

  // Rubble override (spec): if ANY feature is Rubble, it's the
  // secondary regardless of building state in the same hex. The
  // pavement base survives.
  const rubbleFeature = features.find((f) => f.type === TerrainType.Rubble);
  if (rubbleFeature) {
    secondary = visualKeyFor(rubbleFeature.type, rubbleFeature.level);
    const pavementFeature = features.find(
      (f) => f.type === TerrainType.Pavement,
    );
    if (pavementFeature) {
      base = visualKeyFor(pavementFeature.type, pavementFeature.level);
    }
    return { base, secondary };
  }

  for (const feature of features) {
    const key = visualKeyFor(feature.type, feature.level);
    if (!key) continue;
    if (isSecondaryKey(key)) {
      // Last secondary wins — later features override earlier when
      // tied on the secondary slot (e.g., woods + building unlikely
      // but deterministic).
      secondary = key;
    } else {
      // Last base wins — water overrides clear if both declared.
      base = key;
    }
  }

  // Ensure a secondary always has a base to sit on.
  if (secondary && !base) {
    base = defaultBaseFor(secondary);
  }

  return { base, secondary };
}

/**
 * Flat fallback fill. Used when a visual key can't be resolved (e.g.,
 * sand, snow, mud — terrain types outside this change's art catalog)
 * or when runtime is configured to bypass art for a specific key.
 */
function flatFillFor(feature: ITerrainFeature | undefined): string | null {
  if (!feature) return null;
  return TERRAIN_COLORS[feature.type] ?? null;
}

/**
 * Warn-once per visual key so a missing symbol doesn't spam the
 * console. Spec: "the error SHALL be logged (not thrown)".
 */
const warnedMissingKeys = new Set<string>();
function warnMissingKey(key: string): void {
  if (warnedMissingKeys.has(key)) return;
  warnedMissingKeys.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[TerrainArtLayer] visual key "${key}" has no rendered symbol; falling back to flat color`,
  );
}

export interface TerrainArtLayerProps {
  /** The hex being rendered. */
  readonly hex: IHexCoordinate;
  /** The hex's terrain record (features + elevation). May be absent. */
  readonly terrain: IHexTerrain | undefined;
  /**
   * Lookup of every hex terrain on the map, keyed by "q,r". Used to
   * derive contour edges against neighbors. Pass the same map the
   * parent `HexMapDisplay` already maintains.
   */
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  /**
   * If `true`, force fallback to the Phase 1 flat color path.
   * Used by tests and by runtime error handling (spec D4).
   */
  readonly forceFallback?: boolean;
  /**
   * A set of symbol ids to treat as missing (fallback instead of
   * rendering). Used by tests to exercise the asset-load-failure path;
   * runtime never sets this.
   */
  readonly missingSymbolIds?: ReadonlySet<string>;
}

/**
 * Renders the terrain art for a single hex. Sits beneath the hex
 * polygon in `HexCell`.
 */
export const TerrainArtLayer = React.memo(function TerrainArtLayer({
  hex,
  terrain,
  terrainLookup,
  forceFallback,
  missingSymbolIds,
}: TerrainArtLayerProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const elevation = terrain?.elevation ?? 0;
  const shadingColor = shadingFor(elevation);
  const pathD = hexPath(x, y);

  const stack = React.useMemo(() => {
    if (!terrain || terrain.features.length === 0) {
      return { base: null, secondary: null } as {
        base: TerrainVisualKey | null;
        secondary: TerrainVisualKey | null;
      };
    }
    return resolveStack(terrain.features);
  }, [terrain]);

  // Compute contour edges on the fly. For each of 6 neighbors, look up
  // elevation; segments where |delta| >= 1 produce a contour line.
  const contours = React.useMemo(() => {
    const neighborElevs: (number | null)[] = hexNeighbors(hex).map((n) =>
      elevationLookup(n, terrainLookup),
    );
    return contourSegmentsFor({ x, y }, elevation, neighborElevs);
  }, [hex, elevation, terrainLookup, x, y]);

  // Fallback path: render the Phase 1 flat color.
  const firstFeature = terrain?.features[0];
  if (forceFallback) {
    const flat = flatFillFor(firstFeature) ?? '#f8fafc';
    return (
      <g data-testid={`terrain-art-${hex.q}-${hex.r}`} data-fallback="true">
        <path d={pathD} fill={flat} data-terrain-fallback="true" />
      </g>
    );
  }

  // Detect a missing symbol (spec "Fallback on Asset Load Failure").
  const baseId = stack.base ? symbolIdFor(stack.base) : null;
  const secondaryId = stack.secondary ? symbolIdFor(stack.secondary) : null;
  const baseMissing = baseId ? missingSymbolIds?.has(baseId) : false;
  const secondaryMissing = secondaryId
    ? missingSymbolIds?.has(secondaryId)
    : false;
  if (baseMissing && baseId) warnMissingKey(baseId);
  if (secondaryMissing && secondaryId) warnMissingKey(secondaryId);

  const useBaseFallback = baseMissing || (!stack.base && !!firstFeature);
  const useSecondaryFallback = secondaryMissing;

  return (
    <g data-testid={`terrain-art-${hex.q}-${hex.r}`}>
      {/*
        Elevation shading (bottom of the layer stack). Neutral hsl
        lightness modulated by elevation; see elevationShading.ts.
      */}
      <path
        d={pathD}
        fill={shadingColor}
        data-testid={`terrain-shading-${hex.q}-${hex.r}`}
        data-elevation={elevation}
      />

      {/*
        Base terrain art (clear, pavement, water). Either a symbol
        reference or — if the key is missing / terrain has no matching
        key — a flat-color fallback `<path>`.
      */}
      {stack.base && !useBaseFallback && (
        <use
          href={`#${symbolIdFor(stack.base)}`}
          x={x - ART_HALF}
          y={y - ART_HALF}
          width={ART_SIZE}
          height={ART_SIZE}
          data-testid={`terrain-base-${hex.q}-${hex.r}`}
          data-visual-key={stack.base}
        />
      )}
      {useBaseFallback && firstFeature && (
        <path
          d={pathD}
          fill={flatFillFor(firstFeature) ?? '#f8fafc'}
          data-testid={`terrain-base-fallback-${hex.q}-${hex.r}`}
          data-terrain-fallback="true"
        />
      )}

      {/*
        Secondary terrain (woods, buildings, rubble). Rendered at 75%
        opacity for woods/rubble so the base reads through per spec
        stacking. Buildings render at full opacity.
      */}
      {stack.secondary && !useSecondaryFallback && (
        <use
          href={`#${symbolIdFor(stack.secondary)}`}
          x={x - ART_HALF}
          y={y - ART_HALF}
          width={ART_SIZE}
          height={ART_SIZE}
          opacity={
            stack.secondary.includes('woods') || stack.secondary === 'rubble'
              ? SECONDARY_ART_OPACITY
              : 1
          }
          data-testid={`terrain-secondary-${hex.q}-${hex.r}`}
          data-visual-key={stack.secondary}
        />
      )}
      {useSecondaryFallback && firstFeature && (
        <path
          d={pathD}
          fill={flatFillFor(firstFeature) ?? '#78716c'}
          opacity={0.5}
          data-testid={`terrain-secondary-fallback-${hex.q}-${hex.r}`}
          data-terrain-fallback="true"
        />
      )}

      {/*
        Contour edges (top of the terrain layer, below tactical
        overlays). One line per neighbor whose elevation differs by
        1+. Thickness scales 1 -> 1px, 2+ -> 2px. Color contrasts
        against the base fill.
      */}
      {contours.map((segment) => (
        <line
          key={`contour-${hex.q}-${hex.r}-${segment.edgeIndex}`}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          stroke={segment.color}
          strokeWidth={segment.width}
          strokeLinecap="round"
          pointerEvents="none"
          data-testid={`terrain-contour-${hex.q}-${hex.r}-${segment.edgeIndex}`}
          data-contour-delta={segment.width}
        />
      ))}
    </g>
  );
});

export default TerrainArtLayer;
