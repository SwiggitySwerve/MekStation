import React, { useEffect, useMemo, useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { StarmapDisplay } from '@/components/campaign/StarmapDisplay';
import { PageLayout } from '@/components/ui';
import { loadInnerSphereSeed } from '@/lib/starmap/loadInnerSphereSeed';
import {
  buildStarmapSystemLenses,
  type IStarmapSystemLens,
} from '@/lib/starmap/starmapTravelLenses';
import { type IStarmapTravelPreview } from '@/lib/starmap/starmapTravelPreview';
import {
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';

type SystemAnnotationTone = 'safe' | 'warn' | 'risk';

export default function CampaignStarmapPage(): React.ReactElement {
  const shell = useCampaignPageShell('Starmap');
  const campaign = shell.campaign;
  const store = shell.store;
  const seed = useMemo(() => loadInnerSphereSeed(), []);

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

  const selectedSystem = useMemo(
    () => seed.systems.find((system) => system.id === selectedSystemId),
    [seed.systems, selectedSystemId],
  );

  const currentSystem = useMemo(
    () =>
      seed.systems.find(
        (system) => system.id === (campaignCurrentSystemId ?? 'terra'),
      ),
    [campaignCurrentSystemId, seed.systems],
  );

  const travelPreview = useMemo(
    () =>
      campaign
        ? store.getState().previewTravelToSystem(selectedSystemId)
        : null,
    [campaign, selectedSystemId, store],
  );

  const systemLenses = useMemo(
    () => (campaign ? buildStarmapSystemLenses(campaign, seed.systems) : []),
    [campaign, seed.systems],
  );

  const selectedLens = useMemo(
    () => systemLenses.find((lens) => lens.systemId === selectedSystemId),
    [selectedSystemId, systemLenses],
  );

  const systemAnnotations = useMemo(
    () =>
      Object.fromEntries(
        systemLenses.map((lens) => [
          lens.systemId,
          {
            label: lens.badges.slice(0, 2).join(' '),
            tone: annotationToneForLens(lens),
          },
        ]),
      ),
    [systemLenses],
  );

  const pending = renderPendingCampaignPage(shell, {
    title: 'Starmap',
    subtitle: 'Loading Inner Sphere map...',
  });
  if (pending) return pending;

  const loadedCampaign = getLoadedCampaign(shell);

  const handleTravel = (): void => {
    if (!selectedSystemId) return;
    store.getState().travelToSystem(selectedSystemId);
  };

  const travelDisabled = travelPreview?.status !== 'ready';

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

      <div
        className="border-border-theme bg-surface-theme mb-4 grid gap-4 rounded border p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]"
        data-testid="starmap-travel-controls"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-sm">
              <div className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
                Current location
              </div>
              <div
                className="text-text-theme-primary font-mono"
                data-testid="starmap-current-system"
              >
                {currentSystem?.name ??
                  loadedCampaign.currentSystemId ??
                  'Terra'}
              </div>
            </div>

            <label className="text-sm sm:col-span-2">
              <span className="text-text-theme-secondary block text-xs font-semibold tracking-wider uppercase">
                Destination
              </span>
              <select
                value={selectedSystemId}
                onChange={(event) => setSelectedSystemId(event.target.value)}
                className="border-border-theme bg-background-theme text-text-theme-primary mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
                data-testid="starmap-destination-select"
              >
                {seed.systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Metric
              label="Status"
              value={travelPreview?.status ?? 'blocked'}
              testId="starmap-route-status"
            />
            <Metric
              label="Jumps"
              value={String(travelPreview?.jumpCount ?? 0)}
              testId="starmap-jump-count"
            />
            <Metric
              label="Elapsed"
              value={`${travelPreview?.elapsedDays ?? 0} days`}
              testId="starmap-elapsed-days"
            />
            <Metric
              label="Arrival"
              value={formatDate(travelPreview?.arrivalDate)}
              testId="starmap-arrival-date"
            />
          </div>

          {renderPreviewDetails(travelPreview)}
        </div>

        <div className="border-border-theme-subtle border-l-0 pt-0 lg:border-l lg:pl-4">
          {renderLensDetails(selectedLens, selectedSystem)}
          <button
            type="button"
            onClick={handleTravel}
            disabled={travelDisabled}
            className="bg-accent text-text-on-accent mt-4 w-full rounded px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="starmap-travel-btn"
          >
            Approve travel
          </button>
        </div>
      </div>

      <div
        className="border-border-theme h-[600px] w-full overflow-hidden rounded border"
        data-testid="starmap-container"
      >
        <StarmapDisplay
          systems={seed.systems.map((system) => ({
            id: system.id,
            name: system.name,
            position: { x: system.position.x, y: system.position.y },
            faction: system.faction,
            population: system.population,
          }))}
          selectedSystem={selectedSystemId}
          systemAnnotations={systemAnnotations}
          onSystemClick={(systemId) => setSelectedSystemId(systemId)}
        />
      </div>

      <div className="text-text-theme-secondary mt-4 text-xs">
        Inner Sphere snapshot - year {seed.meta.snapshotYear}. Coordinates in
        light-years from Terra (+x spinward, +y rimward).
      </div>
    </PageLayout>
  );
}

function Metric({
  label,
  testId,
  value,
}: {
  readonly label: string;
  readonly testId: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle bg-background-theme rounded border px-3 py-2 text-sm">
      <div className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className="text-text-theme-primary font-mono" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function renderPreviewDetails(
  preview: IStarmapTravelPreview | null,
): React.ReactElement {
  if (!preview) {
    return (
      <div
        className="text-text-theme-secondary text-sm"
        data-testid="starmap-travel-preview"
      >
        No route selected.
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm" data-testid="starmap-travel-preview">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Travel fees"
          value={preview.travelFees.format()}
          testId="starmap-travel-fees"
        />
        <Metric
          label="Upkeep"
          value={preview.dailyCosts.format()}
          testId="starmap-daily-costs"
        />
        <Metric
          label="Projected funds"
          value={preview.projectedFunds.format()}
          testId="starmap-projected-funds"
        />
      </div>

      {preview.reasons.length > 0 ? (
        <ul className="text-danger space-y-1" data-testid="starmap-blockers">
          {preview.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {preview.routeLegs.slice(0, 4).map((leg) => (
          <div
            key={leg.index}
            className="border-border-theme-subtle bg-background-theme rounded border px-3 py-2"
            data-testid="starmap-route-leg"
          >
            <div className="text-text-theme-secondary text-xs font-semibold uppercase">
              Leg {leg.index}
            </div>
            <div className="text-text-theme-primary font-mono">
              {formatDistance(leg.distanceLy)} LY
            </div>
            <div className="text-text-theme-secondary text-xs">
              {leg.fromLabel} to {leg.toLabel}
            </div>
          </div>
        ))}
      </div>

      {preview.deadlineWarnings.length > 0 ? (
        <div
          className="border-warning/40 bg-warning/10 rounded border px-3 py-2 text-xs"
          data-testid="starmap-deadline-warning"
        >
          {preview.deadlineWarnings[0].missionName} is projected{' '}
          {preview.deadlineWarnings[0].daysLate} day(s) late.
        </div>
      ) : null}

      <div className="text-text-theme-secondary text-xs">
        Repair: {preview.progressSummary.repairProgressEvents} progress,{' '}
        {preview.progressSummary.repairCompletedEvents} complete,{' '}
        {preview.progressSummary.repairBlockedEvents} blocked. Medical:{' '}
        {preview.progressSummary.medicalSummary}
      </div>
    </div>
  );
}

function renderLensDetails(
  lens: IStarmapSystemLens | undefined,
  selectedSystem: { readonly name: string } | undefined,
): React.ReactElement {
  if (!lens) {
    return (
      <div
        className="text-text-theme-secondary text-sm"
        data-testid="starmap-lens-panel"
      >
        No destination lens.
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm" data-testid="starmap-lens-panel">
      <div>
        <div className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
          Selected destination
        </div>
        <div
          className="text-text-theme-primary font-mono"
          data-testid="starmap-selected-system"
        >
          {selectedSystem?.name ?? lens.systemName}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Faction"
          value={lens.faction}
          testId="starmap-lens-faction"
        />
        <Metric
          label="Risk"
          value={lens.riskLevel}
          testId="starmap-lens-risk"
        />
        <Metric
          label="Market"
          value={lens.marketQuality}
          testId="starmap-lens-market"
        />
        <Metric
          label="Contracts"
          value={String(lens.contractCount)}
          testId="starmap-lens-contracts"
        />
      </div>
      <div className="text-text-theme-secondary text-xs">
        {lens.inSingleJumpRange
          ? 'Single-jump reachable.'
          : `${lens.jumpsRequired} jump route.`}{' '}
        {lens.nearestDeadlineDate
          ? `Nearest deadline ${formatDate(lens.nearestDeadlineDate)}.`
          : 'No local deadline pressure.'}
      </div>
    </div>
  );
}

function annotationToneForLens(lens: IStarmapSystemLens): SystemAnnotationTone {
  if (lens.riskLevel === 'high' || !lens.withinTravelOrderRange) return 'risk';
  if (lens.contractCount > 0 || lens.riskLevel === 'medium') return 'warn';
  return 'safe';
}

function formatDate(value: string | undefined): string {
  return value ? value.slice(0, 10) : '--';
}

function formatDistance(value: number): string {
  return value.toFixed(1);
}
