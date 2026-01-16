/**
 * Clean Tech Armor Diagram
 *
 * Design Philosophy: Maximum readability and usability
 * - Realistic mech contour silhouette
 * - Solid gradient fills based on armor status
 * - Plain bold numbers for armor values
 * - Color + small text for capacity indication
 * - Stacked front/rear display
 * - Simple border highlight on interaction
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
  SELECTED_STROKE,
} from '../shared/ArmorFills';
import { DiagramHeader } from '../shared/DiagramHeader';
import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';
import { useResolvedLayout, ResolvedPosition } from '../shared/layout';

interface CleanTechLocationProps {
  location: MechLocation;
  /** Resolved position from the layout engine */
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function CleanTechLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: CleanTechLocationProps): React.ReactElement {
  const label = LOCATION_LABELS[location];

  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;

  // Use position from layout engine
  const pos = position;

  const center = pos.center;

  const current = data?.current ?? 0;
  const maximum = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  // Status-based colors for front and rear independently
  // For torso locations, use expected capacity (75/25 split) as baseline
  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);

  const fillColor = isHovered ? lightenColor(frontBaseColor, 0.15) : frontBaseColor;
  const rearFillColor = isHovered ? lightenColor(rearBaseColor, 0.15) : rearBaseColor;
  const strokeColor = isSelected ? SELECTED_STROKE : '#475569';
  const strokeWidth = isSelected ? 2.5 : 1;

  // Split positions for front/rear - 60/40 split for consistency across variants
  const dividerHeight = showRear ? 2 : 0;
  const frontHeight = showRear ? pos.height * 0.60 : pos.height;
  const rearHeight = showRear ? pos.height * 0.40 - dividerHeight : 0;
  const dividerY = pos.y + frontHeight;
  const rearY = dividerY + dividerHeight;

  // Use abbreviated labels for torso sections to fit in smaller space
  const frontLabel = showRear ? `${label}-F` : label;
  const rearLabel = 'R';

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
      {/* Front armor section - use rect for torso locations to ensure proper front/rear split */}
      {pos.path && !showRear ? (
        <path
          d={pos.path}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={6}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-all duration-150"
        />
      )}

      {/* Location label - positioned at top of section */}
      <text
        x={center.x}
        y={pos.y + (isHead ? 9 : showRear ? 10 : 12)}
        textAnchor="middle"
        className="fill-white/80 font-semibold pointer-events-none"
        style={{ fontSize: isHead ? '7px' : showRear ? '8px' : '10px' }}
      >
        {frontLabel}
      </text>

      {/* Front armor value - large bold number */}
      <text
        x={center.x}
        y={pos.y + (isHead ? frontHeight / 2 + 4 : frontHeight / 2 + (showRear ? 2 : 5))}
        textAnchor="middle"
        className="fill-white font-bold pointer-events-none"
        style={{ fontSize: isHead ? '12px' : showRear ? '14px' : (pos.width < 40 ? '14px' : '18px') }}
      >
        {current}
      </text>

      {/* Capacity text - hide for HEAD due to limited space */}
      {!isHead && (
        <text
          x={center.x}
          y={pos.y + frontHeight / 2 + (showRear ? 14 : 18)}
          textAnchor="middle"
          className="fill-white/60 pointer-events-none"
          style={{ fontSize: '9px' }}
        >
          / {maximum}
        </text>
      )}

      {/* Divider line between front and rear */}
      {showRear && (
        <line
          x1={pos.x + 4}
          y1={dividerY + 1}
          x2={pos.x + pos.width - 4}
          y2={dividerY + 1}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="3 2"
          className="pointer-events-none"
        />
      )}

      {/* Rear armor section for torsos */}
      {showRear && (
        <>
          <rect
            x={pos.x}
            y={rearY}
            width={pos.width}
            height={rearHeight}
            rx={6}
            fill={rearFillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="transition-all duration-150"
          />

          {/* Rear label */}
          <text
            x={center.x}
            y={rearY + 9}
            textAnchor="middle"
            className="fill-white/80 font-semibold pointer-events-none"
            style={{ fontSize: '8px' }}
          >
            {rearLabel}
          </text>

          {/* Rear armor value */}
          <text
            x={center.x}
            y={rearY + rearHeight / 2 + 4}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{ fontSize: '12px' }}
          >
            {rear}
          </text>
        </>
      )}
    </g>
  );
}

export interface CleanTechDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
}

export function CleanTechDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
}: CleanTechDiagramProps): React.ReactElement {
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
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      <DiagramHeader title="Armor Allocation" />

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full max-w-[280px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Background grid pattern */}
          <rect
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
            fill="url(#armor-grid)"
            opacity="0.5"
          />

          {/* Render all locations using layout engine positions */}
          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;
            
            return (
              <CleanTechLocation
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

      <ArmorStatusLegend />
      <ArmorDiagramInstructions />
    </div>
  );
}
