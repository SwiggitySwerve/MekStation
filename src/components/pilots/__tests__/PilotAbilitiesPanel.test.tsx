/**
 * PilotAbilitiesPanel — integration tests (Phase 5 Wave 2a).
 *
 * Verifies the happy path (open modal, select SPA, confirm purchase) and
 * the creation-flow removal flow. The pilot store + toast + modal
 * overlay are mocked so the panel renders headlessly.
 *
 * @spec openspec/changes/add-pilot-spa-editor-integration/tasks.md
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IPilot, IPilotAbilityRef } from '@/types/pilot';

import { getAllSPAs } from '@/lib/spa';
import { PilotStatus, PilotType } from '@/types/pilot';

// =============================================================================
// Store + toast mocks
// =============================================================================

const mockPurchaseSPA = jest.fn().mockResolvedValue(true);
const mockRemoveSPA = jest.fn().mockResolvedValue(true);
const mockShowToast = jest.fn();

jest.mock('@/stores/usePilotStore', () => ({
  usePilotStore: () => ({
    purchaseSPA: mockPurchaseSPA,
    removeSPA: mockRemoveSPA,
    error: null,
  }),
}));

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Pass-through ModalOverlay so children render unconditionally when open.
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }) => (isOpen ? <div data-testid="modal-overlay">{children}</div> : null),
}));

// Import after mocks so the component binds the mocked store.
import { PilotAbilitiesPanel } from '../PilotAbilitiesPanel';

// =============================================================================
// Helpers
// =============================================================================

/** Build a minimal pilot fixture with a configurable XP pool + abilities. */
function makePilot(args?: {
  xp?: number;
  abilities?: readonly IPilotAbilityRef[];
}): IPilot {
  const now = new Date().toISOString();
  return {
    id: 'pilot-test',
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: args?.abilities ?? [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: args?.xp ?? 0,
      totalXpEarned: args?.xp ?? 0,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Tests
// =============================================================================

describe('PilotAbilitiesPanel', () => {
  it('opens the picker modal when the Add Ability button is clicked', () => {
    render(<PilotAbilitiesPanel pilot={makePilot({ xp: 1000 })} />);

    expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-ability-btn'));
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    // The picker mounts inside the modal — its testid signals the wiring.
    expect(screen.getByTestId('spa-picker')).toBeInTheDocument();
  });

  it('dispatches purchaseSPA with the selected catalog row', async () => {
    // Pick a row with no designation so a single click confirms.
    const allSpas = getAllSPAs();
    const target = allSpas.find(
      (s) =>
        !s.requiresDesignation &&
        !s.isOriginOnly &&
        !s.isFlaw &&
        s.xpCost !== null &&
        s.xpCost > 0,
    );
    expect(target).toBeDefined();

    render(
      <PilotAbilitiesPanel
        pilot={makePilot({ xp: (target!.xpCost ?? 0) + 200 })}
      />,
    );
    fireEvent.click(screen.getByTestId('add-ability-btn'));

    const row = await screen.findByTestId(`spa-item-${target!.id}`);
    const selectBtn = row.querySelector('button');
    expect(selectBtn).toBeTruthy();
    fireEvent.click(selectBtn!);

    await waitFor(() => {
      expect(mockPurchaseSPA).toHaveBeenCalledWith(
        'pilot-test',
        target!.id,
        expect.objectContaining({ isCreationFlow: false }),
      );
    });
  });

  it('renders Remove disabled outside the creation flow', () => {
    const owned: IPilotAbilityRef = {
      abilityId: getAllSPAs()[0].id,
      acquiredDate: new Date().toISOString(),
      xpSpent: getAllSPAs()[0].xpCost ?? 0,
    };
    render(
      <PilotAbilitiesPanel pilot={makePilot({ xp: 0, abilities: [owned] })} />,
    );

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    expect(removeBtn).toBeDisabled();
    expect(mockRemoveSPA).not.toHaveBeenCalled();
  });

  it('calls removeSPA with isCreationFlow=true when removing during creation', async () => {
    const ability = getAllSPAs()[0];
    const owned: IPilotAbilityRef = {
      abilityId: ability.id,
      acquiredDate: new Date().toISOString(),
      xpSpent: ability.xpCost ?? 0,
    };
    render(
      <PilotAbilitiesPanel
        pilot={makePilot({ xp: 0, abilities: [owned] })}
        isCreationFlow={true}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    expect(removeBtn).not.toBeDisabled();
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockRemoveSPA).toHaveBeenCalledWith('pilot-test', ability.id, {
        isCreationFlow: true,
      });
    });
  });
});
