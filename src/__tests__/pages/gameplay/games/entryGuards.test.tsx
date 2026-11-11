import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { modeAvailability } from '@/lib/multiplayer/modeAvailability';
const mockCreate = jest.fn().mockResolvedValue('ROOT01');
const mockJoin = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn().mockResolvedValue(true);
jest.mock('next/router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/p2p/useSyncRoomStore', () => ({
  useSyncRoomSelector: (
    selector: (state: {
      createRoom: typeof mockCreate;
      joinRoom: typeof mockJoin;
    }) => unknown,
  ) => selector({ createRoom: mockCreate, joinRoom: mockJoin }),
}));
// Deliberately bypass native disabled behavior to exercise the entry callbacks themselves.
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => <button onClick={onClick}>{children}</button>,
}));
import GamesListPage from '@/pages/gameplay/games';
afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  mockCreate.mockClear();
  mockJoin.mockClear();
  mockPush.mockClear();
});
it.each(['disabled', 'available'] as const)(
  'games create and join callbacks obey %s',
  async (status) => {
    jest.replaceProperty(modeAvailability.p2p, 'status', status);
    render(<GamesListPage games={[]} />);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Networked 1v1 room code' }),
      { target: { value: 'ROOT01' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create Lobby' }));
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    if (status === 'available')
      await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(2));
    expect(mockCreate).toHaveBeenCalledTimes(status === 'available' ? 1 : 0);
    expect(mockJoin).toHaveBeenCalledTimes(status === 'available' ? 1 : 0);
  },
);
