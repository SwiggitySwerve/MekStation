import type { ChangeEvent, CSSProperties, ReactElement } from 'react';

import type {
  ArmorAllocationType,
  ArmorData,
  ArmorFacing,
} from './ArmorDiagram.types';

import { MechLocation } from '../../types/construction/CriticalSlotAllocation';
import { ArmorLocation } from './ArmorLocation';

interface FacingToggleProps {
  facing: ArmorFacing;
  onFacingChange: (facing: ArmorFacing) => void;
}

interface AutoAllocateControlProps {
  allocationType: ArmorAllocationType;
  onAllocationTypeChange: (type: ArmorAllocationType) => void;
  onApply: () => void;
}

interface ArmorLocationPanelProps {
  armor: ArmorData;
  facing: ArmorFacing;
  location: MechLocation;
  onArmorChange: (location: MechLocation, value: number) => void;
}

interface ArmorLayoutProps {
  armor: ArmorData;
  facing: ArmorFacing;
  onArmorChange: (location: MechLocation, value: number) => void;
}

interface MobileArmorGroupProps extends ArmorLayoutProps {
  label: string;
  locations: readonly MechLocation[];
}

const FACING_OPTIONS: readonly ArmorFacing[] = ['front', 'rear'];

const ALLOCATION_OPTIONS: readonly {
  value: ArmorAllocationType;
  label: string;
}[] = [
  { value: 'even', label: 'Even Distribution' },
  { value: 'front-weighted', label: 'Front-Weighted' },
  { value: 'rear-weighted', label: 'Rear-Weighted' },
];

const DESKTOP_LOCATIONS: readonly {
  location: MechLocation;
  gridArea: string;
}[] = [
  { location: MechLocation.HEAD, gridArea: 'head' },
  { location: MechLocation.CENTER_TORSO, gridArea: 'center-torso' },
  { location: MechLocation.LEFT_TORSO, gridArea: 'left-torso' },
  { location: MechLocation.RIGHT_TORSO, gridArea: 'right-torso' },
  { location: MechLocation.LEFT_ARM, gridArea: 'left-arm' },
  { location: MechLocation.RIGHT_ARM, gridArea: 'right-arm' },
  { location: MechLocation.LEFT_LEG, gridArea: 'left-leg' },
  { location: MechLocation.RIGHT_LEG, gridArea: 'right-leg' },
];

const MOBILE_LOCATION_GROUPS: readonly {
  label: string;
  locations: readonly MechLocation[];
}[] = [
  {
    label: 'Torso',
    locations: [
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ],
  },
  {
    label: 'Arms',
    locations: [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM],
  },
  {
    label: 'Legs',
    locations: [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG],
  },
];

const DESKTOP_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateAreas: `
          ". head . . . ."
          "left-torso center-torso center-torso right-torso ."
          "left-arm center-torso center-torso right-arm ."
          "left-leg center-torso center-torso right-leg ."
        `,
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '0.5rem',
};

const FACING_BUTTON_BASE_CLASS =
  'min-h-[44px] min-w-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors';
const FACING_BUTTON_ACTIVE_CLASS =
  'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white';
const FACING_BUTTON_INACTIVE_CLASS =
  'text-gray-700 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-600';

function formatFacingLabel(facing: ArmorFacing): string {
  return facing === 'front' ? 'Front' : 'Rear';
}

function getFacingButtonClassName(isSelected: boolean): string {
  const stateClass = isSelected
    ? FACING_BUTTON_ACTIVE_CLASS
    : FACING_BUTTON_INACTIVE_CLASS;
  return `${FACING_BUTTON_BASE_CLASS} ${stateClass}`;
}

function getArmorValue(
  armor: ArmorData,
  facing: ArmorFacing,
  location: MechLocation,
): number {
  return armor[facing][location] ?? 0;
}

function getMaxArmorValue(armor: ArmorData, location: MechLocation): number {
  return armor.max[location] ?? 0;
}

export function FacingToggle({
  facing,
  onFacingChange,
}: FacingToggleProps): ReactElement {
  return (
    <div className="mb-4 flex justify-center">
      <div className="inline-flex rounded-lg bg-gray-200 p-1 dark:bg-gray-700">
        {FACING_OPTIONS.map((option) => {
          const isSelected = facing === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onFacingChange(option)}
              className={getFacingButtonClassName(isSelected)}
              aria-pressed={isSelected}
            >
              {formatFacingLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AutoAllocateControl({
  allocationType,
  onAllocationTypeChange,
  onApply,
}: AutoAllocateControlProps): ReactElement {
  const handleAllocationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onAllocationTypeChange(event.target.value as ArmorAllocationType);
  };

  return (
    <div className="mb-4">
      <label
        htmlFor="auto-allocate-select"
        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Auto-Allocate Armor
      </label>
      <div className="flex gap-2">
        <select
          id="auto-allocate-select"
          value={allocationType}
          onChange={handleAllocationChange}
          className="min-h-[44px] flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {ALLOCATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onApply}
          className="min-h-[44px] min-w-[44px] rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function ArmorLocationPanel({
  armor,
  facing,
  location,
  onArmorChange,
}: ArmorLocationPanelProps): ReactElement {
  return (
    <ArmorLocation
      location={location}
      currentArmor={getArmorValue(armor, facing, location)}
      maxArmor={getMaxArmorValue(armor, location)}
      onArmorChange={(value) => onArmorChange(location, value)}
    />
  );
}

export function DesktopArmorLayout({
  armor,
  facing,
  onArmorChange,
}: ArmorLayoutProps): ReactElement {
  return (
    <div
      className="armor-diagram-grid hidden lg:grid"
      style={DESKTOP_GRID_STYLE}
    >
      {DESKTOP_LOCATIONS.map(({ location, gridArea }) => (
        <div key={location} style={{ gridArea }}>
          <ArmorLocationPanel
            armor={armor}
            facing={facing}
            location={location}
            onArmorChange={onArmorChange}
          />
        </div>
      ))}
    </div>
  );
}

function MobileArmorGroup({
  label,
  locations,
  armor,
  facing,
  onArmorChange,
}: MobileArmorGroupProps): ReactElement {
  return (
    <div className="space-y-3">
      <h4 className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </h4>
      {locations.map((location) => (
        <ArmorLocationPanel
          key={location}
          armor={armor}
          facing={facing}
          location={location}
          onArmorChange={onArmorChange}
        />
      ))}
    </div>
  );
}

export function MobileArmorLayout({
  armor,
  facing,
  onArmorChange,
}: ArmorLayoutProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <ArmorLocationPanel
        armor={armor}
        facing={facing}
        location={MechLocation.HEAD}
        onArmorChange={onArmorChange}
      />

      {MOBILE_LOCATION_GROUPS.map((group) => (
        <MobileArmorGroup
          key={group.label}
          label={group.label}
          locations={group.locations}
          armor={armor}
          facing={facing}
          onArmorChange={onArmorChange}
        />
      ))}
    </div>
  );
}
