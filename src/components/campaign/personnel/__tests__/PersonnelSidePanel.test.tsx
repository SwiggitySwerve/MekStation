/**
 * PersonnelSidePanel — component tests.
 *
 * Verifies tab wiring, vault-pilot resolution, and the missing-vault-pilot
 * fallback. Mocks the underlying `usePilotById` selector + the wrapped
 * Progression / Abilities panels so this suite stays focused on the side
 * panel's own behavior (tab switch, close, missing-pilot guard).
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { PilotStatus, PilotType, type IPilot } from '@/types/pilot';

// =============================================================================
// Mocks (must be defined before importing the component under test)
// =============================================================================

const mockUsePilotById = jest.fn<IPilot | null, [string | null]>();

jest.mock('@/stores/usePilotStore', () => ({
  usePilotById: (id: string | null) => mockUsePilotById(id),
}));

// Stub the wrapped pilot panels so we only assert on PersonnelSidePanel's
// own DOM. The stubs are visible when the matching tab renders so we can
// confirm the tab switcher mounts the right child.
jest.mock('@/components/pilots/PilotProgressionPanel', () => ({
  PilotProgressionPanel: ({ pilot }: { pilot: IPilot }) => (
    <div data-testid="stub-progression-panel">Progression: {pilot.name}</div>
  ),
}));

jest.mock('@/components/pilots/PilotAbilitiesPanel', () => ({
  PilotAbilitiesPanel: ({ pilot }: { pilot: IPilot }) => (
    <div data-testid="stub-abilities-panel">Abilities: {pilot.name}</div>
  ),
}));

// CrewAssignmentPanel pulls in useForceStore + useRouter; stub it because
// its own behavior is tested separately.
jest.mock('../CrewAssignmentPanel', () => ({
  CrewAssignmentPanel: ({ pilotId }: { pilotId: string }) => (
    <div data-testid="stub-assignment-panel">Assignment: {pilotId}</div>
  ),
}));

import { PersonnelSidePanel } from '../PersonnelSidePanel';

// =============================================================================
// Fixtures
// =============================================================================

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  const now = new Date().toISOString();
  return {
    id: 'pilot-vault-1',
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: 50,
      totalXpEarned: 50,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  mockUsePilotById.mockReset();
});

// =============================================================================
// Tests
// =============================================================================

describe('PersonnelSidePanel', () => {
  it('renders nothing when isOpen is false', () => {
    mockUsePilotById.mockReturnValue(makePilot());

    const { container } = render(
      <PersonnelSidePanel
        pilotId="pilot-vault-1"
        isOpen={false}
        onClose={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('opens with three tabs visible and Progression active by default', () => {
    mockUsePilotById.mockReturnValue(makePilot());

    render(
      <PersonnelSidePanel
        pilotId="pilot-vault-1"
        isOpen={true}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'Progression' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Abilities' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Assignment' })).toBeInTheDocument();
    expect(screen.getByTestId('stub-progression-panel')).toBeInTheDocument();
  });

  it('switches to the Abilities tab and renders the abilities panel', () => {
    mockUsePilotById.mockReturnValue(makePilot());

    render(
      <PersonnelSidePanel
        pilotId="pilot-vault-1"
        isOpen={true}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Abilities' }));
    expect(screen.getByTestId('stub-abilities-panel')).toBeInTheDocument();
    expect(
      screen.queryByTestId('stub-progression-panel'),
    ).not.toBeInTheDocument();
  });

  it('switches to the Assignment tab and renders the assignment panel', () => {
    mockUsePilotById.mockReturnValue(makePilot());

    render(
      <PersonnelSidePanel
        pilotId="pilot-vault-1"
        isOpen={true}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Assignment' }));
    expect(screen.getByTestId('stub-assignment-panel')).toHaveTextContent(
      'Assignment: pilot-vault-1',
    );
  });

  it('resolves a wizard-created vault pilot in the personnel detail panel', () => {
    const wizardPilot = makePilot({
      id: 'vault-pilot-1',
      name: 'MechWarrior 1',
    });
    mockUsePilotById.mockImplementation((pilotId) =>
      pilotId === 'vault-pilot-1' ? wizardPilot : null,
    );

    render(
      <PersonnelSidePanel
        pilotId="vault-pilot-1"
        isOpen={true}
        onClose={jest.fn()}
      />,
    );

    expect(mockUsePilotById).toHaveBeenCalledWith('vault-pilot-1');
    expect(screen.getByTestId('stub-progression-panel')).toHaveTextContent(
      'Progression: MechWarrior 1',
    );
    expect(
      screen.queryByText(/Pilot not found in vault/),
    ).not.toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', () => {
    mockUsePilotById.mockReturnValue(makePilot());
    const onClose = jest.fn();

    render(
      <PersonnelSidePanel
        pilotId="pilot-vault-1"
        isOpen={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId('personnel-side-panel-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the missing-vault-pilot message on Progression and Abilities when usePilotById returns null', () => {
    mockUsePilotById.mockReturnValue(null);

    render(
      <PersonnelSidePanel
        pilotId="pilot-orphaned"
        isOpen={true}
        onClose={jest.fn()}
      />,
    );

    // Progression tab is active by default — falls back to message.
    expect(
      screen.queryByTestId('stub-progression-panel'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Pilot not found in vault — this campaign may reference a deleted pilot/,
      ),
    ).toBeInTheDocument();

    // Abilities tab — same fallback.
    fireEvent.click(screen.getByRole('tab', { name: 'Abilities' }));
    expect(
      screen.queryByTestId('stub-abilities-panel'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Pilot not found in vault — this campaign may reference a deleted pilot/,
      ),
    ).toBeInTheDocument();

    // Assignment tab still operates on the pilotId — the stub renders.
    fireEvent.click(screen.getByRole('tab', { name: 'Assignment' }));
    expect(screen.getByTestId('stub-assignment-panel')).toHaveTextContent(
      'Assignment: pilot-orphaned',
    );
  });
});
