/**
 * Personnel Side Panel — campaign roster pilot drilldown.
 *
 * Mounts within the campaign personnel page when a pilot row is clicked.
 * Surfaces three tabs:
 *   - Progression — wraps the existing PilotProgressionPanel
 *   - Abilities   — wraps the existing PilotAbilitiesPanel
 *   - Assignment  — new CrewAssignmentPanel calling useForceStore
 *
 * Resolves the vault `IPilot` via the existing `usePilotById` selector hook.
 * If the pilot does not exist in vault (e.g., stale campaign reference), the
 * Progression and Abilities tabs render an explanatory message; Assignment
 * still renders since it operates on the pilotId directly.
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 */

import React, { useState } from 'react';

import { PilotAbilitiesPanel } from '@/components/pilots/PilotAbilitiesPanel';
import { PilotProgressionPanel } from '@/components/pilots/PilotProgressionPanel';
import { Button, Card } from '@/components/ui';
import { usePilotById } from '@/stores/usePilotStore';

import { CrewAssignmentPanel } from './CrewAssignmentPanel';

// =============================================================================
// Types
// =============================================================================

type Tab = 'progression' | 'abilities' | 'assignment';

interface PersonnelSidePanelProps {
  /** Vault pilot id (from ICampaignRosterEntry.pilotId) */
  pilotId: string;
  /** Whether the panel is mounted/visible */
  isOpen: boolean;
  /** Close handler — called when the close button is clicked */
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PersonnelSidePanel({
  pilotId,
  isOpen,
  onClose,
}: PersonnelSidePanelProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<Tab>('progression');
  const pilot = usePilotById(pilotId);

  if (!isOpen) {
    return null;
  }

  const renderProgression = (): React.ReactElement => {
    if (!pilot) {
      return (
        <p className="text-text-theme-secondary p-4 text-sm">
          Pilot not found in vault — this campaign may reference a deleted
          pilot.
        </p>
      );
    }
    return <PilotProgressionPanel pilot={pilot} />;
  };

  const renderAbilities = (): React.ReactElement => {
    if (!pilot) {
      return (
        <p className="text-text-theme-secondary p-4 text-sm">
          Pilot not found in vault — this campaign may reference a deleted
          pilot.
        </p>
      );
    }
    return <PilotAbilitiesPanel pilot={pilot} isCreationFlow={false} />;
  };

  return (
    <Card
      className="border-border-theme bg-surface-deep flex flex-col gap-4 border p-4"
      data-testid="personnel-side-panel"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h2 className="text-text-theme-primary text-lg font-semibold">
          {pilot?.name ?? 'Pilot'}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          data-testid="personnel-side-panel-close"
        >
          Close
        </Button>
      </div>

      {/* Tab strip */}
      <div
        className="border-border-theme-subtle flex gap-1 border-b"
        role="tablist"
      >
        <TabButton
          label="Progression"
          isActive={activeTab === 'progression'}
          onClick={() => setActiveTab('progression')}
        />
        <TabButton
          label="Abilities"
          isActive={activeTab === 'abilities'}
          onClick={() => setActiveTab('abilities')}
        />
        <TabButton
          label="Assignment"
          isActive={activeTab === 'assignment'}
          onClick={() => setActiveTab('assignment')}
        />
      </div>

      {/* Tab body */}
      <div data-testid={`personnel-side-panel-tab-${activeTab}`}>
        {activeTab === 'progression' && renderProgression()}
        {activeTab === 'abilities' && renderAbilities()}
        {activeTab === 'assignment' && (
          <CrewAssignmentPanel pilotId={pilotId} />
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Tab button helper
// =============================================================================

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({
  label,
  isActive,
  onClick,
}: TabButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-surface-raised text-text-theme-primary border-accent border-b-2'
          : 'text-text-theme-secondary hover:text-text-theme-primary'
      }`}
    >
      {label}
    </button>
  );
}

export default PersonnelSidePanel;
