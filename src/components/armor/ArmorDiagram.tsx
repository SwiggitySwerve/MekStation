import React, { useState } from 'react';
import { ArmorLocation } from './ArmorLocation';
import { MechLocation } from '../../types/construction/CriticalSlotAllocation';

/**
 * Armor values per location for front, rear, and max armor
 * Uses MechLocation enum from base types for consistency
 */
export interface ArmorData {
  front: Partial<Record<MechLocation, number>>;
  rear: Partial<Record<MechLocation, number>>;
  max: Partial<Record<MechLocation, number>>;
}

export type ArmorAllocationType = 'even' | 'front-weighted' | 'rear-weighted';

export interface ArmorDiagramProps {
  armor: ArmorData;
  onArmorChange: (location: MechLocation, value: number, facing: 'front' | 'rear') => void;
  onAutoAllocate?: (type: ArmorAllocationType) => void;
  className?: string;
}

/**
 * Locations grouped by body section for mobile display
 */
const LOCATION_GROUPS = {
  torso: [MechLocation.CENTER_TORSO, MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
  arms: [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM],
  legs: [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG],
} as const;

export function ArmorDiagram({ armor, onArmorChange, onAutoAllocate, className = '' }: ArmorDiagramProps): React.ReactElement {
  const [facing, setFacing] = useState<'front' | 'rear'>('front');
  const [allocationType, setAllocationType] = useState<ArmorAllocationType>('even');

  const handleArmorChange = (location: MechLocation, value: number) => {
    onArmorChange(location, value, facing);
  };

  const handleAutoAllocate = (type: ArmorAllocationType) => {
    setAllocationType(type);
    onAutoAllocate?.(type);
  };

  return (
    <div className={`armor-diagram ${className}`.trim()}>
      {/* Front/Rear Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setFacing('front')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              facing === 'front'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={facing === 'front'}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setFacing('rear')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              facing === 'rear'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={facing === 'rear'}
          >
            Rear
          </button>
        </div>
      </div>

      {/* Auto-Allocate Dropdown */}
      {onAutoAllocate && (
        <div className="mb-4">
          <label htmlFor="auto-allocate-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Auto-Allocate Armor
          </label>
          <div className="flex gap-2">
            <select
              id="auto-allocate-select"
              value={allocationType}
              onChange={(e) => setAllocationType(e.target.value as ArmorAllocationType)}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm min-h-[44px]"
            >
              <option value="even">Even Distribution</option>
              <option value="front-weighted">Front-Weighted</option>
              <option value="rear-weighted">Rear-Weighted</option>
            </select>
            <button
              type="button"
              onClick={() => handleAutoAllocate(allocationType)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px]"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Desktop Silhouette Layout (CSS Grid) */}
      <div className="hidden lg:grid armor-diagram-grid" style={{
        display: 'grid',
        gridTemplateAreas: `
          ". head . . . ."
          "left-torso center-torso center-torso right-torso ."
          "left-arm center-torso center-torso right-arm ."
          "left-leg center-torso center-torso right-leg ."
        `,
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.5rem',
      }}>
        {/* Head */}
        <div style={{ gridArea: 'head' }}>
          <ArmorLocation
            location={MechLocation.HEAD}
            currentArmor={armor[facing][MechLocation.HEAD] ?? 0}
            maxArmor={armor.max[MechLocation.HEAD] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.HEAD, value)}
          />
        </div>

        {/* Center Torso */}
        <div style={{ gridArea: 'center-torso' }}>
          <ArmorLocation
            location={MechLocation.CENTER_TORSO}
            currentArmor={armor[facing][MechLocation.CENTER_TORSO] ?? 0}
            maxArmor={armor.max[MechLocation.CENTER_TORSO] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.CENTER_TORSO, value)}
          />
        </div>

        {/* Left Torso */}
        <div style={{ gridArea: 'left-torso' }}>
          <ArmorLocation
            location={MechLocation.LEFT_TORSO}
            currentArmor={armor[facing][MechLocation.LEFT_TORSO] ?? 0}
            maxArmor={armor.max[MechLocation.LEFT_TORSO] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.LEFT_TORSO, value)}
          />
        </div>

        {/* Right Torso */}
        <div style={{ gridArea: 'right-torso' }}>
          <ArmorLocation
            location={MechLocation.RIGHT_TORSO}
            currentArmor={armor[facing][MechLocation.RIGHT_TORSO] ?? 0}
            maxArmor={armor.max[MechLocation.RIGHT_TORSO] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.RIGHT_TORSO, value)}
          />
        </div>

        {/* Left Arm */}
        <div style={{ gridArea: 'left-arm' }}>
          <ArmorLocation
            location={MechLocation.LEFT_ARM}
            currentArmor={armor[facing][MechLocation.LEFT_ARM] ?? 0}
            maxArmor={armor.max[MechLocation.LEFT_ARM] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.LEFT_ARM, value)}
          />
        </div>

        {/* Right Arm */}
        <div style={{ gridArea: 'right-arm' }}>
          <ArmorLocation
            location={MechLocation.RIGHT_ARM}
            currentArmor={armor[facing][MechLocation.RIGHT_ARM] ?? 0}
            maxArmor={armor.max[MechLocation.RIGHT_ARM] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.RIGHT_ARM, value)}
          />
        </div>

        {/* Left Leg */}
        <div style={{ gridArea: 'left-leg' }}>
          <ArmorLocation
            location={MechLocation.LEFT_LEG}
            currentArmor={armor[facing][MechLocation.LEFT_LEG] ?? 0}
            maxArmor={armor.max[MechLocation.LEFT_LEG] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.LEFT_LEG, value)}
          />
        </div>

        {/* Right Leg */}
        <div style={{ gridArea: 'right-leg' }}>
          <ArmorLocation
            location={MechLocation.RIGHT_LEG}
            currentArmor={armor[facing][MechLocation.RIGHT_LEG] ?? 0}
            maxArmor={armor.max[MechLocation.RIGHT_LEG] ?? 0}
            onArmorChange={(value) => handleArmorChange(MechLocation.RIGHT_LEG, value)}
          />
        </div>
      </div>

      {/* Mobile Vertical Stack */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Head */}
        <ArmorLocation
          location={MechLocation.HEAD}
          currentArmor={armor[facing][MechLocation.HEAD] ?? 0}
          maxArmor={armor.max[MechLocation.HEAD] ?? 0}
          onArmorChange={(value) => handleArmorChange(MechLocation.HEAD, value)}
        />

        {/* Torso Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Torso</h4>
          {LOCATION_GROUPS.torso.map((location) => (
            <ArmorLocation
              key={location}
              location={location}
              currentArmor={armor[facing][location] ?? 0}
              maxArmor={armor.max[location] ?? 0}
              onArmorChange={(value) => handleArmorChange(location, value)}
            />
          ))}
        </div>

        {/* Arms Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Arms</h4>
          {LOCATION_GROUPS.arms.map((location) => (
            <ArmorLocation
              key={location}
              location={location}
              currentArmor={armor[facing][location] ?? 0}
              maxArmor={armor.max[location] ?? 0}
              onArmorChange={(value) => handleArmorChange(location, value)}
            />
          ))}
        </div>

        {/* Legs Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Legs</h4>
          {LOCATION_GROUPS.legs.map((location) => (
            <ArmorLocation
              key={location}
              location={location}
              currentArmor={armor[facing][location] ?? 0}
              maxArmor={armor.max[location] ?? 0}
              onArmorChange={(value) => handleArmorChange(location, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
