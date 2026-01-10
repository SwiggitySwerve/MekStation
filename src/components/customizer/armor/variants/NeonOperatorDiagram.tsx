/**
 * Neon Operator Armor Diagram
 *
 * Design Philosophy: Sci-fi aesthetic and visual impact
 * - Wireframe outline silhouette
 * - Glow/neon fills with glowing edges
 * - Stacked progress rings for front/rear
 * - Amber (front) and sky (rear) color coding
 * - Glow pulse interaction
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
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

interface ProgressRingProps {
  cx: number;
  cy: number;
  radius: number;
  progress: number;
  color: string;
  strokeWidth?: number;
}

function ProgressRing({
  cx,
  cy,
  radius,
  progress,
  color,
  strokeWidth = 3,
}: ProgressRingProps): React.ReactElement {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <g>
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-300"
        style={{ filter: 'url(#armor-glow)' }}
      />
    </g>
  );
}

interface NeonLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

// Calculate leg offset based on torso height expansion
const TORSO_HEIGHT_MULTIPLIER = 1.4;
const LEG_Y_OFFSET = REALISTIC_SILHOUETTE.locations[MechLocation.CENTER_TORSO].height * (TORSO_HEIGHT_MULTIPLIER - 1);

function isLegLocation(location: MechLocation): boolean {
  return location === MechLocation.LEFT_LEG || location === MechLocation.RIGHT_LEG;
}

function NeonLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: NeonLocationProps): React.ReactElement {
  const basePos = REALISTIC_SILHOUETTE.locations[location];
  const label = LOCATION_LABELS[location];
  const showRear = hasTorsoRear(location);

  // Adjust position for torso locations to be taller, and offset legs down
  const pos = showRear
    ? { ...basePos, height: basePos.height * TORSO_HEIGHT_MULTIPLIER }
    : isLegLocation(location)
      ? { ...basePos, y: basePos.y + LEG_Y_OFFSET }
      : basePos;

  const front = data?.current ?? 0;
  const frontMax = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  const frontPercent = frontMax > 0 ? (front / frontMax) * 100 : 0;
  const rearPercent = rearMax > 0 ? (rear / rearMax) * 100 : 0;

  // Status-based colors for front and rear independently
  const frontColor = isSelected ? SELECTED_COLOR : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected ? SELECTED_COLOR : getArmorStatusColor(rear, rearMax);

  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;

  const fillOpacity = isHovered ? 0.4 : 0.25;

  // Layout calculations for stacked front/rear
  const frontSectionHeight = showRear ? pos.height * 0.55 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.45 : 0;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = pos.y + frontSectionHeight + rearSectionHeight / 2;
  const dividerY = pos.y + frontSectionHeight;

  // Ring sizes
  const frontRingRadius = showRear
    ? Math.min(pos.width, frontSectionHeight) * 0.3
    : Math.min(pos.width, pos.height) * 0.35;
  const rearRingRadius = showRear ? Math.min(pos.width, rearSectionHeight) * 0.35 : 0;

  const center = getLocationCenter(pos);

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
      {/* Glow background */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={4}
        fill={glowColor}
        fillOpacity={fillOpacity}
        className="transition-all duration-200"
      />

      {/* Neon edge outline */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={4}
        fill="none"
        stroke={glowColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="transition-all duration-200"
        style={{
          filter: isHovered || isSelected ? 'url(#armor-neon-glow)' : 'url(#armor-glow)',
        }}
      />

      {showRear ? (
        <>
          {/* Front section */}
          <text
            x={center.x}
            y={pos.y + 11}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: '7px',
              textShadow: `0 0 5px ${frontColor}`,
            }}
          >
            {label} FRONT
          </text>

          <ProgressRing
            cx={center.x}
            cy={frontCenterY + 4}
            radius={frontRingRadius}
            progress={frontPercent}
            color={isHovered ? lightenColor(frontColor, 0.2) : frontColor}
            strokeWidth={isHovered ? 4 : 3}
          />

          <text
            x={center.x}
            y={frontCenterY + 8}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{
              fontSize: '14px',
              textShadow: `0 0 10px ${frontColor}`,
            }}
          >
            {front}
          </text>

          {/* Divider line */}
          <line
            x1={pos.x + 6}
            y1={dividerY}
            x2={pos.x + pos.width - 6}
            y2={dividerY}
            stroke="#64748b"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />

          {/* Rear section */}
          <text
            x={center.x}
            y={dividerY + 10}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: '7px',
              textShadow: `0 0 5px ${rearColor}`,
            }}
          >
            REAR
          </text>

          <ProgressRing
            cx={center.x}
            cy={rearCenterY + 2}
            radius={rearRingRadius}
            progress={rearPercent}
            color={isHovered ? lightenColor(rearColor, 0.2) : rearColor}
            strokeWidth={isHovered ? 3 : 2}
          />

          <text
            x={center.x}
            y={rearCenterY + 5}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{
              fontSize: '12px',
              textShadow: `0 0 10px ${rearColor}`,
            }}
          >
            {rear}
          </text>
        </>
      ) : (
        <>
          {/* Non-torso: single ring */}
          <text
            x={center.x}
            y={pos.y + 12}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: '8px',
              textShadow: `0 0 5px ${glowColor}`,
            }}
          >
            {label}
          </text>

          <ProgressRing
            cx={center.x}
            cy={pos.y + pos.height / 2 + 4}
            radius={frontRingRadius}
            progress={frontPercent}
            color={glowColor}
            strokeWidth={isHovered ? 4 : 3}
          />

          <text
            x={center.x}
            y={pos.y + pos.height / 2 + 8}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{
              fontSize: pos.width < 40 ? '12px' : '16px',
              textShadow: `0 0 10px ${glowColor}`,
            }}
          >
            {front}
          </text>
        </>
      )}
    </g>
  );
}

export interface NeonOperatorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

export function NeonOperatorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: NeonOperatorDiagramProps): React.ReactElement {
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
    <div className={`bg-slate-900 rounded-lg border border-cyan-900/50 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3
            className="text-lg font-semibold text-cyan-400"
            style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}
          >
            ARMOR STATUS
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded border transition-all ${
              isOverAllocated
                ? 'border-red-500 text-red-400 hover:bg-red-500/20'
                : 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20'
            }`}
            style={{
              boxShadow: isOverAllocated
                ? '0 0 10px rgba(239, 68, 68, 0.3)'
                : '0 0 10px rgba(34, 211, 238, 0.3)',
            }}
          >
            AUTO [{unallocatedPoints}]
          </button>
        )}
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox="0 0 300 480"
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Scanline overlay */}
          <rect
            x="0"
            y="0"
            width="300"
            height="440"
            fill="url(#armor-scanlines)"
            opacity="0.3"
          />

          {/* Wireframe outline */}
          {REALISTIC_SILHOUETTE.outlinePath && (
            <path
              d={REALISTIC_SILHOUETTE.outlinePath}
              fill="none"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Render all locations */}
          {locations.map((loc) => (
            <NeonLocation
              key={loc}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
            />
          ))}

          {/* Targeting reticle on hovered */}
          {hoveredLocation && (
            <g className="pointer-events-none">
              <circle
                cx={getLocationCenter(REALISTIC_SILHOUETTE.locations[hoveredLocation]).x}
                cy={getLocationCenter(REALISTIC_SILHOUETTE.locations[hoveredLocation]).y}
                r={40}
                fill="none"
                stroke="rgba(34, 211, 238, 0.3)"
                strokeWidth="1"
                strokeDasharray="8 4"
                className="animate-spin"
                style={{ animationDuration: '8s' }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px #22c55e' }} />
          <span className="text-slate-400">75%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" style={{ boxShadow: '0 0 6px #f59e0b' }} />
          <span className="text-slate-400">50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" style={{ boxShadow: '0 0 6px #f97316' }} />
          <span className="text-slate-400">25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444' }} />
          <span className="text-slate-400">&lt;25%</span>
        </div>
        <div className="w-px h-3 bg-slate-700" />
        <span className={`${unallocatedPoints < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
          UNALLOC: {unallocatedPoints}
        </span>
      </div>

      {/* Instructions */}
      <p className="text-xs text-cyan-600/50 text-center mt-2">
        SELECT TARGET LOCATION
      </p>
    </div>
  );
}
