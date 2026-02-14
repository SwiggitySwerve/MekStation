/**
 * Armor Diagram Component
 *
 * SVG-based interactive armor visualization for BattleMechs.
 * Supports two display modes: Schematic (CSS grid) and Silhouette (SVG).
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { SchematicDiagram } from '@/components/armor/schematic';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';

import { ArmorLegend } from './ArmorLegend';
import { ArmorLocation } from './ArmorLocation';

export interface ArmorDiagramProps {
  /** Armor allocation for all locations */
  armorData: LocationArmorData[];
  /** Currently selected location */
  selectedLocation: MechLocation | null;
  /** Unallocated armor points */
  unallocatedPoints: number;
  /** Called when a location is clicked */
  onLocationClick: (location: MechLocation) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Armor diagram with mode switching support.
 * Renders either Schematic (CSS grid) or Silhouette (SVG) based on settings.
 */
export function ArmorDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
}: ArmorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );
  const { armorDiagramMode } = useAppSettingsStore();

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  // Schematic mode: Use CSS grid-based diagram
  if (armorDiagramMode === 'schematic') {
    return (
      <SchematicDiagram
        armorData={armorData}
        selectedLocation={selectedLocation}
        onLocationClick={onLocationClick}
        className={className}
      />
    );
  }

  // Silhouette mode: Use SVG-based diagram
  return (
    <div
      className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-text-theme-primary text-lg font-semibold">
          Armor Allocation
        </h3>
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg
          viewBox="0 0 300 400"
          className="mx-auto w-full max-w-[300px]"
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.CENTER_TORSO : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.LEFT_TORSO : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.RIGHT_TORSO : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.LEFT_ARM : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.RIGHT_ARM : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.LEFT_LEG : null)
            }
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
            onHover={(h) =>
              setHoveredLocation(h ? MechLocation.RIGHT_LEG : null)
            }
            locationType="limb"
          />
        </svg>
      </div>

      {/* Legend */}
      <ArmorLegend className="mt-4" />

      {/* Instructions */}
      <p className="text-text-theme-secondary mt-2 text-center text-xs">
        Click a location to edit armor values
      </p>
    </div>
  );
}
