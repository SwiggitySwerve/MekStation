import React from 'react';

import { Badge } from '@/components/ui';
import {
  ICampaignUnitState,
  ICampaignPilotState,
  CampaignUnitStatus,
  CampaignPilotStatus,
} from '@/types/campaign';

// =============================================================================
// Status Helpers
// =============================================================================

export function getUnitStatusStyles(status: CampaignUnitStatus): {
  badge: 'success' | 'warning' | 'info' | 'red' | 'muted';
  label: string;
} {
  switch (status) {
    case CampaignUnitStatus.Operational:
      return { badge: 'success', label: 'Operational' };
    case CampaignUnitStatus.Damaged:
      return { badge: 'warning', label: 'Damaged' };
    case CampaignUnitStatus.Repairing:
      return { badge: 'info', label: 'Repairing' };
    case CampaignUnitStatus.Destroyed:
      return { badge: 'red', label: 'Destroyed' };
    case CampaignUnitStatus.Salvage:
      return { badge: 'muted', label: 'Salvage' };
    default:
      return { badge: 'muted', label: status };
  }
}

export function getPilotStatusStyles(status: CampaignPilotStatus): {
  badge: 'success' | 'warning' | 'info' | 'red' | 'muted';
  label: string;
} {
  switch (status) {
    case CampaignPilotStatus.Active:
      return { badge: 'success', label: 'Active' };
    case CampaignPilotStatus.Wounded:
      return { badge: 'warning', label: 'Wounded' };
    case CampaignPilotStatus.Critical:
      return { badge: 'red', label: 'Critical' };
    case CampaignPilotStatus.MIA:
      return { badge: 'info', label: 'MIA' };
    case CampaignPilotStatus.KIA:
      return { badge: 'red', label: 'KIA' };
    default:
      return { badge: 'muted', label: status };
  }
}

// =============================================================================
// Unit Card
// =============================================================================

interface UnitCardProps {
  unit: ICampaignUnitState;
  onClick?: () => void;
}

export function RosterUnitCard({
  unit,
  onClick,
}: UnitCardProps): React.ReactElement {
  const statusStyles = getUnitStatusStyles(unit.status);
  const needsRepair =
    unit.status === CampaignUnitStatus.Damaged || unit.repairCost > 0;
  const totalDamage =
    Object.values(unit.armorDamage).reduce((a, b) => a + b, 0) +
    Object.values(unit.structureDamage).reduce((a, b) => a + b, 0);

  return (
    <div
      className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 transition-all ${
        onClick
          ? 'hover:border-accent/50 hover:bg-surface-raised/50 cursor-pointer'
          : ''
      } ${unit.status === CampaignUnitStatus.Destroyed ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-text-theme-primary truncate font-semibold">
            {unit.unitName}
          </h4>
          <p className="text-text-theme-muted truncate text-xs">
            {unit.unitId.slice(0, 8)}...
          </p>
        </div>
        <Badge variant={statusStyles.badge} size="sm">
          {statusStyles.label}
        </Badge>
      </div>

      {unit.status !== CampaignUnitStatus.Destroyed && (
        <div className="space-y-2">
          {totalDamage > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-text-theme-muted w-16 text-xs">Damage</span>
              <div className="bg-surface-raised h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
                  style={{ width: `${Math.min(100, totalDamage * 5)}%` }}
                />
              </div>
            </div>
          )}

          {unit.destroyedComponents.length > 0 && (
            <div className="text-xs text-red-400">
              <span className="font-medium">Destroyed:</span>{' '}
              {unit.destroyedComponents.slice(0, 3).join(', ')}
              {unit.destroyedComponents.length > 3 &&
                ` +${unit.destroyedComponents.length - 3} more`}
            </div>
          )}
        </div>
      )}

      {needsRepair && unit.status !== CampaignUnitStatus.Destroyed && (
        <div className="border-border-theme-subtle mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-amber-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-xs font-medium">Needs Repair</span>
          </div>
          {unit.repairCost > 0 && (
            <span className="text-text-theme-muted text-xs">
              {(unit.repairCost / 1000).toFixed(0)}K C-Bills
            </span>
          )}
        </div>
      )}

      {unit.repairTime > 0 && unit.status === CampaignUnitStatus.Repairing && (
        <div className="mt-2 text-xs text-cyan-400">
          <span className="font-medium">Repair time:</span> {unit.repairTime}{' '}
          mission(s)
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Pilot Card
// =============================================================================

interface PilotCardProps {
  pilot: ICampaignPilotState;
  onClick?: () => void;
}

export function RosterPilotCard({
  pilot,
  onClick,
}: PilotCardProps): React.ReactElement {
  const statusStyles = getPilotStatusStyles(pilot.status);
  const isAvailable = pilot.status === CampaignPilotStatus.Active;
  const isDeceased = pilot.status === CampaignPilotStatus.KIA;

  return (
    <div
      className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 transition-all ${
        onClick
          ? 'hover:border-accent/50 hover:bg-surface-raised/50 cursor-pointer'
          : ''
      } ${isDeceased ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isAvailable
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDeceased
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-surface-raised text-text-theme-muted'
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-text-theme-primary truncate font-semibold">
              {pilot.pilotName}
            </h4>
            <p className="text-text-theme-muted text-xs">
              {pilot.campaignMissions} missions
            </p>
          </div>
        </div>
        <Badge variant={statusStyles.badge} size="sm">
          {statusStyles.label}
        </Badge>
      </div>

      {!isDeceased && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="bg-surface-raised rounded p-2 text-center">
            <div className="text-accent text-lg font-bold">{pilot.xp}</div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              XP
            </div>
          </div>
          <div className="bg-surface-raised rounded p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {pilot.campaignKills}
            </div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              Kills
            </div>
          </div>
          <div className="bg-surface-raised rounded p-2 text-center">
            <div
              className={`text-lg font-bold ${pilot.wounds > 0 ? 'text-red-400' : 'text-text-theme-secondary'}`}
            >
              {pilot.wounds}
            </div>
            <div className="text-text-theme-muted text-[10px] uppercase">
              Wounds
            </div>
          </div>
        </div>
      )}

      {pilot.wounds > 0 && !isDeceased && (
        <div className="flex items-center gap-1.5 text-red-400">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-xs font-medium">
            {pilot.wounds} wound{pilot.wounds !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {pilot.recoveryTime > 0 && (
        <div className="mt-2 text-xs text-cyan-400">
          <span className="font-medium">Recovery:</span> {pilot.recoveryTime}{' '}
          mission(s)
        </div>
      )}
    </div>
  );
}
