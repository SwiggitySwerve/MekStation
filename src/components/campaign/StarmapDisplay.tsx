/**
 * Starmap Display Component
 * Canvas-based starmap with faction colors, pan/zoom, and detail scaling.
 * Uses react-konva for performant rendering of large star systems.
 *
 * Detail thresholds:
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
  systemAnnotations?: Readonly<Record<string, IStarmapSystemAnnotation>>;
  onSystemClick?: (id: string) => void;
  onSystemHover?: (id: string | null) => void;
  className?: string;
}

export interface IStarmapSystemAnnotation {
  readonly label: string;
  readonly tone: 'safe' | 'warn' | 'risk';
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
const INITIAL_POSITION = { x: 160, y: 64 };

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

interface StarSystemNodeProps {
  system: IStarSystem;
  lod: LODLevel;
  isSelected: boolean;
  isHovered: boolean;
  annotation?: IStarmapSystemAnnotation;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const StarSystemNode = React.memo(function StarSystemNode({
  system,
  lod,
  isSelected,
  isHovered,
  annotation,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: StarSystemNodeProps): React.ReactElement {
  const baseSize = getDotSize(lod);
  const hoverScale = isHovered ? 1.3 : 1;
  const displaySize = baseSize * hoverScale;
  const factionColor = getFactionColor(system.faction);
  const annotationColor =
    annotation?.tone === 'risk'
      ? '#f97316'
      : annotation?.tone === 'warn'
        ? '#facc15'
        : '#22c55e';
  const showLabel =
    Boolean(annotation) ||
    isSelected ||
    isHovered ||
    (lod === 'medium' && isMajorSystem(system));
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

      {annotation && lod !== 'far' && (
        <Text
          text={annotation.label}
          x={-displaySize - 8}
          y={displaySize + 8}
          fontSize={10}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={annotationColor}
          fontStyle="bold"
          listening={false}
        />
      )}
    </Group>
  );
});

export function StarmapDisplay({
  systems,
  selectedSystem,
  systemAnnotations,
  onSystemClick,
  onSystemHover,
  className = '',
}: StarmapDisplayProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState(INITIAL_POSITION);
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
    setPosition(INITIAL_POSITION);
  }, []);

  return (
    <div
      className={`flex flex-col overflow-hidden bg-slate-900 ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <div
        className="border-b border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
        data-testid="starmap-map-toolbar"
      >
        <span
          className="rounded bg-slate-800/80 px-2 py-1"
          data-testid="starmap-detail-status"
        >
          Zoom {(zoom * 100).toFixed(0)}% | Detail {detailLabel(lod)}
        </span>
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1">
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
                annotation={systemAnnotations?.[system.id]}
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
            -
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="rounded bg-slate-800 p-2 text-white shadow-lg transition-colors hover:bg-slate-700"
            title="Reset view"
            data-testid="reset-view-btn"
          >
            O
          </button>
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
    </div>
  );
}

export default StarmapDisplay;

function detailLabel(lod: LODLevel): string {
  switch (lod) {
    case 'far':
      return 'far';
    case 'medium':
      return 'medium';
    case 'close':
      return 'close';
  }
}
