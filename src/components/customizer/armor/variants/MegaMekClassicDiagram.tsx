/**
 * MegaMek Classic Armor Diagram
 *
 * Design Philosophy: Authentic MegaMekLab visual parity
 * - Dynamically calculates pip positions similar to MegaMekLab's ArmorPipLayout
 * - Renders pip circles in a grid pattern within each location bounds
 * - Interactive click targets overlay the pip graphics
 * - Supports all mech configurations via LocationBounds
 */

import React, { useState, useMemo } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import { DiagramHeader } from '../shared/DiagramHeader';
import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';
import {
  LocationBounds,
  getLocationBoundsForConfiguration,
} from '../shared/LocationBounds';
import { MechConfiguration } from '@/services/assets/MmDataAssetService';

/** Default pip size (radius) */
const DEFAULT_PIP_RADIUS = 3;
/** Pip spacing multiplier */
const PIP_SPACING = 2.4;

interface PipGridProps {
  count: number;
  bounds: LocationBounds;
  isRear?: boolean;
}

/**
 * Dynamically generates pip circles within the given bounds
 * Similar to MegaMekLab's ArmorPipLayout algorithm
 */
function PipGrid({ count, bounds, isRear = false }: PipGridProps): React.ReactElement | null {
  const pipPositions = useMemo(() => {
    if (count <= 0) return [];

    const positions: { x: number; y: number }[] = [];
    const pipRadius = DEFAULT_PIP_RADIUS;
    const spacing = pipRadius * PIP_SPACING;

    // Calculate how many pips fit per row
    const maxCols = Math.max(1, Math.floor((bounds.width - spacing) / spacing));
    const nRows = Math.max(1, Math.ceil(count / maxCols));
    
    // Adjust columns to balance the layout
    const nCols = Math.max(1, Math.ceil(count / nRows));

    // Calculate actual spacing to center the pips
    const totalWidth = (nCols - 1) * spacing;
    const totalHeight = (nRows - 1) * spacing;
    const startX = bounds.x + (bounds.width - totalWidth) / 2;
    const startY = bounds.y + (bounds.height - totalHeight) / 2;

    let remaining = count;
    for (let row = 0; row < nRows && remaining > 0; row++) {
      const pipsInRow = Math.min(nCols, remaining);
      const rowOffset = (nCols - pipsInRow) * spacing / 2; // Center partial rows
      
      for (let col = 0; col < pipsInRow; col++) {
        positions.push({
          x: startX + col * spacing + rowOffset,
          y: startY + row * spacing,
        });
        remaining--;
      }
    }

    return positions;
  }, [count, bounds]);

  if (pipPositions.length === 0) return null;

  const pipColor = isRear ? '#92400e' : '#334155'; // amber-800 for rear, slate-700 for front

  return (
    <g className="pip-grid pointer-events-none">
      {pipPositions.map((pos, idx) => (
        <circle
          key={idx}
          cx={pos.x}
          cy={pos.y}
          r={DEFAULT_PIP_RADIUS}
          fill="white"
          stroke={pipColor}
          strokeWidth={0.8}
        />
      ))}
    </g>
  );
}

interface ClassicLocationProps {
  location: MechLocation;
  data?: LocationArmorData;
  bounds: LocationBounds;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

/**
 * Interactive location overlay with armor value display
 */
function ClassicLocation({
  location,
  data,
  bounds,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: ClassicLocationProps): React.ReactElement {
  const current = data?.current ?? 0;
  const maximum = data?.maximum ?? 1;
  const rear = data?.rear;
  const rearMax = data?.rearMaximum;
  const showRear = rear !== undefined && rearMax !== undefined;

  // Calculate percentage for color
  const percentage = maximum > 0 ? current / maximum : 0;
  const getStatusColor = (pct: number): string => {
    if (pct >= 0.8) return 'rgba(34, 197, 94, 0.3)'; // Green
    if (pct >= 0.5) return 'rgba(234, 179, 8, 0.3)'; // Yellow
    if (pct >= 0.25) return 'rgba(249, 115, 22, 0.3)'; // Orange
    return 'rgba(239, 68, 68, 0.3)'; // Red
  };

  const fillColor = isSelected
    ? 'rgba(59, 130, 246, 0.4)'
    : isHovered
      ? 'rgba(100, 116, 139, 0.4)'
      : getStatusColor(percentage);

  const strokeColor = isSelected ? '#3b82f6' : isHovered ? '#64748b' : 'transparent';
  const strokeWidth = isSelected ? 2 : 1;

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
      {/* Click target area */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={4}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="transition-all duration-150"
      />

      {/* Armor value badge */}
      <g transform={`translate(${bounds.x + bounds.width / 2}, ${bounds.y + bounds.height / 2})`}>
        {/* Value background */}
        <rect
          x={-18}
          y={-12}
          width={36}
          height={24}
          rx={4}
          fill="rgba(0, 0, 0, 0.7)"
          className="pointer-events-none"
        />
        {/* Current value */}
        <text
          x={0}
          y={5}
          textAnchor="middle"
          className="fill-white font-bold pointer-events-none"
          style={{ fontSize: '14px' }}
        >
          {current}
        </text>
      </g>

      {/* Rear armor indicator for torso locations */}
      {showRear && (
        <g transform={`translate(${bounds.x + bounds.width / 2}, ${bounds.y + bounds.height - 8})`}>
          <rect
            x={-14}
            y={-8}
            width={28}
            height={16}
            rx={3}
            fill="rgba(0, 0, 0, 0.6)"
            className="pointer-events-none"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="fill-amber-400 font-medium pointer-events-none"
            style={{ fontSize: '10px' }}
          >
            R:{rear}
          </text>
        </g>
      )}
    </g>
  );
}

export interface MegaMekClassicDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  configuration?: MechConfiguration;
  className?: string;
}

/**
 * Get locations list for a configuration
 */
function getLocationsForConfig(config: MechConfiguration): MechLocation[] {
  const torsoLocations = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ];

  switch (config) {
    case MechConfiguration.QUAD:
    case MechConfiguration.QUADVEE:
      return [
        ...torsoLocations,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case MechConfiguration.TRIPOD:
      return [
        ...torsoLocations,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case MechConfiguration.LAM:
    case MechConfiguration.BIPED:
    default:
      return [
        ...torsoLocations,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}


/**
 * Get the subtitle based on configuration
 */
function getConfigSubtitle(config: MechConfiguration): string {
  switch (config) {
    case MechConfiguration.QUAD:
      return 'Quad Configuration';
    case MechConfiguration.TRIPOD:
      return 'Tripod Configuration';
    case MechConfiguration.LAM:
      return 'LAM Configuration';
    case MechConfiguration.QUADVEE:
      return 'QuadVee Configuration';
    default:
      return 'MegaMek Classic';
  }
}

export function MegaMekClassicDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  configuration = MechConfiguration.BIPED,
  className = '',
}: MegaMekClassicDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  // Get locations for this configuration
  const locations: MechLocation[] = useMemo(() => 
    getLocationsForConfig(configuration), 
    [configuration]
  );

  // Get bounds for this configuration
  const locationBounds = useMemo(() => 
    getLocationBoundsForConfiguration(configuration),
    [configuration]
  );

  // Calculate viewBox dimensions from bounds
  const viewBox = useMemo(() => {
    const allBounds = Object.values(locationBounds);
    const minX = Math.min(...allBounds.map(b => b.x)) - 20;
    const minY = Math.min(...allBounds.map(b => b.y)) - 20;
    const maxX = Math.max(...allBounds.map(b => b.x + b.width)) + 20;
    const maxY = Math.max(...allBounds.map(b => b.y + b.height)) + 20;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [locationBounds]);

  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      <DiagramHeader title="Armor Allocation" subtitle={getConfigSubtitle(configuration)} />

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={viewBox}
          className="w-full max-w-[320px] mx-auto"
          style={{ height: 'auto', minHeight: '360px' }}
        >
          <defs>
            {/* Grid pattern for background */}
            <pattern id="mm-classic-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>

          {/* Background */}
          <rect
            x="120"
            y="60"
            width="380"
            height="300"
            fill="url(#mm-classic-grid)"
          />

          {/* Mech silhouette outline (simplified) */}
          <path
            d="M306 85 L306 95 M275 130 L337 130 M245 180 L367 180 M255 320 L255 335 M357 320 L357 335"
            fill="none"
            stroke="rgba(100, 116, 139, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 2"
            className="pointer-events-none"
          />

          {/* Render pips for each location */}
          {locations.map((loc) => {
            const data = getArmorData(loc);
            const bounds = locationBounds[loc];
            if (!bounds) return null;

            return (
              <PipGrid
                key={`pips-${loc}`}
                count={data?.current ?? 0}
                bounds={bounds}
              />
            );
          })}

          {/* Render rear pips for torso locations */}
          {[MechLocation.CENTER_TORSO, MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO].map((loc) => {
            const data = getArmorData(loc);
            const bounds = locationBounds[loc];
            if (!bounds || !data?.rear) return null;

            // Rear armor pips rendered below the main area
            const rearBounds = {
              ...bounds,
              y: bounds.y + bounds.height - 20,
              height: 18,
            };

            return (
              <PipGrid
                key={`pips-rear-${loc}`}
                count={data.rear}
                bounds={rearBounds}
                isRear={true}
              />
            );
          })}

          {/* Interactive overlays */}
          {locations.map((loc) => {
            const bounds = locationBounds[loc];
            if (!bounds) return null;

            return (
              <ClassicLocation
                key={`loc-${loc}`}
                location={loc}
                data={getArmorData(loc)}
                bounds={bounds}
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
