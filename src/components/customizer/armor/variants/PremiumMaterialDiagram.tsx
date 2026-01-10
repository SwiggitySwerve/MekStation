/**
 * Premium Material Armor Diagram
 *
 * Design Philosophy: Modern app polish and tactile feel
 * - Realistic contour silhouette
 * - Metallic/textured fills
 * - Circular badge number display
 * - Dot indicator capacity
 * - 3D layered front/rear display
 * - Lift/shadow interaction
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  REALISTIC_SILHOUETTE,
  LOCATION_LABELS,
  getLocationCenter,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  GradientDefs,
  getArmorStatusColor,
  getTorsoStatusColor,
  darkenColor,
  lightenColor,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

/**
 * Circular badge with number
 */
function NumberBadge({
  x,
  y,
  value,
  color,
  size = 24,
}: {
  x: number;
  y: number;
  value: number;
  color: string;
  size?: number;
}): React.ReactElement {
  const radius = size / 2;
  return (
    <g>
      {/* Outer ring */}
      <circle
        cx={x}
        cy={y}
        r={radius + 2}
        fill="none"
        stroke={lightenColor(color, 0.2)}
        strokeWidth={1.5}
        opacity={0.6}
      />
      {/* Badge background */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={darkenColor(color, 0.3)}
        stroke={color}
        strokeWidth={1}
      />
      {/* Inner highlight */}
      <circle
        cx={x}
        cy={y - radius * 0.3}
        r={radius * 0.6}
        fill="url(#armor-metallic)"
        opacity={0.5}
      />
      {/* Number */}
      <text
        x={x}
        y={y + size * 0.15}
        textAnchor="middle"
        fontSize={size * 0.55}
        fontWeight="bold"
        fill="white"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {value}
      </text>
    </g>
  );
}

/**
 * Dot indicator row (like battery level)
 */
function DotIndicator({
  x,
  y,
  fillPercent,
  color,
  dots = 5,
  dotSize = 4,
  gap = 2,
}: {
  x: number;
  y: number;
  fillPercent: number;
  color: string;
  dots?: number;
  dotSize?: number;
  gap?: number;
}): React.ReactElement {
  const filledDots = Math.ceil((fillPercent / 100) * dots);
  const totalWidth = dots * dotSize + (dots - 1) * gap;
  const startX = x - totalWidth / 2;

  return (
    <g>
      {Array.from({ length: dots }).map((_, i) => {
        const isFilled = i < filledDots;
        return (
          <circle
            key={i}
            cx={startX + i * (dotSize + gap) + dotSize / 2}
            cy={y}
            r={dotSize / 2}
            fill={isFilled ? color : '#334155'}
            stroke={isFilled ? lightenColor(color, 0.2) : '#475569'}
            strokeWidth={0.5}
            className="transition-all duration-200"
          />
        );
      })}
    </g>
  );
}

interface PremiumLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function PremiumLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: PremiumLocationProps): React.ReactElement {
  const pos = REALISTIC_SILHOUETTE.locations[location];
  const label = LOCATION_LABELS[location];
  const center = getLocationCenter(pos);
  const showRear = hasTorsoRear(location);

  const current = data?.current ?? 0;
  const maximum = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  const frontPercent = maximum > 0 ? (current / maximum) * 100 : 0;
  const rearPercent = rearMax > 0 ? (rear / rearMax) * 100 : 0;

  // Colors - for torso locations, use combined front+rear for status
  // Both plates share the same status color since they represent one location
  const combinedStatusColor = showRear
    ? getTorsoStatusColor(current, maximum, rear)
    : getArmorStatusColor(current, maximum);
  const baseColor = isSelected ? '#3b82f6' : combinedStatusColor;
  const rearBaseColor = isSelected ? '#2563eb' : combinedStatusColor;

  // 3D effect positioning for rear plate
  const rearOffsetX = 6;
  const rearOffsetY = 6;

  // Lift effect when hovered
  const liftOffset = isHovered ? -2 : 0;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${current} of ${maximum}${showRear ? `, rear: ${rear} of ${rearMax}` : ''}`}
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
      {/* Rear plate (behind, offset for 3D effect) */}
      {showRear && (
        <g transform={`translate(${rearOffsetX}, ${rearOffsetY})`}>
          <rect
            x={pos.x}
            y={pos.y}
            width={pos.width}
            height={pos.height * 0.85}
            rx={8}
            fill={darkenColor(rearBaseColor, 0.4)}
            stroke={darkenColor(rearBaseColor, 0.2)}
            strokeWidth={1}
          />
          {/* Carbon fiber texture */}
          <rect
            x={pos.x}
            y={pos.y}
            width={pos.width}
            height={pos.height * 0.85}
            rx={8}
            fill="url(#armor-carbon)"
            opacity={0.3}
          />
          {/* Rear badge */}
          <NumberBadge
            x={pos.x + pos.width / 2}
            y={pos.y + pos.height * 0.42}
            value={rear}
            color={rearBaseColor}
            size={pos.width < 50 ? 18 : 22}
          />
          {/* Rear label */}
          <text
            x={pos.x + pos.width / 2}
            y={pos.y + 14}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.5)"
            fontWeight="500"
          >
            {label} REAR
          </text>
          {/* Rear dots */}
          <DotIndicator
            x={pos.x + pos.width / 2}
            y={pos.y + pos.height * 0.75}
            fillPercent={rearPercent}
            color={rearBaseColor}
            dots={4}
            dotSize={3}
          />
        </g>
      )}

      {/* Front plate (main, on top) */}
      <g
        transform={`translate(0, ${liftOffset})`}
        style={{
          filter: isHovered ? 'url(#armor-lift-shadow)' : undefined,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Main plate background */}
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={pos.height}
          rx={8}
          fill={darkenColor(baseColor, 0.3)}
          stroke={isSelected ? '#60a5fa' : darkenColor(baseColor, 0.1)}
          strokeWidth={isSelected ? 2 : 1}
          className="transition-colors duration-150"
        />

        {/* Metallic gradient overlay */}
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={pos.height}
          rx={8}
          fill="url(#armor-metallic)"
          opacity={0.6}
        />

        {/* Top highlight edge */}
        <rect
          x={pos.x + 2}
          y={pos.y + 2}
          width={pos.width - 4}
          height={pos.height * 0.15}
          rx={6}
          fill="white"
          opacity={0.1}
        />

        {/* Filled state indicator */}
        <rect
          x={pos.x}
          y={pos.y + pos.height * (1 - frontPercent / 100)}
          width={pos.width}
          height={pos.height * (frontPercent / 100)}
          rx={8}
          fill={baseColor}
          opacity={0.4}
          className="transition-all duration-300"
          style={{
            clipPath: `inset(0 0 0 0 round 8px)`,
          }}
        />

        {/* Location label */}
        <text
          x={center.x}
          y={pos.y + 14}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(255,255,255,0.8)"
          fontWeight="600"
          letterSpacing="0.5"
        >
          {label}
        </text>

        {/* Number badge */}
        <NumberBadge
          x={center.x}
          y={center.y}
          value={current}
          color={baseColor}
          size={pos.width < 50 ? 20 : 28}
        />

        {/* Dot indicators */}
        <DotIndicator
          x={center.x}
          y={pos.y + pos.height - 12}
          fillPercent={frontPercent}
          color={baseColor}
          dots={5}
          dotSize={pos.width < 50 ? 3 : 4}
        />

        {/* Rivets/bolts at corners */}
        {pos.width > 40 && (
          <>
            <circle cx={pos.x + 8} cy={pos.y + 8} r={2} fill="#64748b" />
            <circle cx={pos.x + pos.width - 8} cy={pos.y + 8} r={2} fill="#64748b" />
            <circle cx={pos.x + 8} cy={pos.y + pos.height - 8} r={2} fill="#64748b" />
            <circle cx={pos.x + pos.width - 8} cy={pos.y + pos.height - 8} r={2} fill="#64748b" />
          </>
        )}
      </g>
    </g>
  );
}

export interface PremiumMaterialDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

export function PremiumMaterialDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: PremiumMaterialDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  const locations: MechLocation[] = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
  ];

  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderColor: '#334155',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-200">
            Armor Configuration
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isOverAllocated
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
            }`}
            style={{
              boxShadow: isOverAllocated
                ? '0 0 20px rgba(239, 68, 68, 0.1)'
                : '0 0 20px rgba(245, 158, 11, 0.1)',
            }}
          >
            Auto-Allocate
            <span className="ml-2 px-2 py-0.5 rounded bg-black/20 text-xs">
              {unallocatedPoints}
            </span>
          </button>
        )}
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox="0 0 320 380"
          className="w-full max-w-[320px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Ambient glow behind mech */}
          <ellipse
            cx="160"
            cy="200"
            rx="120"
            ry="160"
            fill="url(#armor-gradient-selected)"
            opacity="0.03"
          />

          {/* Render all locations */}
          {locations.map((loc) => (
            <PremiumLocation
              key={loc}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 mt-5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
          <span className="text-xs text-slate-400">Optimal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
          <span className="text-xs text-slate-400">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
          <span className="text-xs text-slate-400">Critical</span>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-slate-500 text-center mt-3">
        Tap any plate to adjust armor values
      </p>
    </div>
  );
}
