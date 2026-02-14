/**
 * Map Interaction Hook
 * Encapsulates pan, zoom, and touch gesture state for the hex map SVG.
 *
 * Extracted from HexMapDisplay.tsx for modularity.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT } from '@/constants/hexMap';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapInteractionState {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transformedViewBox: string;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  showMovementOverlay: boolean;
  setShowMovementOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverOverlay: boolean;
  setShowCoverOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  showLOSOverlay: boolean;
  setShowLOSOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export function useMapInteraction(radius: number): MapInteractionState {
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{
    dist: number;
    zoom: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [showMovementOverlay, setShowMovementOverlay] = useState(false);
  const [showCoverOverlay, setShowCoverOverlay] = useState(false);
  const [showLOSOverlay, setShowLOSOverlay] = useState(false);

  useEffect(() => {
    const padding = HEX_SIZE * 2;
    const minX = -radius * HEX_WIDTH * 0.75 - padding;
    const maxX = radius * HEX_WIDTH * 0.75 + padding;
    const minY = -radius * HEX_HEIGHT - padding;
    const maxY = radius * HEX_HEIGHT + padding;
    setViewBox({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }, [radius]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(3, z * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const getTouchDistance = useCallback(
    (t1: React.Touch, t2: React.Touch): number => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        setTouchStart({ dist, zoom });
        setIsPanning(false);
      } else if (e.touches.length === 1) {
        setIsPanning(true);
        setPanStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
        setTouchStart(null);
      }
    },
    [getTouchDistance, zoom, pan],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2 && touchStart) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = dist / touchStart.dist;
        setZoom(Math.max(0.5, Math.min(3, touchStart.zoom * scale)));
      } else if (e.touches.length === 1 && isPanning) {
        setPan({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y,
        });
      }
    },
    [touchStart, getTouchDistance, isPanning, panStart],
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setIsPanning(false);
  }, []);

  const transformedViewBox = useMemo(() => {
    const scale = 1 / zoom;
    const width = viewBox.width * scale;
    const height = viewBox.height * scale;
    const x = viewBox.x - pan.x * scale + (viewBox.width - width) / 2;
    const y = viewBox.y - pan.y * scale + (viewBox.height - height) / 2;
    return `${x} ${y} ${width} ${height}`;
  }, [viewBox, zoom, pan]);

  return {
    svgRef,
    transformedViewBox,
    zoom,
    setZoom,
    setPan,
    showMovementOverlay,
    setShowMovementOverlay,
    showCoverOverlay,
    setShowCoverOverlay,
    showLOSOverlay,
    setShowLOSOverlay,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
