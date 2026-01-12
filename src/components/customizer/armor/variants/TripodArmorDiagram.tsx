/**
 * Tripod Armor Diagram
 *
 * Design Philosophy: Three-legged mech with standard biped upper body
 * - Standard biped locations (HD, CT, LT, RT, LA, RA, LL, RL)
 * - Plus Center Leg (CL) for the third leg
 * - Torsos have front/rear armor sections
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { TRIPOD_LOCATIONS } from '@/types/construction/MechConfigurationSystem';
import { LocationArmorData } from '../ArmorDiagram';
import {
  TRIPOD_SILHOUETTE,
  TRIPOD_LOCATION_LABELS,
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
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

interface TripodLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function TripodLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: TripodLocationProps): React.ReactElement | null {
  const pos = TRIPOD_SILHOUETTE.locations[location];
  const label = TRIPOD_LOCATION_LABELS[location];

  // Skip rendering if this location is not defined
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
        style={{ fontSize: pos.width < 40 ? '12px' : '16px' }}
      >
        {current}
      </text>

      {/* Capacity text */}
      <text
        x={center.x}
        y={pos.y + frontHeight / 2 + 16}
        textAnchor="middle"
        className="fill-white/60 pointer-events-none"
        style={{ fontSize: '8px' }}
      >
        / {maximum}
      </text>

      {/* Location label */}
      <text
        x={center.x}
        y={pos.y + 12}
        textAnchor="middle"
        className="fill-white/80 font-semibold pointer-events-none"
        style={{ fontSize: showRear ? '8px' : '9px' }}
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
            style={{ fontSize: '12px' }}
          >
            {rear}
          </text>
        </>
      )}
    </g>
  );
}

export interface TripodArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

export function TripodArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: TripodArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Tripod Armor Allocation</h3>
          <ArmorDiagramQuickSettings />
        </div>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isOverAllocated
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent text-white'
            }`}
          >
            Auto Allocate ({unallocatedPoints} pts)
          </button>
        )}
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={TRIPOD_SILHOUETTE.viewBox}
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Background grid pattern */}
          <rect
            x="0"
            y="0"
            width="300"
            height="380"
            fill="url(#armor-grid)"
            opacity="0.5"
          />

          {/* Render all tripod locations */}
          {TRIPOD_LOCATIONS.map((loc) => (
            <TripodLocation
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
      <div className="flex justify-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-text-theme-secondary">75%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-text-theme-secondary">50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-text-theme-secondary">25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-text-theme-secondary">&lt;25%</span>
        </div>
      </div>

      {/* Location Key */}
      <div className="mt-3 pt-3 border-t border-border-theme-subtle">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-theme-secondary">
          <div>HD = Head</div>
          <div>CT = Center Torso</div>
          <div>LT/RT = Left/Right Torso</div>
          <div>LA/RA = Left/Right Arm</div>
          <div>LL/RL = Left/Right Leg</div>
          <div>CL = Center Leg</div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-text-theme-secondary text-center mt-2">
        Click a location to edit armor values
      </p>
    </div>
  );
}
