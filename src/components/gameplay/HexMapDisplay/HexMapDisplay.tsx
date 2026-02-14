import React, { useState, useCallback, useMemo } from 'react';

import type {
  IHexCoordinate,
  IUnitToken,
  IMovementRangeHex,
  IHexTerrain,
  IHexGrid,
  IHex,
} from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import { HexCell } from './HexCell';
import {
  MovementCostOverlay,
  CoverOverlay,
  LOSLine,
  TerrainPatternDefs,
} from './Overlays';
import { generateHexesInRadius, hexEquals, hexInList } from './renderHelpers';
import { UnitTokenComponent } from './UnitToken';
import { useMapInteraction } from './useMapInteraction';

export interface HexMapDisplayProps {
  radius: number;
  tokens: readonly IUnitToken[];
  selectedHex: IHexCoordinate | null;
  hexTerrain?: readonly IHexTerrain[];
  movementRange?: readonly IMovementRangeHex[];
  attackRange?: readonly IHexCoordinate[];
  highlightPath?: readonly IHexCoordinate[];
  onHexClick?: (hex: IHexCoordinate) => void;
  onHexHover?: (hex: IHexCoordinate | null) => void;
  onTokenClick?: (unitId: string) => void;
  showCoordinates?: boolean;
  className?: string;
}

export function HexMapDisplay({
  radius,
  tokens,
  selectedHex,
  hexTerrain = [],
  movementRange = [],
  attackRange = [],
  highlightPath = [],
  onHexClick,
  onHexHover,
  onTokenClick,
  showCoordinates = false,
  className = '',
}: HexMapDisplayProps): React.ReactElement {
  const [hoveredHex, setHoveredHex] = useState<IHexCoordinate | null>(null);

  const interaction = useMapInteraction(radius);

  const hexes = useMemo(() => generateHexesInRadius(radius), [radius]);

  const terrainLookup = useMemo(() => {
    const map = new Map<string, IHexTerrain>();
    for (const t of hexTerrain) {
      map.set(`${t.coordinate.q},${t.coordinate.r}`, t);
    }
    return map;
  }, [hexTerrain]);

  const movementRangeLookup = useMemo(() => {
    const map = new Map<string, IMovementRangeHex>();
    for (const m of movementRange) {
      map.set(`${m.hex.q},${m.hex.r}`, m);
    }
    return map;
  }, [movementRange]);

  const hexGrid = useMemo((): IHexGrid => {
    const hexMap = new Map<string, IHex>();
    for (const t of hexTerrain) {
      const key = coordToKey(t.coordinate);
      const terrainType = t.features[0]?.type ?? TerrainType.Clear;
      hexMap.set(key, {
        coord: t.coordinate,
        occupantId: null,
        terrain: terrainType,
        elevation: t.elevation,
      });
    }
    for (const hex of hexes) {
      const key = coordToKey(hex);
      if (!hexMap.has(key)) {
        hexMap.set(key, {
          coord: hex,
          occupantId: null,
          terrain: TerrainType.Clear,
          elevation: 0,
        });
      }
    }
    return { config: { radius }, hexes: hexMap };
  }, [hexTerrain, hexes, radius]);

  const selectedUnitPosition = useMemo(() => {
    const selectedToken = tokens.find((t) => t.isSelected);
    return selectedToken?.position ?? null;
  }, [tokens]);

  const losResults = useMemo(() => {
    if (!interaction.showLOSOverlay || !selectedUnitPosition)
      return new Map<string, boolean>();
    const results = new Map<string, boolean>();
    for (const hex of hexes) {
      if (hex.q === selectedUnitPosition.q && hex.r === selectedUnitPosition.r)
        continue;
      const los = calculateLOS(selectedUnitPosition, hex, hexGrid);
      results.set(coordToKey(hex), los.hasLOS);
    }
    return results;
  }, [interaction.showLOSOverlay, selectedUnitPosition, hexes, hexGrid]);

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      onHexClick?.(hex);
    },
    [onHexClick],
  );

  const handleHexHover = useCallback(
    (hex: IHexCoordinate | null) => {
      setHoveredHex(hex);
      onHexHover?.(hex);
    },
    [onHexHover],
  );

  const handleTokenClick = useCallback(
    (unitId: string) => {
      onTokenClick?.(unitId);
    },
    [onTokenClick],
  );

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      data-testid="hex-map-container"
    >
      <svg
        ref={interaction.svgRef}
        viewBox={interaction.transformedViewBox}
        className="h-full w-full touch-manipulation"
        onWheel={interaction.handleWheel}
        onMouseDown={interaction.handleMouseDown}
        onMouseMove={interaction.handleMouseMove}
        onMouseUp={interaction.handleMouseUp}
        onMouseLeave={interaction.handleMouseUp}
        onTouchStart={interaction.handleTouchStart}
        onTouchMove={interaction.handleTouchMove}
        onTouchEnd={interaction.handleTouchEnd}
        data-testid="hex-grid"
      >
        <TerrainPatternDefs />
        <g>
          {hexes.map((hex) => {
            const key = `${hex.q},${hex.r}`;
            const terrain = terrainLookup.get(key);
            const isSelected = selectedHex
              ? hexEquals(hex, selectedHex)
              : false;
            const isHovered = hoveredHex ? hexEquals(hex, hoveredHex) : false;
            const movementInfo = movementRangeLookup.get(key);
            const isInAttackRange = hexInList(hex, attackRange);
            const isInPath = hexInList(hex, highlightPath);

            return (
              <HexCell
                key={key}
                hex={hex}
                terrain={terrain}
                isSelected={isSelected}
                isHovered={isHovered}
                movementInfo={movementInfo}
                isInAttackRange={isInAttackRange}
                isInPath={isInPath}
                showCoordinate={showCoordinates}
                onClick={() => handleHexClick(hex)}
                onMouseEnter={() => handleHexHover(hex)}
                onMouseLeave={() => handleHexHover(null)}
              />
            );
          })}
        </g>

        <g>
          {tokens.map((token) => (
            <UnitTokenComponent
              key={token.unitId}
              token={token}
              onClick={() => handleTokenClick(token.unitId)}
            />
          ))}
        </g>

        {interaction.showLOSOverlay && selectedUnitPosition && (
          <g data-testid="los-overlay">
            {hexes.map((hex) => {
              const key = coordToKey(hex);
              if (
                hex.q === selectedUnitPosition.q &&
                hex.r === selectedUnitPosition.r
              )
                return null;
              const hasLOS = losResults.get(key) ?? true;
              return (
                <LOSLine
                  key={`los-${key}`}
                  from={selectedUnitPosition}
                  to={hex}
                  hasLOS={hasLOS}
                />
              );
            })}
          </g>
        )}

        {interaction.showMovementOverlay && (
          <g data-testid="movement-overlay">
            {hexes.map((hex) => {
              const key = coordToKey(hex);
              const terrain = terrainLookup.get(key);
              return (
                <MovementCostOverlay
                  key={`move-${key}`}
                  hex={hex}
                  terrain={terrain}
                />
              );
            })}
          </g>
        )}

        {interaction.showCoverOverlay && (
          <g data-testid="cover-overlay">
            {hexes.map((hex) => {
              const key = coordToKey(hex);
              const terrain = terrainLookup.get(key);
              return (
                <CoverOverlay
                  key={`cover-${key}`}
                  hex={hex}
                  terrain={terrain}
                />
              );
            })}
          </g>
        )}
      </svg>

      <div
        className="absolute right-4 bottom-4 flex gap-2"
        data-testid="zoom-controls"
      >
        <div className="flex flex-col gap-1" data-testid="overlay-toggles">
          <button
            type="button"
            onClick={() => interaction.setShowMovementOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              interaction.showMovementOverlay
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-slate-700 hover:bg-gray-100'
            }`}
            title="Toggle movement cost overlay"
            data-testid="overlay-toggle-movement"
          >
            MP
          </button>
          <button
            type="button"
            onClick={() => interaction.setShowCoverOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              interaction.showCoverOverlay
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-slate-700 hover:bg-gray-100'
            }`}
            title="Toggle cover level overlay"
            data-testid="overlay-toggle-cover"
          >
            🛡
          </button>
          <button
            type="button"
            onClick={() => interaction.setShowLOSOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              interaction.showLOSOverlay
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-white text-slate-700 hover:bg-gray-100'
            }`}
            title="Toggle LOS overlay"
            data-testid="overlay-toggle-los"
          >
            👁
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => interaction.setZoom((z) => Math.min(3, z * 1.2))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
            title="Zoom in"
            data-testid="zoom-in-btn"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => interaction.setZoom((z) => Math.max(0.5, z / 1.2))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
            title="Zoom out"
            data-testid="zoom-out-btn"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              interaction.setZoom(1);
              interaction.setPan({ x: 0, y: 0 });
            }}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
            title="Reset view"
            data-testid="reset-view-btn"
          >
            ⟲
          </button>
        </div>
      </div>
    </div>
  );
}

export default HexMapDisplay;
