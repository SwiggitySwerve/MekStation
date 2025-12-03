/**
 * Armor Diagram Component
 * 
 * SVG-based interactive armor visualization for BattleMechs.
 * 
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useState } from 'react';
import { ArmorLocation } from './ArmorLocation';
import { ArmorLegend } from './ArmorLegend';
import { MechLocation } from '@/types/construction';

/**
 * Armor allocation data for a single location
 */
export interface LocationArmorData {
  readonly location: MechLocation;
  readonly current: number;
  readonly maximum: number;
  readonly rear?: number;
  readonly rearMaximum?: number;
}

interface ArmorDiagramProps {
  /** Armor allocation for all locations */
  armorData: LocationArmorData[];
  /** Currently selected location */
  selectedLocation: MechLocation | null;
  /** Unallocated armor points */
  unallocatedPoints: number;
  /** Called when a location is clicked */
  onLocationClick: (location: MechLocation) => void;
  /** Called when auto-allocate is clicked */
  onAutoAllocate?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SVG Mech armor diagram with interactive locations
 */
export function ArmorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: ArmorDiagramProps) {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(null);
  
  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };
  
  const isOverAllocated = unallocatedPoints < 0;
  
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Armor Allocation</h3>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isOverAllocated
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            Auto-Allocate ({unallocatedPoints} pts)
          </button>
        )}
      </div>
      
      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox="0 0 300 400"
          className="w-full max-w-[300px] mx-auto"
          style={{ height: 'auto' }}
        >
          {/* Head */}
          <ArmorLocation
            location={MechLocation.HEAD}
            x={120}
            y={10}
            width={60}
            height={50}
            data={getArmorData(MechLocation.HEAD)}
            isSelected={selectedLocation === MechLocation.HEAD}
            isHovered={hoveredLocation === MechLocation.HEAD}
            onClick={() => onLocationClick(MechLocation.HEAD)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.HEAD : null)}
            locationType="head"
          />
          
          {/* Center Torso */}
          <ArmorLocation
            location={MechLocation.CENTER_TORSO}
            x={105}
            y={65}
            width={90}
            height={100}
            data={getArmorData(MechLocation.CENTER_TORSO)}
            isSelected={selectedLocation === MechLocation.CENTER_TORSO}
            isHovered={hoveredLocation === MechLocation.CENTER_TORSO}
            onClick={() => onLocationClick(MechLocation.CENTER_TORSO)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.CENTER_TORSO : null)}
            locationType="torso"
            showRear
          />
          
          {/* Left Torso */}
          <ArmorLocation
            location={MechLocation.LEFT_TORSO}
            x={35}
            y={105}
            width={65}
            height={100}
            data={getArmorData(MechLocation.LEFT_TORSO)}
            isSelected={selectedLocation === MechLocation.LEFT_TORSO}
            isHovered={hoveredLocation === MechLocation.LEFT_TORSO}
            onClick={() => onLocationClick(MechLocation.LEFT_TORSO)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.LEFT_TORSO : null)}
            locationType="torso"
            showRear
          />
          
          {/* Right Torso */}
          <ArmorLocation
            location={MechLocation.RIGHT_TORSO}
            x={200}
            y={105}
            width={65}
            height={100}
            data={getArmorData(MechLocation.RIGHT_TORSO)}
            isSelected={selectedLocation === MechLocation.RIGHT_TORSO}
            isHovered={hoveredLocation === MechLocation.RIGHT_TORSO}
            onClick={() => onLocationClick(MechLocation.RIGHT_TORSO)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.RIGHT_TORSO : null)}
            locationType="torso"
            showRear
          />
          
          {/* Left Arm */}
          <ArmorLocation
            location={MechLocation.LEFT_ARM}
            x={5}
            y={115}
            width={25}
            height={120}
            data={getArmorData(MechLocation.LEFT_ARM)}
            isSelected={selectedLocation === MechLocation.LEFT_ARM}
            isHovered={hoveredLocation === MechLocation.LEFT_ARM}
            onClick={() => onLocationClick(MechLocation.LEFT_ARM)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.LEFT_ARM : null)}
            locationType="limb"
          />
          
          {/* Right Arm */}
          <ArmorLocation
            location={MechLocation.RIGHT_ARM}
            x={270}
            y={115}
            width={25}
            height={120}
            data={getArmorData(MechLocation.RIGHT_ARM)}
            isSelected={selectedLocation === MechLocation.RIGHT_ARM}
            isHovered={hoveredLocation === MechLocation.RIGHT_ARM}
            onClick={() => onLocationClick(MechLocation.RIGHT_ARM)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.RIGHT_ARM : null)}
            locationType="limb"
          />
          
          {/* Left Leg */}
          <ArmorLocation
            location={MechLocation.LEFT_LEG}
            x={55}
            y={210}
            width={45}
            height={130}
            data={getArmorData(MechLocation.LEFT_LEG)}
            isSelected={selectedLocation === MechLocation.LEFT_LEG}
            isHovered={hoveredLocation === MechLocation.LEFT_LEG}
            onClick={() => onLocationClick(MechLocation.LEFT_LEG)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.LEFT_LEG : null)}
            locationType="limb"
          />
          
          {/* Right Leg */}
          <ArmorLocation
            location={MechLocation.RIGHT_LEG}
            x={200}
            y={210}
            width={45}
            height={130}
            data={getArmorData(MechLocation.RIGHT_LEG)}
            isSelected={selectedLocation === MechLocation.RIGHT_LEG}
            isHovered={hoveredLocation === MechLocation.RIGHT_LEG}
            onClick={() => onLocationClick(MechLocation.RIGHT_LEG)}
            onHover={(h) => setHoveredLocation(h ? MechLocation.RIGHT_LEG : null)}
            locationType="limb"
          />
        </svg>
      </div>
      
      {/* Legend */}
      <ArmorLegend className="mt-4" />
      
      {/* Instructions */}
      <p className="text-xs text-slate-400 text-center mt-2">
        Click a location to edit armor values
      </p>
    </div>
  );
}

