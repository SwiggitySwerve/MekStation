/**
 * Encounter force-selection page behaviour.
 *
 * The route and its happy path are covered end to end in
 * `e2e/encounter.spec.ts` for both sides. What had no coverage at all
 * were the states a stuck user actually meets: no saved forces, a save
 * that fails, a request already in flight, and an invalid side.
 *
 * The empty state matters most. `force-selection-empty-state` existed in
 * the page and appeared in no test or spec anywhere, so nothing would
 * have noticed if the one screen a blocked user lands on stopped
 * rendering — and that user has, by definition, no other way forward.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const push = jest.fn();
const routerState = {
  isReady: true,
  query: {} as Record<string, string>,
  asPath: '',
  push,
};

jest.mock('next/router', () => ({
  useRouter: () => routerState,
}));

const encounterState = {
  loadEncounters: jest.fn(async () => undefined),
  getEncounter: jest.fn(),
  setPlayerForce: jest.fn(async () => true),
  setOpponentForce: jest.fn(async () => true),
  validateEncounter: jest.fn(async () => undefined),
  clearError: jest.fn(),
  error: null as string | null,
};

const forceState = {
  loadForces: jest.fn(async () => undefined),
  getForceSummaries: jest.fn(() => [] as unknown[]),
  error: null as string | null,
};

jest.mock('@/stores/useEncounterStore', () => ({
  useEncounterSelector: (selector: (state: unknown) => unknown) =>
    selector(encounterState),
}));

jest.mock('@/stores/useForceStore', () => ({
  useForceSelector: (selector: (state: unknown) => unknown) =>
    selector(forceState),
}));

import SelectForcePage from '@/pages/gameplay/encounters/[id]/select-force';

const ENCOUNTER_ID = 'encounter-1';

function force(id: string, assignedUnits = 4) {
  return {
    id,
    name: `Force ${id}`,
    forceType: 'lance',
    stats: { assignedUnits, totalBV: 1234 },
  };
}

function setRoute(type: string | undefined): void {
  routerState.query = {
    id: ENCOUNTER_ID,
    ...(type === undefined ? {} : { type }),
  };
  routerState.asPath = `/gameplay/encounters/${ENCOUNTER_ID}/select-force${
    type === undefined ? '' : `?type=${type}`
  }`;
}

beforeEach(() => {
  jest.clearAllMocks();
  encounterState.error = null;
  forceState.error = null;
  encounterState.getEncounter.mockReturnValue({
    id: ENCOUNTER_ID,
    name: 'Recovery Drill',
  });
  encounterState.setPlayerForce.mockResolvedValue(true);
  encounterState.setOpponentForce.mockResolvedValue(true);
  forceState.getForceSummaries.mockReturnValue([]);
  setRoute('player');
});

describe('encounter force selection', () => {
  it('shows the recovery empty state when no forces exist', async () => {
    // The screen a blocked user lands on. Nothing referenced this
    // testid anywhere before, so the one path out of being stuck was
    // entirely unguarded.
    render(<SelectForcePage />);

    expect(
      await screen.findByTestId('force-selection-empty-state'),
    ).toBeInTheDocument();
    // And it offers the way forward rather than just reporting absence.
    expect(
      screen.getByRole('link', { name: /create force/i }),
    ).toBeInTheDocument();
  });

  it('assigns through the player action for the player side', async () => {
    forceState.getForceSummaries.mockReturnValue([force('f1')]);
    render(<SelectForcePage />);

    fireEvent.click(await screen.findByTestId('select-force-f1'));

    await waitFor(() => {
      expect(encounterState.setPlayerForce).toHaveBeenCalledWith(
        ENCOUNTER_ID,
        'f1',
      );
    });
    // The other slot is never touched - assigning a player force must
    // not disturb the opponent's.
    expect(encounterState.setOpponentForce).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(encounterState.validateEncounter).toHaveBeenCalledWith(
        ENCOUNTER_ID,
      );
    });
    expect(push).toHaveBeenCalled();
  });

  it('assigns through the opponent action for the opponent side', async () => {
    setRoute('opponent');
    forceState.getForceSummaries.mockReturnValue([force('f1')]);
    render(<SelectForcePage />);

    fireEvent.click(await screen.findByTestId('select-force-f1'));

    await waitFor(() => {
      expect(encounterState.setOpponentForce).toHaveBeenCalledWith(
        ENCOUNTER_ID,
        'f1',
      );
    });
    expect(encounterState.setPlayerForce).not.toHaveBeenCalled();
  });

  it('stays on the page when the save fails, without validating or navigating', async () => {
    // A failed save that still navigated would drop the user back on the
    // encounter believing the force was assigned.
    encounterState.setPlayerForce.mockResolvedValue(false);
    forceState.getForceSummaries.mockReturnValue([force('f1')]);
    render(<SelectForcePage />);

    fireEvent.click(await screen.findByTestId('select-force-f1'));

    await waitFor(() => {
      expect(encounterState.setPlayerForce).toHaveBeenCalled();
    });
    expect(encounterState.validateEncounter).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // Still usable: the button is released so a retry is possible.
    await waitFor(() => {
      expect(screen.getByTestId('select-force-f1')).not.toBeDisabled();
    });
  });

  it('disables every other option while a save is in flight', async () => {
    // Two assignments racing would send two writes for one intent.
    //
    // Note precisely what this proves: the DISABLED prop, not the
    // handler's own `pendingForceId` guard. A click on a disabled button
    // never reaches the handler, so removing that guard leaves this row
    // green - verified. Both protections exist; this is the one a user
    // can see, and it is the one asserted here.
    let release: (value: boolean) => void = () => undefined;
    encounterState.setPlayerForce.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = resolve;
      }),
    );
    forceState.getForceSummaries.mockReturnValue([force('f1'), force('f2')]);
    render(<SelectForcePage />);

    const first = await screen.findByTestId('select-force-f1');
    fireEvent.click(first);
    await waitFor(() => {
      expect(screen.getByTestId('select-force-f2')).toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('select-force-f2'));

    expect(encounterState.setPlayerForce).toHaveBeenCalledTimes(1);
    release(true);
  });

  it('refuses an invalid side instead of guessing one', async () => {
    // Guarded BEFORE the label is derived, so `?type=garbage` cannot
    // render an opponent picker whose buttons silently do nothing. This
    // row exists because a review of mine claimed the opposite - the
    // early return was there all along.
    setRoute('garbage');
    forceState.getForceSummaries.mockReturnValue([force('f1')]);
    render(<SelectForcePage />);

    expect(
      await screen.findByText(/invalid force selection/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('select-force-f1')).not.toBeInTheDocument();
  });

  it('reports a missing encounter rather than an empty picker', async () => {
    encounterState.getEncounter.mockReturnValue(undefined);
    render(<SelectForcePage />);

    expect(await screen.findByText(/encounter not found/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId('force-selection-empty-state'),
    ).not.toBeInTheDocument();
  });
});
