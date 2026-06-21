import { useRouter } from 'next/router';
/**
 * Campaigns List Page
 * Browse, search, and manage campaign configurations.
 *
 * @spec openspec/specs/campaign-system/spec.md
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */
import { useState, useCallback, useEffect } from 'react';
import { useStore } from 'zustand';

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';

import { PageLayout, Card, Button, EmptyState } from '@/components/ui';
import { CampaignCoopEntryPanel } from '@/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { ICampaign } from '@/types/campaign/Campaign';

interface CampaignListEntry {
  readonly id: string;
  readonly name: string;
  readonly factionId: string;
  readonly currentDate: Date;
  readonly balance?: number;
  readonly forcesCount?: number;
  readonly missionsCount?: number;
}

interface CampaignCardProps {
  campaign: CampaignListEntry;
  onClick: () => void;
}

function CampaignCard({
  campaign,
  onClick,
}: CampaignCardProps): React.ReactElement {
  // Per PR4 of `wire-iperson-hard-cutover`: roster store is the canonical
  // personnel source - no legacy `campaign.personnel.size` fallback.
  const personnelCount = useCampaignRosterStore((s) => s.pilots.length);
  return (
    <Card
      className="hover:border-accent/50 group cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`campaign-card-${campaign.id}`}
    >
      <h3 className="text-text-theme-primary group-hover:text-accent mb-2 text-lg font-semibold transition-colors">
        {campaign.name}
      </h3>

      <p className="text-text-theme-secondary mb-3 text-sm">
        Faction: {campaign.factionId}
      </p>

      <p className="text-text-theme-secondary mb-4 text-sm">
        Date: {campaign.currentDate.toLocaleDateString()}
      </p>

      <div className="text-text-theme-secondary flex gap-4 text-sm">
        <span>{personnelCount} Personnel</span>
        <span>{campaign.forcesCount ?? 0} Forces</span>
        <span>{campaign.missionsCount ?? 0} Missions</span>
        {typeof campaign.balance === 'number' && (
          <span>{campaign.balance.toLocaleString()} C-bills</span>
        )}
      </div>
    </Card>
  );
}

function summaryToEntry(summary: ICampaignSummary): CampaignListEntry {
  return {
    id: summary.id,
    name: summary.name,
    factionId: summary.factionId,
    currentDate: new Date(summary.currentDate),
    balance: summary.balance,
  };
}

function campaignToEntry(campaign: ICampaign): CampaignListEntry {
  return {
    id: campaign.id,
    name: campaign.name,
    factionId: campaign.factionId,
    currentDate: campaign.currentDate,
    forcesCount: campaign.forces.size,
    missionsCount: campaign.missions.size,
  };
}

export default function CampaignsListPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  // Reactive subscription (mirrors RosterStateCards.tsx). The previous
  // render-time `store.getState().getCampaign()` read never re-rendered
  // when the store mutated after mount, so a campaign created via store
  // action (create flow, e2e fixture) never surfaced a campaign-card
  // until a full reload (e2e triage RC4).
  const campaign = useStore(store, (s) => s.campaign);
  const [campaignSummaries, setCampaignSummaries] = useState<
    readonly ICampaignSummary[]
  >([]);
  const [campaignListError, setCampaignListError] = useState<string | null>(
    null,
  );
  const [isClient, setIsClient] = useState(false);
  const campaigns =
    campaignSummaries.length > 0
      ? campaignSummaries.map(summaryToEntry)
      : campaign
        ? [campaignToEntry(campaign)]
        : [];

  // Hydration fix: flip to client AFTER mount so SSR + first client
  // render both see the loading state.
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;
    async function loadCampaignSummaries(): Promise<void> {
      try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) {
          throw new Error(`server responded ${response.status}`);
        }
        const summaries = (await response.json()) as ICampaignSummary[];
        if (!cancelled) {
          setCampaignSummaries(summaries);
          setCampaignListError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCampaignListError(
            error instanceof Error ? error.message : 'failed to load campaigns',
          );
        }
      }
    }
    void loadCampaignSummaries();
    return () => {
      cancelled = true;
    };
  }, [isClient]);

  const handleCreateCampaign = useCallback(() => {
    router.push('/gameplay/campaigns/create');
  }, [router]);

  const handleCampaignClick = useCallback(
    async (campaign: CampaignListEntry) => {
      const isActiveCampaign = store.getState().campaign?.id === campaign.id;
      if (!isActiveCampaign) {
        await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
      }
      router.push(`/gameplay/campaigns/${campaign.id}`);
    },
    [router, store],
  );

  if (!isClient) {
    return (
      <PageLayout
        title="Campaigns"
        subtitle="Multi-mission operations with persistent roster and resources"
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <Card className="mb-6 h-20">
            <div className="h-full" />
          </Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Campaigns"
      subtitle="Multi-mission operations with persistent roster and resources"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreateCampaign}
          data-testid="create-campaign-btn"
          leftIcon={
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          New Campaign
        </Button>
      }
    >
      <CampaignCoopEntryPanel />

      {campaignListError && campaigns.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-200">
          Stored campaign list could not refresh: {campaignListError}
        </p>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          }
          title="No campaigns yet"
          message="Start a new campaign to lead your mercenary company through multi-mission operations"
          action={
            <Button variant="primary" onClick={handleCreateCampaign}>
              Create First Campaign
            </Button>
          }
          data-testid="campaigns-empty-state"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => handleCampaignClick(campaign)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
