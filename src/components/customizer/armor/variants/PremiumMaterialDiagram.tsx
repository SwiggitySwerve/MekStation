/**
 * Premium Material Armor Diagram
 *
 * Design Philosophy: Modern app polish and tactile feel
 * - Realistic contour silhouette
 * - Metallic/textured fills
 * - Circular badge number display
 * - Dot indicator capacity
 * - Stacked front/rear display for torso
 * - Lift/shadow interaction
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
  darkenColor,
  lightenColor,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { useResolvedLayout, ResolvedPosition, MechConfigType, getLayoutIdForConfig } from '../shared/layout';

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
  /** Resolved position from the layout engine */
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function PremiumLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: PremiumLocationProps): React.ReactElement {
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
    ? '#3b82f6'
    : showRear
      ? getTorsoFrontStatusColor(front, frontMax)
      : getArmorStatusColor(front, frontMax);
  const rearColor = isSelected
    ? '#2563eb'
    : getTorsoRearStatusColor(rear, frontMax);

  // Lift effect when hovered
  const liftOffset = isHovered ? -2 : 0;

  // Layout for stacked front/rear
  // 60/40 split for consistency across all variants
  const frontSectionHeight = showRear ? pos.height * 0.60 : pos.height;
  const rearSectionHeight = showRear ? pos.height * 0.40 : 0;
  const dividerY = pos.y + frontSectionHeight;

  const center = pos.center;
  const frontCenterY = pos.y + frontSectionHeight / 2;
  const rearCenterY = dividerY + rearSectionHeight / 2;

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
      {/* Front section plate */}
      <g
        transform={`translate(0, ${liftOffset})`}
        style={{
          filter: isHovered ? 'url(#armor-lift-shadow)' : undefined,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Front plate background */}
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontSectionHeight}
          rx={showRear ? 8 : 8}
          ry={showRear ? 8 : 8}
          fill={darkenColor(frontColor, 0.3)}
          stroke={isSelected ? '#60a5fa' : darkenColor(frontColor, 0.1)}
          strokeWidth={isSelected ? 2 : 1}
          className="transition-colors duration-150"
        />

        {/* Metallic gradient overlay */}
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontSectionHeight}
          rx={8}
          fill="url(#armor-metallic)"
          opacity={0.6}
        />

        {/* Top highlight edge */}
        <rect
          x={pos.x + 2}
          y={pos.y + 2}
          width={pos.width - 4}
          height={frontSectionHeight * 0.12}
          rx={6}
          fill="white"
          opacity={0.1}
        />

        {/* Filled state indicator */}
        <rect
          x={pos.x}
          y={pos.y + frontSectionHeight * (1 - frontPercent / 100)}
          width={pos.width}
          height={frontSectionHeight * (frontPercent / 100)}
          rx={8}
          fill={frontColor}
          opacity={0.4}
          className="transition-all duration-300"
        />

        {/* Front label */}
        <text
          x={center.x}
          y={pos.y + (isHead ? 9 : showRear ? 10 : 12)}
          textAnchor="middle"
          fontSize={isHead ? '7' : showRear ? '8' : '10'}
          fill="rgba(255,255,255,0.8)"
          fontWeight="600"
          letterSpacing="0.5"
        >
          {frontLabel}
        </text>

        {/* Front number badge */}
        <NumberBadge
          x={center.x}
          y={frontCenterY + (isHead ? 1 : 2)}
          value={front}
          color={frontColor}
          size={isHead ? 14 : showRear ? (pos.width < 50 ? 18 : 22) : (pos.width < 50 ? 20 : 28)}
        />

        {/* Front dot indicators - hide for HEAD */}
        {!isHead && (
          <DotIndicator
            x={center.x}
            y={pos.y + frontSectionHeight - 10}
            fillPercent={frontPercent}
            color={frontColor}
            dots={showRear ? 4 : 5}
            dotSize={showRear ? 3 : (pos.width < 50 ? 3 : 4)}
          />
        )}

        {/* Rivets/bolts at corners (only on front) */}
        {pos.width > 40 && !showRear && (
          <>
            <circle cx={pos.x + 8} cy={pos.y + 8} r={2} fill="#64748b" />
            <circle cx={pos.x + pos.width - 8} cy={pos.y + 8} r={2} fill="#64748b" />
            <circle cx={pos.x + 8} cy={pos.y + frontSectionHeight - 8} r={2} fill="#64748b" />
            <circle cx={pos.x + pos.width - 8} cy={pos.y + frontSectionHeight - 8} r={2} fill="#64748b" />
          </>
        )}
      </g>

      {/* Rear section plate (only for torso) */}
      {showRear && (
        <>
          {/* Divider line */}
          <line
            x1={pos.x + 4}
            y1={dividerY}
            x2={pos.x + pos.width - 4}
            y2={dividerY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="3 2"
          />

          {/* Rear plate background */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            rx={8}
            fill={darkenColor(rearColor, 0.4)}
            stroke={isSelected ? '#60a5fa' : darkenColor(rearColor, 0.2)}
            strokeWidth={isSelected ? 2 : 1}
            className="transition-colors duration-150"
          />

          {/* Carbon fiber texture on rear */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearSectionHeight}
            rx={8}
            fill="url(#armor-carbon)"
            opacity={0.3}
          />

          {/* Filled state indicator for rear */}
          <rect
            x={pos.x}
            y={dividerY + rearSectionHeight * (1 - rearPercent / 100)}
            width={pos.width}
            height={rearSectionHeight * (rearPercent / 100)}
            rx={8}
            fill={rearColor}
            opacity={0.4}
            className="transition-all duration-300"
          />

          {/* Rear label */}
          <text
            x={center.x}
            y={dividerY + 9}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.7)"
            fontWeight="500"
          >
            {rearLabel}
          </text>

          {/* Rear number badge */}
          <NumberBadge
            x={center.x}
            y={rearCenterY + 2}
            value={rear}
            color={rearColor}
            size={pos.width < 50 ? 16 : 20}
          />

          {/* Rear dot indicators */}
          <DotIndicator
            x={center.x}
            y={dividerY + rearSectionHeight - 8}
            fillPercent={rearPercent}
            color={rearColor}
            dots={4}
            dotSize={3}
          />
        </>
      )}

      {/* Outer border for entire location */}
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        rx={8}
        fill="none"
        stroke={isSelected ? '#60a5fa' : (isHovered ? '#64748b' : 'transparent')}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-colors duration-150"
      />
    </g>
  );
}

export interface PremiumMaterialDiagramProps {
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

export function PremiumMaterialDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: PremiumMaterialDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  // Get layout ID based on mech configuration type
  const layoutId = getLayoutIdForConfig(mechConfigType, 'battlemech');

  // Use the layout engine to get resolved positions
  const { getPosition, viewBox, bounds } = useResolvedLayout(layoutId);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  // Get locations based on mech configuration type
  const locations = getLocationsForConfig(mechConfigType);

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
      </div>

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full max-w-[280px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Ambient glow behind mech */}
          <ellipse
            cx={bounds.minX + bounds.width / 2}
            cy={bounds.minY + bounds.height / 2}
            rx={bounds.width * 0.4}
            ry={bounds.height * 0.4}
            fill="url(#armor-gradient-selected)"
            opacity="0.03"
          />

          {/* Render all locations using layout engine positions */}
          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;
            
            return (
              <PremiumLocation
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
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
          <span className="text-xs text-text-theme-secondary">75%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
          <span className="text-xs text-text-theme-secondary">50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30" />
          <span className="text-xs text-text-theme-secondary">25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
          <span className="text-xs text-text-theme-secondary">&lt;25%</span>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-slate-500 text-center mt-3">
        Tap any plate to adjust armor values
      </p>
    </div>
  );
}
