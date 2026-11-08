import { act, render, screen } from '@testing-library/react';

import { ConnectionState } from '@/lib/p2p/types';

import { ConnectionQualityIndicator } from '../ConnectionQualityIndicator';

const getRetryState = jest.fn();

jest.mock('@/lib/p2p/SyncProvider', () => ({
  getRetryState: (...args: unknown[]) => getRetryState(...args),
}));

describe('ConnectionQualityIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getRetryState.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('labels a connecting indicator with retry attempts as Reconnecting', async () => {
    getRetryState.mockReturnValue({
      isRetrying: true,
      attempts: 2,
      maxAttempts: 5,
    });

    render(
      <ConnectionQualityIndicator
        connectionState={ConnectionState.Connecting}
        peerCount={0}
      />,
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(
      screen.getByRole('button', { name: 'Connection quality: Reconnecting' }),
    ).toBeInTheDocument();
  });

  it('keeps the Connecting label when no retry is in progress', async () => {
    getRetryState.mockReturnValue({
      isRetrying: false,
      attempts: 0,
      maxAttempts: 5,
    });

    render(
      <ConnectionQualityIndicator
        connectionState={ConnectionState.Connecting}
        peerCount={0}
      />,
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(
      screen.getByRole('button', { name: 'Connection quality: Connecting' }),
    ).toBeInTheDocument();
  });
});
