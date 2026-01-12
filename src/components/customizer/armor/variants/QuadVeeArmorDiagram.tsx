/**
 * QuadVee Armor Diagram
 *
 * Design Philosophy: Transformable quad mech visualization
 * - Mode toggle between Mech (quad legs) and Vehicle (tracked) modes
 * - Same 8 locations as standard quad in both modes
 * - Different silhouette representation per mode
 * - Status colors and interaction patterns consistent with other diagrams
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { QuadVeeMode, QUADVEE_MODES } from '@/types/construction/MechConfigurationSystem';
import { LocationArmorData } from '../ArmorDiagram';
import {
  QUAD_SILHOUETTE,
  QUAD_LOCATION_LABELS,
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

interface QuadVeeLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  mode: QuadVeeMode;
}

function QuadVeeLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  mode,
}: QuadVeeLocationProps): React.ReactElement | null {
  const pos = QUAD_SILHOUETTE.locations[location];
  const label = QUAD_LOCATION_LABELS[location];

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

  // Vehicle mode: add visual indication (wheels/treads)
  const isLeg = [
    MechLocation.FRONT_LEFT_LEG,
    MechLocation.FRONT_RIGHT_LEG,
    MechLocation.REAR_LEFT_LEG,
    MechLocation.REAR_RIGHT_LEG,
  ].includes(location);

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

      {/* Vehicle mode: wheel/tread indicator on legs */}
      {mode === QuadVeeMode.VEHICLE && isLeg && (
        <>
          {/* Track indicator */}
          <rect
            x={pos.x + 2}
            y={pos.y + pos.height - 18}
            width={pos.width - 4}
            height={14}
            rx={4}
            fill="#374151"
            stroke="#6B7280"
            strokeWidth={1}
            className="pointer-events-none"
          />
          {/* Track ridges */}
          <line
            x1={pos.x + 6}
            y1={pos.y + pos.height - 11}
            x2={pos.x + pos.width - 6}
            y2={pos.y + pos.height - 11}
            stroke="#6B7280"
            strokeWidth={1}
            strokeDasharray="4 2"
            className="pointer-events-none"
          />
        </>
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

export interface QuadVeeArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
  initialMode?: QuadVeeMode;
  onModeChange?: (mode: QuadVeeMode) => void;
}

/**
 * QuadVee mech locations in display order
 */
const QUADVEE_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.FRONT_LEFT_LEG,
  MechLocation.FRONT_RIGHT_LEG,
  MechLocation.REAR_LEFT_LEG,
  MechLocation.REAR_RIGHT_LEG,
];

export function QuadVeeArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
  initialMode = QuadVeeMode.MECH,
  onModeChange,
}: QuadVeeArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);
  const [currentMode, setCurrentMode] = useState<QuadVeeMode>(initialMode);

  const handleModeChange = (mode: QuadVeeMode) => {
    setCurrentMode(mode);
    onModeChange?.(mode);
  };

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">QuadVee Armor Allocation</h3>
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

      {/* Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-lg bg-surface-elevated p-1 gap-1">
          {QUADVEE_MODES.map((modeDefinition) => (
            <button
              key={modeDefinition.mode}
              onClick={() => handleModeChange(modeDefinition.mode)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                currentMode === modeDefinition.mode
                  ? 'bg-accent text-white'
                  : 'text-text-theme-secondary hover:text-white hover:bg-surface-base'
              }`}
              title={modeDefinition.description}
            >
              {modeDefinition.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Description */}
      <p className="text-xs text-text-theme-secondary text-center mb-3">
        {currentMode === QuadVeeMode.MECH
          ? 'Mech Mode: Standard quad mech movement'
          : 'Vehicle Mode: Tracked vehicle movement'}
      </p>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={QUAD_SILHOUETTE.viewBox}
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Background grid pattern */}
          <rect
            x="0"
            y="0"
            width="300"
            height="280"
            fill="url(#armor-grid)"
            opacity="0.5"
          />

          {/* Render all QuadVee locations */}
          {QUADVEE_LOCATIONS.map((loc) => (
            <QuadVeeLocation
              key={loc}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              mode={currentMode}
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
          <div>FLL = Front Left Leg</div>
          <div>FRL = Front Right Leg</div>
          <div>RLL = Rear Left Leg</div>
          <div>RRL = Rear Right Leg</div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-text-theme-secondary text-center mt-2">
        Click a location to edit armor values
      </p>
    </div>
  );
}
