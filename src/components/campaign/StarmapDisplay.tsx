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
import {
  Stage,
  Layer,
  Circle,
  Text,
  Ring,
  Group,
  Label,
  Tag,
} from 'react-konva';

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
  // Davion gold (canonical House Davion sunburst). Was #b91c1c — a near
  // twin of Kurita's #dc2626 that made the two houses indistinguishable
  // on the map (re-audit DC-04/A11Y-R5). Kurita keeps the Dragon red.
  Davion: '#eab308',
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
/**
 * Padding (screen px) reserved around the fitted cluster when auto-framing
 * the view — sized so name labels (right of dot) and annotation chips
 * (below dot) stay on-canvas for edge systems (re-audit UXF-08:
 * Gibson/Skye labels clipped at the stage edge).
 */
const FIT_PADDING = 90;
/** Fit zoom ceiling — never auto-zoom past the close-LOD baseline. */
const FIT_MAX_ZOOM = 1.25;
/**
 * Fit zoom floor — keeps the initial frame at label-bearing LOD. Distant
 * outlier systems (e.g. the Clan homeworlds far off the Inner Sphere) may
 * start off-canvas rather than shrinking the whole map to dots; pan/zoom
 * reaches them.
 */
const FIT_MIN_ZOOM = 0.7;
/** Percentile trim applied per axis so outliers don't dominate the fit. */
const FIT_TRIM = 0.05;

// Percentile-trimmed extent of one axis: sorts the values and drops the
// outer FIT_TRIM share on each side, so a single distant system does not
// stretch the frame.
function trimmedExtent(values: readonly number[]): {
  min: number;
  max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const lo = Math.floor(sorted.length * FIT_TRIM);
  const hi = Math.ceil(sorted.length * (1 - FIT_TRIM)) - 1;
  return { min: sorted[lo], max: sorted[Math.max(hi, lo)] };
}

/**
 * Fit the camera to the dense cluster of systems (percentile-trimmed
 * bounding box) with label padding. Falls back to the legacy fixed offset
 * while the stage is unmeasured or the system list is empty, so tests and
 * first paint stay deterministic.
 */
function computeFitView(
  systems: readonly IStarSystem[],
  stageSize: { width: number; height: number },
): { zoom: number; position: { x: number; y: number } } {
  if (systems.length === 0 || stageSize.width <= 0 || stageSize.height <= 0) {
    return { zoom: 1, position: INITIAL_POSITION };
  }

  const xExtent = trimmedExtent(systems.map((s) => s.position.x));
  const yExtent = trimmedExtent(systems.map((s) => s.position.y));
  const spanX = Math.max(xExtent.max - xExtent.min, 1);
  const spanY = Math.max(yExtent.max - yExtent.min, 1);

  const usableWidth = Math.max(stageSize.width - FIT_PADDING * 2, 1);
  const usableHeight = Math.max(stageSize.height - FIT_PADDING * 2, 1);
  const zoom = Math.min(
    Math.max(Math.min(usableWidth / spanX, usableHeight / spanY), FIT_MIN_ZOOM),
    FIT_MAX_ZOOM,
  );

  return {
    zoom,
    position: {
      x: FIT_PADDING - xExtent.min * zoom + (usableWidth - spanX * zoom) / 2,
      y: FIT_PADDING - yExtent.min * zoom + (usableHeight - spanY * zoom) / 2,
    },
  };
}

/**
 * Greedy minimal pan that pulls each must-include point (selected system,
 * annotated systems — the actionable ones) inside the padded viewport
 * without changing zoom. The trimmed fit frames the dense cluster, but the
 * route target can sit outside it; the annotation is useless off-canvas.
 */
function panToInclude(
  view: { zoom: number; position: { x: number; y: number } },
  points: readonly { x: number; y: number }[],
  stageSize: { width: number; height: number },
): { zoom: number; position: { x: number; y: number } } {
  const { zoom } = view;
  const position = { ...view.position };
  for (const point of points) {
    const screenX = point.x * zoom + position.x;
    const screenY = point.y * zoom + position.y;
    if (screenX < FIT_PADDING) {
      position.x += FIT_PADDING - screenX;
    } else if (screenX > stageSize.width - FIT_PADDING) {
      position.x -= screenX - (stageSize.width - FIT_PADDING);
    }
    if (screenY < FIT_PADDING) {
      position.y += FIT_PADDING - screenY;
    } else if (screenY > stageSize.height - FIT_PADDING) {
      position.y -= screenY - (stageSize.height - FIT_PADDING);
    }
  }
  return { zoom, position };
}

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
    lod === 'close' ||
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

      {/* Faction name as text at close zoom — a non-color channel so the
          faction encoding does not rely on the dot fill alone (re-audit
          A11Y-R5; doctrine AMBIENT-CHROME rule: no color-only status). */}
      {showLabel && lod === 'close' && (
        <Text
          text={system.faction}
          x={displaySize + 6}
          y={7}
          fontSize={8}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#94a3b8"
          shadowColor="#000000"
          shadowBlur={2}
          shadowOpacity={0.8}
          listening={false}
        />
      )}

      {annotation && lod !== 'far' && (
        // Chip-styled annotation anchored directly under its own dot. The
        // dark tag keeps the text legible when it overlaps a neighboring
        // system's label (re-audit VD-05: the route annotation used to render
        // as bare text drifting into the 'Benjamin' label), and the below-dot
        // anchor makes its owner unambiguous.
        <Label x={-displaySize} y={displaySize + 4} listening={false}>
          <Tag fill="#0f172a" opacity={0.85} cornerRadius={3} />
          <Text
            // Prefix a CVD-safe glyph by tone so annotation status does not
            // rely on color alone (doctrine AMBIENT-CHROME rule).
            text={`${annotationToneGlyph(annotation.tone)}${annotation.label}`}
            fontSize={10}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={annotationColor}
            fontStyle="bold"
            padding={3}
          />
        </Label>
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
  // Faction legend starts collapsed (pill) so it never crowds the canvas.
  const [legendOpen, setLegendOpen] = useState(false);
  // Once the user pans or zooms, the auto-fit effect stops re-framing the
  // camera under them; Reset restores the fitted frame.
  const userAdjustedViewRef = useRef(false);

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

  // The systems the frame MUST show even when the trimmed fit excludes
  // them: the selected system and every annotated system (current
  // location, route target) — those carry the actionable chips.
  const mustIncludePoints = useMemo(
    () =>
      systems
        .filter(
          (system) =>
            system.id === selectedSystem ||
            Boolean(systemAnnotations?.[system.id]),
        )
        .map((system) => system.position),
    [systems, selectedSystem, systemAnnotations],
  );

  // Auto-fit the camera to the dense system cluster (with label padding)
  // once real measurements land — the fixed INITIAL_POSITION left edge
  // systems (Gibson, Skye) with clipped labels (re-audit UXF-08) — then
  // pan minimally so the selected/annotated systems are in frame.
  React.useEffect(() => {
    if (userAdjustedViewRef.current) return;
    const fit = panToInclude(
      computeFitView(systems, stageSize),
      mustIncludePoints,
      stageSize,
    );
    setZoom(fit.zoom);
    setPosition(fit.position);
  }, [systems, stageSize, mustIncludePoints]);

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

      userAdjustedViewRef.current = true;
      setZoom(newScale);
      setPosition(newPos);
    },
    [zoom, position],
  );

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    userAdjustedViewRef.current = true;
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
    userAdjustedViewRef.current = true;
    setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    userAdjustedViewRef.current = true;
    setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
  }, []);

  const handleResetView = useCallback(() => {
    // Reset returns to the fitted frame (not the legacy fixed offset) and
    // re-arms auto-fit so subsequent container resizes keep the map framed.
    userAdjustedViewRef.current = false;
    const fit = panToInclude(
      computeFitView(systems, stageSize),
      mustIncludePoints,
      stageSize,
    );
    setZoom(fit.zoom);
    setPosition(fit.position);
  }, [systems, stageSize, mustIncludePoints]);

  return (
    <div
      className={`flex flex-col overflow-hidden bg-slate-900 ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {/* No top toolbar: the zoom readout now lives in the bottom-right control
          corner so the canvas (the single-action FOCUS object) reclaims the
          height. See command-screen focus doctrine, starmap row. */}
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

        {/* Collapsible faction legend: default is a small pill; expanding it
            reveals the full grid without permanently occupying the canvas. */}
        <div className="absolute top-3 right-3 text-xs text-slate-200">
          {legendOpen ? (
            <div className="rounded border border-slate-700/80 bg-slate-900/90 p-3 shadow-lg">
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="mb-2 flex w-full items-center justify-between gap-4 font-semibold text-slate-100"
                data-testid="starmap-legend-toggle"
                aria-expanded="true"
              >
                <span>Factions</span>
                <span aria-hidden="true">×</span>
              </button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(FACTION_COLORS).map(([faction, color]) => (
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
          ) : (
            <button
              type="button"
              onClick={() => setLegendOpen(true)}
              className="rounded border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-semibold text-slate-100 shadow-lg transition-colors hover:bg-slate-800"
              data-testid="starmap-legend-toggle"
              aria-expanded="false"
            >
              Legend
            </button>
          )}
        </div>

        <div
          className="absolute right-4 bottom-4 flex flex-col items-end gap-1"
          data-testid="zoom-controls"
        >
          {/* Relocated zoom readout: engineering "Detail" word dropped, keep the
              data-testid the e2e specs reference. */}
          <span
            className="rounded bg-slate-800/90 px-2 py-1 text-xs text-slate-100 shadow-lg"
            data-testid="starmap-detail-status"
          >
            Zoom {(zoom * 100).toFixed(0)}%
          </span>
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
      </div>
    </div>
  );
}

export default StarmapDisplay;

// Maps annotation tone to a colorblind-safe leading glyph so status reads
// without depending on the fill color (risk / warn / safe).
function annotationToneGlyph(tone: IStarmapSystemAnnotation['tone']): string {
  switch (tone) {
    case 'risk':
      return '! ';
    case 'warn':
      return '▲ ';
    case 'safe':
      return '✓ ';
  }
}
