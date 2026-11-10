/**
 * The save-status card's conflict block (umbrella task 8.3).
 *
 * A refused save used to offer two buttons, and the dangerous one was
 * the default: "Keep My Version" re-sent the same stale envelope at the
 * version the server had just reported, which the server accepts,
 * discarding whatever the other writer committed. These rows pin what
 * replaced it - the server's typed reason, and exactly one action.
 *
 * The launch-conflict rows also pin when resync may clear its banner.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { CampaignSaveStatusCard } from '../CampaignSaveStatusCard';

describe('CampaignSaveStatusCard launch resync', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    useCampaignPersistenceStore.getState().reset();
  });

  it.each([false, true])(
    'clears the launch banner only when resync succeeds (result: %s)',
    async (adopted) => {
      useCampaignPersistenceStore.getState().reportLaunchConflict({
        code: 'STALE_REVISION',
        reason: 'The campaign moved on',
        activeHead: { branchId: 'main', revision: 7, effectiveGeneration: 1 },
        resyncAction: 'resync-to-active-head',
      });
      const resolve = jest
        .spyOn(
          useCampaignPersistenceStore.getState(),
          'resolveConflictTakeServer',
        )
        .mockResolvedValue(adopted);
      render(<CampaignSaveStatusCard />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Resync to Current' }),
        );
      });

      expect(resolve).toHaveBeenCalledTimes(1);
      if (adopted) {
        expect(
          screen.queryByTestId('campaign-launch-conflict'),
        ).not.toBeInTheDocument();
        expect(
          useCampaignPersistenceStore.getState().launchConflict,
        ).toBeNull();
      } else {
        expect(
          screen.getByTestId('campaign-launch-conflict'),
        ).toHaveTextContent('STALE_REVISION');
        expect(
          useCampaignPersistenceStore.getState().launchConflict,
        ).not.toBeNull();
      }
    },
  );

  it('shows unsaved changes for a pending edit after an earlier save completed', () => {
    useCampaignPersistenceStore.setState({ dirty: true, saveState: 'idle' });
    render(<CampaignSaveStatusCard />);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

describe('CampaignSaveStatusCard conflict block', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  /** Put the store in the state a refused save leaves behind. */
  function seedConflict(
    conflict: ReturnType<
      typeof useCampaignPersistenceStore.getState
    >['saveConflict'],
  ): void {
    useCampaignPersistenceStore.setState({
      saveState: 'conflict',
      saveConflict: conflict,
    });
  }

  it('names the reason and the version the server holds', () => {
    seedConflict({
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 7,
    });

    render(<CampaignSaveStatusCard />);

    const message = screen.getByTestId('campaign-save-conflict');
    expect(message).toHaveTextContent('base-state-unavailable');
    expect(message).toHaveTextContent('version 7');
  });

  it('offers exactly one action, and it is not an overwrite', () => {
    seedConflict({
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 7,
    });

    render(<CampaignSaveStatusCard />);

    expect(
      screen.getByTestId('campaign-conflict-take-server-btn'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('campaign-conflict-keep-local-btn'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Keep My Version/i)).not.toBeInTheDocument();
  });

  it('still reports a conflict when the server sent no typed detail', () => {
    // An older server, or a body this client could not read: the state is
    // still honest and the recovery is still available, so the card must
    // not go blank or invent a reason.
    seedConflict(null);

    render(<CampaignSaveStatusCard />);

    expect(screen.getByTestId('campaign-save-conflict')).toHaveTextContent(
      /changed elsewhere/i,
    );
    expect(
      screen.getByTestId('campaign-conflict-take-server-btn'),
    ).toBeInTheDocument();
  });
});

describe('CampaignSaveStatusCard refusal block (CAMPAIGN-LIVE-WRITE-1)', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  it('shows the server\'s refusal reason, keeps the unsaved-changes flag and never says "playing offline"', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'error',
      dirty: true,
      errorMessage: 'only the host session that started it can change it',
      saveRefusal: {
        code: 'HOST_SESSION_REQUIRED',
        reason: 'malformed',
        message: 'only the host session that started it can change it',
      },
    });

    render(<CampaignSaveStatusCard />);

    const refused = screen.getByTestId('campaign-save-refused');
    expect(refused).toHaveTextContent('HOST_SESSION_REQUIRED');
    expect(refused).toHaveTextContent(
      'only the host session that started it can change it',
    );
    expect(refused).toHaveTextContent('unsaved changes are kept');
    // One badge, and it says the save did not happen - never "Saved".
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByText(/playing offline/i)).not.toBeInTheDocument();
  });

  it('still says "playing offline" for a plain failure (pinned)', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'error',
      errorMessage: 'network down',
      saveRefusal: null,
    });

    render(<CampaignSaveStatusCard />);

    expect(screen.getByText(/network down/)).toHaveTextContent(
      'playing offline; changes are kept locally',
    );
    expect(
      screen.queryByTestId('campaign-save-refused'),
    ).not.toBeInTheDocument();
  });
});

describe('CampaignSaveStatusCard single derived badge', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  function badges(): string[] {
    return [
      'Saved',
      'Unsaved changes',
      'Recovered unsaved changes',
      'Idle',
      'Saving…',
      'Save failed',
      'Conflict',
    ].filter((label) =>
      // Badges only: the Save button also reads "Saving…" while saving.
      screen.queryAllByText(label).some((node) => node.tagName === 'SPAN'),
    );
  }

  it.each([
    ['clean and saved', { saveState: 'saved', dirty: false }, 'Saved'],
    [
      'edited after a save',
      { saveState: 'idle', dirty: true },
      'Unsaved changes',
    ],
    ['saving', { saveState: 'saving', dirty: true }, 'Saving…'],
    [
      'recovered from an earlier document',
      { saveState: 'idle', dirty: true, recoveredPendingWrite: true },
      'Recovered unsaved changes',
    ],
    [
      'failed with edits pending',
      { saveState: 'error', dirty: true, errorMessage: 'offline' },
      'Save failed',
    ],
    ['never saved', { saveState: 'idle', dirty: false }, 'Idle'],
  ] as const)('shows exactly one badge when %s', (_name, patch, label) => {
    useCampaignPersistenceStore.setState({ ...patch });
    render(<CampaignSaveStatusCard />);
    expect(badges()).toEqual([label]);
  });

  it('can never read Saved while edits are pending, whatever the status says', () => {
    // The reducer holds this line; the card does not depend on it.
    useCampaignPersistenceStore.setState({ saveState: 'saved', dirty: true });
    render(<CampaignSaveStatusCard />);
    expect(badges()).toEqual(['Unsaved changes']);
  });

  it('explains a recovered copy and what happens next', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'idle',
      dirty: true,
      recoveredPendingWrite: true,
    });
    render(<CampaignSaveStatusCard />);
    expect(
      screen.getByTestId('campaign-save-pending-detail'),
    ).toHaveTextContent(
      'Found changes from your last session that the server does not have.',
    );
  });

  it('says an ordinary pending edit will be saved automatically', () => {
    useCampaignPersistenceStore.setState({ saveState: 'idle', dirty: true });
    render(<CampaignSaveStatusCard />);
    expect(
      screen.getByTestId('campaign-save-pending-detail'),
    ).toHaveTextContent('Saving automatically in a moment');
  });

  it('tells the player when the copy is too large to save on close', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'idle',
      dirty: true,
      flushSkip: {
        reason: 'envelope-over-keepalive-cap',
        campaignId: 'c',
        byteLength: 70_000,
        capBytes: 65_536,
      },
    });
    render(<CampaignSaveStatusCard />);
    expect(screen.getByTestId('campaign-flush-skipped')).toHaveTextContent(
      'Too large to save when closing. Use Save now.',
    );
  });
});

describe('CampaignSaveStatusCard pending-write conflict', () => {
  const server = buildPopulatedCampaign();
  const localCampaign = {
    ...server,
    currentDate: new Date('3025-09-14T00:00:00.000Z'),
  };
  const dateText = (value: Date | string) =>
    new Date(value).toLocaleDateString();

  beforeEach(() => {
    useCampaignStore().getState().switchCampaign(localCampaign);
    useCampaignPersistenceStore.setState({
      saveState: 'conflict',
      dirty: true,
      conflictServerRecord: buildSerializedCampaign(server, 'device', 9),
      saveConflict: {
        reason: 'local-edits-predate-server',
        recoveryAction: 'resync-to-active-head',
        conflictingFields: [],
        currentVersion: 9,
        localBaseVersion: 7,
      },
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    useCampaignPersistenceStore.getState().reset();
  });

  it('states what the browser holds and what the server holds', () => {
    render(<CampaignSaveStatusCard />);

    const local = screen.getByTestId('campaign-pending-write-local');
    expect(local).toHaveTextContent(dateText(localCampaign.currentDate));
    expect(local).toHaveTextContent('version 7');
    const remote = screen.getByTestId('campaign-pending-write-server');
    expect(remote).toHaveTextContent(dateText(server.currentDate));
    expect(remote).toHaveTextContent('version 9');
    expect(local.textContent).not.toBe(remote.textContent);
  });

  it('says nothing was sent or replaced, the changes stay until chosen, and choosing discards them', () => {
    render(<CampaignSaveStatusCard />);

    const card = screen.getByTestId('campaign-pending-write-conflict');
    expect(card).toHaveTextContent('Nothing was sent and nothing was replaced');
    expect(card).toHaveTextContent('stay in this window until you choose');
    expect(card).toHaveTextContent("server's version discards them for good");
    expect(screen.getByText('Conflict')).toBeInTheDocument();
  });

  it('warns that Use Server Version discards pending battle results before the player clicks', () => {
    const store = useCampaignStore();
    store.getState().enqueueOutcome({
      version: COMBAT_OUTCOME_VERSION,
      matchId: 'conflicted-battle',
      contractId: null,
      scenarioId: 'scenario-1',
      capturedAt: '2026-11-10T00:00:00.000Z',
      endReason: CombatEndReason.ObjectiveMet,
      report: {
        version: 1,
        matchId: 'conflicted-battle',
        winner: GameSide.Player,
        reason: 'objective',
        turnCount: 1,
        units: [],
        mvpUnitId: null,
        log: [],
      },
      unitDeltas: [],
    });
    render(<CampaignSaveStatusCard />);
    expect(
      screen.getByTestId('campaign-conflict-battle-warning'),
    ).toHaveTextContent(
      'Use Server Version discards these battle results along with your other local changes.',
    );
    expect(
      screen.getByTestId('campaign-conflict-battle-warning'),
    ).toHaveTextContent('Nothing is changed until you choose.');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Use Server Version' }),
    ).toBeInTheDocument();
    act(() => store.getState().dequeueOutcome('conflicted-battle'));
    expect(
      screen.queryByTestId('campaign-conflict-battle-warning'),
    ).not.toBeInTheDocument();
  });

  it('offers only the server version: no keep-mine, no save', () => {
    render(<CampaignSaveStatusCard />);

    expect(
      screen.getByRole('button', { name: 'Use Server Version' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.queryByTestId('campaign-save-now-btn'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/keep (my|mine|local)/i)).not.toBeInTheDocument();
    // The generic copy tells the player to redo their edits; here nothing
    // was refused, and the edits are still held.
    expect(
      screen.queryByTestId('campaign-save-conflict'),
    ).not.toBeInTheDocument();
  });

  it('explains further edits are unsent and Save now is paused, with a stable link target', () => {
    // A previous over-cap diagnostic must not suggest Save now in conflict.
    useCampaignPersistenceStore.setState({
      flushSkip: {
        reason: 'envelope-over-keepalive-cap',
        campaignId: server.id,
        byteLength: 70_000,
        capBytes: 65_536,
      },
    });
    render(<CampaignSaveStatusCard />);
    act(() => useCampaignPersistenceStore.getState().markDirty());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Changes stay local and unsent',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saving is paused until you choose Use Server Version',
    );
    expect(
      screen.getByRole('heading', { name: 'Campaign Save' }),
    ).toHaveAttribute('id', 'campaign-save-status');
    expect(
      screen.queryByRole('button', { name: 'Save now' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('campaign-flush-skipped'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('changes nothing until the player clicks, and then takes the server version', async () => {
    const take = jest
      .spyOn(
        useCampaignPersistenceStore.getState(),
        'resolveConflictTakeServer',
      )
      .mockResolvedValue(true);
    render(<CampaignSaveStatusCard />);
    expect(take).not.toHaveBeenCalled();
    expect(useCampaignStore().getState().campaign?.currentDate).toEqual(
      localCampaign.currentDate,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Use Server Version' }),
      );
    });

    expect(take).toHaveBeenCalledTimes(1);
  });

  it('reads the local date live, so it stays true if the player keeps playing', () => {
    render(<CampaignSaveStatusCard />);
    act(() => {
      useCampaignStore()
        .getState()
        .switchCampaign({
          ...localCampaign,
          currentDate: new Date('3025-12-25T00:00:00.000Z'),
        });
    });
    expect(
      screen.getByTestId('campaign-pending-write-local'),
    ).toHaveTextContent(dateText('3025-12-25T00:00:00.000Z'));
  });
});
