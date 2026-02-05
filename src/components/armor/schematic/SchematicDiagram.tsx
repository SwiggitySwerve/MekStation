import React from 'react';

import { MechLocation } from '@/types/construction';

import {
  ArmorDiagramBaseProps,
  LocationArmorData,
  ArmorStatusLegend,
  ArmorDiagramInstructions,
} from '../shared/types';
import { SchematicLocation } from './SchematicLocation';

/**
 * Schematic Armor Diagram
 *
 * Anatomically correct CSS grid layout showing mech body parts
 * in their proper positions with visual connectors.
 */
export function SchematicDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
}: Omit<
  ArmorDiagramBaseProps,
  'unallocatedPoints' | 'onAutoAllocate'
>): React.ReactElement {
  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const renderLocation = (location: MechLocation) => {
    const data = getArmorData(location);
    return (
      <SchematicLocation
        key={location}
        location={location}
        current={data?.current ?? 0}
        maximum={data?.maximum ?? 1}
        rear={data?.rear}
        rearMaximum={data?.rearMaximum}
        isSelected={selectedLocation === location}
        onClick={onLocationClick}
      />
    );
  };

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

      {/* Anatomically Correct Grid Layout */}
      <div
        className="hidden gap-2 lg:grid"
        style={{
          gridTemplateAreas: `
            ".    .    head   .    ."
            "la   lt   ct     rt   ra"
            ".    ll   .      rl   ."
          `,
          gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr',
          gridTemplateRows: 'auto auto auto',
        }}
      >
        <div style={{ gridArea: 'head' }}>
          {renderLocation(MechLocation.HEAD)}
        </div>
        <div style={{ gridArea: 'ct' }}>
          {renderLocation(MechLocation.CENTER_TORSO)}
        </div>
        <div style={{ gridArea: 'lt' }}>
          {renderLocation(MechLocation.LEFT_TORSO)}
        </div>
        <div style={{ gridArea: 'rt' }}>
          {renderLocation(MechLocation.RIGHT_TORSO)}
        </div>
        <div style={{ gridArea: 'la' }}>
          {renderLocation(MechLocation.LEFT_ARM)}
        </div>
        <div style={{ gridArea: 'ra' }}>
          {renderLocation(MechLocation.RIGHT_ARM)}
        </div>
        <div style={{ gridArea: 'll' }}>
          {renderLocation(MechLocation.LEFT_LEG)}
        </div>
        <div style={{ gridArea: 'rl' }}>
          {renderLocation(MechLocation.RIGHT_LEG)}
        </div>
      </div>

      {/* Mobile Stacked Layout */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Head */}
        <div>
          <h4 className="text-text-theme-secondary mb-1 px-1 text-xs font-medium">
            Head
          </h4>
          {renderLocation(MechLocation.HEAD)}
        </div>

        {/* Torso */}
        <div>
          <h4 className="text-text-theme-secondary mb-1 px-1 text-xs font-medium">
            Torso
          </h4>
          <div className="flex flex-col gap-2">
            {renderLocation(MechLocation.CENTER_TORSO)}
            <div className="flex gap-2">
              {renderLocation(MechLocation.LEFT_TORSO)}
              {renderLocation(MechLocation.RIGHT_TORSO)}
            </div>
          </div>
        </div>

        {/* Arms */}
        <div>
          <h4 className="text-text-theme-secondary mb-1 px-1 text-xs font-medium">
            Arms
          </h4>
          <div className="flex gap-2">
            {renderLocation(MechLocation.LEFT_ARM)}
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
        </div>

        {/* Legs */}
        <div>
          <h4 className="text-text-theme-secondary mb-1 px-1 text-xs font-medium">
            Legs
          </h4>
          <div className="flex gap-2">
            {renderLocation(MechLocation.LEFT_LEG)}
            {renderLocation(MechLocation.RIGHT_LEG)}
          </div>
        </div>
      </div>

      <ArmorStatusLegend />
      <ArmorDiagramInstructions />
    </div>
  );
}
