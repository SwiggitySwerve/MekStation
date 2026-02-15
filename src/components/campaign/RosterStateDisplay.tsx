/**
 * RosterStateDisplay Component
 * Shows current unit and pilot status in a campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import React, { useState } from 'react';

import { Card, Button } from '@/components/ui';
import {
  ICampaignUnitState,
  ICampaignPilotState,
  CampaignUnitStatus,
  CampaignPilotStatus,
} from '@/types/campaign';

import { RosterUnitCard, RosterPilotCard } from './RosterStateCards';

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
              <RosterUnitCard
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
            <RosterPilotCard
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
