/**
 * D-3 wiring seam test (2026-06-09 audit, W3.3): the preset selected on
 * the wizard's Preset step must actually configure the created campaign.
 *
 * Before the fix, `handleSubmit` called `createCampaign(name, type)`
 * without an options argument, so `applyPreset` had no production caller
 * and every campaign silently got bare defaults regardless of the card
 * the user clicked — the preset step was cosmetic.
 *
 * These tests exercise the WIRING (wizard UI -> campaign store), not the
 * preset module in isolation: they walk the real wizard, click a real
 * preset card, submit, and read the resulting options off the REAL
 * campaign store.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// =============================================================================
// Mocks — router + toast only. The campaign/roster stores are REAL so the
// test proves the production seam, not a mocked stand-in.
// =============================================================================

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: {},
    pathname: '/gameplay/campaigns/create',
  }),
}));

const mockShowToast = jest.fn();
jest.mock('@/components/shared/Toast', () => {
  const actual = jest.requireActual('@/components/shared/Toast');
  return {
    ...actual,
    useToast: () => ({ showToast: mockShowToast }),
  };
});

import CreateCampaignPage from '@/components/gameplay/pages/campaigns/create/CreateCampaignPage';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Walk the 5-step wizard to submission: name -> type (default Mercenary)
 * -> preset (click the given card) -> roster (empty) -> review -> submit.
 */
async function createCampaignViaWizard(preset?: CampaignPreset): Promise<void> {
  fireEvent.change(screen.getByTestId('campaign-name-input'), {
    target: { value: 'Preset Seam Co.' },
  });
  fireEvent.click(screen.getByTestId('wizard-next-btn')); // -> Type
  fireEvent.click(screen.getByTestId('wizard-next-btn')); // -> Preset
  if (preset) {
    // PresetCard stamps `data-testid="template-<presetId>"`.
    fireEvent.click(screen.getByTestId(`template-${preset}`));
  }
  fireEvent.click(screen.getByTestId('wizard-next-btn')); // -> Roster
  fireEvent.click(screen.getByTestId('wizard-next-btn')); // -> Review
  await act(async () => {
    fireEvent.click(screen.getByTestId('wizard-submit-btn'));
  });
}

function resetWorld(): void {
  resetCampaignStore();
  clientSafeStorage.removeItem('campaign-store');
  mockRouterPush.mockClear();
  mockShowToast.mockClear();
}

// =============================================================================
// Tests
// =============================================================================

describe('CreateCampaignPage — preset selection configures the campaign (D-3)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('creating a campaign with the Casual preset applies the Casual overrides', async () => {
    render(<CreateCampaignPage />);
    await createCampaignViaWizard(CampaignPreset.CASUAL);

    const campaign = useCampaignStore().getState().getCampaign();
    expect(campaign).not.toBeNull();
    // PRESET_CASUAL overrides — each differs from the bare defaults
    // (healing 1.0, maintenanceCycleDays 7, payForMaintenance true,
    // useTaxes true), so all four fail when the preset is cosmetic.
    expect(campaign?.options.healingRateMultiplier).toBe(2.0);
    expect(campaign?.options.maintenanceCycleDays).toBe(0);
    expect(campaign?.options.payForMaintenance).toBe(false);
    expect(campaign?.options.useTaxes).toBe(false);
    expect(campaign?.options.useTurnover).toBe(false);
  });

  it('the default Standard preset applies the Standard overrides (not bare defaults)', async () => {
    render(<CreateCampaignPage />);
    // No preset click — STANDARD is the wizard's initial selection.
    await createCampaignViaWizard();

    const campaign = useCampaignStore().getState().getCampaign();
    expect(campaign).not.toBeNull();
    // PRESET_STANDARD overrides that differ from bare defaults:
    // useRoleBasedSalaries default false, useTaxes default true.
    expect(campaign?.options.useRoleBasedSalaries).toBe(true);
    expect(campaign?.options.useTaxes).toBe(false);
    expect(campaign?.options.useTurnover).toBe(true);
  });
});
