/**
 * Terrain Art Layer
 *
 * Renders the static terrain background for a single hex:
 * 1. Elevation shading
 * 2. Base terrain art
 * 3. Secondary terrain art
 * 4. Contour edges on elevation transitions
 *
 * The layer does NOT render the hex polygon itself; that stays in
 * `HexCell` as the hit-test target.
 */

import React from 'react';

import type { IHexCoordinate, IHexTerrain } from '@/types/gameplay';

import { hexNeighbors } from '@/utils/gameplay/hexMath';
import {
  contourSegmentsFor,
  elevationLookup,
} from '@/utils/terrain/contourEdges';
import { shadingFor } from '@/utils/terrain/elevationShading';

import { hexPath, hexToPixel } from '../HexMapDisplay/renderHelpers';
import {
  TerrainBaseLayer,
  TerrainContourLines,
  TerrainFallbackGroup,
  TerrainSecondaryLayer,
} from './TerrainArtLayer.layers';
import {
  flatFillFor,
  resolveTerrainStack,
  terrainSymbolStateFor,
} from './TerrainArtLayer.model';

export interface TerrainArtLayerProps {
  /** The hex being rendered. */
  readonly hex: IHexCoordinate;
  /** The hex's terrain record (features + elevation). May be absent. */
  readonly terrain: IHexTerrain | undefined;
  /**
   * Lookup of every hex terrain on the map, keyed by "q,r". Used to
   * derive contour edges against neighbors.
   */
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  /**
   * If `true`, force fallback to the Phase 1 flat color path.
   * Used by tests and by runtime error handling.
   */
  readonly forceFallback?: boolean;
  /**
   * A set of symbol ids to treat as missing (fallback instead of
   * rendering). Used by tests to exercise the asset-load-failure path.
   */
  readonly missingSymbolIds?: ReadonlySet<string>;
}

export const TerrainArtLayer = React.memo(function TerrainArtLayer({
  hex,
  terrain,
  terrainLookup,
  forceFallback,
  missingSymbolIds,
}: TerrainArtLayerProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const elevation = terrain?.elevation ?? 0;
  const pathD = hexPath(x, y);
  const firstFeature = terrain?.features[0];

  const stack = React.useMemo(
    () => resolveTerrainStack(terrain?.features),
    [terrain],
  );

  const contours = React.useMemo(() => {
    const neighborElevs = hexNeighbors(hex).map((neighbor) =>
      elevationLookup(neighbor, terrainLookup),
    );
    return contourSegmentsFor({ x, y }, elevation, neighborElevs);
  }, [hex, elevation, terrainLookup, x, y]);

  if (forceFallback) {
    return (
      <TerrainFallbackGroup
        hex={hex}
        pathD={pathD}
        fill={flatFillFor(firstFeature) ?? '#f8fafc'}
      />
    );
  }

  const symbolState = terrainSymbolStateFor(
    stack,
    firstFeature,
    missingSymbolIds,
  );

  return (
    <g data-testid={`terrain-art-${hex.q}-${hex.r}`}>
      <path
        d={pathD}
        fill={shadingFor(elevation)}
        data-testid={`terrain-shading-${hex.q}-${hex.r}`}
        data-elevation={elevation}
      />

      <TerrainBaseLayer
        hex={hex}
        x={x}
        y={y}
        stack={stack}
        symbolState={symbolState}
        firstFeature={firstFeature}
        pathD={pathD}
      />
      <TerrainSecondaryLayer
        hex={hex}
        x={x}
        y={y}
        stack={stack}
        symbolState={symbolState}
        firstFeature={firstFeature}
        pathD={pathD}
      />
      <TerrainContourLines hex={hex} contours={contours} />
    </g>
  );
});

export default TerrainArtLayer;
