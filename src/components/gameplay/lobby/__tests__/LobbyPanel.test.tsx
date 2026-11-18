import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type {
  ILobbyState,
  ILoadout,
  ISelectedUnit,
} from '@/types/gameplay/GameLobbyInterfaces';

import { modeAvailability } from '@/lib/multiplayer/modeAvailability';
import { PilotStatus, PilotType, type IPilot } from '@/types/pilot';

import { GameplayLobbyPanel } from '../LobbyPanel';

const unitA: ISelectedUnit = {
  unitId: 'atlas-as7-d',
  designation: 'Atlas AS7-D',
  tonnage: 100,
  bv: 1897,
};

const unitB: ISelectedUnit = {
  unitId: 'hbk-4g',
  designation: 'Hunchback HBK-4G',
  tonnage: 50,
  bv: 1041,
};

const unitC: ISelectedUnit = {
  unitId: 'wsp-1a',
  designation: 'Wasp WSP-1A',
  tonnage: 20,
  bv: 420,
};

const pilot: IPilot = {
  id: 'pilot-1',
  name: 'Morgan Kell',
  callsign: 'Ghost',
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: { gunnery: 4, piloting: 5 },
  wounds: 0,
  abilities: [],
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
};

function loadout(units: readonly ISelectedUnit[]): ILoadout {
  return {
    units: [...units],
    pilots: units.map((unit, index) => ({
      pilotId: `pilot-${index}`,
      unitId: unit.unitId,
      callsign: `Pilot ${index}`,
      gunnery: 4,
      piloting: 5,
    })),
  };
}

function makeLobby(overrides: Partial<ILobbyState> = {}): ILobbyState {
  return {
    mode: '1v1',
    hostPeerId: 'host-peer',
    guestPeerId: 'guest-peer',
    hostLoadout: loadout([unitA]),
    guestLoadout: loadout([unitB]),
    mapConfig: { radius: 8, terrainPreset: 'clear', turnLimit: 20 },
    hostReady: false,
    guestReady: false,
    ...overrides,
  };
}

function renderPanel(
  lobbyState: ILobbyState,
  localPeerId: string,
  handlers: {
    onLoadoutChange?: jest.Mock;
    onMapConfigChange?: jest.Mock;
    onReadyChange?: jest.Mock;
    onLaunch?: jest.Mock;
  } = {},
): void {
  render(
    <GameplayLobbyPanel
      roomCode="ABC123"
      lobbyState={lobbyState}
      localPeerId={localPeerId}
      availableUnits={[unitA, unitB, unitC]}
      pilots={[pilot]}
      onLoadoutChange={handlers.onLoadoutChange ?? jest.fn()}
      onMapConfigChange={handlers.onMapConfigChange ?? jest.fn()}
      onReadyChange={handlers.onReadyChange ?? jest.fn()}
      onLaunch={handlers.onLaunch ?? jest.fn()}
    />,
  );
}

describe('GameplayLobbyPanel', () => {
  afterEach(() => jest.restoreAllMocks());

  it('disables a ready lobby launch with a visible accessible reason', () => {
    const onLaunch = jest.fn();
    renderPanel(makeLobby({ hostReady: true, guestReady: true }), 'host-peer', {
      onLaunch,
    });
    const launch = screen.getByRole('button', { name: 'Launch Match' });
    expect(launch).toBeDisabled();
    expect(launch).toHaveAccessibleDescription(modeAvailability.p2p.sentence);
    expect(screen.getByText(modeAvailability.p2p.sentence)).toBeVisible();
    fireEvent.click(launch);
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('removes the warning when P2P becomes available', () => {
    jest.replaceProperty(modeAvailability.p2p, 'status', 'available');
    renderPanel(makeLobby({ hostReady: true, guestReady: true }), 'host-peer');
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    expect(
      screen.queryByText(modeAvailability.p2p.sentence),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Launch Match' })).toBeEnabled();
  });
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the remote loadout card read-only', () => {
    renderPanel(makeLobby(), 'host-peer');

    expect(screen.getByLabelText('Add unit to Guest loadout')).toBeDisabled();
    expect(screen.getByLabelText('Map radius')).not.toBeDisabled();
  });

  it('copies the room code for invites', async () => {
    renderPanel(makeLobby(), 'host-peer');

    fireEvent.click(screen.getByRole('button', { name: 'Copy ABC123' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Copied' }),
      ).toBeInTheDocument(),
    );
  });

  it('publishes unit and pilot picks through the loadout callback', () => {
    const onLoadoutChange = jest.fn();
    renderPanel(
      makeLobby({ hostLoadout: { units: [], pilots: [] } }),
      'host-peer',
      { onLoadoutChange },
    );

    fireEvent.change(screen.getByLabelText('Add unit to Host loadout'), {
      target: { value: 'wsp-1a' },
    });

    expect(onLoadoutChange).toHaveBeenLastCalledWith({
      units: [unitC],
      pilots: [],
    });

    onLoadoutChange.mockClear();
    renderPanel(makeLobby({ hostLoadout: loadout([unitC]) }), 'host-peer', {
      onLoadoutChange,
    });
    fireEvent.change(screen.getByLabelText('Host pilot for Wasp WSP-1A'), {
      target: { value: 'pilot-1' },
    });

    expect(onLoadoutChange).toHaveBeenCalledWith({
      units: [unitC],
      pilots: [
        {
          pilotId: 'pilot-1',
          unitId: 'wsp-1a',
          callsign: 'Ghost',
          gunnery: 4,
          piloting: 5,
        },
      ],
    });
  });

  it('lets the host edit map config', () => {
    const onMapConfigChange = jest.fn();
    renderPanel(makeLobby(), 'host-peer', { onMapConfigChange });

    fireEvent.change(screen.getByLabelText('Map radius'), {
      target: { value: '14' },
    });

    expect(onMapConfigChange).toHaveBeenCalledWith({
      radius: 14,
      terrainPreset: 'clear',
      turnLimit: 20,
    });
  });

  it('does not show launch controls to the guest', () => {
    renderPanel(makeLobby({ hostReady: true, guestReady: true }), 'guest-peer');

    expect(
      screen.queryByRole('button', { name: 'Launch Match' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(modeAvailability.p2p.sentence)).toBeInTheDocument();
    expect(screen.getByLabelText('Map radius')).toBeDisabled();
  });

  it('blocks readiness when side mech counts do not match', () => {
    renderPanel(
      makeLobby({
        hostLoadout: loadout([unitA, unitC]),
        guestLoadout: loadout([unitB]),
      }),
      'host-peer',
    );

    expect(
      screen.getByText('Both sides must pick the same number of mechs'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ready' })).toBeDisabled();
  });

  it('lets a ready host launch a valid lobby when available', () => {
    jest.replaceProperty(modeAvailability.p2p, 'status', 'available');
    const onLaunch = jest.fn();
    renderPanel(makeLobby({ hostReady: true, guestReady: true }), 'host-peer', {
      onLaunch,
    });

    const launchButton = screen.getByRole('button', { name: 'Launch Match' });
    expect(launchButton).not.toBeDisabled();

    fireEvent.click(launchButton);

    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  describe('closed lobby', () => {
    const closedReady = (): ILobbyState =>
      makeLobby({ hostReady: true, guestReady: true, closed: true });

    it('says the lobby is closed', () => {
      renderPanel(closedReady(), 'host-peer');

      expect(screen.getByRole('status')).toHaveTextContent(
        'This lobby is closed',
      );
    });

    it('does not offer an open launch to the host', () => {
      const onLaunch = jest.fn();
      renderPanel(closedReady(), 'host-peer', { onLaunch });

      const launchButton = screen.getByRole('button', { name: 'Launch Match' });
      expect(launchButton).toBeDisabled();
      fireEvent.click(launchButton);
      expect(onLaunch).not.toHaveBeenCalled();
    });

    it('disables ready for either side', () => {
      renderPanel(closedReady(), 'guest-peer');

      expect(screen.getByRole('button', { name: 'Not Ready' })).toBeDisabled();
    });

    it('disables loadout and map editing for the host', () => {
      renderPanel(
        makeLobby({ hostLoadout: { units: [], pilots: [] }, closed: true }),
        'host-peer',
      );

      expect(screen.getByLabelText('Add unit to Host loadout')).toBeDisabled();
      expect(screen.getByLabelText('Map radius')).toBeDisabled();
      expect(screen.getByLabelText('Terrain preset')).toBeDisabled();
      expect(screen.getByLabelText('Turn limit')).toBeDisabled();
    });

    it('shows no closed notice for an open lobby', () => {
      renderPanel(makeLobby(), 'host-peer');

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
