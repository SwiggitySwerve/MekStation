import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { buildCampaignEditorUnitState } from '@/lib/campaign/customizer/campaignCustomizerSession';
import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { commitRefitOrder } from '@/stores/campaign/campaignRefitActions';
import { UnitStoreContext, createUnitStore } from '@/stores/useUnitStore';
import { RefitClass } from '@/types/campaign/Refit';
import { RulesLevel } from '@/types/enums/RulesLevel';

import { CampaignCustomizerSessionProvider } from '../CampaignCustomizerSessionContext';
import { CampaignRefitCommandBar } from '../CampaignRefitCommandBar';

const mockPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/stores/campaign/campaignRefitActions', () => ({
  commitRefitOrder: jest.fn(),
}));

const mockCommitRefitOrder = commitRefitOrder as jest.MockedFunction<
  typeof commitRefitOrder
>;

function renderCommandBar(options?: { readonly invalid?: boolean }) {
  const unit = {
    unitId: 'campaign-unit-atlas',
    unitName: 'Atlas',
    chassisVariant: 'AS7-D',
    readiness: 'Ready' as const,
  };
  const route = {
    mode: 'campaign-refit' as const,
    campaignId: 'campaign-1',
    unitId: unit.unitId,
    missionId: 'mission-1',
    returnTo: 'mission-readiness' as const,
    campaignDate: '3025-01-03T00:00:00.000Z',
    budget: 1000000,
    rulesLevel: RulesLevel.STANDARD,
    refitConstraints: 'campaign-owned-refit',
    editorUnitId: '11111111-1111-4111-8111-111111111111',
  };
  const state = buildCampaignEditorUnitState({
    editorUnitId: route.editorUnitId,
    unit,
    currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
    rulesLevel: RulesLevel.STANDARD,
  });
  const store = createUnitStore({
    ...state,
    engineRating: options?.invalid ? 9999 : state.engineRating,
  });
  const onTabChange = jest.fn();
  render(
    <CampaignCustomizerSessionProvider
      session={{
        route,
        unit,
        campaignName: 'Gray Death Legion',
        currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
        returnHref: '/gameplay/campaigns/campaign-1/missions/mission-1/launch',
      }}
    >
      <UnitStoreContext.Provider value={store}>
        <CampaignRefitCommandBar onTabChange={onTabChange} />
      </UnitStoreContext.Provider>
    </CampaignCustomizerSessionProvider>,
  );
  return { onTabChange, route };
}

describe('CampaignRefitCommandBar', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCommitRefitOrder.mockReset().mockReturnValue({
      applied: true,
      order: {
        id: 'refit-1',
        unitId: 'campaign-unit-atlas',
        targetConfiguration: DEFAULT_UNIT_CONFIGURATION,
        refitClass: RefitClass.EquipmentSwap,
        estimatedCost: 0,
        estimatedHours: 0,
        hoursCompleted: 0,
        status: 'in-progress',
        createdAt: '3025-01-03T00:00:00.000Z',
      },
    });
  });

  it('commits a valid campaign-origin edit as a refit order and returns to readiness', () => {
    renderCommandBar();

    expect(screen.getByTestId('campaign-refit-command-bar')).toHaveTextContent(
      'Campaign refit: Atlas',
    );

    fireEvent.click(screen.getByTestId('campaign-refit-save'));

    expect(mockCommitRefitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        unitId: 'campaign-unit-atlas',
        currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      '/gameplay/campaigns/campaign-1/missions/mission-1/launch?unit=campaign-unit-atlas&refresh=deployment-validation&customizerResult=saved&refitOrderId=refit-1',
    );
  });

  it('blocks invalid refit targets with tab-level resolution controls', () => {
    const { onTabChange } = renderCommandBar({ invalid: true });

    expect(screen.getByTestId('campaign-refit-save')).toBeDisabled();
    expect(screen.getByTestId('campaign-refit-validation')).toHaveTextContent(
      'Resolve before saving',
    );

    const resolutionButton = screen
      .getAllByRole('button')
      .find((button) =>
        /^(structure|armor|overview):/i.test(button.textContent ?? ''),
      );
    expect(resolutionButton).toBeDefined();
    fireEvent.click(resolutionButton!);
    expect(onTabChange).toHaveBeenCalledWith(expect.any(String));
    expect(mockCommitRefitOrder).not.toHaveBeenCalled();
  });
});
