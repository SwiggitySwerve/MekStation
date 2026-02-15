/**
 * Record Sheet Display Component
 * Shows unit status in traditional record sheet format.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useMemo } from 'react';

import { IUnitGameState, IWeaponStatus } from '@/types/gameplay';

import { LOCATION_ORDER, REAR_ARMOR_LOCATIONS } from './recordSheet.helpers';
import {
  LocationStatusRow,
  WeaponRow,
  SimpleHeatDisplay,
  PilotStatus,
} from './RecordSheetPanels';

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
