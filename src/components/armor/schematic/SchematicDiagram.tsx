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
}: Omit<ArmorDiagramBaseProps, 'unallocatedPoints' | 'onAutoAllocate'>): React.ReactElement {
  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
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
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-theme-primary">Armor Allocation</h3>
      </div>

      {/* Anatomically Correct Grid Layout */}
      <div
        className="hidden lg:grid gap-2"
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
        <div style={{ gridArea: 'head' }}>{renderLocation(MechLocation.HEAD)}</div>
        <div style={{ gridArea: 'ct' }}>{renderLocation(MechLocation.CENTER_TORSO)}</div>
        <div style={{ gridArea: 'lt' }}>{renderLocation(MechLocation.LEFT_TORSO)}</div>
        <div style={{ gridArea: 'rt' }}>{renderLocation(MechLocation.RIGHT_TORSO)}</div>
        <div style={{ gridArea: 'la' }}>{renderLocation(MechLocation.LEFT_ARM)}</div>
        <div style={{ gridArea: 'ra' }}>{renderLocation(MechLocation.RIGHT_ARM)}</div>
        <div style={{ gridArea: 'll' }}>{renderLocation(MechLocation.LEFT_LEG)}</div>
        <div style={{ gridArea: 'rl' }}>{renderLocation(MechLocation.RIGHT_LEG)}</div>
      </div>

      {/* Mobile Stacked Layout */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Head */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Head</h4>
          {renderLocation(MechLocation.HEAD)}
        </div>

        {/* Torso */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Torso</h4>
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
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Arms</h4>
          <div className="flex gap-2">
            {renderLocation(MechLocation.LEFT_ARM)}
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
        </div>

        {/* Legs */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Legs</h4>
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
