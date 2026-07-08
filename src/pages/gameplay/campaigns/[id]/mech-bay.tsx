/**
 * Campaign Mech Bay Page
 *
 * The roster-wide unit-status grid — the post-battle hub (CP2a,
 * design D2). One row per roster unit with damage state, repair-ticket
 * count, and a drill-down to the unit's Repair Bay detail.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import React, { useEffect, useState } from 'react';

import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { MechBay } from '@/components/campaign/bays/MechBay';
import { buildCampaignCustomizerHref } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import * as CampaignShell from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { generateUUID } from '@/utils/uuid';

const MECH_BAY_LOADING = {
  title: 'Mech Bay',
  subtitle: 'Loading bay...',
  variant: 'bay',
} as const;

interface UnitsIndexApiResponse {
  readonly success: boolean;
  readonly data?: unknown;
}

export interface MechBayUnitLoadoutMaps {
  readonly unitTonnageById: ReadonlyMap<string, number>;
  readonly unitBattleValueById: ReadonlyMap<string, number>;
}

function isUnitIndexEntryArray(value: unknown): value is IUnitIndexEntry[] {
  return Array.isArray(value);
}

async function loadCanonicalIndexWithBV(): Promise<readonly IUnitIndexEntry[]> {
  try {
    const response = await fetch('/api/units?includeBV=true');
    if (!response.ok) return [];

    const payload = (await response.json()) as UnitsIndexApiResponse;
    if (!payload.success || !isUnitIndexEntryArray(payload.data)) {
      return [];
    }
    return payload.data;
  } catch {
    return [];
  }
}

export function buildMechBayUnitLoadoutMaps({
  units,
  unitConfigurations,
  canonicalIndex,
}: {
  readonly units: readonly {
    readonly unitId: string;
    readonly unitRef?: string;
  }[];
  readonly unitConfigurations?: Readonly<
    Record<string, { readonly tonnage: number }>
  >;
  readonly canonicalIndex: readonly IUnitIndexEntry[];
}): MechBayUnitLoadoutMaps {
  const canonicalByUnitRef = new Map(
    canonicalIndex.map((entry) => [entry.id, entry]),
  );
  const unitTonnageById = new Map<string, number>();
  const unitBattleValueById = new Map<string, number>();

  for (const unit of units) {
    const canonicalEntry = unit.unitRef
      ? canonicalByUnitRef.get(unit.unitRef)
      : undefined;
    const configuredTonnage = unitConfigurations?.[unit.unitId]?.tonnage;
    const resolvedTonnage = configuredTonnage ?? canonicalEntry?.tonnage;
    if (resolvedTonnage) {
      unitTonnageById.set(unit.unitId, resolvedTonnage);
    }
    if (canonicalEntry?.bv) {
      unitBattleValueById.set(unit.unitId, canonicalEntry.bv);
    }
  }

  return { unitTonnageById, unitBattleValueById };
}

export default function MechBayPage(): React.ReactElement {
  const shell = CampaignShell.useCampaignPageShell('Mech Bay');
  const units = useCampaignRosterStore((state) => state.units);
  const pilots = useCampaignRosterStore((state) => state.pilots);
  const activeMissionRecord = useCampaignRosterStore((state) =>
    state.getActiveMission(),
  );
  const loadStatus = CampaignShell.useCampaignLoadStatus();
  const [canonicalUnitIndex, setCanonicalUnitIndex] = useState<
    readonly IUnitIndexEntry[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const loadCanonicalIndex = async () => {
      const index = await loadCanonicalIndexWithBV();
      if (!cancelled) {
        setCanonicalUnitIndex([...index]);
      }
    };
    void loadCanonicalIndex();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const { unitTonnageById, unitBattleValueById } = buildMechBayUnitLoadoutMaps({
    units,
    unitConfigurations: campaign.unitConfigurations,
    canonicalIndex: canonicalUnitIndex,
  });
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

  return (
    <CampaignShell.CampaignPageFrameFromShell shell={shell} frame={frame}>
      {saveError ?? (
        <>
          {/* Refit launch flow (CP3, design D6) — opens above the grid
              when the player picks a unit's Refit affordance. */}
          <MechBay
            units={units}
            readinessByUnitId={readinessByUnitId}
            unitTonnageById={unitTonnageById}
            unitBattleValueById={unitBattleValueById}
            repairBay={repairBay}
            campaignId={campaign.id}
            onLaunchRefit={(unitId) => {
              window.location.assign(
                buildCampaignCustomizerHref({
                  campaignId: campaign.id,
                  unitId,
                  missionId: activeMissionRecord?.id,
                  returnTo: 'mek-stable',
                  campaignDate: campaign.currentDate.toISOString(),
                  budget: campaign.finances.balance.amount,
                  rulesLevel: RulesLevel.STANDARD,
                  refitConstraints: 'campaign-owned-refit',
                  editorUnitId: generateUUID(),
                }),
              );
            }}
          />
        </>
      )}
    </CampaignShell.CampaignPageFrameFromShell>
  );
}
