/**
 * Campaign Mech Bay Page
 *
 * The roster-wide unit-status grid — the post-battle hub (CP2a,
 * design D2). One row per roster unit with damage state, repair-ticket
 * count, and a drill-down to the unit's Repair Bay detail.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import React, { useState } from 'react';

import { MechBay } from '@/components/campaign/bays/MechBay';
import { RefitLaunchPanel } from '@/components/campaign/bays/RefitLaunchPanel';
import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { resolveUnitConfiguration } from '@/lib/campaign/refit/unitConfiguration';
import * as CampaignShell from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { commitRefitOrder } from '@/stores/campaign/campaignRefitActions';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

const MECH_BAY_LOADING = {
  title: 'Mech Bay',
  subtitle: 'Loading bay...',
  variant: 'bay',
} as const;

export default function MechBayPage(): React.ReactElement {
  const shell = CampaignShell.useCampaignPageShell('Mech Bay');
  const units = useCampaignRosterStore((state) => state.units);
  const pilots = useCampaignRosterStore((state) => state.pilots);
  const activeMissionRecord = useCampaignRosterStore((state) =>
    state.getActiveMission(),
  );
  const loadStatus = CampaignShell.useCampaignLoadStatus();
  // The unit currently selected for the refit launch flow (CP3, design D6).
  const [refitUnitId, setRefitUnitId] = useState<string | null>(null);

  const pendingPage = CampaignShell.renderPendingCampaignPage(
    shell,
    MECH_BAY_LOADING,
  );
  if (pendingPage) return pendingPage;

  const campaign = CampaignShell.getLoadedCampaign(shell);
  const repairBay = selectRepairBay(campaign);
  const activeMission = activeMissionRecord
    ? campaign.missions.get(activeMissionRecord.id)
    : undefined;
  const readinessProjection = buildMissionReadinessProjection({
    campaignId: campaign.id,
    mission: activeMission,
    units,
    pilots,
    repairBay,
    maxUnits: 4,
    baseCampaignHref: `/gameplay/campaigns/${encodeURIComponent(campaign.id)}`,
  });
  const readinessByUnitId = new Map(
    readinessProjection.units.map((unit) => [unit.unit.unitId, unit]),
  );
  const unitTonnageById = new Map(
    Object.entries(campaign.unitConfigurations ?? {}).map(
      ([unitId, config]) => [unitId, config.tonnage],
    ),
  );
  const frame = {
    title: 'Mech Bay',
    subtitle: `${campaign.name} — ${units.length} units`,
    currentPage: 'mech-bay',
    coopRouteId: 'mech-bay',
  } as const;
  const saveError = CampaignShell.renderCampaignBaySaveError(
    campaign.id,
    loadStatus,
  );

  // The unit selected for refit, and its current configuration.
  const refitUnit = refitUnitId
    ? (units.find((u) => u.unitId === refitUnitId) ?? null)
    : null;
  const refitCurrentConfig = refitUnit
    ? resolveUnitConfiguration(campaign, refitUnit.unitId)
    : null;

  return (
    <CampaignShell.CampaignPageFrameFromShell shell={shell} frame={frame}>
      {saveError ?? (
        <>
          {/* Refit launch flow (CP3, design D6) — opens above the grid
              when the player picks a unit's Refit affordance. */}
          {refitUnit && refitCurrentConfig ? (
            <div className="mb-6">
              <RefitLaunchPanel
                unitId={refitUnit.unitId}
                unitName={refitUnit.unitName}
                currentConfiguration={refitCurrentConfig}
                onCommit={(target) =>
                  commitRefitOrder({
                    unitId: refitUnit.unitId,
                    currentConfiguration: refitCurrentConfig,
                    targetConfiguration: target,
                  })
                }
                onCancel={() => setRefitUnitId(null)}
              />
            </div>
          ) : null}

          <MechBay
            units={units}
            readinessByUnitId={readinessByUnitId}
            unitTonnageById={unitTonnageById}
            repairBay={repairBay}
            campaignId={campaign.id}
            onLaunchRefit={(unitId) => setRefitUnitId(unitId)}
          />
        </>
      )}
    </CampaignShell.CampaignPageFrameFromShell>
  );
}
