/**
 * MegaMek Armor Diagram
 *
 * Design Philosophy: Authentic MegaMek record sheet appearance
 * - Layered rendering: shadow → fill → outline for depth
 * - Detailed mech silhouette with hand actuators and knee joints
 * - Classic record sheet proportions and styling
 * - Clean, professional appearance matching PDF output
 *
 * Uses the Layout Engine for constraint-based positioning.
 */

import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { MechLocation } from '@/types/construction';

import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';
import {
  getMegaMekStatusColor,
  getMegaMekFrontStatusColor,
  getMegaMekRearStatusColor,
  lightenColor,
  SELECTED_COLOR,
  MEGAMEK_COLORS,
} from '../shared/ArmorFills';
import { DiagramHeader } from '../shared/DiagramHeader';
import {
  useResolvedLayout,
  ResolvedPosition,
  getLayoutIdForConfig,
} from '../shared/layout';
import { getLocationLabel, hasTorsoRear } from '../shared/MechSilhouette';

interface MegaMekLocationProps {
  location: MechLocation;
  /** Resolved position from the layout engine */
  position: ResolvedPosition;
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  /** Mech configuration type for correct label lookup */
  configType?: MechConfigType;
}

function MegaMekLocation({
  location,
  position,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  configType = 'biped',
}: MegaMekLocationProps): React.ReactElement {
  const label = getLocationLabel(location, configType);

  const showRear = hasTorsoRear(location);
  const isHead = location === MechLocation.HEAD;

  // Use position from layout engine
  const pos = position;

  // Use abbreviated labels for torso sections to fit in smaller space
  const frontLabel = showRear ? `${label}-F` : label;
  const rearLabel = 'R';

  const center = pos.center;

  const current = data?.current ?? 0;
  const maximum = data?.maximum ?? 1;
  const rear = data?.rear ?? 0;
  const rearMax = data?.rearMaximum ?? 1;

  // Status-based colors using MegaMek beige palette for record sheet style
  const frontBaseColor = isSelected
    ? SELECTED_COLOR
    : showRear
      ? getMegaMekFrontStatusColor(current, maximum)
      : getMegaMekStatusColor(current, maximum);
  const rearBaseColor = isSelected
    ? SELECTED_COLOR
    : getMegaMekRearStatusColor(rear, maximum);

  const fillColor = isHovered
    ? lightenColor(frontBaseColor, 0.1)
    : frontBaseColor;
  const shadowColor = MEGAMEK_COLORS.SHADOW;
  const outlineColor = isSelected ? SELECTED_COLOR : MEGAMEK_COLORS.OUTLINE;
  const outlineWidth = isSelected ? 2 : 1.2;

  // Split heights for front/rear display - 60/40 split for consistency
  const frontHeight = showRear ? pos.height * 0.6 : pos.height;
  const rearHeight = showRear ? pos.height * 0.4 : 0;
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

      {/* Front armor section labels and values - dark text for beige background */}
      <text
        x={center.x}
        y={isHead ? pos.y + 10 : showRear ? pos.y + 12 : pos.y + 14}
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: isHead ? '7px' : showRear ? '8px' : '10px',
          fill: '#4a3f2f',
          fontWeight: 600,
        }}
      >
        {frontLabel}
      </text>

      <text
        x={center.x}
        y={
          isHead
            ? pos.y + pos.height / 2 + 4
            : showRear
              ? pos.y + frontHeight / 2 + 8
              : pos.y + pos.height / 2 + 10
        }
        textAnchor="middle"
        className="pointer-events-none"
        style={{
          fontSize: isHead ? '12px' : pos.width < 40 ? '16px' : '20px',
          fill: '#1a1a1a',
          fontWeight: 700,
        }}
      >
        {current}
      </text>

      {/* Capacity text - hide for HEAD */}
      {!isHead && (
        <text
          x={center.x}
          y={
            showRear
              ? pos.y + frontHeight / 2 + 22
              : pos.y + pos.height / 2 + 24
          }
          textAnchor="middle"
          className="pointer-events-none"
          style={{ fontSize: '9px', fill: '#5c4f3d' }}
        >
          / {maximum}
        </text>
      )}

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

          {/* Rear label - dark text for beige background */}
          <text
            x={center.x}
            y={dividerY + 10}
            textAnchor="middle"
            className="pointer-events-none"
            style={{
              fontSize: '8px',
              fill: '#4a3f2f',
              fontWeight: 600,
            }}
          >
            {rearLabel}
          </text>

          {/* Rear armor value - dark text for beige background */}
          <text
            x={center.x}
            y={dividerY + rearHeight / 2 + 8}
            textAnchor="middle"
            className="pointer-events-none"
            style={{
              fontSize: '16px',
              fill: '#1a1a1a',
              fontWeight: 700,
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

export function MegaMekDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: MegaMekDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );

  // Get layout ID based on mech configuration type
  const layoutId = getLayoutIdForConfig(mechConfigType, 'megamek');

  // Use the layout engine to get resolved positions
  const { getPosition, viewBox, bounds } = useResolvedLayout(layoutId);

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  // Get locations based on mech configuration type
  const locations = getLocationsForConfig(mechConfigType);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
    >
      <DiagramHeader title="Armor Allocation" />

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="mx-auto w-full max-w-[280px]"
          style={{ height: 'auto' }}
        >
          <defs>
            {/* Grid pattern for background */}
            <pattern
              id="megamek-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
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
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
            fill="url(#megamek-grid)"
          />

          {/* Render all locations using layout engine positions */}
          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;

            return (
              <MegaMekLocation
                key={loc}
                location={loc}
                position={position}
                data={getArmorData(loc)}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                onClick={() => onLocationClick(loc)}
                onHover={(h) => setHoveredLocation(h ? loc : null)}
                configType={mechConfigType}
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
