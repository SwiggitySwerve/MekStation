/**
 * Armor Location Component
 * 
 * Individual clickable location in the armor diagram.
 * 
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from './ArmorDiagram';

interface ArmorLocationProps {
  /** Mech location */
  location: MechLocation;
  /** SVG x position */
  x: number;
  /** SVG y position */
  y: number;
  /** SVG width */
  width: number;
  /** SVG height */
  height: number;
  /** Armor data for this location */
  data?: LocationArmorData;
  /** Is this location selected */
  isSelected: boolean;
  /** Is this location hovered */
  isHovered: boolean;
  /** Click handler */
  onClick: () => void;
  /** Hover handler */
  onHover: (isHovered: boolean) => void;
  /** Location type for coloring */
  locationType: 'head' | 'torso' | 'limb';
  /** Show rear armor section */
  showRear?: boolean;
}

/**
 * Get fill color for a location based on state
 */
function getLocationFill(
  locationType: 'head' | 'torso' | 'limb' | 'rear',
  isSelected: boolean,
  isHovered: boolean
): string {
  if (isSelected) {
    return '#2563eb'; // blue-600
  }
  if (isHovered) {
    if (locationType === 'head') return '#22c55e'; // green-500
    if (locationType === 'rear') return '#92400e'; // amber-800 lighter
    return '#f59e0b'; // amber-500
  }
  if (locationType === 'head') return '#16a34a'; // green-600
  if (locationType === 'rear') return '#92400e'; // amber-800
  return '#d97706'; // amber-600
}

/**
 * Get short location label
 */
function getLocationLabel(location: MechLocation): string {
  switch (location) {
    case MechLocation.HEAD: return 'HD';
    case MechLocation.CENTER_TORSO: return 'CT';
    case MechLocation.LEFT_TORSO: return 'LT';
    case MechLocation.RIGHT_TORSO: return 'RT';
    case MechLocation.LEFT_ARM: return 'LA';
    case MechLocation.RIGHT_ARM: return 'RA';
    case MechLocation.LEFT_LEG: return 'LL';
    case MechLocation.RIGHT_LEG: return 'RL';
    default: return '';
  }
}

/**
 * Individual armor location in the diagram
 */
export function ArmorLocation({
  location,
  x,
  y,
  width,
  height,
  data,
  isSelected,
  isHovered,
  onClick,
  onHover,
  locationType,
  showRear = false,
}: ArmorLocationProps): React.ReactElement {
  const label = getLocationLabel(location);
  const mainFill = getLocationFill(locationType, isSelected, isHovered);
  const rearFill = getLocationFill('rear', isSelected, isHovered);
  
  const mainHeight = showRear ? height * 0.7 : height;
  const rearHeight = showRear ? height * 0.3 : 0;
  const rearY = y + mainHeight;
  
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${data?.current ?? 0} points${showRear ? `, rear: ${data?.rear ?? 0} points` : ''}`}
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
      {/* Main section */}
      <rect
        x={x}
        y={y}
        width={width}
        height={mainHeight}
        rx={4}
        fill={mainFill}
        stroke={isSelected ? '#60a5fa' : '#475569'}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-colors"
      />
      
      {/* Main armor value */}
      <text
        x={x + width / 2}
        y={y + mainHeight / 2 + 4}
        textAnchor="middle"
        className="fill-white text-sm font-bold"
        style={{ fontSize: width < 40 ? '10px' : '12px' }}
      >
        {data?.current ?? 0}
      </text>
      
      {/* Location label */}
      <text
        x={x + width / 2}
        y={y + 12}
        textAnchor="middle"
        className="fill-white/70 font-medium"
        style={{ fontSize: '8px' }}
      >
        {label}
      </text>
      
      {/* Rear section (for torso locations) */}
      {showRear && (
        <>
          <rect
            x={x}
            y={rearY}
            width={width}
            height={rearHeight}
            rx={4}
            fill={rearFill}
            stroke={isSelected ? '#60a5fa' : '#475569'}
            strokeWidth={isSelected ? 2 : 1}
            className="transition-colors"
          />
          
          {/* Rear armor value */}
          <text
            x={x + width / 2}
            y={rearY + rearHeight / 2 + 4}
            textAnchor="middle"
            className="fill-white text-xs font-bold"
            style={{ fontSize: '10px' }}
          >
            {data?.rear ?? 0}
          </text>
          
          {/* Rear label */}
          <text
            x={x + width / 2}
            y={rearY + 10}
            textAnchor="middle"
            className="fill-white/70"
            style={{ fontSize: '6px' }}
          >
            R
          </text>
        </>
      )}
    </g>
  );
}

