import { render, screen, act } from '@testing-library/react';
import React from 'react';

import {
  modeAvailability,
  getVaultSharingNotice,
} from '@/lib/multiplayer/modeAvailability';
const mockCreate = jest.fn().mockResolvedValue('ROOT01');
const mockJoin = jest.fn().mockResolvedValue(undefined);
let mockRoomProps:
  | {
      onCreateRoom: (password?: string) => Promise<string>;
      onJoinRoom: (code: string, password?: string) => Promise<void>;
    }
  | undefined;
jest.mock('@/components/sync', () => ({
  SyncStatusIndicator: () => <span>Disconnected</span>,
  PeerList: () => null,
  RoomCodeDialog: (props: NonNullable<typeof mockRoomProps>) => {
    mockRoomProps = props;
    return null;
  },
}));
jest.mock('@/lib/p2p/useSyncRoomStore', () => ({
  useConnectionState: () => 'disconnected',
  usePeers: () => [],
  useRoomCode: () => null,
  useSyncRoomSelector: (selector: (state: object) => unknown) =>
    selector({
      localPeerName: 'Root',
      localPeerId: null,
      setLocalPeerName: jest.fn(),
      createRoom: mockCreate,
      joinRoom: mockJoin,
      leaveRoom: jest.fn(),
      error: null,
      clearError: jest.fn(),
    }),
}));
import { P2PSyncSettings } from '../P2PSyncSettings';
afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  mockCreate.mockClear();
  mockJoin.mockClear();
});
it.each(['disabled', 'available'] as const)(
  'sharing entry obeys %s, including direct callbacks',
  async (status) => {
    jest.replaceProperty(modeAvailability.p2p, 'status', status);
    render(
      <P2PSyncSettings isExpanded onToggle={jest.fn()} onRef={jest.fn()} />,
    );
    const connect = screen.getByRole('button', {
      name: 'Connect',
    });
    if (status === 'disabled') {
      expect(connect).toBeDisabled();
      expect(connect).toHaveAccessibleDescription(
        getVaultSharingNotice()!.sentence,
      );
    } else expect(connect).toBeEnabled();
    await act(async () => {
      await mockRoomProps!.onCreateRoom();
      await mockRoomProps!.onJoinRoom('ROOT01');
    });
    expect(mockCreate).toHaveBeenCalledTimes(status === 'available' ? 1 : 0);
    expect(mockJoin).toHaveBeenCalledTimes(status === 'available' ? 1 : 0);
  },
);
