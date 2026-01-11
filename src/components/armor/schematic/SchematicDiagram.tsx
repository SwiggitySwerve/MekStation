import React from 'react';
import { MechLocation } from '@/types/construction';
import { ArmorDiagramBaseProps, LocationArmorData } from '../shared/types';
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
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: ArmorDiagramBaseProps): React.ReactElement {
  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

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
        <h3 className="text-lg font-semibold text-white">Armor Allocation</h3>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isOverAllocated
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            Auto Allocate ({unallocatedPoints} pts)
          </button>
        )}
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

      {/* Instructions */}
      <p className="text-xs text-text-theme-secondary text-center mt-2">
        Click a location to edit armor values
      </p>
    </div>
  );
}
