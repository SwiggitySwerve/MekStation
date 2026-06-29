/**
 * Campaign Starmap Page
 *
 * Per `wire-starmap-into-campaign` (Wave 6.4): mounts the existing
 * `<StarmapDisplay>` component on a dedicated campaign sub-route,
 * fed by the Inner Sphere seed dataset. The page wires three pieces
 * together for the MVP travel-between-systems loop:
 *
 *   1. Seed dataset → `StarmapDisplay` systems prop (40 canonical
 *      Inner Sphere worlds, see src/lib/starmap/seed/inner-sphere-seed.json).
 *   2. Click-to-select → component-local `selectedSystem` state.
 *   3. "Travel here" CTA → `useCampaignStore.travelToSystem(systemId)`,
 *      which validates the destination, updates
 *      `campaign.currentSystemId`, and emits a 'travel' activity-log
 *      entry. Same-system clicks no-op; unknown systemIds are
 *      filtered by the seed loader long before the action fires.
 *
 * @spec openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md
 * @spec openspec/changes/wire-starmap-into-campaign/specs/campaign-system/spec.md
 */

import React, { useEffect, useMemo, useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { StarmapDisplay } from '@/components/campaign/StarmapDisplay';
import { PageLayout } from '@/components/ui';
import {
  findSystemById,
  loadInnerSphereSeed,
} from '@/lib/starmap/loadInnerSphereSeed';
import {
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';

export default function CampaignStarmapPage(): React.ReactElement {
  const shell = useCampaignPageShell('Starmap');
  const campaign = shell.campaign;
  const store = shell.store;

  // PT-102 lesson: ALWAYS setIsClient inside useEffect, never useState
  // initializer — the latter throws a hydration mismatch in SSR.

  // Local selection state — independent of the campaign's
  // `currentSystemId` so the operator can click around the map
  // without committing a jump. Defaults to the current-system pin
  // (or Terra as the canonical legacy-campaign fallback) so the
  // viewport has an obvious starting anchor.
  const campaignCurrentSystemId = campaign?.currentSystemId;
  const initialSelection = campaignCurrentSystemId ?? 'terra';
  const [selectedSystemId, setSelectedSystemId] =
    useState<string>(initialSelection);
  useEffect(() => {
    if (!campaignCurrentSystemId) return;
    setSelectedSystemId((current) =>
      current === 'terra' ? campaignCurrentSystemId : current,
    );
  }, [campaignCurrentSystemId]);

  // Load the seed dataset once — loadInnerSphereSeed is synchronous
  // (build-time JSON import) so this is safe inside useMemo.
  const seed = useMemo(() => loadInnerSphereSeed(), []);

  const selectedSystem = useMemo(
    () => findSystemById(selectedSystemId),
    [selectedSystemId],
  );

  const currentSystem = useMemo(
    () => findSystemById(campaignCurrentSystemId ?? 'terra'),
    [campaignCurrentSystemId],
  );

  const pending = renderPendingCampaignPage(shell, {
    title: 'Starmap',
    subtitle: 'Loading Inner Sphere map...',
  });
  if (pending) return pending;

  const loadedCampaign = getLoadedCampaign(shell);

  // Travel CTA handler — calls the campaign store action which
  // owns both the campaign mutation and the activity-log emit.
  // The action returns false on no-op (same system) or unknown id;
  // the button's `disabled` already gates same-system clicks so
  // the false path is purely defensive here.
  const handleTravel = (): void => {
    if (!selectedSystemId) return;
    store.getState().travelToSystem(selectedSystemId);
  };

  const isSameAsCurrent =
    !!loadedCampaign.currentSystemId &&
    loadedCampaign.currentSystemId === selectedSystemId;
  // Fallback: legacy campaigns without a currentSystemId default to
  // Terra — so 'terra' should ALSO be considered "same system" when
  // the campaign has no recorded location yet.
  const isLegacyTerraSelf =
    !loadedCampaign.currentSystemId && selectedSystemId === 'terra';
  const travelDisabled =
    isSameAsCurrent || isLegacyTerraSelf || !selectedSystem;

  return (
    <PageLayout
      title="Starmap"
      subtitle={loadedCampaign.name}
      maxWidth="wide"
      breadcrumbs={shell.breadcrumbs}
    >
      <CampaignNavigation
        campaignId={loadedCampaign.id}
        currentPage="starmap"
        coopSession={loadedCampaign.coopSession}
      />

      {/* Selection / travel control strip. Sits above the canvas so
       * the operator can read the destination + commit a jump
       * without leaving the page. The current-system pin reads off
       * `campaign.currentSystemId` (or Terra as the legacy default).
       */}
      <div
        className="border-border-theme bg-surface-theme mb-4 flex flex-wrap items-center gap-4 rounded border p-4"
        data-testid="starmap-travel-controls"
      >
        <div className="text-sm">
          <div className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
            Current location
          </div>
          <div
            className="text-text-theme-primary font-mono"
            data-testid="starmap-current-system"
          >
            {currentSystem?.name ?? loadedCampaign.currentSystemId ?? 'Terra'}
          </div>
        </div>

        <div className="text-sm">
          <div className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
            Selected destination
          </div>
          <div
            className="text-text-theme-primary font-mono"
            data-testid="starmap-selected-system"
          >
            {selectedSystem?.name ?? '— pick a system —'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleTravel}
          disabled={travelDisabled}
          className="bg-accent text-text-on-accent ml-auto rounded px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="starmap-travel-btn"
        >
          Travel here
        </button>
      </div>

      <div
        className="border-border-theme h-[600px] w-full overflow-hidden rounded border"
        data-testid="starmap-container"
      >
        <StarmapDisplay
          systems={seed.systems.map((s) => ({
            id: s.id,
            name: s.name,
            position: { x: s.position.x, y: s.position.y },
            faction: s.faction,
            population: s.population,
          }))}
          selectedSystem={selectedSystemId}
          onSystemClick={(systemId) => setSelectedSystemId(systemId)}
        />
      </div>

      <div className="text-text-theme-secondary mt-4 text-xs">
        Inner Sphere snapshot — year {seed.meta.snapshotYear}. Coordinates in
        light-years from Terra (+x spinward, +y rimward).
      </div>
    </PageLayout>
  );
}
