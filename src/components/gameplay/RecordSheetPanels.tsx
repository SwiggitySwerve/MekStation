import React from 'react';

import {
  MAX_HEAT,
  getHeatColorClass,
  getActiveHeatEffects,
} from '@/constants/heat';
import { IWeaponStatus } from '@/types/gameplay';

import { LOCATION_NAMES, getStatusColor } from './recordSheet.helpers';

// =============================================================================
// Location Status Row
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

export function LocationStatusRow({
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
      <div className="mb-1 flex items-center justify-between md:mb-0 md:w-28">
        <span className="text-text-theme-primary text-base font-medium md:text-sm">
          {displayName}
        </span>
        {destroyed && (
          <span
            className="text-xs font-bold text-red-600 md:hidden"
            data-testid={`location-destroyed-${location}-mobile`}
          >
            DESTROYED
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-4">
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
          <div className="md:hidden" />
        )}
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

// =============================================================================
// Weapon Row
// =============================================================================

interface WeaponRowProps {
  weapon: IWeaponStatus;
  isSelected: boolean;
  onToggle?: () => void;
}

export function WeaponRow({
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

// =============================================================================
// Simple Heat Display
// =============================================================================

export function SimpleHeatDisplay({
  heat,
  heatSinks,
}: {
  heat: number;
  heatSinks: number;
}): React.ReactElement {
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

// =============================================================================
// Pilot Status
// =============================================================================

export function PilotStatus({
  name,
  gunnery,
  piloting,
  wounds,
  conscious,
}: {
  name: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  conscious: boolean;
}): React.ReactElement {
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
