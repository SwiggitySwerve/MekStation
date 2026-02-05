/**
 * Starmap Display Component
 * Canvas-based starmap with faction colors, pan/zoom, and Level of Detail (LOD).
 * Uses react-konva for performant rendering of large star systems.
 *
 * LOD Thresholds:
 * - Far (zoom < 0.3): Dots only (5px), no labels
 * - Medium (0.3-0.7): Dots (8px) + major system labels (pop > 1B)
 * - Close (zoom > 0.7): Dots (12px) + all labels + faction indicators
 */

import type Konva from 'konva';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Stage, Layer, Circle, Text, Ring, Group } from 'react-konva';

export interface IStarSystem {
  id: string;
  name: string;
  position: { x: number; y: number };
  faction: string;
  population?: number;
}

export interface StarmapDisplayProps {
  systems: IStarSystem[];
  selectedSystem?: string;
  onSystemClick?: (id: string) => void;
  onSystemHover?: (id: string | null) => void;
  className?: string;
}

export const FACTION_COLORS: Record<string, string> = {
  Lyran: '#1e40af',
  Davion: '#b91c1c',
  Liao: '#15803d',
  Kurita: '#dc2626',
  Marik: '#7c3aed',
  Steiner: '#2563eb',
  Periphery: '#a16207',
  ComStar: '#f5f5f5',
  Clan: '#059669',
  Independent: '#6b7280',
};

const LOD_THRESHOLDS = { FAR: 0.3, MEDIUM: 0.7 };
const DOT_SIZES = { FAR: 5, MEDIUM: 8, CLOSE: 12 };
const MAJOR_SYSTEM_POPULATION = 1_000_000_000;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;

type LODLevel = 'far' | 'medium' | 'close';

function getLODLevel(zoom: number): LODLevel {
  if (zoom < LOD_THRESHOLDS.FAR) return 'far';
  if (zoom < LOD_THRESHOLDS.MEDIUM) return 'medium';
  return 'close';
}

function getDotSize(lod: LODLevel): number {
  switch (lod) {
    case 'far':
      return DOT_SIZES.FAR;
    case 'medium':
      return DOT_SIZES.MEDIUM;
    case 'close':
      return DOT_SIZES.CLOSE;
  }
}

function isMajorSystem(system: IStarSystem): boolean {
  return (system.population ?? 0) >= MAJOR_SYSTEM_POPULATION;
}

function getFactionColor(faction: string): string {
  return FACTION_COLORS[faction] ?? FACTION_COLORS.Independent;
}

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(1)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return String(pop);
}

interface StarSystemNodeProps {
  system: IStarSystem;
  lod: LODLevel;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const StarSystemNode = React.memo(function StarSystemNode({
  system,
  lod,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: StarSystemNodeProps): React.ReactElement {
  const baseSize = getDotSize(lod);
  const hoverScale = isHovered ? 1.3 : 1;
  const displaySize = baseSize * hoverScale;
  const factionColor = getFactionColor(system.faction);
  const showLabel =
    lod === 'close' || (lod === 'medium' && isMajorSystem(system));
  const showFactionIndicator = lod === 'close';

  return (
    <Group
      x={system.position.x}
      y={system.position.y}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring
          innerRadius={displaySize + 2}
          outerRadius={displaySize + 5}
          fill="#fbbf24"
          opacity={0.9}
        />
      )}

      {isHovered && !isSelected && (
        <Circle radius={displaySize + 8} fill={factionColor} opacity={0.2} />
      )}

      <Circle
        radius={displaySize}
        fill={factionColor}
        stroke={isSelected ? '#fbbf24' : isHovered ? '#ffffff' : '#1e293b'}
        strokeWidth={isSelected ? 2 : 1}
        shadowColor={factionColor}
        shadowBlur={isHovered ? 10 : 0}
        shadowOpacity={0.5}
      />

      {showFactionIndicator && (
        <Circle
          radius={displaySize + 1}
          stroke={factionColor}
          strokeWidth={2}
          opacity={0.6}
          listening={false}
        />
      )}

      {showLabel && (
        <Text
          text={system.name}
          x={displaySize + 6}
          y={-6}
          fontSize={lod === 'close' ? 12 : 10}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#e2e8f0"
          shadowColor="#000000"
          shadowBlur={2}
          shadowOpacity={0.8}
          listening={false}
        />
      )}

      {lod === 'close' && system.population && (
        <Text
          text={formatPopulation(system.population)}
          x={displaySize + 6}
          y={8}
          fontSize={9}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#94a3b8"
          listening={false}
        />
      )}
    </Group>
  );
});

export function StarmapDisplay({
  systems,
  selectedSystem,
  onSystemClick,
  onSystemHover,
  className = '',
}: StarmapDisplayProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

  const lod = useMemo(() => getLODLevel(zoom), [zoom]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setStageSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale =
        direction > 0
          ? Math.min(MAX_ZOOM, oldScale * ZOOM_STEP)
          : Math.max(MIN_ZOOM, oldScale / ZOOM_STEP);

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setZoom(newScale);
      setPosition(newPos);
    },
    [zoom, position],
  );

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setPosition({ x: e.target.x(), y: e.target.y() });
  }, []);

  const handleSystemClick = useCallback(
    (id: string) => onSystemClick?.(id),
    [onSystemClick],
  );

  const handleSystemHover = useCallback(
    (id: string | null) => {
      setHoveredSystem(id);
      onSystemHover?.(id);
    },
    [onSystemHover],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-900 ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        draggable
        x={position.x}
        y={position.y}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        data-testid="starmap-canvas"
      >
        <Layer>
          {systems.map((system) => (
            <StarSystemNode
              key={system.id}
              system={system}
              lod={lod}
              isSelected={selectedSystem === system.id}
              isHovered={hoveredSystem === system.id}
              onClick={() => handleSystemClick(system.id)}
              onMouseEnter={() => handleSystemHover(system.id)}
              onMouseLeave={() => handleSystemHover(null)}
            />
          ))}
        </Layer>
      </Stage>

      <div
        className="absolute right-4 bottom-4 flex flex-col gap-1"
        data-testid="zoom-controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
          title="Zoom in"
          data-testid="zoom-in-btn"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
          title="Zoom out"
          data-testid="zoom-out-btn"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
          title="Reset view"
          data-testid="reset-view-btn"
        >
          ⟲
        </button>
      </div>

      <div className="absolute top-4 left-4 rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-300">
        Zoom: {(zoom * 100).toFixed(0)}% | LOD: {lod}
      </div>

      <div className="absolute bottom-4 left-4 rounded bg-slate-800/90 p-3 text-xs text-slate-300 shadow-lg">
        <div className="mb-2 font-semibold text-slate-200">Factions</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(FACTION_COLORS)
            .slice(0, 6)
            .map(([faction, color]) => (
              <div key={faction} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{faction}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default StarmapDisplay;
