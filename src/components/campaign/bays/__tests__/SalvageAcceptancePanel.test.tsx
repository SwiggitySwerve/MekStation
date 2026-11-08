/**
 * Salvage Acceptance Panel — render tests
 *
 * Covers tasks.md 5.6 and the spec scenarios "Accepting a salvage item
 * persists its status", "Declining a salvage item excludes it from the
 * total", "Value total is a pure projection", "Salvage Acceptance empty
 * state".
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ISalvageBayItem } from '@/types/campaign/CampaignInventory';

import { projectCampaignInventory } from '@/lib/campaign/inventory/projectCampaignInventory';
import { createCampaign } from '@/types/campaign/Campaign';
import { DamageLevel } from '@/types/campaign/Salvage';

import { SAMPLE_SALVAGE_BAY } from '../__fixtures__/bayFixtures';
import { SalvageAcceptancePanel } from '../SalvageAcceptancePanel';

describe('SalvageAcceptancePanel', () => {
  it('allows accepting an awarded unit before enrollment', () => {
    const candidate = {
      source: 'unit' as const,
      unitId: 'awarded-atlas',
      designation: 'Atlas AS7-D',
      destroyedFromBattle: 'battle-award',
      finalStatus: 'crippled' as const,
      damageLevel: DamageLevel.Heavy,
      originalValue: 400_000,
      recoveredValue: 100_000,
      recoveryPercentage: 0.25,
      repairCostEstimate: 300_000,
      disposition: 'mercenary' as const,
      status: 'awarded' as const,
    };
    const campaign = {
      ...createCampaign('Awarded salvage', 'mercenary'),
      salvageAllocations: {
        'battle-award': {
          pool: {
            battleId: 'battle-award',
            contractId: null,
            candidates: [candidate],
            totalEstimatedValue: 100_000,
            hostileTerritory: false,
          },
          mercenaryAward: {
            side: 'mercenary' as const,
            candidates: [candidate],
            totalValue: 100_000,
            estimatedRepairCost: 300_000,
          },
          employerAward: {
            side: 'employer' as const,
            candidates: [],
            totalValue: 0,
            estimatedRepairCost: 0,
          },
          splitMethod: 'contract' as const,
          processed: true,
        },
      },
    };
    const onDecide = jest.fn();
    render(
      <SalvageAcceptancePanel
        salvageBay={
          projectCampaignInventory(campaign, [], '2026-11-08T00:00:00Z')
            .salvageBay
        }
        onDecide={onDecide}
      />,
    );
    expect(screen.getByTestId('salvage-accept-awarded-atlas')).toBeEnabled();
    expect(screen.getByTestId('salvage-value-total')).toHaveTextContent(
      '0 C-Bills',
    );
    fireEvent.click(screen.getByTestId('salvage-accept-awarded-atlas'));
    expect(onDecide).toHaveBeenCalledWith('awarded-atlas', 'accepted');
  });

  it('disables both decisions for accepted salvage', () => {
    const onDecide = jest.fn();
    render(
      <SalvageAcceptancePanel
        salvageBay={[{ ...SAMPLE_SALVAGE_BAY[0], status: 'accepted' }]}
        onDecide={onDecide}
      />,
    );
    expect(screen.getByTestId('salvage-accept-salvage-atlas')).toBeDisabled();
    expect(screen.getByTestId('salvage-decline-salvage-atlas')).toBeDisabled();
    fireEvent.click(screen.getByTestId('salvage-decline-salvage-atlas'));
    expect(onDecide).not.toHaveBeenCalled();
  });

  it('renders a row for every salvage candidate', () => {
    render(
      <SalvageAcceptancePanel
        salvageBay={SAMPLE_SALVAGE_BAY}
        onDecide={() => {}}
      />,
    );
    for (const item of SAMPLE_SALVAGE_BAY) {
      expect(
        screen.getByTestId(`salvage-row-${item.partId}`),
      ).toBeInTheDocument();
    }
  });

  it('accept calls onDecide with the accepted decision', () => {
    const onDecide = jest.fn();
    render(
      <SalvageAcceptancePanel
        salvageBay={SAMPLE_SALVAGE_BAY}
        onDecide={onDecide}
      />,
    );
    fireEvent.click(screen.getByTestId('salvage-accept-salvage-atlas'));
    expect(onDecide).toHaveBeenCalledWith('salvage-atlas', 'accepted');
  });

  it('decline calls onDecide with the declined decision', () => {
    const onDecide = jest.fn();
    render(
      <SalvageAcceptancePanel
        salvageBay={SAMPLE_SALVAGE_BAY}
        onDecide={onDecide}
      />,
    );
    fireEvent.click(screen.getByTestId('salvage-decline-salvage-atlas'));
    expect(onDecide).toHaveBeenCalledWith('salvage-atlas', 'declined');
  });

  it('the value total sums only accepted items', () => {
    render(
      <SalvageAcceptancePanel
        salvageBay={SAMPLE_SALVAGE_BAY}
        onDecide={() => {}}
      />,
    );
    // SAMPLE_SALVAGE_BAY has one accepted item worth 200,000.
    expect(screen.getByTestId('salvage-value-total')).toHaveTextContent(
      '200,000 C-Bills',
    );
  });

  it('declined items are excluded from the total', () => {
    // Two accepted (4,000,000 + 200,000), one declined.
    const bay: ISalvageBayItem[] = [
      { ...SAMPLE_SALVAGE_BAY[0], status: 'accepted' },
      { ...SAMPLE_SALVAGE_BAY[1], status: 'accepted' },
      { ...SAMPLE_SALVAGE_BAY[2], status: 'declined' },
    ];
    render(<SalvageAcceptancePanel salvageBay={bay} onDecide={() => {}} />);
    // 4,000,000 + 200,000 = 4,200,000 — the declined 60,000 is excluded.
    expect(screen.getByTestId('salvage-value-total')).toHaveTextContent(
      '4,200,000 C-Bills',
    );
  });

  it('the total recomputes without double-counting when status toggles', () => {
    // Flip the declined item to accepted — the total should grow by
    // exactly its recovered value, with no incremental drift.
    const before: ISalvageBayItem[] = [
      { ...SAMPLE_SALVAGE_BAY[1], status: 'accepted' }, // 200,000
      { ...SAMPLE_SALVAGE_BAY[2], status: 'declined' }, // 60,000
    ];
    const { rerender } = render(
      <SalvageAcceptancePanel salvageBay={before} onDecide={() => {}} />,
    );
    expect(screen.getByTestId('salvage-value-total')).toHaveTextContent(
      '200,000 C-Bills',
    );

    const after: ISalvageBayItem[] = [
      { ...SAMPLE_SALVAGE_BAY[1], status: 'accepted' },
      { ...SAMPLE_SALVAGE_BAY[2], status: 'accepted' },
    ];
    rerender(<SalvageAcceptancePanel salvageBay={after} onDecide={() => {}} />);
    expect(screen.getByTestId('salvage-value-total')).toHaveTextContent(
      '260,000 C-Bills',
    );
  });

  it('shows an empty state — not an error — when there is no salvage', () => {
    render(<SalvageAcceptancePanel salvageBay={[]} onDecide={() => {}} />);
    expect(screen.getByTestId('bay-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('bay-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('salvage-panel')).not.toBeInTheDocument();
  });
});
