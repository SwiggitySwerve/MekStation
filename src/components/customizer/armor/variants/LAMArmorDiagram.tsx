/**
 * LAM (Land-Air Mech) Armor Diagram
 *
 * Design Philosophy: Mode-switchable visualization for transformable mechs
 * - Mech mode uses standard biped silhouette
 * - AirMech mode shows hybrid view
 * - Fighter mode shows aerospace silhouette with mapped armor values
 * - Mode toggle allows viewing armor allocation in different configurations
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import {
  LAMMode,
  LAM_CONFIGURATION,
  configurationRegistry,
} from '@/types/construction/MechConfigurationSystem';
import { LocationArmorData } from '../ArmorDiagram';
import {
  REALISTIC_SILHOUETTE,
  FIGHTER_SILHOUETTE,
  LOCATION_LABELS,
  FIGHTER_LOCATION_LABELS,
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

interface LAMLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  isFighterMode: boolean;
}

function LAMLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  isFighterMode,
}: LAMLocationProps): React.ReactElement | null {
  const silhouette = isFighterMode ? FIGHTER_SILHOUETTE : REALISTIC_SILHOUETTE;
  const labels = isFighterMode ? FIGHTER_LOCATION_LABELS : LOCATION_LABELS;

  const pos = silhouette.locations[location];
  const label = labels[location];

  // Skip rendering if this location is not defined in this silhouette
  if (!pos) return null;

  const center = getLocationCenter(pos);
  // Fighter mode doesn't have rear armor on individual locations
  const showRear = !isFighterMode && hasTorsoRear(location);

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

export interface LAMArmorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

/**
 * Biped mech locations for LAM Mech mode
 */
const MECH_LOCATIONS: MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * Fighter locations for LAM Fighter mode
 */
const FIGHTER_LOCATIONS: MechLocation[] = [
  MechLocation.NOSE,
  MechLocation.FUSELAGE,
  MechLocation.LEFT_WING,
  MechLocation.RIGHT_WING,
  MechLocation.AFT,
];

/**
 * Calculate fighter mode armor values from mech mode armor
 * Uses the armor location mapping from LAM configuration
 */
function calculateFighterArmor(
  mechArmorData: LocationArmorData[]
): LocationArmorData[] {
  const armorMapping = configurationRegistry.getFighterArmorMapping(
    LAM_CONFIGURATION.id
  );

  if (!armorMapping) {
    return [];
  }

  // Create a map of mech armor data for quick lookup
  const mechArmorMap = new Map<MechLocation, LocationArmorData>();
  for (const data of mechArmorData) {
    mechArmorMap.set(data.location, data);
  }

  // Calculate fighter armor by summing mapped mech locations
  const fighterArmor: Map<MechLocation, LocationArmorData> = new Map();

  // Initialize fighter locations
  for (const fighterLoc of FIGHTER_LOCATIONS) {
    fighterArmor.set(fighterLoc, {
      location: fighterLoc,
      current: 0,
      maximum: 0,
    });
  }

  // Sum armor from mech locations to fighter locations
  for (const mechLoc of MECH_LOCATIONS) {
    const fighterLoc = armorMapping[mechLoc];
    if (!fighterLoc || !FIGHTER_LOCATIONS.includes(fighterLoc)) continue;

    const mechData = mechArmorMap.get(mechLoc);
    if (!mechData) continue;

    const fighterData = fighterArmor.get(fighterLoc)!;

    // Add front armor + rear armor to the fighter location
    const totalMechArmor = mechData.current + (mechData.rear ?? 0);
    const totalMechMax = mechData.maximum + (mechData.rearMaximum ?? 0);

    fighterArmor.set(fighterLoc, {
      location: fighterLoc,
      current: fighterData.current + totalMechArmor,
      maximum: fighterData.maximum + totalMechMax,
    });
  }

  return Array.from(fighterArmor.values());
}

export function LAMArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: LAMArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);
  const [currentMode, setCurrentMode] = useState<LAMMode>(LAMMode.MECH);

  const isFighterMode = currentMode === LAMMode.FIGHTER;

  // Get locations and armor data based on current mode
  const displayLocations = isFighterMode ? FIGHTER_LOCATIONS : MECH_LOCATIONS;
  const displayArmorData = isFighterMode
    ? calculateFighterArmor(armorData)
    : armorData;

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return displayArmorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;
  const silhouette = isFighterMode ? FIGHTER_SILHOUETTE : REALISTIC_SILHOUETTE;

  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">LAM Armor Allocation</h3>
          <ArmorDiagramQuickSettings />
        </div>
        {onAutoAllocate && !isFighterMode && (
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
        <div className="inline-flex rounded-lg bg-surface-subtle p-1">
          {([LAMMode.MECH, LAMMode.AIRMECH, LAMMode.FIGHTER] as LAMMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                currentMode === mode
                  ? 'bg-accent text-white'
                  : 'text-text-theme-secondary hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Description */}
      {isFighterMode && (
        <div className="text-center text-xs text-text-theme-secondary mb-3">
          Fighter mode armor is calculated from Mech mode allocation
        </div>
      )}

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={silhouette.viewBox}
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

          {/* Render all locations for current mode */}
          {displayLocations.map((loc) => (
            <LAMLocation
              key={loc}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => !isFighterMode && onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              isFighterMode={isFighterMode}
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
        {isFighterMode ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-theme-secondary">
            <div>NOS = Nose</div>
            <div>FUS = Fuselage</div>
            <div>LW = Left Wing</div>
            <div>RW = Right Wing</div>
            <div>AFT = Aft</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-theme-secondary">
            <div>HD = Head</div>
            <div>CT = Center Torso</div>
            <div>LT/RT = Left/Right Torso</div>
            <div>LA/RA = Left/Right Arm</div>
            <div>LL/RL = Left/Right Leg</div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-text-theme-secondary text-center mt-2">
        {isFighterMode
          ? 'Switch to Mech mode to edit armor values'
          : 'Click a location to edit armor values'}
      </p>
    </div>
  );
}
