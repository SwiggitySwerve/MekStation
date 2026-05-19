/**
 * Bay Inventory Integration — end-to-end projection → render
 *
 * Covers tasks.md 6.1: after a campaign battle and day advancement, all
 * four bays render the projected `ICampaignInventory`. This test exercises
 * the real `projectCampaignInventory` → `attachCampaignInventory` →
 * bay-selector → bay-component path so the contract between CP1's
 * projection and CP2a's surfaces is verified, not mocked.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import { MechBay } from '@/components/campaign/bays/MechBay';
import { MedicalBay } from '@/components/campaign/bays/MedicalBay';
import { RepairBay } from '@/components/campaign/bays/RepairBay';
import { SalvageAcceptancePanel } from '@/components/campaign/bays/SalvageAcceptancePanel';
import { attachCampaignInventory } from '@/lib/campaign/processors/inventoryProjectionProcessor';
import {
  selectMedicalBay,
  selectRepairBay,
  selectSalvageBay,
} from '@/stores/campaign/campaignBaySelectors';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { DamageLevel } from '@/types/campaign/Salvage';

import { SAMPLE_ROSTER_UNITS } from '../__fixtures__/bayFixtures';

// =============================================================================
// Post-battle campaign fixture
// =============================================================================

/** A repair ticket as the post-battle repair-queue builder would emit. */
function makeTicket(overrides: Partial<IRepairTicket>): IRepairTicket {
  return {
    ticketId: 'ticket-x',
    unitId: 'unit-atlas',
    kind: 'armor',
    location: 'CT',
    expectedHours: 6,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-01-02T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

/** A salvage allocation as the post-battle salvage processor would emit. */
function makeAllocation(): ISalvageAllocation {
  const candidate = {
    source: 'unit' as const,
    unitId: 'enemy-atlas',
    designation: 'Atlas AS7-D',
    destroyedFromBattle: 'match-1',
    finalStatus: 'destroyed' as const,
    damageLevel: DamageLevel.Heavy,
    originalValue: 8_000_000,
    recoveredValue: 2_000_000,
    recoveryPercentage: 0.25,
    repairCostEstimate: 500_000,
    partId: 'salvage-atlas',
    disposition: 'mercenary' as const,
    status: 'pending' as const,
  };
  return {
    pool: {
      battleId: 'match-1',
      contractId: 'contract-1',
      candidates: [candidate],
      totalEstimatedValue: 2_000_000,
      hostileTerritory: false,
    },
    employerAward: {
      side: 'employer',
      candidates: [],
      totalValue: 0,
      estimatedRepairCost: 0,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: [candidate],
      totalValue: 2_000_000,
      estimatedRepairCost: 500_000,
    },
    splitMethod: 'contract',
    processed: true,
  };
}

/** Roster pilots — one injured, one fit. */
const ROSTER_PILOTS: readonly ICampaignRosterEntry[] = [
  {
    pilotId: 'pilot-1',
    pilotName: 'Natasha Kerensky',
    status: CampaignPilotStatus.Wounded,
    wounds: 4,
    recoveryTime: 14,
    xp: 0,
    assignedUnitId: 'unit-atlas',
  } as ICampaignRosterEntry,
  {
    pilotId: 'pilot-2',
    pilotName: 'Morgan Kell',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
  } as ICampaignRosterEntry,
];

/** Build a post-battle campaign with a projected inventory attached. */
function postBattleCampaign(): ICampaign {
  const base = createCampaign('Battle-Tested', 'mercenary');
  const withBattleState = {
    ...base,
    repairQueue: [
      makeTicket({ ticketId: 'ticket-x', unitId: 'unit-atlas' }),
      makeTicket({
        ticketId: 'ticket-y',
        unitId: 'unit-locust',
        kind: 'ammo',
        location: undefined,
        expectedHours: 1,
      }),
    ],
    salvageAllocations: { 'match-1': makeAllocation() },
  } as ICampaign;

  // Day advancement's CLEANUP-phase processor attaches the inventory.
  return attachCampaignInventory(
    withBattleState,
    ROSTER_PILOTS,
    '3025-01-02T00:00:00.000Z',
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('Bay inventory integration', () => {
  const campaign = postBattleCampaign();

  it('the Mech Bay renders the projected repair-ticket counts', () => {
    const repairBay = selectRepairBay(campaign);
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={repairBay}
        campaignId={campaign.id}
      />,
    );
    // unit-atlas has 1 projected ticket, unit-locust has 1.
    expect(
      screen.getByTestId('mech-bay-ticket-count-unit-atlas'),
    ).toHaveTextContent('1 ticket');
    expect(
      screen.getByTestId('mech-bay-ticket-count-unit-locust'),
    ).toHaveTextContent('1 ticket');
  });

  it('the Repair Bay renders the projected tickets grouped by unit', () => {
    const repairBay = selectRepairBay(campaign);
    render(<RepairBay repairBay={repairBay} onReorder={() => {}} />);
    expect(
      screen.getByTestId('repair-unit-group-unit-atlas'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('repair-unit-group-unit-locust'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('repair-ticket-ticket-x')).toBeInTheDocument();
  });

  it('the Medical Bay renders the projected injured pilot', () => {
    const medicalBay = selectMedicalBay(campaign);
    render(<MedicalBay medicalBay={medicalBay} />);
    // Only the wounded pilot is projected — the active pilot is excluded.
    expect(screen.getByTestId('medical-bay-row-pilot-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('medical-bay-row-pilot-2'),
    ).not.toBeInTheDocument();
  });

  it('the Salvage panel renders the projected mercenary-share candidate', () => {
    const salvageBay = selectSalvageBay(campaign);
    render(
      <SalvageAcceptancePanel salvageBay={salvageBay} onDecide={() => {}} />,
    );
    expect(screen.getByTestId('salvage-row-salvage-atlas')).toBeInTheDocument();
  });

  it('a battle-free campaign produces empty bays on every surface', () => {
    const fresh = attachCampaignInventory(
      createCampaign('Fresh', 'mercenary'),
      [],
      '3025-01-01T00:00:00.000Z',
    );
    expect(selectRepairBay(fresh)).toEqual([]);
    expect(selectSalvageBay(fresh)).toEqual([]);
    expect(selectMedicalBay(fresh)).toEqual([]);

    render(
      <RepairBay repairBay={selectRepairBay(fresh)} onReorder={() => {}} />,
    );
    expect(screen.getByTestId('bay-empty')).toBeInTheDocument();
  });
});
