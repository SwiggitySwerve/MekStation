import { act, renderHook } from '@testing-library/react';

import { modeAvailability } from '@/lib/multiplayer/modeAvailability';
import { useNetworked1v1Launch } from '@/pages/gameplay/encounters/[id]/pre-battle';

afterEach(() => jest.restoreAllMocks());
it.each(['disabled', 'available'] as const)(
  'encounter entry obeys %s before creating a room',
  async (status) => {
    jest.replaceProperty(modeAvailability.p2p, 'status', status);
    const createSyncRoom = jest.fn().mockResolvedValue('ROOT01');
    const push = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useNetworked1v1Launch({ createSyncRoom, router: { push } }),
    );
    await act(async () => result.current.startNetworked1v1());
    expect(createSyncRoom).toHaveBeenCalledTimes(
      status === 'available' ? 1 : 0,
    );
    expect(push).toHaveBeenCalledTimes(status === 'available' ? 1 : 0);
  },
);
