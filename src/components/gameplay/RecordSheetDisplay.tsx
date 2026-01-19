/**
 * Record Sheet Display Component
 * Shows unit status in traditional record sheet format.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useMemo } from 'react';
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
 */
function getDamagePercent(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((1 - current / max) * 100);
}

/**
 * Get status color based on remaining percentage.
 */
function getStatusColor(remaining: number, max: number): string {
  const percent = max > 0 ? (remaining / max) * 100 : 0;
  if (percent === 0) return 'text-gray-500';
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

  return (
    <div className={`flex items-center py-1 px-2 ${destroyed ? 'opacity-50 line-through' : ''}`}>
      <span className="w-28 text-sm font-medium">{displayName}</span>
      <div className="flex-1 flex items-center gap-4">
        {/* Front armor */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 w-6">AR:</span>
          <span className={`text-sm font-mono w-8 text-right ${armorColor}`}>
            {armor}/{maxArmor}
          </span>
        </div>
        {/* Rear armor (if applicable) */}
        {rearArmor !== undefined && maxRearArmor !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-6">RR:</span>
            <span className={`text-sm font-mono w-8 text-right ${getStatusColor(rearArmor, maxRearArmor)}`}>
              {rearArmor}/{maxRearArmor}
            </span>
          </div>
        )}
        {/* Structure */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 w-6">IS:</span>
          <span className={`text-sm font-mono w-8 text-right ${structureColor}`}>
            {structure}/{maxStructure}
          </span>
        </div>
      </div>
      {destroyed && (
        <span className="text-red-600 text-xs font-bold">DESTROYED</span>
      )}
    </div>
  );
}

interface WeaponRowProps {
  weapon: IWeaponStatus;
  isSelected: boolean;
  onToggle?: () => void;
}

function WeaponRow({ weapon, isSelected, onToggle }: WeaponRowProps): React.ReactElement {
  const isAvailable = !weapon.destroyed;
  const rowClasses = weapon.destroyed
    ? 'opacity-50 line-through'
    : weapon.firedThisTurn
    ? 'bg-yellow-50'
    : '';

  return (
    <div
      className={`flex items-center py-1 px-2 hover:bg-gray-50 ${rowClasses}`}
      onClick={isAvailable && onToggle ? onToggle : undefined}
      style={{ cursor: isAvailable && onToggle ? 'pointer' : 'default' }}
    >
      {onToggle && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          disabled={!isAvailable}
          className="mr-2"
        />
      )}
      <span className="flex-1 text-sm">{weapon.name}</span>
      <span className="text-xs text-gray-500 w-16">{weapon.location}</span>
      <span className="text-xs text-gray-600 w-8 text-center">{weapon.heat}H</span>
      <span className="text-xs text-gray-600 w-8 text-center">{weapon.damage}D</span>
      <span className="text-xs text-gray-500 w-20">
        {weapon.ranges.short}/{weapon.ranges.medium}/{weapon.ranges.long}
      </span>
      {weapon.ammoRemaining !== undefined && (
        <span className="text-xs text-gray-500 w-12 text-right">
          {weapon.ammoRemaining} rds
        </span>
      )}
    </div>
  );
}

interface SimpleHeatDisplayProps {
  heat: number;
  heatSinks: number;
}

function SimpleHeatDisplay({ heat, heatSinks }: SimpleHeatDisplayProps): React.ReactElement {
  const maxHeat = 30;
  const heatPercent = Math.min((heat / maxHeat) * 100, 100);
  
  // Heat effect thresholds
  const getHeatColor = () => {
    if (heat >= 30) return 'bg-red-600';
    if (heat >= 23) return 'bg-red-500';
    if (heat >= 17) return 'bg-orange-500';
    if (heat >= 13) return 'bg-yellow-500';
    if (heat >= 8) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getHeatEffects = () => {
    const effects: string[] = [];
    if (heat >= 30) effects.push('SHUTDOWN');
    if (heat >= 26) effects.push('+5 to-hit penalty');
    if (heat >= 24) effects.push('Ammo explosion risk');
    if (heat >= 18) effects.push('+4 to-hit penalty');
    if (heat >= 13) effects.push('+2 to-hit penalty');
    if (heat >= 8) effects.push('+1 to-hit penalty');
    return effects;
  };

  const effects = getHeatEffects();

  return (
    <div className="bg-gray-50 p-2 rounded">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded overflow-hidden">
            <div
              className={`h-full ${getHeatColor()} transition-all`}
              style={{ width: `${heatPercent}%` }}
            />
          </div>
        </div>
        <div className="text-sm font-mono">
          <span className="font-bold">{heat}</span>
          <span className="text-gray-500">/{maxHeat}</span>
        </div>
      </div>
      {effects.length > 0 && (
        <div className="text-xs text-red-600">
          {effects.join(' • ')}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-1">
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

function PilotStatus({ name, gunnery, piloting, wounds, conscious }: PilotStatusProps): React.ReactElement {
  const woundIndicators = [];
  for (let i = 0; i < 6; i++) {
    woundIndicators.push(
      <span
        key={i}
        className={`w-4 h-4 rounded-full border ${
          i < wounds ? 'bg-red-500 border-red-600' : 'bg-white border-gray-300'
        }`}
      />
    );
  }

  return (
    <div className="p-2 bg-gray-50 rounded">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{name}</span>
        {!conscious && <span className="text-red-600 text-xs font-bold">UNCONSCIOUS</span>}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span>Gunnery: <strong>{gunnery}</strong></span>
        <span>Piloting: <strong>{piloting}</strong></span>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className="text-xs text-gray-500 mr-2">Wounds:</span>
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
        rearArmor: hasRear ? state.armor[`${location}_rear`] ?? 0 : undefined,
        maxRearArmor: hasRear ? maxArmor[`${location}_rear`] ?? 0 : undefined,
      };
    });
  }, [state, maxArmor, maxStructure]);

  return (
    <div className={`bg-white p-4 overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-300 pb-2 mb-4">
        <h2 className="text-lg font-bold">{unitName}</h2>
        <span className="text-sm text-gray-600">{designation}</span>
        {state.destroyed && (
          <span className="ml-4 text-red-600 font-bold">DESTROYED</span>
        )}
      </div>

      {/* Pilot Status */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-2">PILOT</h3>
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
        <h3 className="text-sm font-bold text-gray-700 mb-2">HEAT ({heatSinks} sinks)</h3>
        <SimpleHeatDisplay heat={state.heat} heatSinks={heatSinks} />
      </div>

      {/* Armor/Structure */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-2">ARMOR / STRUCTURE</h3>
        <div className="border rounded divide-y">
          {locationStatuses.map((loc) => (
            <LocationStatusRow key={loc.location} {...loc} />
          ))}
        </div>
      </div>

      {/* Weapons */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-2">WEAPONS</h3>
        <div className="border rounded divide-y">
          <div className="flex items-center py-1 px-2 bg-gray-50 text-xs text-gray-600">
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
              onToggle={onWeaponToggle ? () => onWeaponToggle(weapon.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Movement info */}
      <div className="text-sm text-gray-600">
        <span>Movement this turn: </span>
        <strong>{state.movementThisTurn}</strong>
        {state.hexesMovedThisTurn > 0 && (
          <span> ({state.hexesMovedThisTurn} hexes)</span>
        )}
      </div>
    </div>
  );
}

export default RecordSheetDisplay;
