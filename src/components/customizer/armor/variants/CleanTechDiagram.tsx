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
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  BATTLEMECH_SILHOUETTE,
  LOCATION_LABELS,
  getLocationCenter,
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

interface CleanTechLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function CleanTechLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: CleanTechLocationProps): React.ReactElement | null {
  const pos = BATTLEMECH_SILHOUETTE.locations[location];
  const label = LOCATION_LABELS[location];

  // Skip rendering if this location is not defined in this silhouette
  if (!pos) return null;

  const center = getLocationCenter(pos);
  const showRear = hasTorsoRear(location);

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

  // Split positions for front/rear - adjusted for divider
  const dividerHeight = showRear ? 2 : 0;
  const frontHeight = showRear ? pos.height * 0.65 : pos.height;
  const rearHeight = showRear ? pos.height * 0.35 - dividerHeight : 0;
  const dividerY = pos.y + frontHeight;
  const rearY = dividerY + dividerHeight;

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
      {/* Front armor section */}
      {pos.path ? (
        <path
          d={pos.path}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="transition-all duration-150"
          style={{
            clipPath: showRear ? `inset(0 0 ${rearHeight}px 0)` : undefined,
          }}
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

      {/* Front armor value - large bold number */}
      <text
        x={center.x}
        y={pos.y + frontHeight / 2 + 5}
        textAnchor="middle"
        className="fill-white font-bold pointer-events-none"
        style={{ fontSize: pos.width < 40 ? '14px' : '18px' }}
      >
        {current}
      </text>

      {/* Capacity text */}
      <text
        x={center.x}
        y={pos.y + frontHeight / 2 + 18}
        textAnchor="middle"
        className="fill-white/60 pointer-events-none"
        style={{ fontSize: '9px' }}
      >
        / {maximum}
      </text>

      {/* Location label */}
      <text
        x={center.x}
        y={pos.y + 12}
        textAnchor="middle"
        className="fill-white/80 font-semibold pointer-events-none"
        style={{ fontSize: showRear ? '8px' : '10px' }}
      >
        {showRear ? `${label} FRONT` : label}
      </text>

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
            y={rearY + 11}
            textAnchor="middle"
            className="fill-white/80 font-semibold pointer-events-none"
            style={{ fontSize: '8px' }}
          >
            REAR
          </text>

          {/* Rear armor value */}
          <text
            x={center.x}
            y={rearY + rearHeight / 2 + 6}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{ fontSize: '14px' }}
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

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={BATTLEMECH_SILHOUETTE.viewBox}
          className="w-full max-w-[280px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Background grid pattern */}
          <rect
            x="0"
            y="0"
            width="200"
            height="280"
            fill="url(#armor-grid)"
            opacity="0.5"
          />

          {/* Render all locations */}
          {locations.map((loc) => (
            <CleanTechLocation
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

      <ArmorStatusLegend />
      <ArmorDiagramInstructions />
    </div>
  );
}
