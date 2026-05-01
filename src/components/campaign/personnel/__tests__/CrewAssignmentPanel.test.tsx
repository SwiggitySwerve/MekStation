/**
 * CrewAssignmentPanel — component tests.
 *
 * Mocks `useForceStore` directly (no fetch mocking needed since the store
 * already abstracts the API surface). Covers: current-assignment display,
 * compatible-slot listing, assign success, unassign success, reassign
 * (swap) path, API error surface, and the no-Force empty-state CTA.
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IAssignment, IForce } from '@/types/force';

import { ForcePosition, ForceStatus, ForceType } from '@/types/force';

// =============================================================================
// Mocks
// =============================================================================

// next/router shim — CrewAssignmentPanel reads campaign id from router.query.
jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: 'campaign-1' } }),
}));

// next/link — render a plain anchor so we can assert the href.
jest.mock(
  'next/link',
  () =>
    function MockLink(props: {
      href: string;
      children: React.ReactNode;
      className?: string;
    }) {
      return (
        <a href={props.href} className={props.className}>
          {props.children}
        </a>
      );
    },
);

// Force-store mock — the panel calls useForceStore((s) => s.<field>) for
// each field. Our mock implementation accepts a selector and runs it
// against the active fixture state.
type ForceStoreState = {
  forces: readonly IForce[];
  isLoading: boolean;
  error: string | null;
  loadForces: jest.Mock;
  assignPilot: jest.Mock;
  clearAssignment: jest.Mock;
};

const mockLoadForces = jest.fn().mockResolvedValue(undefined);
const mockAssignPilot = jest.fn().mockResolvedValue(true);
const mockClearAssignment = jest.fn().mockResolvedValue(true);

let storeState: ForceStoreState = {
  forces: [],
  isLoading: false,
  error: null,
  loadForces: mockLoadForces,
  assignPilot: mockAssignPilot,
  clearAssignment: mockClearAssignment,
};

jest.mock('@/stores/useForceStore', () => ({
  useForceStore: <T,>(selector: (state: ForceStoreState) => T): T =>
    selector(storeState),
}));

import { CrewAssignmentPanel } from '../CrewAssignmentPanel';

// =============================================================================
// Fixture builders
// =============================================================================

function makeAssignment(
  args: Partial<IAssignment> & { id: string },
): IAssignment {
  return {
    id: args.id,
    pilotId: args.pilotId ?? null,
    unitId: args.unitId ?? null,
    position: args.position ?? ForcePosition.Member,
    slot: args.slot ?? 1,
    notes: args.notes,
  };
}

function makeForce(args: {
  id?: string;
  name?: string;
  assignments: readonly IAssignment[];
}): IForce {
  const now = new Date().toISOString();
  return {
    id: args.id ?? 'force-1',
    name: args.name ?? 'Alpha Lance',
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: args.assignments,
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: 0,
      assignedUnits: 0,
      emptySlots: 0,
      averageSkill: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function setStore(overrides: Partial<ForceStoreState>): void {
  storeState = {
    forces: [],
    isLoading: false,
    error: null,
    loadForces: mockLoadForces,
    assignPilot: mockAssignPilot,
    clearAssignment: mockClearAssignment,
    ...overrides,
  };
}

beforeEach(() => {
  mockLoadForces.mockClear();
  mockAssignPilot.mockClear();
  mockClearAssignment.mockClear();
  setStore({});
});

// =============================================================================
// Tests
// =============================================================================

describe('CrewAssignmentPanel', () => {
  it('displays the current assignment with an Unassign button', () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-A',
              pilotId: 'pilot-1',
              unitId: 'unit-atlas',
              slot: 1,
              position: ForcePosition.Lead,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    expect(screen.getByTestId('current-assignment-unit')).toHaveTextContent(
      'Alpha Lance · unit-atlas (lead #1)',
    );
    expect(screen.getByTestId('unassign-button')).toBeInTheDocument();
    expect(screen.queryByTestId('available-slots')).not.toBeInTheDocument();
  });

  it('lists compatible empty slots when the pilot has no current assignment', () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            // Compatible: empty pilot but unit present.
            makeAssignment({
              id: 'assign-B',
              pilotId: null,
              unitId: 'unit-locust',
              slot: 1,
              position: ForcePosition.Member,
            }),
            makeAssignment({
              id: 'assign-C',
              pilotId: null,
              unitId: 'unit-wasp',
              slot: 2,
              position: ForcePosition.Member,
            }),
            // Filtered out: no unit assigned.
            makeAssignment({
              id: 'assign-D',
              pilotId: null,
              unitId: null,
              slot: 3,
              position: ForcePosition.Member,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-unassigned" />);

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    const slotList = screen.getByTestId('available-slots');
    expect(slotList).toBeInTheDocument();
    expect(screen.getByTestId('assign-button-assign-B')).toBeInTheDocument();
    expect(screen.getByTestId('assign-button-assign-C')).toBeInTheDocument();
    expect(
      screen.queryByTestId('assign-button-assign-D'),
    ).not.toBeInTheDocument();
  });

  it('invokes assignPilot with the slot id and pilot id on Assign click', async () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-E',
              pilotId: null,
              unitId: 'unit-mauler',
              slot: 1,
              position: ForcePosition.Member,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-99" />);

    fireEvent.click(screen.getByTestId('assign-button-assign-E'));

    await waitFor(() => {
      expect(mockAssignPilot).toHaveBeenCalledWith('assign-E', 'pilot-99');
    });
  });

  it('invokes clearAssignment with the slot id on Unassign click', async () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-F',
              pilotId: 'pilot-1',
              unitId: 'unit-atlas',
              slot: 1,
              position: ForcePosition.Lead,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    fireEvent.click(screen.getByTestId('unassign-button'));

    await waitFor(() => {
      expect(mockClearAssignment).toHaveBeenCalledWith('assign-F');
    });
  });

  it('reassign swap: when current assignment exists, no available-slots are shown', () => {
    // Per the panel's design: while a current assignment exists the player
    // unassigns first, then re-assigns from the freshly-empty slot list.
    // The reassign "swap" therefore funnels through clearAssignment first;
    // verifying the available-slots panel stays hidden while assigned is
    // the most precise test of the swap funnel.
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-G1',
              pilotId: 'pilot-7',
              unitId: 'unit-orion',
              slot: 1,
              position: ForcePosition.Lead,
            }),
            makeAssignment({
              id: 'assign-G2',
              pilotId: null,
              unitId: 'unit-stalker',
              slot: 2,
              position: ForcePosition.Member,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-7" />);

    expect(screen.getByTestId('current-assignment-unit')).toHaveTextContent(
      'Alpha Lance · unit-orion (lead #1)',
    );
    expect(screen.queryByTestId('available-slots')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('assign-button-assign-G2'),
    ).not.toBeInTheDocument();
  });

  it('surfaces useForceStore.error in the panel error region', () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-H',
              pilotId: null,
              unitId: 'unit-rifleman',
              slot: 1,
              position: ForcePosition.Member,
            }),
          ],
        }),
      ],
      error: 'Slot is already occupied',
    });

    render(<CrewAssignmentPanel pilotId="pilot-error" />);

    expect(screen.getByTestId('assignment-error')).toHaveTextContent(
      'Slot is already occupied',
    );
  });

  it('renders the no-Force empty state with a CTA link when forces is empty after load', () => {
    setStore({ forces: [], isLoading: false });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    expect(
      screen.getByText('No active force in this campaign.'),
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Create one in Forces/i });
    expect(cta).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/forces',
    );
  });

  it('shows a transient loading message while the store is loading and forces are empty', () => {
    setStore({ forces: [], isLoading: true });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    expect(screen.getByText('Loading forces…')).toBeInTheDocument();
  });

  it('calls loadForces() on mount when forces is empty', () => {
    setStore({ forces: [], isLoading: false });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    expect(mockLoadForces).toHaveBeenCalledTimes(1);
  });

  it('does NOT call loadForces() on mount when forces are already populated', () => {
    setStore({
      forces: [
        makeForce({
          assignments: [
            makeAssignment({
              id: 'assign-I',
              pilotId: null,
              unitId: 'unit-jenner',
              slot: 1,
              position: ForcePosition.Member,
            }),
          ],
        }),
      ],
    });

    render(<CrewAssignmentPanel pilotId="pilot-1" />);

    expect(mockLoadForces).not.toHaveBeenCalled();
  });
});
