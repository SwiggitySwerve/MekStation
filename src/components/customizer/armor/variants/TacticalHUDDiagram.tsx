/**
 * Tactical HUD Armor Diagram
 *
 * Design Philosophy: Information density and military feel
 * - Geometric/polygonal silhouette
 * - Bottom-up tank fill style
 * - LED segmented number display
 * - Horizontal bar capacity indicator
 * - Side-by-side front/rear view
 * - Bracket focus interaction
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  GEOMETRIC_SILHOUETTE,
  LOCATION_LABELS,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  GradientDefs,
  getArmorStatusColor,
  getTorsoStatusColor,
  darkenColor,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

/**
 * LED-style segmented digit display
 */
function LEDDigit({ value, x, y, size = 12 }: { value: string; x: number; y: number; size?: number }): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="'Courier New', monospace"
      fontWeight="bold"
      fontSize={size}
      fill="#22d3ee"
      style={{
        textShadow: '0 0 4px #22d3ee, 0 0 8px rgba(34, 211, 238, 0.5)',
        letterSpacing: '1px',
      }}
    >
      {value}
    </text>
  );
}

/**
 * Horizontal bar gauge
 */
function BarGauge({
  x,
  y,
  width,
  height,
  fillPercent,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fillPercent: number;
  color: string;
}): React.ReactElement {
  const fillWidth = (width - 2) * (fillPercent / 100);

  return (
    <g>
      {/* Background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={1}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth={0.5}
      />
      {/* Fill */}
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, fillWidth)}
        height={height - 2}
        rx={0.5}
        fill={color}
        className="transition-all duration-300"
      />
      {/* Tick marks */}
      {[25, 50, 75].map((tick) => (
        <line
          key={tick}
          x1={x + (width * tick) / 100}
          y1={y}
          x2={x + (width * tick) / 100}
          y2={y + height}
          stroke="#475569"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

/**
 * Corner bracket decorations
 */
function CornerBrackets({
  x,
  y,
  width,
  height,
  size = 8,
  color = '#22d3ee',
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
  color?: string;
}): React.ReactElement {
  return (
    <g stroke={color} strokeWidth={1.5} fill="none" style={{ filter: 'url(#armor-glow)' }}>
      {/* Top-left */}
      <path d={`M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}`} />
      {/* Top-right */}
      <path d={`M ${x + width - size} ${y} L ${x + width} ${y} L ${x + width} ${y + size}`} />
      {/* Bottom-left */}
      <path d={`M ${x} ${y + height - size} L ${x} ${y + height} L ${x + size} ${y + height}`} />
      {/* Bottom-right */}
      <path d={`M ${x + width - size} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - size}`} />
    </g>
  );
}

interface TacticalLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  isRear?: boolean;
  scale?: number;
  offsetX?: number;
}

function TacticalLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  isRear = false,
  scale = 1,
  offsetX = 0,
}: TacticalLocationProps): React.ReactElement {
  const basePos = GEOMETRIC_SILHOUETTE.locations[location];
  const pos = {
    x: basePos.x * scale + offsetX,
    y: basePos.y * scale,
    width: basePos.width * scale,
    height: basePos.height * scale,
    path: basePos.path,
  };

  const label = LOCATION_LABELS[location];
  const center = {
    x: pos.x + pos.width / 2,
    y: pos.y + pos.height / 2,
  };

  const current = isRear ? (data?.rear ?? 0) : (data?.current ?? 0);
  const maximum = isRear ? (data?.rearMaximum ?? 1) : (data?.maximum ?? 1);
  const percentage = maximum > 0 ? (current / maximum) * 100 : 0;
  const isTorso = hasTorsoRear(location);

  // For torso locations, use combined front+rear for status color
  const baseColor = isTorso
    ? getTorsoStatusColor(data?.current ?? 0, data?.maximum ?? 1, data?.rear ?? 0)
    : getArmorStatusColor(current, maximum);
  const fillColor = isSelected ? '#3b82f6' : baseColor;
  const darkFill = darkenColor(fillColor, 0.6);

  // Calculate tank fill
  const fillHeight = pos.height * (percentage / 100);
  const fillY = pos.y + pos.height - fillHeight;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} ${isRear ? 'rear ' : ''}armor: ${current} of ${maximum}`}
      aria-pressed={isSelected}
      className="cursor-pointer focus:outline-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {/* Background (empty state) */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        fill={darkFill}
        stroke="#475569"
        strokeWidth={1}
        className="transition-colors duration-200"
      />

      {/* Tank fill */}
      <rect
        x={pos.x}
        y={fillY}
        width={pos.width}
        height={fillHeight}
        fill={fillColor}
        opacity={0.8}
        className="transition-all duration-300"
      />

      {/* Grid overlay */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        fill="url(#armor-grid)"
        opacity={0.5}
      />

      {/* Border */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        fill="none"
        stroke={isSelected ? '#60a5fa' : '#64748b'}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Corner brackets on hover/select */}
      {(isHovered || isSelected) && (
        <CornerBrackets
          x={pos.x - 2}
          y={pos.y - 2}
          width={pos.width + 4}
          height={pos.height + 4}
          color={isSelected ? '#60a5fa' : '#22d3ee'}
        />
      )}

      {/* Location label */}
      <text
        x={center.x}
        y={pos.y + 10 * scale}
        textAnchor="middle"
        fontSize={7 * scale}
        fill="#94a3b8"
        fontFamily="monospace"
      >
        {isRear ? `${label}-R` : label}
      </text>

      {/* LED armor value */}
      <LEDDigit
        value={current.toString().padStart(2, '0')}
        x={center.x}
        y={center.y + 2}
        size={Math.max(10, 14 * scale)}
      />

      {/* Bar gauge */}
      <BarGauge
        x={pos.x + 4}
        y={pos.y + pos.height - 8 * scale}
        width={pos.width - 8}
        height={4 * scale}
        fillPercent={percentage}
        color={fillColor}
      />
    </g>
  );
}

export interface TacticalHUDDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

export function TacticalHUDDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: TacticalHUDDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  const allLocations: MechLocation[] = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
  ];

  const torsoLocations: MechLocation[] = [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ];

  // Scale factors for side-by-side layout
  const frontScale = 0.65;
  const rearScale = 0.45;
  const frontOffset = 0;
  const rearOffset = 195;

  return (
    <div className={`bg-slate-900 rounded-lg border border-slate-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-mono font-bold text-slate-300 tracking-wider">
            ARMOR DIAGNOSTIC
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors ${
              isOverAllocated
                ? 'border-red-600 text-red-400 hover:bg-red-900/30'
                : 'border-amber-600 text-amber-400 hover:bg-amber-900/30'
            }`}
          >
            AUTO-ALLOC [{unallocatedPoints > 0 ? '+' : ''}{unallocatedPoints}]
          </button>
        )}
      </div>

      {/* View labels */}
      <div className="flex justify-between px-4 mb-2 text-xs font-mono text-slate-500">
        <span>[ FRONT VIEW ]</span>
        <span>[ REAR VIEW ]</span>
      </div>

      {/* Diagram - side by side */}
      <div className="relative">
        <svg
          viewBox="0 0 340 280"
          className="w-full mx-auto"
          style={{ height: 'auto', maxWidth: '400px' }}
        >
          <GradientDefs />

          {/* Divider line */}
          <line
            x1="170"
            y1="10"
            x2="170"
            y2="270"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Front view - all locations */}
          {allLocations.map((loc) => (
            <TacticalLocation
              key={`front-${loc}`}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              scale={frontScale}
              offsetX={frontOffset}
            />
          ))}

          {/* Rear view - torso locations only */}
          {torsoLocations.map((loc) => (
            <TacticalLocation
              key={`rear-${loc}`}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              isRear
              scale={rearScale}
              offsetX={rearOffset}
            />
          ))}

          {/* Scan line animation */}
          <line
            x1="0"
            y1="0"
            x2="340"
            y2="0"
            stroke="#22d3ee"
            strokeWidth="1"
            opacity="0.3"
          >
            <animate
              attributeName="y1"
              values="0;280;0"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values="0;280;0"
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      </div>

      {/* Status readout */}
      <div className="flex justify-between items-center mt-3 px-2 py-1.5 bg-slate-800/50 rounded text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-slate-500">STATUS:</span>
          <span className={isOverAllocated ? 'text-red-400' : 'text-green-400'}>
            {isOverAllocated ? 'OVERALLOC' : 'NOMINAL'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500">AVAIL:</span>
          <span className={unallocatedPoints < 0 ? 'text-red-400' : 'text-cyan-400'}>
            {unallocatedPoints}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-slate-600 text-center mt-2 font-mono">
        SELECT LOCATION TO MODIFY
      </p>
    </div>
  );
}
