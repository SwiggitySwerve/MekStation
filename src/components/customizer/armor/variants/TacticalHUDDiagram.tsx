/**
 * Tactical HUD Armor Diagram
 *
 * Design Philosophy: Information density and military feel
 * - Geometric/polygonal silhouette
 * - Bottom-up tank fill style
 * - LED segmented number display
 * - Horizontal bar capacity indicator
 * - Stacked front/rear display for torso
 * - Bracket focus interaction
 *
 * Uses the Layout Engine for constraint-based positioning.
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  getLocationLabel,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  GradientDefs,
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  darkenColor,
  ARMOR_STATUS,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { useResolvedLayout, ResolvedPosition, MechConfigType, getLayoutIdForConfig } from '../shared/layout';

/**
 * LED-style segmented digit display
 */
function LEDDigit({ value, x, y, size = 12, color = '#22d3ee' }: { value: string; x: number; y: number; size?: number; color?: string }): React.ReactElement {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="'Courier New', monospace"
      fontWeight="bold"
      fontSize={size}
      fill={color}
      style={{
        textShadow: `0 0 4px ${color}, 0 0 8px ${color}50`,
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
  /** Resolved position from the layout engine */
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  /** Mech configuration type for correct label lookup */
  configType?: MechConfigType;
}

function TacticalLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: TacticalLocationProps): React.ReactElement {
  const label = getLocationLabel(location, configType);
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;

  // Use position from layout engine
  const pos = position;

  const center = {
    x: pos.x + pos.width / 2,
    y: pos.y + pos.height / 2,
  };

  const front = data?.current ?? 0;
  const frontMax = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  // For torso locations, use expected capacity (75/25 split) as baseline
  const expectedFrontMax = showRear ? Math.round(frontMax * 0.75) : frontMax;
  const expectedRearMax = showRear ? Math.round(frontMax * 0.25) : 1;

  // Fill percentages based on expected capacity
  const frontPercent = expectedFrontMax > 0 ? Math.min(100, (front / expectedFrontMax) * 100) : 0;
  const rearPercent = expectedRearMax > 0 ? Math.min(100, (rear / expectedRearMax) * 100) : 0;

  // Status-based colors for front and rear
  const frontColor = isSelected
    ? '#3b82f6'
    : showRear
      ? getTorsoFrontStatusColor(front, frontMax)
      : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected
    ? '#3b82f6'
    : getTorsoRearStatusColor(rear, frontMax);
  const darkFrontFill = darkenColor(frontColor, 0.6);
  const darkRearFill = darkenColor(rearColor, 0.6);

  // Layout for stacked front/rear
  // 60/40 split for consistency across all variants
  const frontSectionHeight = showRear ? pos.height * 0.60 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.40 : 0;
  const dividerY = pos.y + frontSectionHeight;

  // Tank fill calculations
  const frontFillHeight = frontSectionHeight * (frontPercent / 100);
  const frontFillY = pos.y + frontSectionHeight - frontFillHeight;
  const rearFillHeight = rearSectionHeight * (rearPercent / 100);
  const rearFillY = dividerY + rearSectionHeight - rearFillHeight;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${front} of ${frontMax}${showRear ? `, rear: ${rear} of ${rearMax}` : ''}`}
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
      {/* Front section background */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={frontSectionHeight}
        fill={darkFrontFill}
        stroke="#475569"
        strokeWidth={1}
        className="transition-colors duration-200"
      />

      {/* Front tank fill */}
      <rect
        x={pos.x}
        y={frontFillY}
        width={pos.width}
        height={frontFillHeight}
        fill={frontColor}
        opacity={0.8}
        className="transition-all duration-300"
      />

      {/* Front grid overlay */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={frontSectionHeight}
        fill="url(#armor-grid)"
        opacity={0.5}
      />

      {/* Front label */}
      <text
        x={center.x}
        y={pos.y + (isHead ? 8 : 10)}
        textAnchor="middle"
        fontSize={isHead ? 7 : 9}
        fill="#94a3b8"
        fontFamily="monospace"
      >
        {showRear ? `${label}-F` : label}
      </text>

      {/* Front LED value */}
      <LEDDigit
        value={front.toString().padStart(2, '0')}
        x={center.x}
        y={pos.y + frontSectionHeight / 2 + (isHead ? 3 : 4)}
        size={isHead ? 10 : showRear ? 12 : 14}
        color={frontColor}
      />

      {/* Front bar gauge - hide for HEAD due to limited space */}
      {!isHead && (
        <BarGauge
          x={pos.x + 4}
          y={pos.y + frontSectionHeight - 8}
          width={pos.width - 8}
          height={4}
          fillPercent={frontPercent}
          color={frontColor}
        />
      )}

      {showRear && (
        <>
          {/* Divider line */}
          <line
            x1={pos.x}
            y1={dividerY}
            x2={pos.x + pos.width}
            y2={dividerY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="3 2"
          />

          {/* Rear section background */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            fill={darkRearFill}
            stroke="#475569"
            strokeWidth={1}
            className="transition-colors duration-200"
          />

          {/* Rear tank fill */}
          <rect
            x={pos.x}
            y={rearFillY}
            width={pos.width}
            height={rearFillHeight}
            fill={rearColor}
            opacity={0.8}
            className="transition-all duration-300"
          />

          {/* Rear grid overlay */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            fill="url(#armor-grid)"
            opacity={0.5}
          />

          {/* Rear label */}
          <text
            x={center.x}
            y={dividerY + 10}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
            fontFamily="monospace"
          >
            {label}-R
          </text>

          {/* Rear LED value */}
          <LEDDigit
            value={rear.toString().padStart(2, '0')}
            x={center.x}
            y={dividerY + rearSectionHeight / 2 + 4}
            size={10}
            color={rearColor}
          />

          {/* Rear bar gauge */}
          <BarGauge
            x={pos.x + 4}
            y={dividerY + rearSectionHeight - 7}
            width={pos.width - 8}
            height={3}
            fillPercent={rearPercent}
            color={rearColor}
          />
        </>
      )}

      {/* Outer border */}
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
    </g>
  );
}

export interface TacticalHUDDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  /** Mech configuration type for layout selection */
  mechConfigType?: MechConfigType;
}

/**
 * Get the locations to render based on mech configuration type
 */
function getLocationsForConfig(configType: MechConfigType): MechLocation[] {
  switch (configType) {
    case 'quad':
    case 'quadvee':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case 'tripod':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case 'lam':
    case 'biped':
    default:
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}

export function TacticalHUDDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: TacticalHUDDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  // Get layout ID based on mech configuration type
  const layoutId = getLayoutIdForConfig(mechConfigType, 'geometric');

  // Use the layout engine to get resolved positions
  const { layout: _layout, getPosition, viewBox, bounds } = useResolvedLayout(layoutId);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  // Get locations based on mech configuration type
  const locations = getLocationsForConfig(mechConfigType);

  return (
    <div className={`bg-surface-deep rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-mono font-bold text-slate-300 tracking-wider">
            ARMOR DIAGNOSTIC
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Render all locations using layout engine positions */}
          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;
            
            return (
              <TacticalLocation
                key={loc}
                location={loc}
                position={position}
                data={getArmorData(loc)}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                onClick={() => onLocationClick(loc)}
                onHover={(h) => setHoveredLocation(h ? loc : null)}
                configType={mechConfigType}
              />
            );
          })}

          {/* Scan line animation - uses auto-calculated bounds */}
          <line
            x1={bounds.minX}
            y1="0"
            x2={bounds.maxX}
            y2="0"
            stroke="#22d3ee"
            strokeWidth="1"
            opacity="0.3"
          >
            <animate
              attributeName="y1"
              values={`${bounds.minY};${bounds.maxY};${bounds.minY}`}
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values={`${bounds.minY};${bounds.maxY};${bounds.minY}`}
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-3 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          <span className="text-text-theme-muted">{Math.round(ARMOR_STATUS.HEALTHY.min * 100)}%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-text-theme-muted">{Math.round(ARMOR_STATUS.MODERATE.min * 100)}%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-text-theme-muted">{Math.round(ARMOR_STATUS.LOW.min * 100)}%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-text-theme-muted">&lt;{Math.round(ARMOR_STATUS.LOW.min * 100)}%</span>
        </div>
      </div>

      {/* Status readout */}
      <div className="flex justify-between items-center mt-3 px-2 py-1.5 bg-surface-base/50 rounded text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-text-theme-muted">STATUS:</span>
          <span className={isOverAllocated ? 'text-red-400' : 'text-green-400'}>
            {isOverAllocated ? 'OVERALLOC' : 'NOMINAL'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-theme-muted">AVAIL:</span>
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
