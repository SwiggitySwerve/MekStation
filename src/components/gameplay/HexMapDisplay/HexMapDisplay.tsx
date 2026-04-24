import React, { useState, useCallback, useMemo, useEffect } from 'react';

import type {
  IHexCoordinate,
  IUnitToken,
  IMovementRangeHex,
  IHexTerrain,
  IHexGrid,
  IHex,
} from '@/types/gameplay';

import { UnitTokenForType } from '@/components/gameplay/UnitToken/UnitTokenForType';
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
import {
  useMapInteraction,
  type MapInteractionState,
} from './useMapInteraction';

export interface HexMapDisplayProps {
  radius: number;
  tokens: readonly IUnitToken[];
  selectedHex: IHexCoordinate | null;
  hexTerrain?: readonly IHexTerrain[];
  movementRange?: readonly IMovementRangeHex[];
  attackRange?: readonly IHexCoordinate[];
  highlightPath?: readonly IHexCoordinate[];
  /**
   * Per `add-movement-phase-ui` task 4.3: cumulative MP cost of the
   * currently-previewed path. When present (hovering a reachable
   * hex) the map shows an MP badge at the hovered destination.
   */
  hoverMpCost?: number;
  /**
   * Per § 4.4: `true` when the user hovers a hex outside the
   * reachable set during the Movement phase — drives the shared
   * "Unreachable" tooltip the map renders in its HTML overlay.
   */
  hoverUnreachable?: boolean;
  /**
   * Per task 10.1 / legend scenarios: when the host page is in the
   * Movement phase we also draw a small MP-type legend at the
   * bottom-left of the map. Each row lights up for the currently
   * active MP type so the player can tell at a glance what the
   * overlay colors mean.
   */
  mpLegend?: {
    readonly active: 'walk' | 'run' | 'jump';
    readonly jumpAvailable: boolean;
  };
  onHexClick?: (hex: IHexCoordinate) => void;
  onHexHover?: (hex: IHexCoordinate | null) => void;
  onTokenClick?: (unitId: string) => void;
  /**
   * Per `add-minimap-and-camera-controls` task 2.3 and task 7.x: the
   * host handles double-click on a unit token by centering the camera
   * on that unit and selecting it. Delegated up so the host (which
   * owns selection state) can do both in one dispatch.
   */
  onTokenDoubleClick?: (unitId: string) => void;
  /**
   * Optional — called once the map's internal `useMapInteraction`
   * state exists so the host can forward the camera controls to the
   * minimap and the hotkey layer. The map remains the single owner
   * of camera state; this is a read/action bridge, not a sync.
   */
  onInteractionReady?: (state: MapInteractionState) => void;
  /**
   * Host-supplied extras rendered inside the map's positioned
   * container (above the SVG, below the zoom/overlay controls).
   * Used by the GameplayLayout to mount the minimap + hotkey hint +
   * help overlay without having to duplicate the container
   * positioning logic.
   */
  overlayChildren?: React.ReactNode;
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
  hoverMpCost,
  hoverUnreachable = false,
  mpLegend,
  onHexClick,
  onHexHover,
  onTokenClick,
  onTokenDoubleClick,
  onInteractionReady,
  overlayChildren,
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

  const handleTokenDoubleClick = useCallback(
    (unitId: string) => {
      onTokenDoubleClick?.(unitId);
    },
    [onTokenDoubleClick],
  );

  // Publish the interaction bridge once mounted (and whenever the
  // underlying callable surface changes). The host uses this to wire
  // the minimap + hotkey layer without owning camera state itself.
  useEffect(() => {
    onInteractionReady?.(interaction);
  }, [onInteractionReady, interaction]);

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

            // Per add-movement-phase-ui § 4.3: only the currently
            // hovered reachable hex gets the MP cost badge.
            const cellHoverMpCost =
              isHovered && hoverMpCost !== undefined && movementInfo?.reachable
                ? hoverMpCost
                : undefined;
            // Per § 4.4: flag the hovered cell when it's outside the
            // reachable envelope so the tooltip layer keys off it.
            const cellIsUnreachableHover =
              isHovered && hoverUnreachable && !movementInfo?.reachable;

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
                hoverMpCost={cellHoverMpCost}
                isUnreachableHover={cellIsUnreachableHover}
                onClick={() => handleHexClick(hex)}
                onMouseEnter={() => handleHexHover(hex)}
                onMouseLeave={() => handleHexHover(null)}
              />
            );
          })}
        </g>

        <g>
          {tokens.map((token) => (
            <UnitTokenForType
              key={token.unitId}
              token={token}
              onClick={handleTokenClick}
              onDoubleClick={handleTokenDoubleClick}
              allTokens={tokens}
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

      {/*
        Per add-movement-phase-ui § 4.4 "Hover unreachable hex shows
        tooltip": when the consumer flags the currently-hovered hex as
        unreachable we render a single shared "Unreachable" tooltip in
        HTML above the SVG rather than duplicating DOM per cell.
      */}
      {hoverUnreachable && (
        <div
          className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded bg-slate-900/90 px-2 py-1 text-xs font-medium text-slate-100 shadow"
          data-testid="hex-unreachable-tooltip"
          role="tooltip"
        >
          Unreachable
        </div>
      )}

      {/*
        Per add-movement-phase-ui task 10.1 / scenarios "Legend
        reflects current MP type" + "Jump unavailable dims Jump row":
        draw a small legend so the player knows what the walk/run/jump
        tints mean. Active row bolded + outlined; inactive rows dim;
        Jump row dims further and shows a tooltip when the unit has no
        jump capability.
      */}
      {mpLegend && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1 rounded bg-white/90 p-2 text-xs shadow"
          data-testid="mp-legend"
        >
          {(['walk', 'run', 'jump'] as const).map((kind) => {
            const isActive = mpLegend.active === kind;
            const isJumpDisabled = kind === 'jump' && !mpLegend.jumpAvailable;
            const swatch =
              kind === 'walk'
                ? 'bg-green-500'
                : kind === 'run'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500';
            const label =
              kind === 'walk' ? 'Walk' : kind === 'run' ? 'Run' : 'Jump';
            return (
              <div
                key={kind}
                className={`flex items-center gap-2 rounded px-1 py-0.5 ${
                  isActive
                    ? 'font-semibold ring-1 ring-slate-700'
                    : 'opacity-70'
                } ${isJumpDisabled ? 'opacity-40' : ''}`}
                data-testid={`mp-legend-${kind}`}
                data-active={isActive ? 'true' : undefined}
                data-disabled={isJumpDisabled ? 'true' : undefined}
                title={isJumpDisabled ? 'No jump capability' : undefined}
              >
                <span className={`inline-block h-3 w-3 rounded-sm ${swatch}`} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Host-supplied overlays (minimap, hotkey help, hint badge).
          Rendered inside the positioned container so they share the
          map's coordinate space. Per add-minimap-and-camera-controls. */}
      {overlayChildren}
    </div>
  );
}

export default HexMapDisplay;
