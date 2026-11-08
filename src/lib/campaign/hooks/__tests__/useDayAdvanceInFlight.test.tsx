/**
 * K13 PR3: the hook every advance control reads follows the campaign store's
 * in-flight flag, both ways.
 */

import { act, renderHook } from '@testing-library/react';

import { useDayAdvanceInFlight } from '@/lib/campaign/hooks/useDayAdvanceInFlight';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';

describe('useDayAdvanceInFlight', () => {
  beforeEach(() => resetCampaignStore());
  afterEach(() => resetCampaignStore());

  it('(B7) follows dayAdvanceInFlight as it is set and cleared', () => {
    const { result } = renderHook(() => useDayAdvanceInFlight());
    expect(result.current).toBe(false);

    act(() => useCampaignStore().setState({ dayAdvanceInFlight: true }));
    expect(result.current).toBe(true);

    act(() => useCampaignStore().setState({ dayAdvanceInFlight: false }));
    expect(result.current).toBe(false);
  });
});
