/**
 * Hex Map Display Component
 * Interactive hex grid with unit tokens, movement ranges, and attack indicators.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  IHexCoordinate,
  Facing,
  GameSide,
  IUnitToken,
  IMovementRangeHex,
} from '@/types/gameplay';
import {
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_COLORS,
} from '@/constants/hexMap';

// =============================================================================
// Types
// =============================================================================

export interface HexMapDisplayProps {
  /** Map radius (in hexes from center) */
  radius: number;
  /** Unit tokens to display */
  tokens: readonly IUnitToken[];
  /** Currently selected hex */
  selectedHex: IHexCoordinate | null;
  /** Hexes showing movement range */
  movementRange?: readonly IMovementRangeHex[];
  /** Hexes showing attack range */
  attackRange?: readonly IHexCoordinate[];
  /** Path to highlight (for movement preview) */
  highlightPath?: readonly IHexCoordinate[];
  /** Callback when hex is clicked */
  onHexClick?: (hex: IHexCoordinate) => void;
  /** Callback when hex is hovered */
  onHexHover?: (hex: IHexCoordinate | null) => void;
  /** Callback when token is clicked */
  onTokenClick?: (unitId: string) => void;
  /** Show coordinate labels */
  showCoordinates?: boolean;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Constants (using imported HEX_SIZE, HEX_WIDTH, HEX_HEIGHT, HEX_HEX_COLORS)
// =============================================================================

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert axial hex coordinates to pixel position.
 */
function hexToPixel(hex: IHexCoordinate): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * hex.q;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

/**
 * Convert pixel position to axial hex coordinates.
 */
function pixelToHex(x: number, y: number): IHexCoordinate {
  const q = (2 / 3 * x) / HEX_SIZE;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / HEX_SIZE;
  return roundHex(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex.
 */
function roundHex(q: number, r: number): IHexCoordinate {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

/**
 * Generate hexes within a radius.
 */
function generateHexesInRadius(radius: number): IHexCoordinate[] {
  const hexes: IHexCoordinate[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Generate SVG path for a flat-top hexagon.
 */
function hexPath(cx: number, cy: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = cx + HEX_SIZE * Math.cos(angleRad);
    const y = cy + HEX_SIZE * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }
  return `M${points.join('L')}Z`;
}

/**
 * Get rotation angle for facing.
 */
function getFacingRotation(facing: Facing): number {
  const facingAngles: Record<Facing, number> = {
    [Facing.North]: 0,
    [Facing.Northeast]: 60,
    [Facing.Southeast]: 120,
    [Facing.South]: 180,
    [Facing.Southwest]: 240,
    [Facing.Northwest]: 300,
  };
  return facingAngles[facing] ?? 0;
}

/**
 * Check if two hex coordinates are equal.
 */
function hexEquals(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Check if a hex is in a list.
 */
function hexInList(hex: IHexCoordinate, list: readonly IHexCoordinate[]): boolean {
  return list.some((h) => hexEquals(h, hex));
}

// =============================================================================
// Sub-Components
// =============================================================================

interface HexCellProps {
  hex: IHexCoordinate;
  isSelected: boolean;
  isHovered: boolean;
  movementInfo?: IMovementRangeHex;
  isInAttackRange: boolean;
  isInPath: boolean;
  showCoordinate: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function HexCell({
  hex,
  isSelected,
  isHovered,
  movementInfo,
  isInAttackRange,
  isInPath,
  showCoordinate,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HexCellProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);

  // Determine fill color
  let fill = HEX_COLORS.hexFill;
  if (isSelected) {
    fill = HEX_COLORS.hexSelected;
  } else if (isInPath) {
    fill = HEX_COLORS.pathHighlight;
  } else if (movementInfo) {
    fill = movementInfo.reachable ? HEX_COLORS.movementRange : HEX_COLORS.movementRangeUnreachable;
  } else if (isInAttackRange) {
    fill = HEX_COLORS.attackRange;
  } else if (isHovered) {
    fill = HEX_COLORS.hexHover;
  }

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <path
        d={hexPath(x, y)}
        fill={fill}
        stroke={HEX_COLORS.gridLine}
        strokeWidth={1}
      />
      {showCoordinate && (
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize={10}
          fill="#64748b"
        >
          {hex.q},{hex.r}
        </text>
      )}
      {movementInfo && movementInfo.reachable && (
        <text
          x={x}
          y={y + 12}
          textAnchor="middle"
          fontSize={8}
          fill="#166534"
        >
          {movementInfo.mpCost}MP
        </text>
      )}
    </g>
  );
}

interface UnitTokenComponentProps {
  token: IUnitToken;
  onClick: () => void;
}

function UnitTokenComponent({ token, onClick }: UnitTokenComponentProps): React.ReactElement {
  const { x, y } = hexToPixel(token.position);
  const rotation = getFacingRotation(token.facing);

  // Determine token color
  let color = token.side === GameSide.Player ? HEX_COLORS.playerToken : HEX_COLORS.opponentToken;
  if (token.isDestroyed) {
    color = HEX_COLORS.destroyedToken;
  }

  // Selection ring
  const ringColor = token.isSelected ? '#fbbf24' : token.isValidTarget ? '#f87171' : 'transparent';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Selection/target ring */}
      <circle r={HEX_SIZE * 0.7} fill="none" stroke={ringColor} strokeWidth={3} />

      {/* Token body */}
      <circle r={HEX_SIZE * 0.5} fill={color} stroke="#1e293b" strokeWidth={2} />

      {/* Facing indicator (arrow) */}
      <g transform={`rotate(${rotation - 90})`}>
        <path
          d="M0,-20 L8,-8 L0,-12 L-8,-8 Z"
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      {/* Designation */}
      <text
        y={4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="white"
      >
        {token.designation}
      </text>

      {/* Destroyed X */}
      {token.isDestroyed && (
        <g stroke="#dc2626" strokeWidth={3}>
          <line x1={-12} y1={-12} x2={12} y2={12} />
          <line x1={12} y1={-12} x2={-12} y2={12} />
        </g>
      )}
    </g>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Interactive hex map display.
 */
export function HexMapDisplay({
  radius,
  tokens,
  selectedHex,
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
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate all hexes
  const hexes = useMemo(() => generateHexesInRadius(radius), [radius]);

  // Create movement range lookup
  const movementRangeLookup = useMemo(() => {
    const map = new Map<string, IMovementRangeHex>();
    for (const m of movementRange) {
      map.set(`${m.hex.q},${m.hex.r}`, m);
    }
    return map;
  }, [movementRange]);

  // Calculate viewBox
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

  // Handle hex click
  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      onHexClick?.(hex);
    },
    [onHexClick]
  );

  // Handle hex hover
  const handleHexHover = useCallback(
    (hex: IHexCoordinate | null) => {
      setHoveredHex(hex);
      onHexHover?.(hex);
    },
    [onHexHover]
  );

  // Handle token click
  const handleTokenClick = useCallback(
    (unitId: string) => {
      onTokenClick?.(unitId);
    },
    [onTokenClick]
  );

  // Pan and zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(3, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Calculate transformed viewBox
  const transformedViewBox = useMemo(() => {
    const scale = 1 / zoom;
    const width = viewBox.width * scale;
    const height = viewBox.height * scale;
    const x = viewBox.x - pan.x * scale + (viewBox.width - width) / 2;
    const y = viewBox.y - pan.y * scale + (viewBox.height - height) / 2;
    return `${x} ${y} ${width} ${height}`;
  }, [viewBox, zoom, pan]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <svg
        ref={svgRef}
        viewBox={transformedViewBox}
        className="w-full h-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Hex grid */}
        <g>
          {hexes.map((hex) => {
            const key = `${hex.q},${hex.r}`;
            const isSelected = selectedHex ? hexEquals(hex, selectedHex) : false;
            const isHovered = hoveredHex ? hexEquals(hex, hoveredHex) : false;
            const movementInfo = movementRangeLookup.get(key);
            const isInAttackRange = hexInList(hex, attackRange);
            const isInPath = hexInList(hex, highlightPath);

            return (
              <HexCell
                key={key}
                hex={hex}
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

        {/* Unit tokens */}
        <g>
          {tokens.map((token) => (
            <UnitTokenComponent
              key={token.unitId}
              token={token}
              onClick={() => handleTokenClick(token.unitId)}
            />
          ))}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          className="bg-white p-2 rounded shadow hover:bg-gray-100"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
          className="bg-white p-2 rounded shadow hover:bg-gray-100"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="bg-white p-2 rounded shadow hover:bg-gray-100"
          title="Reset view"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}

export default HexMapDisplay;
