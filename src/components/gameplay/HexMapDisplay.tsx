/**
 * Hex Map Display Component
 * Interactive hex grid with unit tokens, movement ranges, and attack indicators.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';

import {
  HEX_SIZE,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_COLORS,
} from '@/constants/hexMap';
import {
  TERRAIN_COLORS,
  WATER_DEPTH_COLORS,
  TERRAIN_PATTERNS,
  TERRAIN_LAYER_ORDER,
} from '@/constants/terrain';
import {
  IHexCoordinate,
  Facing,
  GameSide,
  IUnitToken,
  IMovementRangeHex,
  IHexTerrain,
  TerrainType,
  IHexGrid,
  IHex,
} from '@/types/gameplay';
import { TERRAIN_PROPERTIES, CoverLevel } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

// =============================================================================
// Types
// =============================================================================

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
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

/**
 * Convert pixel position to axial hex coordinates.
 * @internal Reserved for future mouse interaction support
 */
function _pixelToHex(x: number, y: number): IHexCoordinate {
  const q = ((2 / 3) * x) / HEX_SIZE;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
  return _roundHex(q, r);
}

/**
 * Round fractional hex coordinates to nearest hex.
 * @internal Used by _pixelToHex
 */
function _roundHex(q: number, r: number): IHexCoordinate {
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
function hexInList(
  hex: IHexCoordinate,
  list: readonly IHexCoordinate[],
): boolean {
  return list.some((h) => hexEquals(h, hex));
}

/**
 * Get the primary terrain feature (highest layer order) for a hex.
 */
function getPrimaryTerrainFeature(
  terrain: IHexTerrain | undefined,
): { type: TerrainType; level: number } | null {
  if (!terrain || terrain.features.length === 0) return null;

  const sortedFeatures = [...terrain.features].sort(
    (a, b) => TERRAIN_LAYER_ORDER[b.type] - TERRAIN_LAYER_ORDER[a.type],
  );
  return sortedFeatures[0];
}

function getTerrainMovementCost(terrain: IHexTerrain | undefined): number {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return 1;
  const props = TERRAIN_PROPERTIES[feature.type];
  return 1 + (props?.movementCostModifier.walk ?? 0);
}

function getTerrainCoverLevel(terrain: IHexTerrain | undefined): CoverLevel {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return CoverLevel.None;
  const props = TERRAIN_PROPERTIES[feature.type];
  return props?.coverLevel ?? CoverLevel.None;
}

function getTerrainFill(terrain: IHexTerrain | undefined): string {
  const feature = getPrimaryTerrainFeature(terrain);
  if (!feature) return HEX_COLORS.hexFill;

  if (feature.type === TerrainType.Water) {
    const depthIndex = Math.min(feature.level, 3);
    return WATER_DEPTH_COLORS[depthIndex] ?? WATER_DEPTH_COLORS[1];
  }

  const patternId = TERRAIN_PATTERNS[feature.type];
  if (patternId) {
    return `url(#${patternId})`;
  }

  return TERRAIN_COLORS[feature.type] ?? HEX_COLORS.hexFill;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface HexCellProps {
  hex: IHexCoordinate;
  terrain?: IHexTerrain;
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

const HexCell = React.memo(function HexCell({
  hex,
  terrain,
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
  const pathD = hexPath(x, y);

  const terrainFill = getTerrainFill(terrain);
  const primaryFeature = getPrimaryTerrainFeature(terrain);
  const terrainType = primaryFeature?.type ?? null;

  const hasOverlay =
    isSelected || isInPath || movementInfo || isInAttackRange || isHovered;
  let overlayFill: string | null = null;
  let overlayOpacity = 0.5;

  if (isSelected) {
    overlayFill = HEX_COLORS.hexSelected;
    overlayOpacity = 0.7;
  } else if (isInPath) {
    overlayFill = HEX_COLORS.pathHighlight;
    overlayOpacity = 0.6;
  } else if (movementInfo) {
    overlayFill = movementInfo.reachable
      ? HEX_COLORS.movementRange
      : HEX_COLORS.movementRangeUnreachable;
    overlayOpacity = 0.5;
  } else if (isInAttackRange) {
    overlayFill = HEX_COLORS.attackRange;
    overlayOpacity = 0.5;
  } else if (isHovered) {
    overlayFill = HEX_COLORS.hexHover;
    overlayOpacity = 0.4;
  }

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      data-testid={`hex-${hex.q}-${hex.r}`}
    >
      <path
        d={pathD}
        fill={terrainFill}
        stroke={HEX_COLORS.gridLine}
        strokeWidth={1}
        data-terrain={terrainType}
      />
      {hasOverlay && overlayFill && (
        <path
          d={pathD}
          fill={overlayFill}
          opacity={overlayOpacity}
          pointerEvents="none"
        />
      )}
      {showCoordinate && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#64748b">
          {hex.q},{hex.r}
        </text>
      )}
      {movementInfo && movementInfo.reachable && (
        <text x={x} y={y + 12} textAnchor="middle" fontSize={8} fill="#166534">
          {movementInfo.mpCost}MP
        </text>
      )}
    </g>
  );
});

interface UnitTokenComponentProps {
  token: IUnitToken;
  onClick: () => void;
}

const UnitTokenComponent = React.memo(function UnitTokenComponent({
  token,
  onClick,
}: UnitTokenComponentProps): React.ReactElement {
  const { x, y } = hexToPixel(token.position);
  const rotation = getFacingRotation(token.facing);

  // Determine token color
  let color =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (token.isDestroyed) {
    color = HEX_COLORS.destroyedToken;
  }

  // Selection ring
  const ringColor = token.isSelected
    ? '#fbbf24'
    : token.isValidTarget
      ? '#f87171'
      : 'transparent';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
      data-testid={`unit-token-${token.unitId}`}
    >
      {/* Selection/target ring */}
      <circle
        r={HEX_SIZE * 0.7}
        fill="none"
        stroke={ringColor}
        strokeWidth={3}
      />

      {/* Token body */}
      <circle
        r={HEX_SIZE * 0.5}
        fill={color}
        stroke="#1e293b"
        strokeWidth={2}
      />

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

      {token.isDestroyed && (
        <g stroke="#dc2626" strokeWidth={3}>
          <line x1={-12} y1={-12} x2={12} y2={12} />
          <line x1={12} y1={-12} x2={-12} y2={12} />
        </g>
      )}
    </g>
  );
});

interface MovementCostOverlayProps {
  hex: IHexCoordinate;
  terrain: IHexTerrain | undefined;
}

const MovementCostOverlay = React.memo(function MovementCostOverlay({
  hex,
  terrain,
}: MovementCostOverlayProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const cost = getTerrainMovementCost(terrain);

  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={12} fill="#1e293b" opacity={0.85} />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {cost}
      </text>
    </g>
  );
});

interface CoverOverlayProps {
  hex: IHexCoordinate;
  terrain: IHexTerrain | undefined;
}

const CoverOverlay = React.memo(function CoverOverlay({
  hex,
  terrain,
}: CoverOverlayProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const coverLevel = getTerrainCoverLevel(terrain);

  const shieldPath = `M${x},${y - 14} L${x - 10},${y - 6} L${x - 10},${y + 4} Q${x},${y + 14} ${x + 10},${y + 4} L${x + 10},${y - 6} Z`;

  let fillColor: string;
  let fillOpacity: number;
  switch (coverLevel) {
    case CoverLevel.Full:
      fillColor = '#22c55e';
      fillOpacity = 0.9;
      break;
    case CoverLevel.Partial:
      fillColor = '#eab308';
      fillOpacity = 0.8;
      break;
    default:
      fillColor = '#64748b';
      fillOpacity = 0.3;
  }

  return (
    <g pointerEvents="none">
      <path
        d={shieldPath}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      {coverLevel === CoverLevel.Partial && (
        <line
          x1={x - 8}
          y1={y}
          x2={x + 8}
          y2={y}
          stroke="#1e293b"
          strokeWidth={2}
        />
      )}
    </g>
  );
});

interface LOSLineProps {
  from: IHexCoordinate;
  to: IHexCoordinate;
  hasLOS: boolean;
}

const LOSLine = React.memo(function LOSLine({
  from,
  to,
  hasLOS,
}: LOSLineProps): React.ReactElement {
  const fromPixel = hexToPixel(from);
  const toPixel = hexToPixel(to);

  return (
    <line
      x1={fromPixel.x}
      y1={fromPixel.y}
      x2={toPixel.x}
      y2={toPixel.y}
      stroke={hasLOS ? '#22c55e' : '#ef4444'}
      strokeWidth={2}
      strokeOpacity={0.6}
      strokeDasharray={hasLOS ? undefined : '4,4'}
      pointerEvents="none"
    />
  );
});

function TerrainPatternDefs(): React.ReactElement {
  return (
    <defs>
      <pattern
        id="pattern-light-woods"
        patternUnits="userSpaceOnUse"
        width="12"
        height="12"
      >
        <rect
          width="12"
          height="12"
          fill={TERRAIN_COLORS[TerrainType.LightWoods]}
        />
        <circle cx="6" cy="6" r="3" fill="#4ade80" opacity="0.6" />
        <circle cx="0" cy="0" r="2" fill="#22c55e" opacity="0.4" />
        <circle cx="12" cy="12" r="2" fill="#22c55e" opacity="0.4" />
      </pattern>

      <pattern
        id="pattern-heavy-woods"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.HeavyWoods]}
        />
        <circle cx="5" cy="5" r="4" fill="#15803d" opacity="0.7" />
        <circle cx="0" cy="0" r="3" fill="#166534" opacity="0.5" />
        <circle cx="10" cy="10" r="3" fill="#166534" opacity="0.5" />
        <circle cx="10" cy="0" r="2" fill="#14532d" opacity="0.4" />
        <circle cx="0" cy="10" r="2" fill="#14532d" opacity="0.4" />
      </pattern>

      <pattern
        id="pattern-rough"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <rect width="8" height="8" fill={TERRAIN_COLORS[TerrainType.Rough]} />
        <circle cx="2" cy="2" r="1.5" fill="#a8a29e" />
        <circle cx="6" cy="5" r="1" fill="#78716c" />
        <circle cx="4" cy="7" r="0.8" fill="#a8a29e" />
      </pattern>

      <pattern
        id="pattern-rubble"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.Rubble]}
        />
        <polygon points="2,3 4,1 5,4" fill="#78716c" />
        <polygon points="6,7 8,5 9,8" fill="#57534e" />
        <polygon points="1,8 3,6 4,9" fill="#78716c" />
        <rect
          x="5"
          y="2"
          width="2"
          height="1.5"
          fill="#57534e"
          transform="rotate(15 6 2.75)"
        />
      </pattern>

      <pattern
        id="pattern-building"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.Building]}
        />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#57534e" strokeWidth="0.5" />
        <line x1="5" y1="0" x2="5" y2="10" stroke="#57534e" strokeWidth="0.5" />
        <rect x="1" y="1" width="3" height="3" fill="#44403c" opacity="0.3" />
        <rect x="6" y="6" width="3" height="3" fill="#44403c" opacity="0.3" />
      </pattern>
    </defs>
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
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
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
    if (!showLOSOverlay || !selectedUnitPosition)
      return new Map<string, boolean>();
    const results = new Map<string, boolean>();
    for (const hex of hexes) {
      if (hex.q === selectedUnitPosition.q && hex.r === selectedUnitPosition.r)
        continue;
      const los = calculateLOS(selectedUnitPosition, hex, hexGrid);
      results.set(coordToKey(hex), los.hasLOS);
    }
    return results;
  }, [showLOSOverlay, selectedUnitPosition, hexes, hexGrid]);

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
    [onHexClick],
  );

  // Handle hex hover
  const handleHexHover = useCallback(
    (hex: IHexCoordinate | null) => {
      setHoveredHex(hex);
      onHexHover?.(hex);
    },
    [onHexHover],
  );

  // Handle token click
  const handleTokenClick = useCallback(
    (unitId: string) => {
      onTokenClick?.(unitId);
    },
    [onTokenClick],
  );

  // Pan and zoom handlers
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

  // Touch pan and pinch-zoom handlers
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
    <div
      className={`relative overflow-hidden bg-slate-100 ${className}`}
      data-testid="hex-map-container"
    >
      <svg
        ref={svgRef}
        viewBox={transformedViewBox}
        className="h-full w-full touch-manipulation"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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

        {showLOSOverlay && selectedUnitPosition && (
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

        {showMovementOverlay && (
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

        {showCoverOverlay && (
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
            onClick={() => setShowMovementOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              showMovementOverlay
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
            onClick={() => setShowCoverOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              showCoverOverlay
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
            onClick={() => setShowLOSOverlay((v) => !v)}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-xs font-medium shadow transition-colors ${
              showLOSOverlay
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
            onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
            title="Zoom in"
            data-testid="zoom-in-btn"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-white p-2 shadow hover:bg-gray-100"
            title="Zoom out"
            data-testid="zoom-out-btn"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
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
