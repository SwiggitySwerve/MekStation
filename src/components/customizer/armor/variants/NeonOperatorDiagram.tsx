/**
 * Neon Operator Armor Diagram
 *
 * Design Philosophy: Sci-fi aesthetic and visual impact
 * - Wireframe outline silhouette
 * - Glow/neon fills with glowing edges
 * - Stacked progress rings for front/rear
 * - Amber (front) and sky (rear) color coding
 * - Glow pulse interaction
 *
 * Uses the Layout Engine for constraint-based positioning.
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  LOCATION_LABELS,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  GradientDefs,
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { useResolvedLayout, ResolvedPosition } from '../shared/layout';

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
  /** Resolved position from the layout engine */
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function NeonLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: NeonLocationProps): React.ReactElement {
  const label = LOCATION_LABELS[location];
  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;

  // Use position from layout engine
  const pos = position;

  // Use abbreviated labels for torso sections to fit in smaller space
  const frontLabel = showRear ? `${label}-F` : label;
  const rearLabel = 'R';

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

  // Status-based colors for front and rear independently
  const frontColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(front, frontMax)
      : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, frontMax);

  const glowColor = isHovered ? lightenColor(frontColor, 0.2) : frontColor;

  const fillOpacity = isHovered ? 0.4 : 0.25;

  // Layout calculations for stacked front/rear - 60/40 split for consistency
  const frontSectionHeight = showRear ? pos.height * 0.60 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.40 : 0;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = pos.y + frontSectionHeight + rearSectionHeight / 2;
  const dividerY = pos.y + frontSectionHeight;

  // Ring sizes
  const frontRingRadius = showRear
    ? Math.min(pos.width, frontSectionHeight) * 0.3
    : Math.min(pos.width, pos.height) * 0.35;
  const rearRingRadius = showRear ? Math.min(pos.width, rearSectionHeight) * 0.35 : 0;

  const center = pos.center;

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
            y={pos.y + 10}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: '8px',
              textShadow: `0 0 3px ${frontColor}`,
            }}
          >
            {frontLabel}
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
            y={dividerY + 9}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: '8px',
              textShadow: `0 0 3px ${rearColor}`,
            }}
          >
            {rearLabel}
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
          {/* Non-torso: single ring - HEAD gets special compact layout */}
          <text
            x={center.x}
            y={pos.y + (isHead ? 9 : 12)}
            textAnchor="middle"
            className="fill-white/70 font-medium pointer-events-none"
            style={{
              fontSize: isHead ? '7px' : '9px',
              textShadow: `0 0 3px ${glowColor}`,
            }}
          >
            {label}
          </text>

          {/* Skip ring for HEAD - not enough space */}
          {!isHead && (
            <ProgressRing
              cx={center.x}
              cy={pos.y + pos.height / 2 + 4}
              radius={frontRingRadius}
              progress={frontPercent}
              color={glowColor}
              strokeWidth={isHovered ? 4 : 3}
            />
          )}

          <text
            x={center.x}
            y={pos.y + (isHead ? pos.height / 2 + 4 : pos.height / 2 + 8)}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{
              fontSize: isHead ? '12px' : (pos.width < 40 ? '12px' : '16px'),
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
  className?: string;
}

export function NeonOperatorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
}: NeonOperatorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  // Use the layout engine to get resolved positions
  const { getPosition, viewBox, bounds } = useResolvedLayout('battlemech-biped');

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

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
    <div className={`bg-surface-deep rounded-lg border border-cyan-900/50 p-4 ${className}`}>
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
      </div>

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full max-w-[280px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Scanline overlay */}
          <rect
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
            fill="url(#armor-scanlines)"
            opacity="0.3"
          />

          {/* Render all locations using layout engine positions */}
          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;
            
            return (
              <NeonLocation
                key={loc}
                location={loc}
                position={position}
                data={getArmorData(loc)}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                onClick={() => onLocationClick(loc)}
                onHover={(h) => setHoveredLocation(h ? loc : null)}
              />
            );
          })}

          {/* Targeting reticle on hovered */}
          {hoveredLocation && (() => {
            const hoveredPos = getPosition(hoveredLocation);
            if (!hoveredPos) return null;
            return (
              <g className="pointer-events-none">
                <circle
                  cx={hoveredPos.center.x}
                  cy={hoveredPos.center.y}
                  r={40}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="8 4"
                  className="animate-spin"
                  style={{ animationDuration: '8s' }}
                />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px #22c55e' }} />
          <span className="text-text-theme-secondary">75%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" style={{ boxShadow: '0 0 6px #f59e0b' }} />
          <span className="text-text-theme-secondary">50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" style={{ boxShadow: '0 0 6px #f97316' }} />
          <span className="text-text-theme-secondary">25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444' }} />
          <span className="text-text-theme-secondary">&lt;25%</span>
        </div>
        <div className="w-px h-3 bg-surface-raised" />
        <span className={`${unallocatedPoints < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
          UNALLOC: {unallocatedPoints}
        </span>
      </div>

      {/* Instructions */}
      <p className="text-xs text-cyan-500/70 text-center mt-2">
        SELECT TARGET LOCATION
      </p>
    </div>
  );
}
