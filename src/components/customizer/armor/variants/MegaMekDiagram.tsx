/**
 * MegaMek Armor Diagram
 *
 * Design Philosophy: Authentic MegaMek record sheet appearance
 * - Layered rendering: shadow → fill → outline for depth
 * - Detailed mech silhouette with hand actuators and knee joints
 * - Classic record sheet proportions and styling
 * - Clean, professional appearance matching PDF output
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  MEGAMEK_SILHOUETTE,
  LOCATION_LABELS,
  getLocationCenter,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  getArmorStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';
import { DiagramHeader } from '../shared/DiagramHeader';
import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';

interface MegaMekLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function MegaMekLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: MegaMekLocationProps): React.ReactElement | null {
  const pos = MEGAMEK_SILHOUETTE.locations[location];
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
  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getTorsoFrontStatusColor(current, maximum)
      : getArmorStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getTorsoRearStatusColor(rear, maximum);

  const fillColor = isHovered ? lightenColor(frontBaseColor, 0.1) : frontBaseColor;
  const shadowColor = '#1a1a1a';
  const outlineColor = isSelected ? '#fbbf24' : '#000000';
  const outlineWidth = isSelected ? 2 : 1.2;

  // Split heights for front/rear display
  const frontHeight = showRear ? pos.height * 0.65 : pos.height;
  const rearHeight = showRear ? pos.height * 0.35 : 0;
  const dividerY = pos.y + frontHeight;

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
      {/* Layer 1: Shadow (offset for depth) */}
      {pos.path && (
        <path
          d={pos.path}
          fill={shadowColor}
          stroke="none"
          className="pointer-events-none"
          transform="translate(2, 2)"
          opacity={0.3}
        />
      )}

      {/* Layer 2: Fill */}
      {pos.path ? (
        <path
          d={pos.path}
          fill={fillColor}
          stroke="none"
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={4}
          fill={fillColor}
          className="transition-all duration-150"
        />
      )}

      {/* Layer 3: Outline */}
      {pos.path ? (
        <path
          d={pos.path}
          fill="none"
          stroke={outlineColor}
          strokeWidth={outlineWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="transition-all duration-150"
        />
      ) : (
        <rect
          x={pos.x}
          y={pos.y}
          width={pos.width}
          height={frontHeight}
          rx={4}
          fill="none"
          stroke={outlineColor}
          strokeWidth={outlineWidth}
        />
      )}

      {/* Detail lines for mechanical look */}
      {/* Detail lines removed for cleaner MegaMek style */}

      {/* Front armor section labels and values */}
      <text
        x={center.x}
        y={showRear ? pos.y + 14 : pos.y + 14}
        textAnchor="middle"
        className="fill-white/80 font-semibold pointer-events-none"
        style={{
          fontSize: showRear ? '9px' : '10px',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        {showRear ? `${label} FRONT` : label}
      </text>

      <text
        x={center.x}
        y={showRear ? pos.y + frontHeight / 2 + 8 : pos.y + pos.height / 2 + 10}
        textAnchor="middle"
        className="fill-white font-bold pointer-events-none"
        style={{
          fontSize: pos.width < 40 ? '16px' : '20px',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}
      >
        {current}
      </text>

      <text
        x={center.x}
        y={showRear ? pos.y + frontHeight / 2 + 22 : pos.y + pos.height / 2 + 24}
        textAnchor="middle"
        className="fill-white/60 pointer-events-none"
        style={{ fontSize: '9px' }}
      >
        / {maximum}
      </text>

      {/* Rear armor section for torsos */}
      {showRear && (
        <>
          {/* Rear divider line */}
          <line
            x1={pos.x + 8}
            y1={dividerY}
            x2={pos.x + pos.width - 8}
            y2={dividerY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="4 2"
            className="pointer-events-none"
          />

          {/* Rear fill overlay */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearHeight}
            rx={4}
            fill={isHovered ? lightenColor(rearBaseColor, 0.1) : rearBaseColor}
            className="transition-all duration-150"
          />

          {/* Rear outline */}
          <rect
            x={pos.x}
            y={dividerY}
            width={pos.width}
            height={rearHeight}
            rx={4}
            fill="none"
            stroke={outlineColor}
            strokeWidth={outlineWidth}
          />

          {/* Rear label */}
          <text
            x={center.x}
            y={dividerY + 12}
            textAnchor="middle"
            className="fill-white/80 font-semibold pointer-events-none"
            style={{
              fontSize: '8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            REAR
          </text>

          {/* Rear armor value */}
          <text
            x={center.x}
            y={dividerY + rearHeight / 2 + 8}
            textAnchor="middle"
            className="fill-white font-bold pointer-events-none"
            style={{
              fontSize: '16px',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {rear}
          </text>
        </>
      )}
    </g>
  );
}

export interface MegaMekDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
}

export function MegaMekDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
}: MegaMekDiagramProps): React.ReactElement {
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
          viewBox={MEGAMEK_SILHOUETTE.viewBox}
          className="w-full max-w-[280px] mx-auto"
          style={{ height: 'auto' }}
        >
          <defs>
            {/* Grid pattern for background */}
            <pattern id="megamek-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>

          {/* Background */}
          <rect
            x="0"
            y="0"
            width="200"
            height="320"
            fill="url(#megamek-grid)"
          />

          {/* Mech outline (faint wireframe) */}
          {MEGAMEK_SILHOUETTE.outlinePath && (
            <path
              d={MEGAMEK_SILHOUETTE.outlinePath}
              fill="none"
              stroke="rgba(100, 116, 139, 0.15)"
              strokeWidth="1"
              strokeDasharray="6 3"
              className="pointer-events-none"
            />
          )}

          {/* Render all locations */}
          {locations.map((loc) => (
            <MegaMekLocation
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
