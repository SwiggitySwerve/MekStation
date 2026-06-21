/**
 * Campaign Personnel Page
 * Manage pilot roster for the campaign.
 *
 * Reads from `useCampaignRosterStore.pilots` (the live `ICampaignRosterEntry`
 * records written at campaign creation), NOT from a campaign-level personnel
 * map. The legacy personnel sub-store was deleted in
 * `migrate-personnel-to-roster-employment` Phase 5 — see council decision
 * below for the architectural reason.
 *
 * Pilot data (skills, abilities, XP) resolves via vault join through
 * `usePilotById` inside the side panel. The XP-spend mechanic flows through
 * the existing `usePilotStore` actions, which already POST to the correct
 * routes.
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 * @spec openspec/council-decisions/2026-05-01-personnel-architecture-path.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CampaignCoopRouteSurfaceConnected } from '@/components/campaign/coop';
import { PersonnelSidePanel } from '@/components/campaign/personnel/PersonnelSidePanel';
import { Card, EmptyState, PageLayout } from '@/components/ui';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

// =============================================================================
// Pilot Roster Row
// =============================================================================

interface PilotRosterRowProps {
  pilot: ICampaignRosterEntry;
  isSelected: boolean;
  onClick: () => void;
}

function PilotRosterRow({
  pilot,
  isSelected,
  onClick,
}: PilotRosterRowProps): React.ReactElement {
  return (
    <Card
      className={`cursor-pointer p-4 transition-colors ${
        isSelected ? 'border-accent border-2' : 'hover:border-accent/50'
      }`}
      onClick={onClick}
      data-testid={`pilot-row-${pilot.pilotId}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-text-theme-primary text-base font-semibold">
            {pilot.pilotName}
          </h3>
          <p className="text-text-theme-secondary mt-1 text-xs">
            {pilot.status} · XP {pilot.xp} · Wounds {pilot.wounds}/6
          </p>
        </div>
        {pilot.assignedUnitId && (
          <span className="text-text-theme-muted font-mono text-xs">
            {pilot.assignedUnitId}
          </span>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PersonnelPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const pilots = useCampaignRosterStore((state) => state.pilots);
  const [selectedPilotId, setSelectedPilotId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Personnel' },
  ];

  // SSR loading state
  if (!isClient) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Loading personnel..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-32">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Campaign not found"
        maxWidth="wide"
        breadcrumbs={breadcrumbs}
      >
        <EmptyState
          title="Campaign not found"
          message="Return to campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Personnel"
      subtitle={`${campaign.name} — ${pilots.length} pilots`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="personnel"
        coopSession={campaign.coopSession}
      />

      <CampaignCoopRouteSurfaceConnected
        campaign={campaign}
        routeId="personnel"
      />
      {pilots.length === 0 ? (
        <EmptyState
          title="No pilots in this campaign roster"
          message="Add pilots during campaign creation to see them here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
          {/* Left: pilot roster grid */}
          <div className="space-y-3">
            {pilots.map((pilot) => (
              <PilotRosterRow
                key={pilot.pilotId}
                pilot={pilot}
                isSelected={selectedPilotId === pilot.pilotId}
                onClick={() => setSelectedPilotId(pilot.pilotId)}
              />
            ))}
          </div>

          {/* Right: side panel column */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selectedPilotId ? (
              <PersonnelSidePanel
                pilotId={selectedPilotId}
                isOpen={selectedPilotId !== null}
                onClose={() => setSelectedPilotId(null)}
              />
            ) : (
              <Card className="border-border-theme-subtle border-2 border-dashed p-8 text-center">
                <p className="text-text-theme-secondary text-sm">
                  Select a pilot to view progression, abilities, and assignment.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
