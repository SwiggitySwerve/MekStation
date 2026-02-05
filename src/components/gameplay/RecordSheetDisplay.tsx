/**
 * Record Sheet Display Component
 * Shows unit status in traditional record sheet format.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useMemo } from 'react';

import {
  MAX_HEAT,
  getHeatColorClass,
  getActiveHeatEffects,
} from '@/constants/heat';
import { IUnitGameState, IWeaponStatus } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface RecordSheetDisplayProps {
  /** Unit name */
  unitName: string;
  /** Unit designation (e.g., "ATL-7K") */
  designation: string;
  /** Current unit state */
  state: IUnitGameState;
  /** Maximum armor values per location */
  maxArmor: Record<string, number>;
  /** Maximum structure values per location */
  maxStructure: Record<string, number>;
  /** Weapons on this unit */
  weapons: readonly IWeaponStatus[];
  /** Pilot name */
  pilotName: string;
  /** Gunnery skill */
  gunnery: number;
  /** Piloting skill */
  piloting: number;
  /** Heat sink count */
  heatSinks: number;
  /** Selected weapon IDs (for attack UI) */
  selectedWeaponIds?: readonly string[];
  /** Callback when weapon selection changes */
  onWeaponToggle?: (weaponId: string) => void;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Standard BattleMech locations in display order */
const LOCATION_ORDER = [
  'head',
  'center_torso',
  'left_torso',
  'right_torso',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
];

/** Location display names */
const LOCATION_NAMES: Record<string, string> = {
  head: 'Head',
  center_torso: 'Center Torso',
  left_torso: 'Left Torso',
  right_torso: 'Right Torso',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
};

/** Locations with rear armor */
const REAR_ARMOR_LOCATIONS = ['center_torso', 'left_torso', 'right_torso'];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get damage percentage for a location.
 * @internal Reserved for future damage visualization
 */
function _getDamagePercent(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((1 - current / max) * 100);
}

/**
 * Get status color based on remaining percentage.
 */
function getStatusColor(remaining: number, max: number): string {
  const percent = max > 0 ? (remaining / max) * 100 : 0;
  if (percent === 0) return 'text-text-theme-secondary';
  if (percent <= 25) return 'text-red-600';
  if (percent <= 50) return 'text-orange-500';
  if (percent <= 75) return 'text-yellow-600';
  return 'text-green-600';
}

// =============================================================================
// Sub-Components
// =============================================================================

interface LocationStatusRowProps {
  location: string;
  armor: number;
  maxArmor: number;
  structure: number;
  maxStructure: number;
  destroyed: boolean;
  rearArmor?: number;
  maxRearArmor?: number;
}

function LocationStatusRow({
  location,
  armor,
  maxArmor,
  structure,
  maxStructure,
  destroyed,
  rearArmor,
  maxRearArmor,
}: LocationStatusRowProps): React.ReactElement {
  const displayName = LOCATION_NAMES[location] || location;
  const armorColor = getStatusColor(armor, maxArmor);
  const structureColor = getStatusColor(structure, maxStructure);
  const rearArmorColor =
    rearArmor !== undefined && maxRearArmor !== undefined
      ? getStatusColor(rearArmor, maxRearArmor)
      : '';

  return (
    <div
      className={`px-3 py-2 md:flex md:items-center md:px-2 md:py-1 ${destroyed ? 'line-through opacity-50' : ''}`}
      data-testid={`location-row-${location}`}
    >
      {/* Location name - full width on mobile, fixed width on desktop */}
      <div className="mb-1 flex items-center justify-between md:mb-0 md:w-28">
        <span className="text-text-theme-primary text-base font-medium md:text-sm">
          {displayName}
        </span>
        {/* DESTROYED badge - only visible on mobile in header area */}
        {destroyed && (
          <span
            className="text-xs font-bold text-red-600 md:hidden"
            data-testid={`location-destroyed-${location}-mobile`}
          >
            DESTROYED
          </span>
        )}
      </div>

      {/* Stats grid - wraps on mobile, inline on desktop */}
      <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-4">
        {/* Front armor */}
        <div className="flex items-center gap-1">
          <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
            AR:
          </span>
          <span
            className={`font-mono text-base md:w-8 md:text-right md:text-sm ${armorColor}`}
            data-testid={`location-armor-${location}`}
          >
            {armor}/{maxArmor}
          </span>
        </div>
        {/* Rear armor (if applicable) */}
        {rearArmor !== undefined && maxRearArmor !== undefined ? (
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              RR:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${rearArmorColor}`}
              data-testid={`location-armor-${location}_rear`}
            >
              {rearArmor}/{maxRearArmor}
            </span>
          </div>
        ) : (
          /* Empty placeholder to maintain grid on locations without rear armor */
          <div className="md:hidden" />
        )}
        {/* Structure */}
        <div className="flex items-center gap-1">
          <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
            IS:
          </span>
          <span
            className={`font-mono text-base md:w-8 md:text-right md:text-sm ${structureColor}`}
            data-testid={`location-structure-${location}`}
          >
            {structure}/{maxStructure}
          </span>
        </div>
      </div>

      {/* DESTROYED badge - desktop only (at end of row) */}
      {destroyed && (
        <span
          className="ml-2 hidden text-xs font-bold text-red-600 md:inline"
          data-testid={`location-destroyed-${location}`}
        >
          DESTROYED
        </span>
      )}
    </div>
  );
}

interface WeaponRowProps {
  weapon: IWeaponStatus;
  isSelected: boolean;
  onToggle?: () => void;
}

function WeaponRow({
  weapon,
  isSelected,
  onToggle,
}: WeaponRowProps): React.ReactElement {
  const isAvailable = !weapon.destroyed;
  const rowClasses = weapon.destroyed
    ? 'opacity-50 line-through'
    : weapon.firedThisTurn
      ? 'bg-yellow-50'
      : '';

  return (
    <div
      className={`hover:bg-surface-deep px-3 py-3 md:flex md:items-center md:px-2 md:py-1 ${rowClasses}`}
      onClick={isAvailable && onToggle ? onToggle : undefined}
      style={{ cursor: isAvailable && onToggle ? 'pointer' : 'default' }}
      data-testid={`weapon-row-${weapon.id}`}
    >
      {/* Mobile: Card layout */}
      <div className="md:hidden">
        <div className="mb-2 flex items-center gap-3">
          {onToggle && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              disabled={!isAvailable}
              className="h-5 min-h-[44px] w-5 min-w-[44px] touch-manipulation"
              data-testid={`weapon-checkbox-${weapon.id}-mobile`}
            />
          )}
          <span
            className="flex-1 text-base font-medium"
            data-testid={`weapon-name-${weapon.id}`}
          >
            {weapon.name}
          </span>
          <span className="text-text-theme-secondary text-sm">
            {weapon.location}
          </span>
        </div>
        <div className="text-text-theme-secondary flex items-center gap-4 pl-8 text-sm">
          <span data-testid={`weapon-heat-${weapon.id}-mobile`}>
            {weapon.heat}H
          </span>
          <span data-testid={`weapon-damage-${weapon.id}-mobile`}>
            {weapon.damage}D
          </span>
          <span>
            S/M/L: {weapon.ranges.short}/{weapon.ranges.medium}/
            {weapon.ranges.long}
          </span>
          {weapon.ammoRemaining !== undefined && (
            <span data-testid={`weapon-ammo-${weapon.id}-mobile`}>
              {weapon.ammoRemaining} rds
            </span>
          )}
        </div>
      </div>

      {/* Desktop: Row layout */}
      <div className="hidden md:contents">
        {onToggle && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            disabled={!isAvailable}
            className="mr-2"
            data-testid={`weapon-checkbox-${weapon.id}`}
          />
        )}
        <span
          className="flex-1 text-sm"
          data-testid={`weapon-name-${weapon.id}-desktop`}
        >
          {weapon.name}
        </span>
        <span className="text-text-theme-secondary w-16 text-xs">
          {weapon.location}
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-heat-${weapon.id}`}
        >
          {weapon.heat}H
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-damage-${weapon.id}`}
        >
          {weapon.damage}D
        </span>
        <span className="text-text-theme-secondary w-20 text-xs">
          {weapon.ranges.short}/{weapon.ranges.medium}/{weapon.ranges.long}
        </span>
        {weapon.ammoRemaining !== undefined && (
          <span
            className="text-text-theme-secondary w-12 text-right text-xs"
            data-testid={`weapon-ammo-${weapon.id}`}
          >
            {weapon.ammoRemaining} rds
          </span>
        )}
      </div>
    </div>
  );
}

interface SimpleHeatDisplayProps {
  heat: number;
  heatSinks: number;
}

function SimpleHeatDisplay({
  heat,
  heatSinks,
}: SimpleHeatDisplayProps): React.ReactElement {
  const heatPercent = Math.min((heat / MAX_HEAT) * 100, 100);
  const effects = getActiveHeatEffects(heat);

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="heat-display">
      <div className="mb-2 flex items-center gap-4">
        <div className="flex-1">
          <div className="bg-surface-deep h-4 overflow-hidden rounded">
            <div
              className={`h-full ${getHeatColorClass(heat)} transition-all`}
              style={{ width: `${heatPercent}%` }}
              data-testid="heat-bar"
            />
          </div>
        </div>
        <div className="font-mono text-sm">
          <span className="font-bold" data-testid="heat-value">
            {heat}
          </span>
          <span className="text-text-theme-secondary">/{MAX_HEAT}</span>
        </div>
      </div>
      {effects.length > 0 && (
        <div className="text-xs text-red-600" data-testid="heat-effects">
          {effects.join(' • ')}
        </div>
      )}
      <div
        className="text-text-theme-secondary mt-1 text-xs"
        data-testid="heat-dissipation"
      >
        Dissipation: {heatSinks} heat/turn
      </div>
    </div>
  );
}

interface PilotStatusProps {
  name: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  conscious: boolean;
}

function PilotStatus({
  name,
  gunnery,
  piloting,
  wounds,
  conscious,
}: PilotStatusProps): React.ReactElement {
  const woundIndicators = [];
  for (let i = 0; i < 6; i++) {
    woundIndicators.push(
      <span
        key={i}
        className={`h-4 w-4 rounded-full border ${
          i < wounds
            ? 'border-red-600 bg-red-500'
            : 'bg-surface-raised border-border-theme'
        }`}
        data-testid={`pilot-wound-${i}`}
        data-filled={i < wounds}
      />,
    );
  }

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="pilot-status">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-text-theme-primary font-medium"
          data-testid="pilot-name"
        >
          {name}
        </span>
        {!conscious && (
          <span
            className="text-xs font-bold text-red-600"
            data-testid="pilot-unconscious"
          >
            UNCONSCIOUS
          </span>
        )}
      </div>
      <div className="text-text-theme-primary flex items-center gap-4 text-sm">
        <span data-testid="pilot-gunnery">
          Gunnery: <strong>{gunnery}</strong>
        </span>
        <span data-testid="pilot-piloting">
          Piloting: <strong>{piloting}</strong>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1" data-testid="pilot-wounds">
        <span className="text-text-theme-secondary mr-2 text-xs">Wounds:</span>
        {woundIndicators}
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Record sheet display showing full unit status.
 */
export function RecordSheetDisplay({
  unitName,
  designation,
  state,
  maxArmor,
  maxStructure,
  weapons,
  pilotName,
  gunnery,
  piloting,
  heatSinks,
  selectedWeaponIds = [],
  onWeaponToggle,
  className = '',
}: RecordSheetDisplayProps): React.ReactElement {
  // Build location statuses
  const locationStatuses = useMemo(() => {
    return LOCATION_ORDER.map((location) => {
      const hasRear = REAR_ARMOR_LOCATIONS.includes(location);
      return {
        location,
        armor: state.armor[location] ?? 0,
        maxArmor: maxArmor[location] ?? 0,
        structure: state.structure[location] ?? 0,
        maxStructure: maxStructure[location] ?? 0,
        destroyed: state.destroyedLocations.includes(location),
        rearArmor: hasRear ? (state.armor[`${location}_rear`] ?? 0) : undefined,
        maxRearArmor: hasRear ? (maxArmor[`${location}_rear`] ?? 0) : undefined,
      };
    });
  }, [state, maxArmor, maxStructure]);

  return (
    <div
      className={`bg-surface-base overflow-y-auto p-4 ${className}`}
      data-testid="record-sheet"
    >
      {/* Header */}
      <div className="border-border-theme mb-4 border-b pb-2">
        <h2
          className="text-text-theme-primary text-lg font-bold"
          data-testid="record-sheet-unit-name"
        >
          {unitName}
        </h2>
        <span
          className="text-text-theme-secondary text-sm"
          data-testid="record-sheet-designation"
        >
          {designation}
        </span>
        {state.destroyed && (
          <span
            className="ml-4 font-bold text-red-600"
            data-testid="record-sheet-destroyed"
          >
            DESTROYED
          </span>
        )}
      </div>

      {/* Pilot Status */}
      <div className="mb-4">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          PILOT
        </h3>
        <PilotStatus
          name={pilotName}
          gunnery={gunnery}
          piloting={piloting}
          wounds={state.pilotWounds}
          conscious={state.pilotConscious}
        />
      </div>

      {/* Heat */}
      <div className="mb-4">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          HEAT ({heatSinks} sinks)
        </h3>
        <SimpleHeatDisplay heat={state.heat} heatSinks={heatSinks} />
      </div>

      {/* Armor/Structure */}
      <div className="mb-4" data-testid="armor-structure-section">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          ARMOR / STRUCTURE
        </h3>
        <div className="border-border-theme divide-y rounded border">
          {locationStatuses.map((loc) => (
            <LocationStatusRow key={loc.location} {...loc} />
          ))}
        </div>
      </div>

      {/* Weapons */}
      <div className="mb-4" data-testid="weapons-section">
        <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
          WEAPONS
        </h3>
        <div className="border-border-theme divide-y rounded border">
          <div className="bg-surface-raised text-text-theme-secondary hidden items-center px-2 py-1 text-xs md:flex">
            {onWeaponToggle && <span className="w-6" />}
            <span className="flex-1">Weapon</span>
            <span className="w-16">Loc</span>
            <span className="w-8 text-center">Heat</span>
            <span className="w-8 text-center">Dmg</span>
            <span className="w-20">S/M/L</span>
            <span className="w-12 text-right">Ammo</span>
          </div>
          {weapons.map((weapon) => (
            <WeaponRow
              key={weapon.id}
              weapon={weapon}
              isSelected={selectedWeaponIds.includes(weapon.id)}
              onToggle={
                onWeaponToggle ? () => onWeaponToggle(weapon.id) : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Movement info */}
      <div
        className="text-text-theme-secondary text-sm"
        data-testid="movement-info"
      >
        <span>Movement this turn: </span>
        <strong data-testid="movement-type">{state.movementThisTurn}</strong>
        {state.hexesMovedThisTurn > 0 && (
          <span data-testid="hexes-moved">
            {' '}
            ({state.hexesMovedThisTurn} hexes)
          </span>
        )}
      </div>
    </div>
  );
}

export default RecordSheetDisplay;
