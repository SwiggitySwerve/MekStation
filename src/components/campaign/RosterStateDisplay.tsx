/**
 * RosterStateDisplay Component
 * Shows current unit and pilot status in a campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import React, { useState } from 'react';

import { Card, Badge, Button } from '@/components/ui';
import {
  ICampaignUnitState,
  ICampaignPilotState,
  CampaignUnitStatus,
  CampaignPilotStatus,
} from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

interface RosterStateDisplayProps {
  units: readonly ICampaignUnitState[];
  pilots: readonly ICampaignPilotState[];
  onUnitClick?: (unit: ICampaignUnitState) => void;
  onPilotClick?: (pilot: ICampaignPilotState) => void;
}

type TabType = 'units' | 'pilots';

// =============================================================================
// Status Helpers
// =============================================================================

function getUnitStatusStyles(status: CampaignUnitStatus): {
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

function getPilotStatusStyles(status: CampaignPilotStatus): {
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
// Unit Card Component
// =============================================================================

interface UnitCardProps {
  unit: ICampaignUnitState;
  onClick?: () => void;
}

function UnitCard({ unit, onClick }: UnitCardProps): React.ReactElement {
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
      {/* Header */}
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

      {/* Damage indicators */}
      {unit.status !== CampaignUnitStatus.Destroyed && (
        <div className="space-y-2">
          {/* Damage bar */}
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

          {/* Destroyed components */}
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

      {/* Needs repair indicator */}
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

      {/* Repair time */}
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
// Pilot Card Component
// =============================================================================

interface PilotCardProps {
  pilot: ICampaignPilotState;
  onClick?: () => void;
}

function PilotCard({ pilot, onClick }: PilotCardProps): React.ReactElement {
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
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
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

      {/* Stats Grid */}
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

      {/* Wounds indicator */}
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

      {/* Recovery time */}
      {pilot.recoveryTime > 0 && (
        <div className="mt-2 text-xs text-cyan-400">
          <span className="font-medium">Recovery:</span> {pilot.recoveryTime}{' '}
          mission(s)
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RosterStateDisplay({
  units,
  pilots,
  onUnitClick,
  onPilotClick,
}: RosterStateDisplayProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('units');

  const operationalUnits = units.filter(
    (u) =>
      u.status === CampaignUnitStatus.Operational ||
      u.status === CampaignUnitStatus.Damaged,
  );
  const activePilots = pilots.filter(
    (p) =>
      p.status === CampaignPilotStatus.Active ||
      p.status === CampaignPilotStatus.Wounded,
  );

  return (
    <Card>
      {/* Header with tabs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text-theme-primary text-lg font-semibold">
          Campaign Roster
        </h2>
        <div className="bg-surface-deep flex gap-1 rounded-lg p-1">
          <Button
            variant={activeTab === 'units' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('units')}
          >
            Units ({operationalUnits.length}/{units.length})
          </Button>
          <Button
            variant={activeTab === 'pilots' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('pilots')}
          >
            Pilots ({activePilots.length}/{pilots.length})
          </Button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'units' ? (
        units.length === 0 ? (
          <div className="text-text-theme-muted py-8 text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p>No units in roster</p>
            <p className="mt-1 text-sm">
              Add units from your vault to participate in this campaign
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <UnitCard
                key={unit.unitId}
                unit={unit}
                onClick={onUnitClick ? () => onUnitClick(unit) : undefined}
              />
            ))}
          </div>
        )
      ) : pilots.length === 0 ? (
        <div className="text-text-theme-muted py-8 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p>No pilots in roster</p>
          <p className="mt-1 text-sm">
            Add pilots from your vault to crew your units
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pilots.map((pilot) => (
            <PilotCard
              key={pilot.pilotId}
              pilot={pilot}
              onClick={onPilotClick ? () => onPilotClick(pilot) : undefined}
            />
          ))}
        </div>
      )}

      {/* Repair bay link */}
      {activeTab === 'units' &&
        units.some((u) => u.status === CampaignUnitStatus.Damaged) && (
          <div className="border-border-theme-subtle mt-4 border-t pt-4">
            <Button variant="secondary" className="w-full">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Open Repair Bay
            </Button>
          </div>
        )}
    </Card>
  );
}

export default RosterStateDisplay;
