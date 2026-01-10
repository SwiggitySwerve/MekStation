/**
 * Neon Operator Armor Diagram
 *
 * Design Philosophy: Sci-fi aesthetic and visual impact
 * - Wireframe outline silhouette
 * - Glow/neon fills with glowing edges
 * - Progress ring around numbers
 * - Color-only capacity indication
 * - Toggle switch for front/rear
 * - Glow pulse interaction
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from '../ArmorDiagram';
import {
  REALISTIC_SILHOUETTE,
  LOCATION_LABELS,
  getLocationCenter,
  hasTorsoRear,
} from '../shared/MechSilhouette';
import {
  GradientDefs,
  getArmorStatusColor,
  getTorsoStatusColor,
  lightenColor,
  SELECTED_COLOR,
} from '../shared/ArmorFills';
import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';

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
  data?: LocationArmorData;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  showRear?: boolean;
}

function NeonLocation({
  location,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  showRear = false,
}: NeonLocationProps): React.ReactElement {
  const pos = REALISTIC_SILHOUETTE.locations[location];
  const label = LOCATION_LABELS[location];
  const center = getLocationCenter(pos);
  const hasTorso = hasTorsoRear(location);

  const current = showRear ? (data?.rear ?? 0) : (data?.current ?? 0);
  const maximum = showRear ? (data?.rearMaximum ?? 1) : (data?.maximum ?? 1);
  const percentage = maximum > 0 ? (current / maximum) * 100 : 0;

  // Calculate colors - for torso locations, use combined front+rear for status
  const baseColor = isSelected
    ? SELECTED_COLOR
    : hasTorso
      ? getTorsoStatusColor(data?.current ?? 0, data?.maximum ?? 1, data?.rear ?? 0)
      : getArmorStatusColor(current, maximum);
  const glowColor = isHovered ? lightenColor(baseColor, 0.3) : baseColor;
  const fillOpacity = isHovered ? 0.4 : 0.25;

  // Ring size based on location
  const ringRadius = Math.min(pos.width, pos.height) * 0.35;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} ${showRear ? 'rear ' : ''}armor: ${current} of ${maximum}`}
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

      {/* Progress ring */}
      <ProgressRing
        cx={center.x}
        cy={center.y}
        radius={ringRadius}
        progress={percentage}
        color={glowColor}
        strokeWidth={isHovered ? 4 : 3}
      />

      {/* Armor value */}
      <text
        x={center.x}
        y={center.y + 5}
        textAnchor="middle"
        className="fill-white font-bold pointer-events-none"
        style={{
          fontSize: pos.width < 40 ? '12px' : '16px',
          textShadow: `0 0 10px ${glowColor}`,
        }}
      >
        {current}
      </text>

      {/* Location label */}
      <text
        x={center.x}
        y={pos.y + 12}
        textAnchor="middle"
        className="fill-white/70 font-medium pointer-events-none"
        style={{
          fontSize: '8px',
          textShadow: `0 0 5px ${glowColor}`,
        }}
      >
        {showRear ? `${label}R` : label}
      </text>

      {/* Has rear indicator dot */}
      {hasTorso && !showRear && (
        <circle
          cx={pos.x + pos.width - 8}
          cy={pos.y + 8}
          r={3}
          fill={getArmorStatusColor(data?.rear ?? 0, data?.rearMaximum ?? 1)}
          style={{ filter: 'url(#armor-glow)' }}
        />
      )}
    </g>
  );
}

export interface NeonOperatorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

export function NeonOperatorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: NeonOperatorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);
  const [showRearView, setShowRearView] = useState(false);

  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  // Front view shows all locations
  const frontLocations: MechLocation[] = [
    MechLocation.HEAD,
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
  ];

  // Rear view only shows torso locations
  const rearLocations: MechLocation[] = [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ];

  const currentLocations = showRearView ? rearLocations : frontLocations;

  return (
    <div className={`bg-slate-900 rounded-lg border border-cyan-900/50 p-4 ${className}`}>
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
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded border transition-all ${
              isOverAllocated
                ? 'border-red-500 text-red-400 hover:bg-red-500/20'
                : 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/20'
            }`}
            style={{
              boxShadow: isOverAllocated
                ? '0 0 10px rgba(239, 68, 68, 0.3)'
                : '0 0 10px rgba(34, 211, 238, 0.3)',
            }}
          >
            AUTO [{unallocatedPoints}]
          </button>
        )}
      </div>

      {/* Front/Rear Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded border border-cyan-800 overflow-hidden">
          <button
            onClick={() => setShowRearView(false)}
            className={`px-4 py-1.5 text-sm font-medium transition-all ${
              !showRearView
                ? 'bg-cyan-500/30 text-cyan-300'
                : 'text-cyan-600 hover:bg-cyan-500/10'
            }`}
            style={{
              textShadow: !showRearView ? '0 0 10px rgba(34, 211, 238, 0.5)' : undefined,
            }}
          >
            FRONT
          </button>
          <button
            onClick={() => setShowRearView(true)}
            className={`px-4 py-1.5 text-sm font-medium transition-all ${
              showRearView
                ? 'bg-cyan-500/30 text-cyan-300'
                : 'text-cyan-600 hover:bg-cyan-500/10'
            }`}
            style={{
              textShadow: showRearView ? '0 0 10px rgba(34, 211, 238, 0.5)' : undefined,
            }}
          >
            REAR
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox={REALISTIC_SILHOUETTE.viewBox}
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {/* Scanline overlay */}
          <rect
            x="0"
            y="0"
            width="300"
            height="400"
            fill="url(#armor-scanlines)"
            opacity="0.3"
          />

          {/* Wireframe outline */}
          {REALISTIC_SILHOUETTE.outlinePath && (
            <path
              d={REALISTIC_SILHOUETTE.outlinePath}
              fill="none"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          )}

          {/* Render locations */}
          {currentLocations.map((loc) => (
            <NeonLocation
              key={`${loc}-${showRearView ? 'rear' : 'front'}`}
              location={loc}
              data={getArmorData(loc)}
              isSelected={selectedLocation === loc}
              isHovered={hoveredLocation === loc}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              showRear={showRearView && hasTorsoRear(loc)}
            />
          ))}

          {/* Targeting reticle on hovered */}
          {hoveredLocation && (
            <g className="pointer-events-none">
              <circle
                cx={getLocationCenter(REALISTIC_SILHOUETTE.locations[hoveredLocation]).x}
                cy={getLocationCenter(REALISTIC_SILHOUETTE.locations[hoveredLocation]).y}
                r={40}
                fill="none"
                stroke="rgba(34, 211, 238, 0.3)"
                strokeWidth="1"
                strokeDasharray="8 4"
                className="animate-spin"
                style={{ animationDuration: '8s' }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Status bar */}
      <div className="flex justify-center items-center gap-2 mt-4 text-xs text-cyan-500/70">
        <span>SYS: ONLINE</span>
        <span>|</span>
        <span>VIEW: {showRearView ? 'REAR' : 'FRONT'}</span>
        <span>|</span>
        <span className={unallocatedPoints < 0 ? 'text-red-400' : ''}>
          UNALLOC: {unallocatedPoints}
        </span>
      </div>

      {/* Instructions */}
      <p className="text-xs text-cyan-600/50 text-center mt-2">
        SELECT TARGET LOCATION
      </p>
    </div>
  );
}
