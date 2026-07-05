/**
 * Canvas-based starmap with faction colors, pan/zoom, and detail scaling.
 */

import type Konva from 'konva';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';

import type { StarmapDisplayProps } from './StarmapDisplay.model';

import {
  StarmapFactionLegend,
  StarmapZoomControls,
} from './StarmapDisplay.controls';
import {
  computeFitView,
  getLODLevel,
  INITIAL_POSITION,
  MAX_ZOOM,
  MIN_ZOOM,
  panToInclude,
  ZOOM_STEP,
} from './StarmapDisplay.model';
import { StarSystemNode } from './StarmapSystemNode';

export { FACTION_COLORS } from './StarmapDisplay.model';
export type {
  IStarSystem,
  IStarmapSystemAnnotation,
  StarmapDisplayProps,
} from './StarmapDisplay.model';

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
  const [legendOpen, setLegendOpen] = useState(false);
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
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();

      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const oldScale = zoom;
      const direction = event.evt.deltaY > 0 ? -1 : 1;
      const newScale =
        direction > 0
          ? Math.min(MAX_ZOOM, oldScale * ZOOM_STEP)
          : Math.max(MIN_ZOOM, oldScale / ZOOM_STEP);

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      userAdjustedViewRef.current = true;
      setZoom(newScale);
      setPosition({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [zoom, position],
  );

  const handleDragEnd = useCallback(
    (event: Konva.KonvaEventObject<DragEvent>) => {
      userAdjustedViewRef.current = true;
      setPosition({ x: event.target.x(), y: event.target.y() });
    },
    [],
  );

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
    setZoom((current) => Math.min(MAX_ZOOM, current * ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    userAdjustedViewRef.current = true;
    setZoom((current) => Math.max(MIN_ZOOM, current / ZOOM_STEP));
  }, []);

  const handleResetView = useCallback(() => {
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

        <StarmapFactionLegend isOpen={legendOpen} onToggle={setLegendOpen} />
        <StarmapZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        />
      </div>
    </div>
  );
}

export default StarmapDisplay;
