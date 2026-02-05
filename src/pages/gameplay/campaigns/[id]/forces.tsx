import { useRouter } from 'next/router';
/**
 * Campaign Forces Page (TO&E)
 * Table of Organization and Equipment - manage force hierarchy.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { PageLayout, Card, EmptyState, Badge } from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { FormationLevel } from '@/types/campaign/enums';
import { IForce } from '@/types/campaign/Force';

// =============================================================================
// Force Tree Node Component
// =============================================================================

interface ForceNodeProps {
  force: IForce;
  allForces: Map<string, IForce>;
  level: number;
}

function ForceNode({
  force,
  allForces,
  level,
}: ForceNodeProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = force.subForceIds.length > 0;
  const indent = level * 24;

  const getFormationColor = (formationLevel: FormationLevel): string => {
    switch (formationLevel) {
      case FormationLevel.LANCE:
        return 'bg-blue-500/20 text-blue-400';
      case FormationLevel.COMPANY:
        return 'bg-green-500/20 text-green-400';
      case FormationLevel.BATTALION:
        return 'bg-yellow-500/20 text-yellow-400';
      case FormationLevel.REGIMENT:
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div>
      <div
        className="hover:bg-surface-raised/50 flex cursor-pointer items-center gap-3 rounded p-3 transition-colors"
        style={{ paddingLeft: `${indent + 12}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <svg
            className={`text-text-theme-secondary h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : (
          <div className="w-4" />
        )}

        {/* Force Icon */}
        <svg
          className="text-accent h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>

        {/* Force Name */}
        <span className="text-text-theme-primary flex-1 font-semibold">
          {force.name}
        </span>

        {/* Formation Level Badge */}
        <Badge className={getFormationColor(force.formationLevel)}>
          {force.formationLevel}
        </Badge>

        {/* Force Type */}
        <span className="text-text-theme-secondary text-sm">
          {force.forceType}
        </span>

        {/* Unit Count */}
        <span className="text-text-theme-secondary text-sm">
          {force.unitIds.length} units
        </span>
      </div>

      {/* Child Forces */}
      {hasChildren && isExpanded && (
        <div>
          {force.subForceIds.map((subForceId) => {
            const subForce = allForces.get(subForceId);
            if (!subForce) return null;
            return (
              <ForceNode
                key={subForceId}
                force={subForce}
                allForces={allForces}
                level={level + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function ForcesPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const [isClient, setIsClient] = useState(false);

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Forces (TO&E)' },
  ];

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Forces (TO&E)"
        subtitle="Loading forces..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <Card className="h-96">
            <div className="h-full" />
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Handle campaign not found
  if (!campaign) {
    return (
      <PageLayout
        title="Forces (TO&E)"
        subtitle="Campaign not found"
        maxWidth="wide"
      >
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          }
          title="Campaign not found"
          message="Return to campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  // Get root force
  const rootForce = campaign.forces.get(campaign.rootForceId);

  return (
    <PageLayout
      title="Forces (TO&E)"
      subtitle={`${campaign.name} - Table of Organization and Equipment`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      {/* Navigation Tabs */}
      <CampaignNavigation campaignId={campaign.id} currentPage="forces" />

      {!rootForce ? (
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
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          }
          title="No force structure"
          message="This campaign has no force organization defined."
        />
      ) : (
        <Card>
          <div className="border-border-theme mb-4 border-b pb-4">
            <h2 className="text-text-theme-primary text-lg font-semibold">
              Force Hierarchy
            </h2>
            <p className="text-text-theme-secondary mt-1 text-sm">
              {campaign.forces.size} total forces
            </p>
          </div>

          <div className="space-y-1">
            <ForceNode
              force={rootForce}
              allForces={campaign.forces}
              level={0}
            />
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
