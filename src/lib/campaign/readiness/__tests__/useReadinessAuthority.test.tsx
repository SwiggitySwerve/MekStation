import { act, renderHook, waitFor } from '@testing-library/react';

import { readCampaignLaunchHead } from '@/lib/campaign/encounter/readCampaignLaunchHead';

import { useReadinessAuthority } from '../useReadinessAuthority';

jest.mock('@/lib/campaign/encounter/readCampaignLaunchHead', () => ({
  readCampaignLaunchHead: jest.fn(),
}));
const readHead = jest.mocked(readCampaignLaunchHead);

describe('useReadinessAuthority', () => {
  beforeEach(() => readHead.mockReset());

  it('uses snapshot authority when an older successful reader result omits the field', async () => {
    readHead.mockResolvedValue({ kind: 'no-authoritative-stream' });
    const { result } = renderHook(() => useReadinessAuthority('campaign-1'));
    expect(result.current.kind).toBe('blocked');
    await waitFor(() => expect(result.current).toEqual({ kind: 'snapshot' }));
  });

  it('never carries another campaign’s journal status into a replacement', async () => {
    readHead.mockResolvedValueOnce({
      kind: 'head',
      branchId: 'root',
      revision: 1,
      effectiveGeneration: 0,
      readinessAuthority: { kind: 'journal', units: { 'unit-1': 'destroyed' } },
    });
    const { result, rerender } = renderHook(
      ({ id }) => useReadinessAuthority(id),
      { initialProps: { id: 'campaign-1' } },
    );
    await waitFor(() => expect(result.current.kind).toBe('journal'));
    readHead.mockResolvedValueOnce({ kind: 'no-authoritative-stream' });
    rerender({ id: 'campaign-2' });
    expect(result.current.kind).toBe('blocked');
    await waitFor(() => expect(result.current.kind).toBe('snapshot'));
  });

  it('ignores a response after unmount', async () => {
    let resolve:
      | ((value: Awaited<ReturnType<typeof readCampaignLaunchHead>>) => void)
      | undefined;
    readHead.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result, unmount } = renderHook(() =>
      useReadinessAuthority('campaign-1'),
    );
    unmount();
    await act(async () => resolve?.({ kind: 'no-authoritative-stream' }));
    expect(result.current.kind).toBe('blocked');
  });
});
