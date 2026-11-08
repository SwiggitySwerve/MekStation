/**
 * Whether a day advance, multi-day advance or jump is in flight on the
 * campaign store. Every control that moves the campaign clock reads it to
 * disable itself; the store refuses a second call regardless.
 */

import { useStore } from 'zustand';

import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export function useDayAdvanceInFlight(): boolean {
  return useStore(useCampaignStore(), (state) => state.dayAdvanceInFlight);
}
